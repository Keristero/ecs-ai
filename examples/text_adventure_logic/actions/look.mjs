import {query, getComponent, Wildcard, getEntityComponents} from 'bitecs'
import {z} from 'zod'

import {Action} from '../Action.mjs'
import {get_components_for_entity,get_all_components_and_relations} from '../helpers.mjs'

const look = new Action('look', ['l'], 'Look around the current room')
look.func = async (game,args)=>{
    const {actor_eid} = args
    const {world, prefabs} = game
    const {Room, Name, Description} = world.components
    const {Has, ConnectsTo} = world.relations
    //work out which room the actor is in
    const rooms = query(world, [Room,Has(actor_eid)]) 

    let room_eid = rooms[0]

    // Get room connections
    let room_connections = query(world, [ConnectsTo(room_eid)])

    //return all entities in room
    let entities = query(world, [Name,Has(Wildcard)])
    let named_entities = {}
    for(let eid of entities){
        named_entities[eid] = get_all_components_and_relations(world,eid)
    }

    return look.create_event(actor_eid,`You look around the room.`, {
        room_eid,
        room_name: getComponent(world, room_eid, Name),
        room_description: getComponent(world, room_eid, Description),
        room_connections,
        entities:named_entities
    })
}

export {look}