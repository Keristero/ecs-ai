import {query, hasComponent, removeComponent, addComponent} from 'bitecs'
import {InRoom, InInventory} from '../relations/text_adventure_relations.mjs'
import {z} from 'zod'

/**
 * Drop action - player drops an item
 * @param {Object} game - The game instance
 * @param {Object} params - Action parameters
 * @param {number} params.playerId - The player entity ID (optional, defaults to game.playerId)
 * @param {number} params.itemId - The item ID to drop
 * @returns {Object} Action result with success status and message
 */
export default function drop(game, params) {
    const playerId = params.playerId ?? game.playerId
    const {itemId} = params
    const {world} = game
    const {Item} = world.components
    
    // itemId is the entity ID - check if it exists and has Item component
    const items = query(world, [Item])
    const item = items.find(i => i === itemId)
    
    if (!item) {
        return {success: false, message: "Item not found!"}
    }
    
    // Check if player has the item (is it in their inventory?)
    const itemsInInventory = query(world, [Item, InInventory(playerId)])
    if (!itemsInInventory.includes(item)) {
        return {success: false, message: "You don't have that item!"}
    }
    
    // Find player's current room
    const rooms = query(world, [world.components.Room])
    const playerRoom = rooms.find(room => {
        const entities_in_room = query(world, [InRoom(room)])
        return entities_in_room.includes(playerId)
    })
    
    if (!playerRoom) {
        return {success: false, message: "You are not in any room!"}
    }
    
    // Remove from inventory and add to room
    removeComponent(world, item, InInventory(playerId))
    addComponent(world, item, InRoom(playerRoom))
    
    return {success: true, message: `You drop the item.`}
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
