import {z} from 'zod'
import {findEntityRoom} from '../helpers.mjs'
import {createActionEvent} from '../action_helpers.mjs'

/**
 * Get game info action - returns game state information
 * @param {Object} game - The game instance
 * @param {Object} params - Action parameters (none required)
 * @returns {Object} Game information including player ID
 */
export default function gameinfo(game, params) {
    const actorId = params.actorId ?? game.playerId
    const roomEid = findEntityRoom(game.world, actorId)
    
    return createActionEvent('gameinfo', actorId, roomEid, true, {
        player_eid: game.playerId,
        player_exists: game.playerId !== undefined,
        message: `Player entity ID: ${game.playerId}`
    })
}

// Action metadata for dynamic command generation and autocomplete
export const metadata = {
    name: 'gameinfo',
    aliases: ['info', 'status'],
    description: 'Get game state information',
    parameters: [], // No parameters
    autocompletes: [], // No autocomplete needed
    inputSchema: z.object({})
}
