import { getComponent } from 'bitecs'

import { Action, action_argument_schemas } from '../Action.mjs'

const drop = new Action('drop', ['leave', 'discard'], 'Leave an item in the room', {
    target_eid: action_argument_schemas.target_eid
}, { 
    includeActorRoom: true,
    entityValidation: {
        target_eid: {
            components: ['Item'],
            isTargetOf: [{
                relation: 'Has',
                source: 'actor_eid'
            }]
        }
    }
})

drop.func = async (game, args) => {
    const { actor_eid, room_eid, target_eid } = args
    const { world } = game
    const { Name } = world.components

    // Get item display name for message
    const itemName = getComponent(world, target_eid, Name)
    const item_display_name = itemName ? itemName.value : `Item ${target_eid}`

    // Note: Actual inventory transfer is handled by inventory_system
    return drop.create_event(actor_eid, `You drop the ${item_display_name}.`, {
        success: true,
        item_name: item_display_name,
        target_eid: target_eid,
        room_eid
    })
}

export { drop }