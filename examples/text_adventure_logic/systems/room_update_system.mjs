import { EVENT_NAMES, EVENT_TYPES, create_event } from '../EventQueue.mjs'
import System from '../System.mjs'
import { get_all_components_and_relations, get_relation_data_for_entity } from '../helpers.mjs'
import { getRelationTargets, getComponent } from 'bitecs'

const room_update_system = new System('room_update_system', 100) // Run after other systems
room_update_system.event_whitelist = [EVENT_NAMES.LOOK, EVENT_NAMES.PICKUP, EVENT_NAMES.DROP] // Listen to actions that change room state

room_update_system.func = async ({ game, event }) => {
    // Only process successful actions (whitelist already filters event names)
    if (!event.details.success) {
        return null
    }

    const { world } = game
    const { Name } = world.components
    const { Has } = world.relations
    const { room_eid, actor_eid } = event.details

    // Get current room state - all entities in the room
    let entitiesInRoom = getRelationTargets(world, room_eid, Has)
    console.log(`[room_update_system] Room ${room_eid} contains entities:`, entitiesInRoom)
    let current_entities = {}
    
    // Process entities currently in the room (only physical room entities)
    for(let eid of entitiesInRoom){
        try {
            if(getComponent(world, eid, Name)){
                const entityData = get_all_components_and_relations(world, eid, 2)
                current_entities[eid] = entityData
            }
        } catch (error) {
            console.log(`Entity ${eid} no longer exists, skipping from room entities`)
        }
    }

    // Create room_update event with current state
    return create_event(
        EVENT_NAMES.ROOM_UPDATE,
        'Room state updated',
        EVENT_TYPES.SYSTEM,
        {
            room_eid,
            actor_eid,
            entities: current_entities,
            triggered_by: event.name
        }
    )
}

export { room_update_system }