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
