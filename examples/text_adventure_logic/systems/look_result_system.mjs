import { EVENT_NAMES, create_event } from '../EventQueue.mjs'
import System from '../System.mjs'
import { get_all_components_and_relations, get_relation_data_for_entity } from '../helpers.mjs'
import { getRelationTargets, getComponent } from 'bitecs'

const look_result_system = new System('look_result_system', 100) // Run after other systems
look_result_system.event_whitelist = ['look', 'pickup', 'drop'] // Listen to specific action events

look_result_system.func = async ({ game, event }) => {
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
    console.log(`[look_result_system] Room ${room_eid} contains entities:`, entitiesInRoom)
    let current_entities = {}
    let allReferencedEntities = new Set()
    
    // Process entities currently in the room (only physical room entities)
    for(let eid of entitiesInRoom){
        try {
            if(getComponent(world, eid, Name)){
                const entityData = get_all_components_and_relations(world, eid)
                // Use depth=2 to include complete data for related entities within relations
                entityData.relations = get_relation_data_for_entity(world, eid, [], 2)
                current_entities[eid] = entityData
            }
        } catch (error) {
            console.log(`Entity ${eid} no longer exists, skipping from room entities`)
        }
    }

    // Create look_result event with current state
    return create_event(
        'look_result',
        'Room state updated',
        'system',
        {
            room_eid,
            actor_eid,
            entities: current_entities,
            triggered_by: event.name
        }
    )
}

export { look_result_system }