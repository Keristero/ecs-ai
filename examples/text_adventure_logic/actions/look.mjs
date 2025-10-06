import {query, hasComponent, getComponent} from 'bitecs'
import {InRoom, InInventory} from '../systems/text_adventure_systems.mjs'

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
    const roomNameData = getComponent(world, currentRoom, Name)
    const roomDescData = getComponent(world, currentRoom, Description)
    const roomName = roomNameData?.value || ''
    const roomDescription = roomDescData?.value || ''
    
    // Get all entities in the room
    const entities_in_room = query(world, [InRoom(currentRoom)])
    
    const items = entities_in_room.filter(e => hasComponent(world, e, Item))
    const landmarks = entities_in_room.filter(e => hasComponent(world, e, Landmark))
    const enemies = entities_in_room.filter(e => hasComponent(world, e, Enemy))
    
    // Get available exits/connections from this room
    const connections = query(world, [Connection])
    const exits = connections
        .filter(conn => Connection.from[conn] === roomId)
        .map(conn => world.string_store.getString(Connection.direction[conn]))
    
    // Get items in player inventory using InInventory relation
    const inventory = query(world, [Item, InInventory(playerId)])
    
    return {
        success: true,
        roomId,
        roomName,
        roomDescription,
        exits,
        items: items.map(e => {
            const nameData = getComponent(world, e, Name)
            const descData = getComponent(world, e, Description)
            return {
                id: Item.id[e],
                name: nameData?.value || '',
                description: descData?.value || ''
            }
        }),
        landmarks: landmarks.map(e => {
            const nameData = getComponent(world, e, Name)
            const descData = getComponent(world, e, Description)
            return {
                id: Landmark.id[e],
                name: nameData?.value || '',
                description: descData?.value || ''
            }
        }),
        enemies: enemies.map(e => {
            const nameData = getComponent(world, e, Name)
            const descData = getComponent(world, e, Description)
            return {
                id: Enemy.id[e],
                name: nameData?.value || '',
                description: descData?.value || ''
            }
        }),
        inventory: inventory.map(e => {
            const nameData = getComponent(world, e, Name)
            const descData = getComponent(world, e, Description)
            return {
                id: Item.id[e],
                name: nameData?.value || '',
                description: descData?.value || ''
            }
        })
    }
}
