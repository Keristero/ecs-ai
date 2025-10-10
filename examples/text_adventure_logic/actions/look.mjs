import {query, getComponent, Wildcard, getEntityComponents, getRelationTargets} from 'bitecs'
import {z} from 'zod'

import {Action} from '../Action.mjs'
import {get_components_for_entity,get_all_components_and_relations,get_relation_data_for_entity} from '../helpers.mjs'

const look = new Action('look', ['l'], 'Look around the current room', {}, {includeActorRoom: true})
look.func = async (game,args)=>{
    const {actor_eid, room_eid} = args
    const {world, prefabs} = game
    const {Name, Description, Room} = world.components
    const {Has, ConnectsTo} = world.relations

    // Get room information
    const roomComponents = get_all_components_and_relations(world, room_eid)

    let room_name = roomComponents.Name.value
    let room_description = roomComponents.Description.value

    //return all entities in room
    // Get entities that this room "Has" (items, players, etc. in this room)
    let entitiesInRoom = getRelationTargets(world, room_eid, Has)
    let named_entities = {}
    for(let eid of entitiesInRoom){
        // Only include entities that have a Name component (so we can describe them)
        if(getComponent(world, eid, Name)){
            named_entities[eid] = get_all_components_and_relations(world,eid)
        }
    }

    // Get room connections using the generic helper
    const relationData = get_relation_data_for_entity(world, room_eid, ['ConnectsTo'])

    return look.create_event(actor_eid,`You look around the room.`, {
        room_eid,
        room_name,
        room_description,
        entities: named_entities,
        relations: relationData
    })
}

export {look}