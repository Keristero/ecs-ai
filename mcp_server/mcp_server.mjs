import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { tool_defs, resource_defs } from "../game_framework/ecs_interface.mjs";
import express from 'express';
import env from "../environment.mjs";
import Logger from "../logger.mjs";
const logger = new Logger("MCP Server", 'cyan');

const DEFAULT_MIME_TYPE = 'text/plain';

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

function normalizeTextResult(result) {
    if (typeof result === 'string') {
        return result;
    }

    const contentBlocks = result?.content;
    if (Array.isArray(contentBlocks)) {
        const textBlock = contentBlocks.find((block) => block?.type === 'text' && typeof block.text === 'string');
        if (textBlock?.text) {
            return textBlock.text;
        }
    }

    try {
        return JSON.stringify(result);
    } catch (error) {
        logger.warn(`Failed to stringify tool/resource result: ${error.message}`);
        return '';
    }
}

function decodeArguments(encodedValue, handle) {
    if (!encodedValue) {
        return {};
    }

    try {
        const json = Buffer.from(encodedValue, 'base64url').toString('utf8');
        const parsed = JSON.parse(json);
        return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch (error) {
        logger.warn(`Resource ${handle}: failed to decode arguments: ${error.message}`);
        return {};
    }
}

function buildResourceMetadata(resource_def, additionalMeta = {}) {
    const metadata = {
        title: resource_def?.details?.title,
        description: resource_def?.details?.description,
        mimeType: DEFAULT_MIME_TYPE,
        ...additionalMeta
    };

    const inputShape = extractInputShape(resource_def?.details?.inputSchema);
    if (inputShape && Object.keys(inputShape).length > 0) {
        metadata._meta = {
            ...(metadata._meta ?? {}),
            argumentsEncoding: 'base64url-json',
            inputFields: Object.keys(inputShape)
        };
    }

    return metadata;
}

function buildResourceResult(uri, result) {
    const text = normalizeTextResult(result);
    return {
        contents: [
            {
                uri: uri.href,
                mimeType: DEFAULT_MIME_TYPE,
                text
            }
        ]
    };
}

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

    for (const handle in resource_defs) {
        logger.info(`Registering resource: ${handle}`)
        const resource_def = resource_defs[handle]

        const inputShape = extractInputShape(resource_def?.details?.inputSchema);

        if (!inputShape || Object.keys(inputShape).length === 0) {
            const uri = `ecs-resource://${handle}`;
            server.registerResource(
                handle,
                uri,
                buildResourceMetadata(resource_def),
                async (uriObj) => {
                    const result = await resource_def.run({ game });
                    return buildResourceResult(uriObj, result);
                }
            );
            continue;
        }

        const template = new ResourceTemplate(`ecs-resource://${handle}/{arguments}`, { list: undefined });
        server.registerResource(
            handle,
            template,
            buildResourceMetadata(resource_def),
            async (uriObj, variables) => {
                const decoded = decodeArguments(variables?.arguments, handle);
                const result = await resource_def.run({ game, ...decoded });
                return buildResourceResult(uriObj, result);
            }
        );
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