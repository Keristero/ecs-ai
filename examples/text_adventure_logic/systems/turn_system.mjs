import { query } from 'bitecs'
import System from '../System.mjs'
import { EVENT_NAMES } from '../EventQueue.mjs'
import { sleep } from '../helpers.mjs'

const turn_system = new System('turn_system', 200) // Lowest priority - manage turn order

turn_system.func = async function ({ game, event }) {
    if(event.name === EVENT_NAMES.GAME_START){
        return await this.increment_round(game)
    }
    if(event.type === 'action' && event.details.actor_eid == this.current_turn_eid){
        //throttle actions if no players are connected
        if(game.wss && game.wss.clients.size === 0){
            await sleep(1000)
        }
        return await this.increment_turn(game)
    }
    return null
}

turn_system.increment_round = async function(game){
    let {Actor} = game.world.components
    
    // Wait for actors to be available
    while(true) {
        this.actors = query(game.world, [Actor])
        if(this.actors.length > 0) {
            break
        }
        await sleep(1000) // Wait 1 second before checking again
    }
    
    this.actors.sort((a, b) => b - a);
    this.round_number = this.round_number + 1 || 1
    console.log(`--- Round ${this.round_number} ---`)
    this.actors_who_have_not_taken_their_turn = [...this.actors]
    return this.increment_turn(game)
}

turn_system.increment_turn = async function(game){
    if(this.actors_who_have_not_taken_their_turn.length === 0){
        return await this.increment_round(game)
    }else{
        this.current_turn_eid = this.actors_who_have_not_taken_their_turn.shift()
        this.action_taken = null
        return this.create_event(EVENT_NAMES.ACTOR_TURN_CHANGE, `Its now the turn of entity ${this.current_turn_eid}`,{
            eid: this.current_turn_eid,
            round: this.round_number,
            turn: this.actors.length - this.actors_who_have_not_taken_their_turn.length
        })
    }
}

export { turn_system }
