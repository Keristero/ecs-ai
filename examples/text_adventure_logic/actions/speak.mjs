import {query, hasComponent} from 'bitecs'
import {z} from 'zod'
import {
    findEntityRoom,
    getEntitiesInRoom,
    getEntityName,
    formatEntitiesDisplay,
    successResult,
    failureResult
} from '../helpers.mjs'

/**
 * Speak action - say something in the current room
 * Entities with Ears component in the room will hear the dialogue
 * @param {Object} game - The game instance
 * @param {Object} params - Action parameters
 * @param {number} params.playerId - The player entity ID (optional, defaults to game.playerId)
 * @param {string} params.dialogue - What the player wants to say
 * @returns {Object} Action result with listeners who heard the dialogue
 */
export default function speak(game, params) {
    const playerId = params.playerId ?? game.playerId
    const {dialogue} = params
    const {world} = game
    const {Ears} = world.components
    
    // Find current room
    const currentRoom = findEntityRoom(world, playerId)
    
    if (!currentRoom) {
        return failureResult("You are not in any room!")
    }
    
    // Get room name for context
    const roomName = getEntityName(world, currentRoom)
    
    // Find all entities in the room with Ears (excluding the speaker)
    const entities_in_room = getEntitiesInRoom(world, currentRoom)
    const listeners = entities_in_room.filter(e => 
        e !== playerId && hasComponent(world, e, Ears)
    )
    
    // Format listener details
    const listenerDetails = formatEntitiesDisplay(world, listeners)
    
    // Log to console for debugging
    console.log('\n=== DIALOGUE ===')
    console.log(`Room: ${roomName}`)
    console.log(`Speaker: Player (ID: ${playerId})`)
    console.log(`Dialogue: "${dialogue}"`)
    console.log(`Listeners: ${listenerDetails.map(l => l.name).join(', ') || 'none'}`)
    console.log('================\n')
    
    return successResult(`You say: "${dialogue}"`, {
        dialogue,
        roomId: currentRoom,
        roomName,
        speakerId: playerId,
        listeners: listenerDetails,
        listenerCount: listeners.length
    })
}

// Action metadata for dynamic command generation and autocomplete
export const metadata = {
    name: 'speak',
    aliases: ['say', 'talk', 'shout'],
    description: 'Say something in the current room',
    parameters: ['dialogue'],
    autocompletes: [
        [] // dialogue parameter - no autocomplete, free text
    ],
    inputSchema: z.object({
        dialogue: z.string().min(1, 'You must say something')
    }),
    summarizeWithAI: true // AI should generate narrative including any NPC responses
}
