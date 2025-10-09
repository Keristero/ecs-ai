import { query } from 'bitecs'
import System from '../System.mjs'
import { EVENT_NAMES } from '../EventQueue.mjs'
import { sleep } from '../helpers.mjs'

const turn_system = new System('turn_system')

turn_system.func = async function ({ game, event }) {
    console.log("Turn system handling event:", event);
    if(event.name === EVENT_NAMES.GAME_START){
        return this.increment_round(game)
    }
    if(event.type === 'action' && event.details.actor_eid == this.current_turn_eid){
        await(sleep(1))
        return this.increment_turn(game)
    }
    return null
}

turn_system.increment_round = function(game){
    let {Actor} = game.world.components
    this.actors = query(game.world, [Actor])
    if(this.actors.length === 0){
        throw new Error("No actors found in the world to take turns")
    }
    this.actors.sort((a, b) => b - a);
    this.round_number = this.round_number + 1 || 1
    console.log(`--- Round ${this.round_number} ---`)
    this.actors_who_have_not_taken_their_turn = [...this.actors]
    return this.increment_turn(game)
}

turn_system.increment_turn = function(game){
    if(this.actors_who_have_not_taken_their_turn.length === 0){
        return this.increment_round(game)
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
