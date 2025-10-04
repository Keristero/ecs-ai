import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { tool_defs, resource_defs } from "../game_framework/ecs_interface.mjs";
import express from 'express';
import {mcp_port,mcp_host} from "../environment.mjs";
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

    const port = parseInt(mcp_port);
    app.listen(port, () => {
        logger.info(`Listening on port ${mcp_host}:${port}/mcp`);
    }).on('error', error => {
        logger.error(`Failed to host: ${error.message}`);
        process.exit(1);
    });

}

export { serve_mcp };