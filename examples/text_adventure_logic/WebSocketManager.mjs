import { WebSocketServer } from 'ws';
import Logger from '../../logger.mjs';
import env from '../../environment.mjs';

const logger = new Logger('Text Adventure WebSocket', 'magenta');

export const SOCKET_MESSAGE_TYPES = {
    ACTION: 'action',
    ACTION_SCHEMAS: 'action_schemas',
    PLAYER_CONNECT: 'player_connect',
}


export class WebSocketManager{
    constructor(game){
        if (!game.httpServer) {
            logger.error('No HTTP server found on game object. Cannot set up WebSocket server.');
            return null;
        }

        logger.info('Setting up text adventure WebSocket server');
        
        game.wss = new WebSocketServer({ server: game.httpServer });

        game.event_queue.emitter.on('event', (event) => {
            // Broadcast event to all connected clients
            for(let client of game.wss.clients){
                if(client.readyState === client.OPEN){
                    this.send_event_to_client(client,event)
                }
            }
        });

        game.wss.on('connection', async (client) => {
            // send the action schemas
            client.send(JSON.stringify({
                type: SOCKET_MESSAGE_TYPES.ACTION_SCHEMAS,
                details: game.actions
            }))
            // send all the events so far to catch them up
            for(const event of game.event_queue.events){
                this.send_event_to_client(client,event)
            }
        });

        logger.info(`WebSocket server ready on ws://${env.api_host}:${env.api_port}`);
    }
    send_event_to_client(client,event){
        client.send(JSON.stringify(event));
    }
}