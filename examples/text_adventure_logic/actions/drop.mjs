import {removeComponent, addComponent} from 'bitecs'
import {z} from 'zod'
import {
    validateEntity,
    findEntityRoom,
    hasItemInInventory,
    validateComponentForAction,
    successResult,
    failureResult
} from '../helpers.mjs'
import {create_action_event} from '../event_helpers.mjs'

/**
 * Drop action - entity drops an item
 * Requires: Actor must have Hands component with health >= 0.5
 * @param {Object} game - The game instance
 * @param {Object} params - Action parameters
 * @param {number} params.actorId - The entity performing the action (optional, defaults to game.playerId)
 * @param {number} params.itemId - The item ID to drop
 * @returns {Object} Action result with success status and message
 */
export default function drop(game, params) {
    const actorId = params.actorId ?? game.playerId
    const {itemId} = params
    const {world} = game
    const {Has} = world.relations
    const {Item, Hands} = world.components
    
    // Find actor's current room first
    const actorRoom = findEntityRoom(world, actorId)
    
    if (!actorRoom) {
        return create_action_event('drop', "You are not in any room!", actorId, null, false, {})
    }
    
    // Validate actor has functional Hands
    const handsValidation = validateComponentForAction(world, actorId, Hands, 'Hands', 'drop items')
    if (!handsValidation.valid) {
        return create_action_event('drop', handsValidation.error, actorId, actorRoom, false, {})
    }
    
    // Validate item exists and has Item component
    const validation = validateEntity(world, itemId, [Item])
    if (!validation.valid) {
        return create_action_event('drop', "Item not found!", actorId, actorRoom, false, {
            item_eid: itemId
        })
    }
    
    // Check if actor has the item in inventory
    if (!hasItemInInventory(world, actorId, itemId)) {
        return create_action_event('drop', "You don't have that item!", actorId, actorRoom, false, {
            item_eid: itemId
        })
    }
    
    // Remove from inventory using Has relation and add to room
    removeComponent(world, actorId, Has(itemId))
    addComponent(world, actorRoom, Has(itemId))
    
    // Build message with warning if Hands impaired
    let message = "You drop the item."
    if (handsValidation.warning) {
        message += ` (${handsValidation.warning})`
    }
    
    return create_action_event('drop', message, actorId, actorRoom, true, {
        item_eid: itemId
    })
}

// Action metadata for dynamic command generation and autocomplete
export const metadata = {
    name: 'drop',
    aliases: ['discard', 'toss'],
    description: 'Drop an item from inventory',
    parameters: ['itemId'], // Parameter names
    autocompletes: [
        ['Item'] // itemId parameter: must have Item component (and be in inventory - handled by client)
    ],
    inputSchema: z.object({
        itemId: z.number().int().nonnegative().describe('ID of the item to drop')
    })
}
