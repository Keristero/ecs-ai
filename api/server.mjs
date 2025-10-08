import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import Logger from '../logger.mjs';
import { tool_defs } from '../game_framework/ecs_interface.mjs';
import { setupDocs } from './docs.mjs';
import { ollama_defs, zPromptPayload } from './ollama_defs.mjs';
import env from '../environment.mjs';

const logger = new Logger('API Server', 'blue');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const formatServerAddress = (server) => {
    const addressInfo = server.address();
    if (!addressInfo) {
        return `http://${env.api_host}:${env.api_port}`;
    }

    if (typeof addressInfo === 'string') {
        return addressInfo;
    }

    const host = ['::', '0.0.0.0'].includes(addressInfo.address) ? '127.0.0.1' : addressInfo.address;
    return `http://${host}:${addressInfo.port}`;
};

const createToolEndpoints = (app, game, defs, basePath) => {
    // List all available tools
    app.get(`/${basePath}`, (req, res) => {
        const items = Object.entries(defs).map(([handle, def]) => ({
            handle,
            title: def?.details?.title ?? handle,
            description: def?.details?.description ?? '',
            metadata: def?.metadata ?? null // Include metadata if available
        }));
        res.json({ [basePath]: items });
    });

    // Create individual tool endpoints
    for (const [handle, definition] of Object.entries(defs)) {
        app.post(`/${basePath}/${handle}`, async (req, res) => {
            try {
                // Validate input if schema exists
                if (definition?.details?.inputSchema) {
                    const validationResult = definition.details.inputSchema.safeParse(req.body);
                    if (!validationResult.success) {
                        return res.status(400).json({ error: 'invalid_input', details: validationResult.error });
                    }
                }
                
                // Run the tool
                const result = await definition.run({ game, ...(req.body || {}) });
                
                // Return result
                const response = typeof result === 'string' ? result : 
                               result?.content?.[0]?.text || result;
                res.json({ handle, result: response });

            } catch (error) {
                logger.error(`${handle} failed:`, error.message);
                res.status(500).json({ error: 'execution_failed', message: error.message });
            }
        });
    }
};

async function serve_api(game, options = {}) {
    const app = express();
    
    // Enable CORS for all routes
    app.use(cors());
    
    app.use(express.json());

    // Health check
    app.get('/health', (req, res) => res.json({ status: 'ok' }));

    app.post('/agent/prompt', async (req, res) => {
        const validation = zPromptPayload.safeParse(req.body ?? {});

        if (!validation.success) {
            return res.status(400).json({
                error: 'invalid_prompt_payload',
                details: validation.error.format()
            });
        }

        try {
            const result = await ollama_defs.prompt.run({
                config: {
                    fetchImpl: globalThis.fetch?.bind(globalThis) ?? fetch,
                    baseUrl: env.DEFAULT_OLLAMA_BASE_URL,
                    model: env.ollama_model_name,
                    mcpUrl: env.DEFAULT_MCP_URL
                },
                payload: validation.data
            });

            if (Array.isArray(result?.log)) {
                for (const logEntry of result.log) {
                    logger.info('[Agent Prompt]', logEntry);
                }
            }

            switch (result?.type) {
                case 'json':
                    return res.status(result.status ?? 200).json(result.body ?? {});
                case 'error':
                    return res.status(result.status ?? 500).json(result.body ?? { error: 'agent_error' });
                case 'stream':
                    return res.status(501).json({
                        error: 'streaming_not_supported',
                        message: 'Streaming responses are not yet supported by the HTTP API.'
                    });
                default:
                    return res.status(500).json({ error: 'unexpected_agent_result' });
            }
        } catch (error) {
            logger.error('Agent prompt failed:', error.message ?? error);
            return res.status(502).json({
                error: 'ollama_unreachable',
                message: error?.message ?? 'Failed to contact Ollama server.'
            });
        }
    });

    // Create ECS tool endpoints
    createToolEndpoints(app, game, tool_defs, 'tools');

    // Setup API documentation
    setupDocs(app, { logger });

    // Start server
    const server = await new Promise((resolve, reject) => {
        const httpServer = app
            .listen(env.api_port, env.api_host, () => {
                logger.info(`API listening on ${formatServerAddress(httpServer)}`);
                resolve(httpServer);
            })
            .on('error', (error) => {
                logger.error(`Failed to host API server: ${error.message}`);
                reject(error);
            });
    });

    // Attach the HTTP server to the game so games can set up their own WebSocket servers
    game.httpServer = server;

    return { app, server };
}

export { serve_api };