import { query, getComponent, hasComponent, addComponent, removeComponent, set, getRelationTargets } from 'bitecs'
import { z } from 'zod'

import { Action } from '../Action.mjs'
import { get_components_for_entity, get_all_components_and_relations } from '../helpers.mjs'

const pickup = new Action('pickup', ['take', 'get'], 'Pick up an item from the room',
    z.object({
        item_name: z.string().min(1, 'Item name cannot be empty')
    }), 
    { includeActorRoom: true }
)

pickup.func = async (game, args) => {
    const { actor_eid, room_eid, item_name } = args
    const { world } = game
    const { Name, Item } = world.components
    const { Has } = world.relations

    // Get all entities that the room has
    const entitiesInRoom = getRelationTargets(world, room_eid, Has)

    // Find the item by name
    let target_item = null
    let item_display_name = null

    for (const entity_eid of entitiesInRoom) {
        // Check if this entity is an item
        if (hasComponent(world, entity_eid, Item)) {
            const entityName = getComponent(world, entity_eid, Name)
            if (entityName && entityName.value.toLowerCase() === item_name.toLowerCase()) {
                target_item = entity_eid
                item_display_name = entityName.value
                break
            }
        }
    }

    // Check if item was found
    if (!target_item) {
        return pickup.create_event(actor_eid, `You don't see a "${item_name}" here to pick up.`, {
            success: false,
            item_name
        })
    }

    // Transfer the item: remove from room, add to actor
    removeComponent(world, room_eid, Has(target_item))
    addComponent(world, actor_eid, Has(target_item))

    return pickup.create_event(actor_eid, `You pick up the ${item_display_name}.`, {
        success: true,
        item_name: item_display_name,
        target_item,
        room_eid
    })
}

export { pickup }