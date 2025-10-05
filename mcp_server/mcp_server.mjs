import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { tool_defs, resource_defs } from "../game_framework/ecs_interface.mjs";
import express from 'express';
import env from "../environment.mjs";
import Logger from "../logger.mjs";
const logger = new Logger("MCP Server", 'cyan');

async function serve_mcp(game) {

    // Create an MCP server with resources capability
    const server = new McpServer({
        name: "ecs-server",
        version: "1.0.0"
    }, {
        capabilities: {
            resources: {}
        }
    });

    // Add all tools exposed by the ECS interface
    for (const handle in tool_defs) {
        logger.info(`Registering tool: ${handle}`)
        const tool_def = tool_defs[handle]
        
        // Extract schema properties for MCP format
        let inputSchema = {};
        if (tool_def.details.inputSchema && tool_def.details.inputSchema._def?.shape) {
            const shape = typeof tool_def.details.inputSchema._def.shape === 'function' 
                ? tool_def.details.inputSchema._def.shape() 
                : tool_def.details.inputSchema._def.shape;
            inputSchema = shape || {};
        }
        
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

    for (const handle in resource_defs) {
        logger.info(`Registering resource: ${handle}`)
        const resource_def = resource_defs[handle]
        
        // Extract schema properties for MCP format  
        let inputSchema = {};
        if (resource_def.details.inputSchema && resource_def.details.inputSchema._def?.shape) {
            const shape = typeof resource_def.details.inputSchema._def.shape === 'function' 
                ? resource_def.details.inputSchema._def.shape() 
                : resource_def.details.inputSchema._def.shape;
            inputSchema = shape || {};
        }
        
        server.registerResource(
            handle,
            {
                title: resource_def.details.title,
                description: resource_def.details.description,
                inputSchema
            },
            async (args) => {
                const result = await resource_def.run({game, ...args});
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