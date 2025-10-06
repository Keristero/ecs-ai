import {query, removeComponent, addComponent} from 'bitecs'
import {InRoom, InInventory} from '../systems/text_adventure_systems.mjs'

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
    const {Item} = world.components
    
    const items = query(world, [Item])
    const item = items.find(i => Item.id[i] === itemId)
    
    if (!item) {
        return {success: false, message: "Item not found!"}
    }
    
    // Check if item is in the same room as player
    const rooms = query(world, [world.components.Room])
    const playerRoom = rooms.find(room => {
        const entities_in_room = query(world, [InRoom(room)])
        return entities_in_room.includes(playerId)
    })
    
    const itemRoom = rooms.find(room => {
        const entities_in_room = query(world, [InRoom(room)])
        return entities_in_room.includes(item)
    })
    
    if (playerRoom !== itemRoom) {
        return {success: false, message: "That item is not here!"}
    }
    
    // Remove item from room and add to player inventory
    removeComponent(world, item, InRoom(playerRoom))
    addComponent(world, item, InInventory(playerId))
    
    return {success: true, message: `You pick up the item.`}
}
