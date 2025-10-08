import { WebSocketServer } from 'ws';
import Logger from '../../logger.mjs';
import { action_defs, load_actions } from '../../game_framework/actions_interface.mjs';
import { queueEvent } from './event_queue.mjs';
import { submitPlayerAction, notifyPlayerDisconnect } from './systems/player_turn_system.mjs';
import env from '../../environment.mjs';

const logger = new Logger('Text Adventure WebSocket', 'magenta');

export function setupWebSocketServer(game) {
    if (!game.httpServer) {
        logger.error('No HTTP server found on game object. Cannot set up WebSocket server.');
        return null;
    }

    logger.info('Setting up text adventure WebSocket server');
    
    const wss = new WebSocketServer({ server: game.httpServer });
    const clients = new Set();
    const clientPlayerMap = new Map();

    game.wsClients = clients;
    game.wss = wss;
    game.clientPlayerMap = clientPlayerMap;

    wss.on('connection', async (ws) => {
        logger.info('Text adventure client connected');
        clients.add(ws);
        
        // Emit a player_connect event - a system will handle spawning the player
        const connectEvent = {
            type: 'system',
            name: 'player_connect',
            system: {
                system_name: 'websocket',
                details: {
                    ws_id: Math.random().toString(36).substr(2, 9) // Temporary ID until player is spawned
                }
            }
        };
        
        // Store WebSocket with a temporary ID until we get the player ID from the spawn system
        const tempId = connectEvent.system.details.ws_id;
        clientPlayerMap.set(ws, { tempId, playerId: null, ws: ws });
        
        // Send action schemas
        ws.send(JSON.stringify({
            type: 'action_schemas',
            action_schemas: {
                schemas: getActionSchemas()
            }
        }));
        
        // Queue the connect event - this will trigger player_spawn_system
        await queueEvent(game.eventQueue, connectEvent);
        
        // Note: Don't send round state here - it will be sent after player_spawned event

        ws.on('message', async (data) => {
            try {
                const message = JSON.parse(data.toString());
                const clientData = clientPlayerMap.get(ws);
                const playerId = clientData?.playerId;
                
                logger.info('Received WebSocket message:', message.type);

                switch (message.type) {
                    case 'player_action': {
                        if (!playerId) {
                            logger.warn('player_action received before playerId assigned');
                            ws.send(JSON.stringify({ type: 'error', message: 'Player not ready yet' }));
                            break;
                        }
                        const actionObj = message.action;
                        const actionName = actionObj.type;
                        if (!action_defs[actionName]) {
                            ws.send(JSON.stringify({ type: 'error', message: `Unknown action: ${actionName}` }));
                            break;
                        }
                        // Player action becomes its own event; player_turn_system will produce turn_complete later
                        submitPlayerAction(game, playerId, actionObj)
                        ws.send(JSON.stringify({ type: 'action_received', action: actionName }))
                        break;
                    }
                    
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

                        const actionParams = params || {};
                        if (playerId) {
                            actionParams.actor_eid = playerId;
                        }
                        
                        logger.info(`Running action ${action} with params:`, actionParams);
                        const event = await actionDef.run({ game, ...actionParams });
                        
                        if (event) {
                            logger.info(`Action ${action} returned event:`, event?.type, event?.name);
                            
                            if (guid) {
                                event.guid = guid;
                            }
                            
                            await queueEvent(game.eventQueue, event);
                        }
                        
                        ws.send(JSON.stringify({
                            type: 'action_accepted',
                            action,
                            guid,
                            messageId: message.messageId
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

        ws.on('close', async () => {
            logger.info('Text adventure client disconnected');
            const clientData = clientPlayerMap.get(ws);
            
            if (clientData?.playerId) {
                // Emit a player_disconnect event - a system will handle despawning
                const disconnectEvent = {
                    type: 'system',
                    name: 'player_disconnect',
                    system: {
                        system_name: 'websocket',
                        details: {
                            player_eid: clientData.playerId
                        }
                    }
                };
                
                await queueEvent(game.eventQueue, disconnectEvent);
                notifyPlayerDisconnect(game, clientData.playerId)
            }
            
            clientPlayerMap.delete(ws);
            clients.delete(ws);
        });

        ws.on('error', (error) => {
            logger.error('Text adventure WebSocket error:', error.message);
            clients.delete(ws);
        });
    });

    logger.info(`WebSocket server ready on ws://${env.api_host}:${env.api_port}`);
    
    return { wss, clients };
}

function getActionSchemas() {
    const schemas = {};
    
    for (const [actionName, actionDef] of Object.entries(action_defs)) {
        schemas[actionName] = {
            description: actionDef.description || actionName,
            parameters: actionDef.parameters || []
        };
    }
    
    return schemas;
}

export function setupEventBroadcasting(game) {
    if (!game.eventQueue || !game.wsClients) {
        logger.warn('Event queue or WebSocket clients not available for broadcasting');
        return;
    }

    logger.info('Setting up text adventure event broadcasting');

    // Subscribe to individual events
    game.eventQueue.on('event', (event) => {
        // Handle player_spawned events to map WebSocket to player ID
        if (event.type === 'system' && event.name === 'player_spawned') {
            const { ws_id, player_eid } = event.system.details;
            
            // Find the WebSocket with this temp ID and update it with the real player ID
            game.wsClients.forEach((ws) => {
                const clientData = game.clientPlayerMap.get(ws);
                if (clientData?.tempId === ws_id) {
                    clientData.playerId = player_eid;
                    
                    // Send player_connected event to this specific client
                    ws.send(JSON.stringify({
                        type: 'player_connected',
                        player_connected: {
                            playerId: player_eid,
                            message: 'Welcome to the adventure!'
                        }
                    }));
                    
                    logger.info(`Mapped WebSocket to player ${player_eid}`);
                }
            });
        }
        
        // Broadcast event to all clients
        broadcastToClients(game, {
            type: 'event',
            data: event
        });
        
        logger.info(`Broadcasted event: ${event.type}:${event.name}`);
    });
    
    // Subscribe to round state updates
    // Broadcast round_info events to clients for UI state
    game.eventQueue.on('event', (event) => {
        if (event.type === 'round' && event.name === 'round_info') {
            broadcastToClients(game, { type: 'round_info', data: event.round })
        }
    })
}

function broadcastToClients(game, message) {
    const messageStr = JSON.stringify(message);
    
    game.wsClients.forEach(client => {
        if (client.readyState === 1) {
            try {
                client.send(messageStr);
            } catch (error) {
                logger.error(`Failed to send to client:`, error.message);
            }
        }
    });
}

export async function initializeWebSocket(game) {
    await load_actions();
    logger.info('Text adventure actions loaded');
    
    const websocketSetup = setupWebSocketServer(game);
    
    if (websocketSetup) {
        setupEventBroadcasting(game);
        logger.info('Text adventure WebSocket initialization complete');
        return websocketSetup;
    } else {
        logger.error('Failed to set up WebSocket server');
        return null;
    }
}

export async function startFirstRound(game) {
    // This is called by the game logic, not needed here
}