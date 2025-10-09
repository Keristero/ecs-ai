import { WebSocketServer } from 'ws';
import Logger from '../../logger.mjs';
import { action_defs, load_actions } from '../../game_framework/actions_interface.mjs';
import env from '../../environment.mjs';

const logger = new Logger('Text Adventure WebSocket', 'magenta');

export const SOCKET_MESSAGE_TYPES = {
    ACTION: 'action',
    ACTION_SCHEMAS: 'action_schemas',
    PLAYER_CONNECT: 'player_connect',
}

export function setupWebSocketServer(game) {
    if (!game.httpServer) {
        logger.error('No HTTP server found on game object. Cannot set up WebSocket server.');
        return null;
    }

    logger.info('Setting up text adventure WebSocket server');
    
    const wss = new WebSocketServer({ server: game.httpServer });
    const client_to_eid = new Map();
    const clientPlayerMap = new Map();

    game.wsClients = clients;
    game.wss = wss;
    game.clientPlayerMap = clientPlayerMap;

    wss.on('connection', async (ws) => {
        logger.info('Text adventure client connected');
        //we need to spawn players and store the EIDs in the mapping
        client_to_eid.set(ws,null)

        ws.on('message', async (data) => {
            
        });

        ws.on('close', async () => {
            client_to_eid.delete(ws);
        });

        ws.on('error', (error) => {
            //
        });
    });

    logger.info(`WebSocket server ready on ws://${env.api_host}:${env.api_port}`);
    
    return { wss, clients };
}