import {Action} from '../Action.mjs'
import {get_all_components_and_relations} from '../helpers.mjs'

const look = new Action('look', ['l'], 'Look around the current room', {}, {includeActorRoom: true})
look.func = async (game,args)=>{
    const {actor_eid, room_eid} = args
    const {world} = game
    const {Name} = world.components

    // Get room information for the message
    const roomComponents = get_all_components_and_relations(world, room_eid)
    let room_name = roomComponents.Name ? roomComponents.Name.value : "Unknown Room"

    return look.create_event(actor_eid, `You look around ${room_name}.`, {
        success: true,
        room_eid
    })
}

export {look}