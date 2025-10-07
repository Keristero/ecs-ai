import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import Logger from '../logger.mjs';
import { tool_defs } from '../game_framework/ecs_interface.mjs';
import { action_defs, load_actions } from '../game_framework/actions_interface.mjs';
import { setupDocs } from './docs.mjs';
import { ollama_defs, zPromptPayload } from './ollama_defs.mjs';
import { getRoundStateSnapshot, queueEvent, startRound } from '../examples/text_adventure_logic/event_queue.mjs';
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

const createEndpoints = (app, game, defs, basePath) => {
    // List all available items (unified interface)
    app.get(`/${basePath}`, (req, res) => {
        const items = Object.entries(defs).map(([handle, def]) => ({
            handle,
            title: def?.details?.title ?? handle,
            description: def?.details?.description ?? '',
            metadata: def?.metadata ?? null // Include metadata if available
        }));
        res.json({ [basePath]: items });
    });

    // Create individual endpoints (unified interface)
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
                
                // Run the action/tool (unified interface)
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

async function serve_api(game) {
    const app = express();
    
    // Enable CORS for all routes
    app.use(cors());
    
    app.use(express.json());

    // Load actions before starting server
    await load_actions();

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

    // Create ECS endpoints
    createEndpoints(app, game, tool_defs, 'tools');

    // Create action endpoints
    createEndpoints(app, game, action_defs, 'actions');

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

    // Setup WebSocket server
    const wss = new WebSocketServer({ server });
    const clients = new Set();

    // Store reference to clients in game
    game.wsClients = clients;
    
    // Subscribe to event queue events using EventEmitter pattern
    if (game.eventQueue) {
        // Subscribe to individual events
        game.eventQueue.on('event', (event) => {
            const message = JSON.stringify({
                type: 'event',
                data: event
            });
            logger.info(`Broadcasting event to ${clients.size} client(s): ${event.type}:${event.name}`);
            
            let successCount = 0;
            let failCount = 0;
            
            clients.forEach(client => {
                if (client.readyState === 1) { // WebSocket.OPEN
                    try {
                        client.send(message);
                        successCount++;
                    } catch (error) {
                        logger.error(`Failed to send to client:`, error.message);
                        failCount++;
                    }
                } else {
                    failCount++;
                }
            });
            
            logger.info(`Event broadcast result: ${successCount} sent, ${failCount} failed`);
        });
        
        // Subscribe to round state updates
        game.eventQueue.on('round_state', (roundState) => {
            const message = JSON.stringify({
                type: 'round_state',
                data: roundState
            });
            logger.info(`Broadcasting round state to ${clients.size} client(s) - ${roundState.events.length} events`);
            
            clients.forEach(client => {
                if (client.readyState === 1) {
                    try {
                        client.send(message);
                    } catch (error) {
                        logger.error(`Failed to send round state to client:`, error.message);
                    }
                }
            });
        });
    }

    wss.on('connection', (ws) => {
        logger.info('Client connected via WebSocket');
        clients.add(ws);

        // Send current round state immediately (includes playerId)
        if (game.eventQueue) {
            const roundState = getRoundStateSnapshot(game.eventQueue);
            ws.send(JSON.stringify({
                type: 'round_state',
                data: roundState
            }));
        }

        ws.on('message', async (data) => {
            try {
                const message = JSON.parse(data.toString());
                logger.info('Received WebSocket message:', message.type, message.action || message.tool || '');

                switch (message.type) {
                    case 'action': {
                        const { action, params, guid } = message;
                        logger.info(`Processing action: ${action}`, params);
                        const actionDef = action_defs[action];
                        
                        if (!actionDef) {
                            logger.error(`Unknown action: ${action}`);
                            ws.send(JSON.stringify({
                                type: 'error',
                                message: `Unknown action: ${action}`,
                                messageId: message.messageId
                            }));
                            return;
                        }

                        // Run the action to get the event
                        const actionParams = params || {};
                        logger.info(`Running action ${action} with params:`, actionParams);
                        const event = await actionDef.run({ game, ...actionParams });
                        logger.info(`Action ${action} returned event:`, event.type, event.name);
                        
                        // If client provided a GUID, use it for the event
                        if (guid) {
                            event.guid = guid;
                            logger.info(`Using client-provided GUID: ${guid}`);
                        }
                        
                        // Queue the event (this will broadcast it and run systems)
                        logger.info(`Queueing event for action ${action}`);
                        await queueEvent(game.eventQueue, event);
                        logger.info(`Event queued successfully for action ${action}`);
                        
                        // Send simple acknowledgment back to client
                        ws.send(JSON.stringify({
                            type: 'action_accepted',
                            action,
                            guid,
                            messageId: message.messageId
                        }));
                        logger.info(`Sent action_accepted for ${action}`);
                        break;
                    }

                    case 'tool': {
                        const { tool, params } = message;
                        const toolDef = tool_defs[tool];
                        
                        if (!toolDef) {
                            ws.send(JSON.stringify({
                                type: 'error',
                                message: `Unknown tool: ${tool}`
                            }));
                            return;
                        }

                        const result = await toolDef.run({ game, ...(params || {}) });
                        ws.send(JSON.stringify({
                            type: 'tool_result',
                            tool,
                            result
                        }));
                        break;
                    }

                    default:
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: `Unknown message type: ${message.type}`
                        }));
                }
            } catch (error) {
                logger.error('WebSocket message error:', error.message);
                ws.send(JSON.stringify({
                    type: 'error',
                    message: error.message
                }));
            }
        });

        ws.on('close', () => {
            logger.info('Client disconnected from WebSocket');
            clients.delete(ws);
        });

        ws.on('error', (error) => {
            logger.error('WebSocket error:', error.message);
            clients.delete(ws);
        });
    });

    logger.info(`WebSocket server ready on ws://${env.api_host}:${env.api_port}`);

    // Start the first round now that WebSocket broadcasting is ready
    if (game.eventQueue && !game.eventQueue.actors.length) {
        logger.info('Starting first round...');
        await startRound(game.eventQueue);
        logger.info('First round started');
    }

    return { app, server, wss };
}

export { serve_api };