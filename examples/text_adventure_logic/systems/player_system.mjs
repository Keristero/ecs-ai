import {addEntity, addComponent, hasComponent, IsA} from 'bitecs'
import System from '../System.mjs'
import { EVENT_NAMES } from '../EventQueue.mjs'
import { SOCKET_MESSAGE_TYPES } from '../WebSocketManager.mjs'
import { sleep } from '../helpers.mjs'
import Logger from '../../../logger.mjs'
const logger = new Logger('Player System', 'cyan')

const player_system = new System('player_system')
player_system.event_whitelist = [EVENT_NAMES.GAME_START,EVENT_NAMES.ACTOR_TURN_CHANGE]

player_system.player_eids = new Map()

player_system.func = async function ({ game, event }) {
    const { world, prefabs } = game
    const { Player } = game.world.components
    if(event.name === EVENT_NAMES.GAME_START){
        logger.info("Setting up player connections...")
        game.wss.on('connection', async (client) => {
            logger.info("New player connected");
            //handle player connect
            const new_player = addEntity(world)
            addComponent(world, new_player, IsA(prefabs.player))

            this.player_eids.set(client,new_player)
            let event = this.create_event(EVENT_NAMES.IDENTIFY_PLAYER, `Player entity ${new_player} has joined the game`, {eid: new_player})
            client.send(JSON.stringify(event))

            client.on('message', async (data) => {
                let deserialized = JSON.parse(data)
                logger.info(`Received message:`,deserialized);
                //check if its an action
                if(deserialized.type == SOCKET_MESSAGE_TYPES.ACTION){
                    let {actor_eid} = deserialized.args
                    console.log("Actor eid:", actor_eid, "Player turn:", this.player_turn);
                    if(actor_eid == this.player_turn){
                        let action = game.actions[deserialized.name]
                        let res = action.execute(game, deserialized.args)
                        this.player_action = res
                    }
                }
            });

            client.on('close', async () => {
                //handle player disconnect

                this.player_eids.delete(ws)
            });

            client.on('error', (error) => {
                //
            });
        });
        return null
    }
    if(event.name === EVENT_NAMES.ACTOR_TURN_CHANGE){
        //check if the actor is a player
        let {eid} = event.details
        const is_player = hasComponent(world, eid, Player)
        this.player_action = null
        this.player_turn = null
        if(!is_player) return null
        //wait until we get an action from the player whose turn it is
        this.player_turn = event.details.eid
        logger.info("Waiting for player action...");
        while(this.player_action == null){
            await sleep(200)
        }
    }
}

export { player_system }
