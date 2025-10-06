import {removeComponent, addComponent} from 'bitecs'
import {z} from 'zod'
import {
    validateEntity,
    findEntityRoom,
    areInSameRoom,
    successResult,
    failureResult
} from '../helpers.mjs'

/**
 * Pickup action - player picks up an item
 * @param {Object} game - The game instance
 * @param {Object} params - Action parameters
 * @param {number} params.playerId - The player entity ID (optional, defaults to game.playerId)
 * @param {number} params.itemId - The item ID to pick up
 * @returns {Object} Action result with success status and message
 */
export default function pickup(game, params) {
    const playerId = params.playerId ?? game.playerId
    const {itemId} = params
    const {world} = game
    const {InRoom, InInventory} = world.relations
    const {Item} = world.components
    
    // Validate item exists and has Item component
    const validation = validateEntity(world, itemId, [Item])
    if (!validation.valid) {
        return failureResult("Item not found!")
    }
    
    // Check if item is in the same room as player
    if (!areInSameRoom(world, playerId, itemId)) {
        return failureResult("That item is not here!")
    }
    
    // Get rooms for transfer
    const playerRoom = findEntityRoom(world, playerId)
    
    // Remove item from room and add to player inventory
    removeComponent(world, itemId, InRoom(playerRoom))
    addComponent(world, itemId, InInventory(playerId))
    
    return successResult("You pick up the item.")
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
