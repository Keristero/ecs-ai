import {removeComponent, addComponent} from 'bitecs'
import look from './look.mjs'
import {z} from 'zod'
import {
    findEntityRoom,
    findConnectedRoom,
    failureResult
} from '../helpers.mjs'

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
    const {InRoom} = world.relations
    
    // Find current room
    const currentRoom = findEntityRoom(world, playerId)
    
    if (!currentRoom) {
        return failureResult("You are not in any room!")
    }
    
    // Find connected room in the specified direction
    const connectedRooms = findConnectedRoom(world, currentRoom, direction)
    
    if (connectedRooms.length === 0) {
        return failureResult(`There is no exit to the ${direction}.`)
    }
    
    const targetRoom = connectedRooms[0]
    
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
