import {removeComponent, addComponent} from 'bitecs'
import {z} from 'zod'
import {
    validateEntity,
    findEntityRoom,
    areInSameRoom,
    validateComponentForAction,
    successResult,
    failureResult
} from '../helpers.mjs'

/**
 * Pickup action - entity picks up an item
 * Requires: Actor must have Hands component with health >= 0.5
 * @param {Object} game - The game instance
 * @param {Object} params - Action parameters
 * @param {number} params.actorId - The entity performing the action (optional, defaults to game.playerId)
 * @param {number} params.itemId - The item ID to pick up
 * @returns {Object} Action result with success status and message
 */
export default function pickup(game, params) {
    const actorId = params.actorId ?? game.playerId
    const {itemId} = params
    const {world} = game
    const {InRoom, Has} = world.relations
    const {Item, Hands} = world.components
    
    // Validate actor has functional Hands
    const handsValidation = validateComponentForAction(world, actorId, Hands, 'Hands', 'pick up items')
    if (!handsValidation.valid) {
        return failureResult(handsValidation.error)
    }
    
    // Validate item exists and has Item component
    const validation = validateEntity(world, itemId, [Item])
    if (!validation.valid) {
        return failureResult("Item not found!")
    }
    
    // Check if item is in the same room as actor
    if (!areInSameRoom(world, actorId, itemId)) {
        return failureResult("That item is not here!")
    }
    
    // Get rooms for transfer
    const actorRoom = findEntityRoom(world, actorId)
    
    // Remove item from room and add to actor's inventory using Has relation
    removeComponent(world, itemId, InRoom(actorRoom))
    addComponent(world, actorId, Has(itemId))
    
    // Build message with warning if Hands impaired
    let message = "You pick up the item."
    if (handsValidation.warning) {
        message += ` (${handsValidation.warning})`
    }
    
    return successResult(message)
}

// Action metadata for dynamic command generation and autocomplete
export const metadata = {
    name: 'pickup',
    aliases: ['get', 'take', 'grab'],
    description: 'Pick up an item',
    parameters: ['itemId'], // Parameter names
    autocompletes: [
        ['Item'] // itemId parameter: must have Item component (and be in current room - handled by client)
    ],
    inputSchema: z.object({
        itemId: z.number().int().nonnegative().describe('ID of the item to pick up')
    })
}
