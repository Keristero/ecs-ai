import { query, getComponent, hasComponent, addComponent, removeComponent, set, getRelationTargets } from 'bitecs'
import { z } from 'zod'

import { Action, action_argument_schemas } from '../Action.mjs'
import { get_components_for_entity, get_all_components_and_relations } from '../helpers.mjs'

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
    const { Has } = world.relations

    // Get item display name
    const itemName = getComponent(world, target_eid, Name)
    const item_display_name = itemName ? itemName.value : `Item ${target_eid}`

    // Transfer the item: remove from room, add to actor
    // (Validation already ensures the item is in the room and has Item component)
    removeComponent(world, actor_eid, Has(target_eid))
    addComponent(world, room_eid, Has(target_eid))

    return pickup.create_event(actor_eid, `You drop the ${item_display_name}.`, {
        success: true,
        item_name: item_display_name,
        target_item: target_eid,
        room_eid
    })
}

export { drop }