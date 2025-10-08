import { WebSocketServer } from 'ws';
import Logger from '../../logger.mjs';
import { action_defs, load_actions } from '../../game_framework/actions_interface.mjs';
import { getRoundStateSnapshot, queueEvent, startRound } from './event_queue.mjs';
import env from '../../environment.mjs';

const logger = new Logger('Text Adventure WebSocket', 'magenta');

/**
 * Set up WebSocket server for the text adventure game
 * @param {Object} game - Game object with httpServer attached
 * @returns {Object} WebSocket server and clients set
 */
export function setupWebSocketServer(game) {
    if (!game.httpServer) {
        logger.error('No HTTP server found on game object. Cannot set up WebSocket server.');
        return null;
    }

    logger.info('Setting up text adventure WebSocket server');
    
    // Create WebSocket server using the attached HTTP server
    const wss = new WebSocketServer({ server: game.httpServer });
    const clients = new Set();

    // Store reference to clients in game
    game.wsClients = clients;
    game.wss = wss;

    wss.on('connection', (ws) => {
        logger.info('Text adventure client connected');
        clients.add(ws);
        
        // Send current round state immediately (includes playerId)
        if (game.eventQueue && getRoundStateSnapshot) {
            const roundState = getRoundStateSnapshot(game.eventQueue);
            ws.send(JSON.stringify({
                type: 'round_state',
                data: roundState
            }));
            logger.info('Sent initial round state to client');
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

                    default:
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: `Unknown message type: ${message.type}. Text adventure supports: action`
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
            logger.info('Text adventure client disconnected');
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

/**
 * Set up event broadcasting for the text adventure game
 * @param {Object} game - Game object with eventQueue and wsClients
 */
export function setupEventBroadcasting(game) {
    if (!game.eventQueue || !game.wsClients) {
        logger.warn('Event queue or WebSocket clients not available for broadcasting');
        return;
    }

    logger.info('Setting up text adventure event broadcasting');

    // Subscribe to individual events
    game.eventQueue.on('event', (event) => {
        const message = JSON.stringify({
            type: 'event',
            data: event
        });
        logger.info(`Broadcasting event to ${game.wsClients.size} client(s): ${event.type}:${event.name}`);
        
        let successCount = 0;
        let failCount = 0;
        
        game.wsClients.forEach(client => {
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
        logger.info(`Broadcasting round state to ${game.wsClients.size} client(s) - ${roundState.events.length} events`);
        
        game.wsClients.forEach(client => {
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

/**
 * Initialize the text adventure WebSocket functionality
 * This loads actions and sets up the WebSocket server
 * @param {Object} game - Game object with httpServer attached
 */
export async function initializeWebSocket(game) {
    // Load actions first
    await load_actions();
    logger.info('Text adventure actions loaded');
    
    // Set up WebSocket server
    const websocketSetup = setupWebSocketServer(game);
    
    if (websocketSetup) {
        // Set up event broadcasting
        setupEventBroadcasting(game);
        
        logger.info('Text adventure WebSocket initialization complete');
        return websocketSetup;
    } else {
        logger.error('Failed to set up WebSocket server');
        return null;
    }
}

/**
 * Start the first round of the game
 * This should be called after WebSocket is set up
 */
export async function startFirstRound(game) {
    if (game.eventQueue && !game.eventQueue.actors.length) {
        logger.info('Starting first round...');
        await startRound(game.eventQueue);
        logger.info('First round started');
    }
}