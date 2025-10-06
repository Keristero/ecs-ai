import {query, hasComponent, getComponent} from 'bitecs'
import {InRoom, InInventory, ConnectsTo} from '../relations/text_adventure_relations.mjs'
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
    const {Room, Item, Landmark, Enemy, Name, Description} = world.components
    
    // Find current room
    const rooms = query(world, [Room])
    const currentRoom = rooms.find(room => {
        const entities_in_room = query(world, [InRoom(room)])
        return entities_in_room.includes(playerId)
    })
    
    if (!currentRoom) {
        return {success: false, message: "You are not in any room!"}
    }
    
    // Use entity ID directly - no more Room.id field
    const roomId = currentRoom
    const roomName = getComponent(world, currentRoom, Name)?.value || ''
    const roomDescription = getComponent(world, currentRoom, Description)?.value || ''
    
    // Get all entities in the room
    const entities_in_room = query(world, [InRoom(currentRoom)])
    
    const items = entities_in_room.filter(e => hasComponent(world, e, Item))
    const landmarks = entities_in_room.filter(e => hasComponent(world, e, Landmark))
    const enemies = entities_in_room.filter(e => hasComponent(world, e, Enemy))
    
    // Get available exits by finding all rooms this room connects to
    // Query all rooms and check if currentRoom has ConnectsTo relation with them
    const allRooms = query(world, [Room])
    const exits = []
    
    for (const targetRoom of allRooms) {
        // Check if currentRoom has a ConnectsTo(targetRoom) relation
        const entitiesConnectingToTarget = query(world, [ConnectsTo(targetRoom)])
        if (entitiesConnectingToTarget.includes(currentRoom)) {
            // Get the direction from the relation data (stored as string index)
            const directionIndex = ConnectsTo(targetRoom).direction[currentRoom]
            if (directionIndex !== undefined) {
                const direction = world.string_store.getString(directionIndex)
                exits.push(direction)
            }
        }
    }
    
    // Get items in player inventory using InInventory relation
    const inventory = query(world, [Item, InInventory(playerId)])
    
    return {
        success: true,
        roomId,
        roomName,
        roomDescription,
        exits,
        items: items.map(e => {
            // Use entity ID directly - no more Item.id field
            return {
                id: e,
                name: getComponent(world, e, Name)?.value || '',
                description: getComponent(world, e, Description)?.value || ''
            }
        }),
        landmarks: landmarks.map(e => {
            // Use entity ID directly - no more Landmark.id field
            return {
                id: e,
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
            // Use entity ID directly - no more Item.id field
            return {
                id: e,
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
