import { EVENT_NAMES, EVENT_TYPES, create_event } from '../EventQueue.mjs'
import System from '../System.mjs'
import { addComponent, removeComponent, getComponent } from 'bitecs'

const inventory_system = new System('inventory_system', 50) // Run before room_update_system
inventory_system.event_whitelist = [EVENT_NAMES.PICKUP, EVENT_NAMES.DROP] // Listen to inventory action events

inventory_system.func = async ({ game, event }) => {
    console.log(`[inventory_system] Received event: ${event.name}, type: ${event.type}`)
    
    // Only process successful actions
    if (!event.details.success) {
        console.log(`[inventory_system] Event not successful, skipping`)
        return null
    }

    const { world } = game
    const { Name } = world.components
    const { Has } = world.relations
    const { room_eid, actor_eid, target_eid } = event.details

    // Get item display name for messaging
    const itemName = getComponent(world, target_eid, Name)
    const item_display_name = itemName ? itemName.value : `Item ${target_eid}`

    if (event.name === EVENT_NAMES.PICKUP) {
        // Transfer item from room to actor
        removeComponent(world, room_eid, Has(target_eid))
        addComponent(world, actor_eid, Has(target_eid))
        
        console.log(`[inventory_system] ${actor_eid} picked up ${item_display_name} (${target_eid}) from room ${room_eid}`)
        
    } else if (event.name === EVENT_NAMES.DROP) {
        // Transfer item from actor to room
        removeComponent(world, actor_eid, Has(target_eid))
        addComponent(world, room_eid, Has(target_eid))
        
        console.log(`[inventory_system] ${actor_eid} dropped ${item_display_name} (${target_eid}) in room ${room_eid}`)
    }

    // Return success confirmation event
    return create_event(
        EVENT_NAMES.INVENTORY_UPDATE,
        `Inventory operation completed: ${event.name}`,
        EVENT_TYPES.SYSTEM,
        {
            action: event.name,
            actor_eid,
            target_eid,
            item_name: item_display_name,
            room_eid,
            success: true
        }
    )
}

export { inventory_system }