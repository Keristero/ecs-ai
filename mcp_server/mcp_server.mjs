import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { tool_defs, resource_defs } from "../game_framework/ecs_interface.mjs";
import express from 'express';
import env from "../environment.mjs";
import Logger from "../logger.mjs";
const logger = new Logger("MCP Server", 'cyan');

async function serve_mcp(game) {

    // Create an MCP server
    const server = new McpServer({
        name: "ecs-server",
        version: "1.0.0"
    });

    // Add all tools exposed by the ECS interface
    for (const handle in tool_defs) {
        logger.info(`Registering tool: ${handle}`)
        const tool_def = tool_defs[handle]
        server.registerTool(handle, tool_def.details, ()=>{
            return tool_def.run({game, ...arguments[0]})
        })
    }

    for (const handle in resource_defs) {
        logger.info(`Registering resource: ${handle}`)
        const resource_def = resource_defs[handle]
        server.registerResource(handle, resource_def.details, ()=>{
            return resource_def.run({game, ...arguments[0]})
        })
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
    const host = env.mcp_host || '0.0.0.0';
    const parsedPort = Number.isFinite(env.mcp_port) ? env.mcp_port : Number.parseInt(env.mcp_port, 10);
    const port = Number.isFinite(parsedPort) ? parsedPort : 6061;

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