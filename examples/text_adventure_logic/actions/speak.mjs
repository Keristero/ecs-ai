import {query, hasComponent, getComponent} from 'bitecs'
import {z} from 'zod'
import {
    findEntityRoom,
    getEntitiesInRoom,
    getEntityName,
    formatEntitiesDisplay,
    successResult,
    failureResult
} from '../helpers.mjs'
import {createActionEvent} from '../action_helpers.mjs'

/**
 * Speak action - entity speaks dialogue in current room
 * Any entities with the Ears component in the same room will be listed as listeners
 * Requires: Actor must have Attributes component with intelligence >= 2
 * @param {Object} game - The game instance
 * @param {Object} params - Action parameters
 * @param {number} params.actorId - The entity performing the action (optional, defaults to game.playerId)
 * @param {string} params.dialogue - The dialogue text to speak
 * @returns {Object} Action result with room context and listeners
 */
export default function speak(game, params) {
    const actorId = params.actorId ?? game.playerId
    const {dialogue} = params
    const {world} = game
    const {Ears, Attributes} = world.components
    
    // Check if actor has Attributes component
    if (!hasComponent(world, actorId, Attributes)) {
        return createActionEvent('speak', actorId, false, {
            error: "Cannot speak: entity lacks Attributes component"
        })
    }
    
    // Get actor's intelligence
    const attributes = getComponent(world, actorId, Attributes)
    const intelligence = attributes?.intelligence ?? 0
    
    if (intelligence < 2) {
        return createActionEvent('speak', actorId, false, {
            error: `Cannot speak: intelligence too low (${intelligence}, needs 2+)`
        })
    }
    
    // Find current room
    const currentRoom = findEntityRoom(world, actorId)
    
    if (!currentRoom) {
        return createActionEvent('speak', actorId, null, false, {
            error: "You are not in any room!"
        })
    }
    
    // Get all entities in the room
    const entities_in_room = getEntitiesInRoom(world, currentRoom)
    
    // Find entities with Ears (can hear), excluding the speaker
    const listeners = entities_in_room
        .filter(e => e !== actorId && hasComponent(world, e, Ears))
    
    // Format listener information
    const listenerNames = formatEntitiesDisplay(world, listeners)
    
    // Get room and speaker names
    const roomName = getEntityName(world, currentRoom)
    const speakerName = getEntityName(world, actorId) || 'Unknown'
    
    // Log detailed information to console
    console.log('\n=== DIALOGUE ===')
    console.log(`Room: ${roomName}`)
    console.log(`Speaker: ${speakerName} (ID: ${actorId})`)
    console.log(`Dialogue: "${dialogue}"`)
    console.log(`Listeners: ${listeners.length > 0 ? listenerNames.map(l => l.name).join(', ') : 'none'}`)
    console.log('================\n')
    
    return createActionEvent('speak', actorId, currentRoom, true, {
        dialogue,
        message: `You say: "${dialogue}"`
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
