import {query, hasComponent, getComponent} from 'bitecs'
import {z} from 'zod'

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
    const {InRoom} = world.relations
    const {Room, Ears, Name} = world.components
    
    // Find current room
    const rooms = query(world, [Room])
    const currentRoom = rooms.find(room => {
        const entities_in_room = query(world, [InRoom(room)])
        return entities_in_room.includes(playerId)
    })
    
    if (!currentRoom) {
        return {success: false, message: "You are not in any room!"}
    }
    
    // Get room name for context
    const roomName = getComponent(world, currentRoom, Name)?.value || `Room ${currentRoom}`
    
    // Find all entities in the room with Ears
    const entities_in_room = query(world, [InRoom(currentRoom)])
    const listeners = entities_in_room.filter(e => {
        // Don't include the speaker
        if (e === playerId) return false
        // Must have Ears component
        return hasComponent(world, e, Ears)
    })
    
    // Get names of listeners
    const listenerDetails = listeners.map(e => {
        const name = getComponent(world, e, Name)?.value || `Entity ${e}`
        const description = getComponent(world, e, world.components.Description)?.value || ''
        return {
            id: e,
            name,
            description
        }
    })
    
    // Log to console for debugging
    console.log('\n=== DIALOGUE ===')
    console.log(`Room: ${roomName}`)
    console.log(`Speaker: Player (ID: ${playerId})`)
    console.log(`Dialogue: "${dialogue}"`)
    console.log(`Listeners: ${listenerDetails.map(l => l.name).join(', ') || 'none'}`)
    console.log('================\n')
    
    return {
        success: true,
        message: `You say: "${dialogue}"`,
        dialogue,
        roomId: currentRoom,
        roomName,
        speakerId: playerId,
        listeners: listenerDetails,
        listenerCount: listeners.length
    }
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
