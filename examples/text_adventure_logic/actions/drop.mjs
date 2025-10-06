import {removeComponent, addComponent} from 'bitecs'
import {z} from 'zod'
import {
    validateEntity,
    findEntityRoom,
    hasItemInInventory,
    successResult,
    failureResult
} from '../helpers.mjs'

/**
 * Drop action - entity drops an item
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
    const {InRoom, InInventory} = world.relations
    const {Item} = world.components
    
    // Validate item exists and has Item component
    const validation = validateEntity(world, itemId, [Item])
    if (!validation.valid) {
        return failureResult("Item not found!")
    }
    
    // Check if actor has the item in inventory
    if (!hasItemInInventory(world, actorId, itemId)) {
        return failureResult("You don't have that item!")
    }
    
    // Find actor's current room
    const actorRoom = findEntityRoom(world, actorId)
    
    if (!actorRoom) {
        return failureResult("You are not in any room!")
    }
    
    // Remove from inventory and add to room
    removeComponent(world, itemId, InInventory(actorId))
    addComponent(world, itemId, InRoom(actorRoom))
    
    return successResult("You drop the item.")
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
