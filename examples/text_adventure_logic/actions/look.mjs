import {query, getComponent, Wildcard, getEntityComponents, getRelationTargets} from 'bitecs'
import {z} from 'zod'

import {Action} from '../Action.mjs'
import {get_components_for_entity,get_all_components_and_relations} from '../helpers.mjs'

const look = new Action('look', ['l'], 'Look around the current room', {}, {includeActorRoom: true})
look.func = async (game,args)=>{
    const {actor_eid, room_eid} = args
    const {world, prefabs} = game
    const {Name, Description} = world.components
    const {Has, ConnectsTo} = world.relations

    // Safety check for room_eid (automatically provided by Action class)
    if (!room_eid) {
        return look.create_event(actor_eid, `You are not in any room.`, {
            success: false,
            room_eid: null,
            room_name: 'Unknown',
            room_description: 'You are nowhere.',
            room_connections: {},
            entities: {}
        })
    }

    // Get room information
    const roomComponents = get_all_components_and_relations(world, room_eid)
    
    // If we can't get room information, the action should fail
    if (!roomComponents.Name || !roomComponents.Description) {
        return look.create_event(actor_eid, `Cannot look around - room information is missing.`, {
            success: false,
            room_eid,
            error: 'Room components missing',
            room_name: 'Unknown Room',
            room_description: 'A room with no description.',
            room_connections: {},
            entities: {}
        })
    }
    
    let room_name = roomComponents.Name.value
    let room_description = roomComponents.Description.value

    // Get room connections using getRelationTargets
    let connection_targets = getRelationTargets(world, room_eid, ConnectsTo) || []
    let room_connections = {}
    for(let target_eid of connection_targets) {
        if (target_eid && ConnectsTo(target_eid) && ConnectsTo(target_eid).direction) {
            let direction_index = ConnectsTo(target_eid).direction[room_eid]
            let direction = direction_index ? world.string_store.getString(direction_index) : 'unknown'
            let target_name = getComponent(world, Name, target_eid)?.value || 'Unknown'
            
            room_connections[target_eid] = {
                direction: direction,
                name: target_name
            }
        }
    }

    //return all entities in room
    let entities = query(world, [Name,Has(Wildcard)])
    let named_entities = {}
    for(let eid of entities){
        named_entities[eid] = get_all_components_and_relations(world,eid)
    }

    return look.create_event(actor_eid,`You look around the room.`, {
        room_eid,
        room_name,
        room_description,
        room_connections,
        entities:named_entities
    })
}

export {look}