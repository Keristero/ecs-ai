import {query, hasComponent} from 'bitecs'
import {z} from 'zod'
import {
    findEntityRoom,
    getEntitiesInRoom,
    getInventoryItems,
    getRoomExits,
    getEntityName,
    formatEntitiesDisplay,
    validateComponentForAction,
    successResult,
    failureResult
} from '../helpers.mjs'
import {createActionEvent} from '../action_helpers.mjs'

/**
 * Look action - get information about the current room
 * Requires: Actor must have Eyes component with health >= 0.5
 * @param {Object} game - The game instance
 * @param {Object} params - Action parameters
 * @param {number} params.actorId - The entity performing the action (optional, defaults to game.playerId)
 * @returns {Object} Room information including descriptions, items, landmarks, and enemies
 */
export default function look(game, params) {
    const actorId = params.actorId ?? game.playerId
    const {world} = game
    const {Item, Landmark, Enemy, Eyes} = world.components
    
    // Validate actor has functional Eyes
    const eyesValidation = validateComponentForAction(world, actorId, Eyes, 'Eyes', 'look')
    if (!eyesValidation.valid) {
        return createActionEvent('look', actorId, null, false, {
            error: eyesValidation.error
        })
    }
    
    // Find current room
    const currentRoom = findEntityRoom(world, actorId)
    
    if (!currentRoom) {
        return createActionEvent('look', actorId, null, false, {
            error: "You are not in any room!"
        })
    }
    
    // Get room info
    const roomId = currentRoom
    const roomName = getEntityName(world, currentRoom)
    const roomDescription = world.components.Description 
        ? (hasComponent(world, currentRoom, world.components.Description)
            ? getEntityName(world, currentRoom) 
            : '')
        : ''
    
    // Get room description properly
    const Description = world.components.Description
    const roomDesc = hasComponent(world, currentRoom, Description)
        ? (Description.value?.[currentRoom] !== undefined 
            ? world.string_store.getString(Description.value[currentRoom])
            : '')
        : ''
    
    // Get all entities in the room
    const entities_in_room = getEntitiesInRoom(world, currentRoom)
    
    // Filter by type
    const items = entities_in_room.filter(e => hasComponent(world, e, Item))
    const landmarks = entities_in_room.filter(e => hasComponent(world, e, Landmark))
    const enemies = entities_in_room.filter(e => hasComponent(world, e, Enemy))
    
    // Get available exits
    const exitData = getRoomExits(world, currentRoom)
    const exits = exitData.map(exit => exit.direction)
    
    // Get items in actor's inventory
    const inventory = getInventoryItems(world, actorId)
    
    // Build message with warning if Eyes impaired
    let message = ""
    if (eyesValidation.warning) {
        message = eyesValidation.warning
    }
    
    return createActionEvent('look', actorId, roomId, true, {
        room_name: roomName,
        room_description: roomDesc,
        exits,
        items: formatEntitiesDisplay(world, items),
        landmarks: formatEntitiesDisplay(world, landmarks),
        enemies: formatEntitiesDisplay(world, enemies),
        inventory: formatEntitiesDisplay(world, inventory),
        message
    })
}

// Action metadata for dynamic command generation and autocomplete
export const metadata = {
    name: 'look',
    aliases: ['l', 'examine'],
    description: 'Look around the current room',
    parameters: [], // No parameters
    autocompletes: [], // No autocomplete needed
    inputSchema: z.object({})
}
