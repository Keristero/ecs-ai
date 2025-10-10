import {addEntity, addComponent, hasComponent, IsA} from 'bitecs'
import System from '../System.mjs'
import { EVENT_NAMES } from '../EventQueue.mjs'
import { SOCKET_MESSAGE_TYPES } from '../WebSocketManager.mjs'
import { sleep } from '../helpers.mjs'
import Logger from '../../../logger.mjs'

const npc_system = new System('npc_system', 20) // Medium priority - handle NPC actions after players
npc_system.event_whitelist = [EVENT_NAMES.GAME_START,EVENT_NAMES.ACTOR_TURN_CHANGE]

npc_system.func = async function ({ game, event }) {
    const { world, prefabs } = game
    const { Player } = game.world.components
    if(event.name === EVENT_NAMES.ACTOR_TURN_CHANGE){
        //check if the actor is a player
        const is_player = hasComponent(world, Player, event.details.eid)
        if(is_player) return null
        
        //wait until we get an action from the player whose turn it is
        return await game.actions['look'].execute(game,{actor_eid: event.details.eid})
    }
    return null
}

export { npc_system }
