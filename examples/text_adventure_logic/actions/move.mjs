import {removeComponent, addComponent} from 'bitecs'
import look from './look.mjs'
import {z} from 'zod'
import {
    findEntityRoom,
    findConnectedRoom,
    failureResult
} from '../helpers.mjs'
import {create_action_event} from '../event_helpers.mjs'

/**
 * Move action - entity moves in a direction
 * @param {Object} game - The game instance
 * @param {Object} params - Action parameters
 * @param {number} params.actorId - The entity performing the action (optional, defaults to game.playerId)
 * @param {string} params.direction - Direction to move (north, south, east, west)
 * @returns {Object} Action result with success status and room information
 */
export default function move(game, params) {
    const actorId = params.actorId ?? game.playerId
    const {direction} = params
    const {world} = game
    const {Has} = world.relations
    
    // Find current room
    const currentRoom = findEntityRoom(world, actorId)
    
    if (!currentRoom) {
        return create_action_event('move', "You are not in any room!", actorId, null, false, {})
    }
    
    // Find connected room in the specified direction
    const connectedRooms = findConnectedRoom(world, currentRoom, direction)
    
    if (connectedRooms.length === 0) {
        return create_action_event('move', `There is no exit to the ${direction}.`, actorId, currentRoom, false, {
            direction
        })
    }
    
    const targetRoom = connectedRooms[0]
    
    // Move actor to new room
    removeComponent(world, currentRoom, Has(actorId))
    addComponent(world, targetRoom, Has(actorId))
    
    // Automatically look at the new room
    const lookResult = look(game, {actorId})
    
    // Return move event with look details
    return create_action_event('move', `You move ${direction}.`, actorId, targetRoom, true, {
        direction,
        from_room_eid: currentRoom,
        to_room_eid: targetRoom,
        look_details: lookResult.details
    })
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
