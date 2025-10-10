import {addEntity, addComponent, getComponent, hasComponent, IsA} from 'bitecs'
import System from '../System.mjs'
import { EVENT_NAMES } from '../EventQueue.mjs'
import { SOCKET_MESSAGE_TYPES } from '../WebSocketManager.mjs'
import { sleep } from '../helpers.mjs'
import Logger from '../../../logger.mjs'
const logger = new Logger('Player System', 'cyan')

const player_system = new System('player_system', 10) // High priority - handle player setup/turns early
player_system.event_whitelist = [EVENT_NAMES.GAME_START,EVENT_NAMES.ACTOR_TURN_CHANGE]

player_system.player_eids = new Map()

player_system.spawn_player = function(game, client = null) {
    const { world, prefabs, entities } = game
    const { Player } = world.components
    const { Has } = world.relations
    
    logger.info("Spawning new player...")
    
    // Create new player entity
    const new_player = addEntity(world)
    addComponent(world, new_player, IsA(prefabs.player))

    //log if new player has the player component
    const playerComponent = getComponent(world, new_player, Player)
    console.log("New player component:", playerComponent);
    
    // Get starting room from game entities (set by setup_world)
    const starting_room = entities?.starting_room
    
    if (starting_room) {
        // Update the player's respawn room to the actual starting room
        const playerComponent = getComponent(world, new_player, Player)
        if (playerComponent) {
            playerComponent.respawnRoom = starting_room
        }
        
        // Add player to room (room Has player relationship)
        addComponent(world, starting_room, Has(new_player))
        logger.info(`Player ${new_player} spawned in room ${starting_room}`)
    } else {
        logger.error("No starting room found for player", new_player)
    }
    
    // Associate with client if provided
    if (client) {
        this.player_eids.set(client, new_player)
    }
    
    return new_player
}

player_system.func = async function ({ game, event }) {
    const { world, prefabs } = game
    const { Player } = game.world.components
    const { Has } = game.world.relations
    if(event.name === EVENT_NAMES.GAME_START){
        logger.info("Setting up player connections...")
        game.wss.on('connection', async (client) => {
            logger.info("New player connected");
            
            // Use the streamlined spawn_player function
            const new_player = this.spawn_player(game, client)
            
            // Send player identification event
            let event = this.create_event(EVENT_NAMES.IDENTIFY_PLAYER, `Player entity ${new_player} has joined the game`, {eid: new_player})
            client.send(JSON.stringify(event))

            client.on('message', async (data) => {
                let deserialized = JSON.parse(data)
                logger.info(`Received message:`,deserialized);
                //check if its an action
                if(deserialized.type == SOCKET_MESSAGE_TYPES.ACTION){
                    let {actor_eid} = deserialized.args
                    if(actor_eid == this.player_turn){
                        let action = game.actions[deserialized.name]
                        let res = await action.execute(game, deserialized.args)
                        this.player_action = res
                    }
                }
            });

            client.on('close', async () => {
                //handle player disconnect
                logger.info("player disconnected");
                this.player_eids.delete(client)
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
