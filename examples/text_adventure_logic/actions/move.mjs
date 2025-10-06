import {query, removeComponent, addComponent, getComponent} from 'bitecs'
import look from './look.mjs'
import {z} from 'zod'

/**
 * Move action - player moves in a direction
 * @param {Object} game - The game instance
 * @param {Object} params - Action parameters
 * @param {number} params.playerId - The player entity ID (optional, defaults to game.playerId)
 * @param {string} params.direction - Direction to move (north, south, east, west)
 * @returns {Object} Action result with success status and room information
 */
export default function move(game, params) {
    const playerId = params.playerId ?? game.playerId
    const {direction} = params
    const {world} = game
    const {InRoom, ConnectsTo} = world.relations
    const {Room} = world.components
    
    // Find current room
    const rooms = query(world, [Room])
    const currentRoom = rooms.find(room => {
        const entities_in_room = query(world, [InRoom(room)])
        return entities_in_room.includes(playerId)
    })
    
    if (!currentRoom) {
        return {success: false, message: "You are not in any room!"}
    }
    
    // Find connected rooms from current room
    // Query all rooms that the current room ConnectsTo
    const connectedRooms = query(world, [Room])
        .filter(room => {
            // Check if currentRoom has a ConnectsTo relation targeting this room
            const hasRelation = query(world, [ConnectsTo(room)]).includes(currentRoom)
            if (!hasRelation) return false
            
            // Get the direction from the relation data (stored as string index)
            const directionIndex = ConnectsTo(room).direction[currentRoom]
            if (directionIndex === undefined) return false
            
            const roomDirection = world.string_store.getString(directionIndex)
            return roomDirection === direction
        })
    
    if (connectedRooms.length === 0) {
        return {success: false, message: `There is no exit to the ${direction}.`}
    }
    
    const targetRoom = connectedRooms[0]
    
    if (!targetRoom) {
        return {success: false, message: "The destination room does not exist!"}
    }
    
    // Move player to new room
    removeComponent(world, playerId, InRoom(currentRoom))
    addComponent(world, playerId, InRoom(targetRoom))
    
    // Automatically look at the new room
    const lookResult = look(game, {playerId})
    
    // Add move message to the look result
    return {
        ...lookResult,
        message: `You move ${direction}.`
    }
}

// Action metadata for dynamic command generation and autocomplete
export const metadata = {
    name: 'move',
    aliases: ['go', 'walk', 'm'],
    description: 'Move in a direction',
    parameters: ['direction'], // List of parameter names
    autocompletes: [
        [] // direction parameter - no entity targeting, handled specially by client (shows available exits)
    ],
    inputSchema: z.object({
        direction: z.string().describe('Direction to move (north, south, east, west, etc.)')
    })
}
