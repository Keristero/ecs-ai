import { getComponent } from 'bitecs'

import { Action, action_argument_schemas } from '../Action.mjs'

const pickup = new Action('pickup', ['take', 'get'], 'Pick up an item from the room', {
    target_eid: action_argument_schemas.target_eid
}, { 
    includeActorRoom: true,
    entityValidation: {
        target_eid: {
            components: ['Item'],
            isTargetOf: [{
                relation: 'Has',
                source: 'room_eid'
            }]
        }
    }
})

pickup.func = async (game, args) => {
    const { actor_eid, room_eid, target_eid } = args
    const { world } = game
    const { Name } = world.components

    console.log(`[pickup action] Executing for actor ${actor_eid}, target ${target_eid}, room ${room_eid}`)

    // Get item display name for message
    const itemName = getComponent(world, target_eid, Name)
    const item_display_name = itemName ? itemName.value : `Item ${target_eid}`

    console.log(`[pickup action] Item display name: ${item_display_name}`)

    // Note: Actual inventory transfer is handled by inventory_system
    const event = pickup.create_event(actor_eid, `You pick up the ${item_display_name}.`, {
        success: true,
        item_name: item_display_name,
        target_eid: target_eid,
        room_eid
    })
    
    console.log(`[pickup action] Created event:`, event)
    return event
}

export { pickup }