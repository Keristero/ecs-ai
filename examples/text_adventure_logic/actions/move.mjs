import {query, removeComponent, addComponent} from 'bitecs'
import {InRoom} from '../systems/text_adventure_systems.mjs'
import look from './look.mjs'

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
    const {Connection, Room} = world.components
    
    // Find current room
    const rooms = query(world, [Room])
    const currentRoom = rooms.find(room => {
        const entities_in_room = query(world, [InRoom(room)])
        return entities_in_room.includes(playerId)
    })
    
    if (!currentRoom) {
        return {success: false, message: "You are not in any room!"}
    }
    
    // Find connection in the given direction
    const connections = query(world, [Connection])
    const connection = connections.find(conn => {
        const connDirection = world.string_store.getString(Connection.direction[conn])
        return Connection.from[conn] === Room.id[currentRoom] && 
               connDirection === direction
    })
    
    if (!connection) {
        return {success: false, message: `There is no exit to the ${direction}.`}
    }
    
    // Find the destination room
    const targetRoomId = Connection.to[connection]
    const targetRoom = rooms.find(room => Room.id[room] === targetRoomId)
    
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
