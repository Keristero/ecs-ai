import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { tool_defs } from "../game_framework/ecs_interface.mjs";
import express from 'express';
import env from "../environment.mjs";
import Logger from "../logger.mjs";
const logger = new Logger("MCP Server", 'cyan');

function extractInputShape(zodObject) {
    if (!zodObject) return undefined;
    if (typeof zodObject.shape === 'function') {
        return zodObject.shape();
    }
    if (zodObject.shape) {
        return zodObject.shape;
    }
    const defShape = zodObject._def?.shape;
    if (!defShape) return undefined;
    return typeof defShape === 'function' ? defShape() : defShape;
}

async function serve_mcp(game) {

    // Create an MCP server with tools capability
    const server = new McpServer({
        name: "ecs-server",
        version: "1.0.0"
    }, {
        capabilities: {
            tools: {}
        }
    });

    // Add all tools exposed by the ECS interface
    for (const handle in tool_defs) {
        logger.info(`Registering tool: ${handle}`)
        const tool_def = tool_defs[handle]

        const inputSchema = extractInputShape(tool_def?.details?.inputSchema);

        server.registerTool(
            handle,
            {
                title: tool_def.details.title,
                description: tool_def.details.description,
                inputSchema
            },
            async (args) => {
                const result = await tool_def.run({game, ...args});
                return {
                    content: [{
                        type: 'text',
                        text: typeof result === 'string' ? result : 
                              result?.content?.[0]?.text || JSON.stringify(result)
                    }]
                };
            }
        )
    }

    const app = express();
    app.use(express.json());

    app.post('/mcp', async (req, res) => {
        // Create a new transport for each request to prevent request ID collisions
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
            enableJsonResponse: true
        });

        res.on('close', () => {
            transport.close();
        });

        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
    });
    let host = env.mcp_host;
    if (!host) {
        host = '127.0.0.1';
    }

    // Node's HTTP server prefers IPv6 when asked to bind to "localhost" on dual-stack hosts.
    // Resolve it explicitly to an IPv4 loopback address so tools expecting IPv4 keep working.
    if (host === 'localhost') {
        host = '127.0.0.1';
    }

    // Allow explicit IPv6/any-address bindings that the caller provided (e.g. :: or 0.0.0.0).
    const port = Number.isFinite(env.mcp_port) ? env.mcp_port : 6061;

    return await new Promise((resolve, reject) => {
        const server = app
            .listen(port, host, () => {
                logger.info(`MCP listening on http://${host}:${port}/mcp`);
                resolve({ app, server });
            })
            .on('error', (error) => {
                logger.error(`Failed to host MCP server: ${error.message}`);
                reject(error);
            });
    });
}

export { serve_mcp };