import { EVENT_NAMES, EVENT_TYPES, create_event } from '../EventQueue.mjs'
import System from '../System.mjs'
import { addComponent, removeComponent, getComponent } from 'bitecs'

const movement_system = new System('movement_system', 40) // Run before room_update_system
movement_system.event_whitelist = [EVENT_NAMES.MOVE] // Listen to move action events

movement_system.func = async ({ game, event }) => {
    console.log(`[movement_system] Received event: ${event.name}, type: ${event.type}`)
    
    // Only process successful actions
    if (!event.details.success) {
        console.log(`[movement_system] Move not successful, skipping`)
        return null
    }

    const { world } = game
    const { Name } = world.components
    const { Has } = world.relations
    const { actor_eid, from_room_eid, to_room_eid, direction, connection_description } = event.details

    // Get actor display name for messaging
    const actorName = getComponent(world, actor_eid, Name)
    const actor_display_name = actorName ? actorName.value : `Actor ${actor_eid}`

    // Move the actor: remove from old room, add to new room
    removeComponent(world, from_room_eid, Has(actor_eid))
    addComponent(world, to_room_eid, Has(actor_eid))

    // Create descriptive completion message
    let completionMessage = `Movement completed: ${actor_display_name} moved ${direction}`
    
    // Return movement completion event
    return create_event(
        EVENT_NAMES.MOVEMENT_UPDATE,
        completionMessage,
        EVENT_TYPES.SYSTEM,
        {
            actor_eid,
            from_room_eid,
            to_room_eid,
            direction,
            connection_description,
            success: true
        }
    )
}

export { movement_system }