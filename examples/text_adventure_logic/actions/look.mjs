import {query, hasComponent, getComponent} from 'bitecs'
import {InRoom, InInventory} from '../systems/text_adventure_systems.mjs'
import {z} from 'zod'

/**
 * Look action - get information about the current room
 * @param {Object} game - The game instance
 * @param {Object} params - Action parameters
 * @param {number} params.playerId - The player entity ID (optional, defaults to game.playerId)
 * @returns {Object} Room information including descriptions, items, landmarks, and enemies
 */
export default function look(game, params) {
    const playerId = params.playerId ?? game.playerId
    const {world} = game
    const {Room, Item, Landmark, Enemy, Name, Description, Connection} = world.components
    
    // Find current room
    const rooms = query(world, [Room])
    const currentRoom = rooms.find(room => {
        const entities_in_room = query(world, [InRoom(room)])
        return entities_in_room.includes(playerId)
    })
    
    if (!currentRoom) {
        return {success: false, message: "You are not in any room!"}
    }
    
    const roomId = Room.id[currentRoom]
    const roomName = getComponent(world, currentRoom, Name)?.value || ''
    const roomDescription = getComponent(world, currentRoom, Description)?.value || ''
    
    // Get all entities in the room
    const entities_in_room = query(world, [InRoom(currentRoom)])
    
    const items = entities_in_room.filter(e => hasComponent(world, e, Item))
    const landmarks = entities_in_room.filter(e => hasComponent(world, e, Landmark))
    const enemies = entities_in_room.filter(e => hasComponent(world, e, Enemy))
    
    // Get available exits/connections from this room
    const connections = query(world, [Connection])
    const exits = connections
        .filter(conn => Connection.from[conn] === roomId)
        .map(conn => getComponent(world, conn, Connection)?.direction || '')
    
    // Get items in player inventory using InInventory relation
    const inventory = query(world, [Item, InInventory(playerId)])
    
    return {
        success: true,
        roomId,
        roomName,
        roomDescription,
        exits,
        items: items.map(e => {
            return {
                id: getComponent(world, e, Item)?.id,
                name: getComponent(world, e, Name)?.value || '',
                description: getComponent(world, e, Description)?.value || ''
            }
        }),
        landmarks: landmarks.map(e => {
            return {
                id: getComponent(world, e, Landmark)?.id,
                name: getComponent(world, e, Name)?.value || '',
                description: getComponent(world, e, Description)?.value || ''
            }
        }),
        enemies: enemies.map(e => {
            return {
                id: e, // enemies don't have an id field in the component, use entity id
                name: getComponent(world, e, Name)?.value || '',
                description: getComponent(world, e, Description)?.value || ''
            }
        }),
        inventory: inventory.map(e => {
            return {
                id: getComponent(world, e, Item)?.id,
                name: getComponent(world, e, Name)?.value || '',
                description: getComponent(world, e, Description)?.value || ''
            }
        })
    }
}

// Action metadata for dynamic command generation and autocomplete
export const metadata = {
    name: 'look',
    aliases: ['l', 'examine', 'inspect'],
    description: 'Look around the current room',
    parameters: [], // No parameters
    autocompletes: [], // No autocomplete needed
    inputSchema: z.object({})
}
