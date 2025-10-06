import {z} from 'zod'

/**
 * Get game info action - returns game state information
 * @param {Object} game - The game instance
 * @param {Object} params - Action parameters (none required)
 * @returns {Object} Game information including player ID
 */
export default function gameinfo(game, params) {
    return {
        success: true,
        playerId: game.playerId,
        playerExists: game.playerId !== undefined,
        message: `Player entity ID: ${game.playerId}`
    }
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
