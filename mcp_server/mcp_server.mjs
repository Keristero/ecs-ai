import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {tool_defs, resource_defs} from "../game_framework/ecs_interface.mjs";
import Logger from "../logger.mjs";
const logger = new Logger("MCP Server",'cyan');


// Create an MCP server
const server = new McpServer({
  name: "demo-server",
  version: "1.0.0"
});

// Add all tools exposed by the ECS interface
for(const handle in tool_defs){
    logger.info(`Registering tool: ${handle}`)
    const tool_def = tool_defs[handle]
    server.registerTool(handle, tool_def.details, tool_def.run)
}

for(const handle in resource_defs){
    logger.info(`Registering resource: ${handle}`)
    const resource_def = resource_defs[handle]
    server.registerResource(handle, resource_def.details, resource_def.run)
}

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);

export default server;