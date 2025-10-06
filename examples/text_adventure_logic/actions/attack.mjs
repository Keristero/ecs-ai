import {query, removeComponent} from 'bitecs'
import {InRoom} from '../systems/text_adventure_systems.mjs'

/**
 * Attack action - player attacks an enemy
 * @param {Object} game - The game instance
 * @param {Object} params - Action parameters
 * @param {number} params.playerId - The player entity ID (optional, defaults to game.playerId)
 * @param {number} params.enemyId - The enemy entity ID to attack
 * @returns {Object} Action result with success status, message, and combat info
 */
export default function attack(game, params) {
    const playerId = params.playerId ?? game.playerId
    const {enemyId} = params
    const {world} = game
    const {Enemy, Hitpoints, Attributes} = world.components
    
    const enemies = query(world, [Enemy, Hitpoints])
    const enemy = enemies.find(e => e === enemyId)
    
    if (!enemy) {
        return {success: false, message: "Enemy not found!"}
    }
    
    // Check if enemy is in same room as player
    const rooms = query(world, [world.components.Room])
    const playerRoom = rooms.find(room => {
        const entities_in_room = query(world, [InRoom(room)])
        return entities_in_room.includes(playerId)
    })
    
    const enemyRoom = rooms.find(room => {
        const entities_in_room = query(world, [InRoom(room)])
        return entities_in_room.includes(enemy)
    })
    
    if (playerRoom !== enemyRoom) {
        return {success: false, message: "That enemy is not here!"}
    }
    
    // Calculate damage based on player attributes
    const playerStr = Attributes.strength[playerId] || 1
    const damage = Math.floor(Math.random() * playerStr) + playerStr
    
    Hitpoints.current[enemy] = Math.max(0, Hitpoints.current[enemy] - damage)
    
    const enemyDead = Hitpoints.current[enemy] <= 0
    
    if (enemyDead) {
        // Remove dead enemy from room
        removeComponent(world, enemy, InRoom(enemyRoom))
        return {success: true, message: `You defeat the enemy!`, enemyDead: true, damage}
    }
    
    return {success: true, message: `You attack the enemy for ${damage} damage!`, enemyDead: false, damage}
}
