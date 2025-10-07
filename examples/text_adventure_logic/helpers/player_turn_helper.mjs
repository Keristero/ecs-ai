import {endTurn} from '../event_queue.mjs'

/**
 * Function to be called when player action completes
 * This ends the player's turn and progresses to the next actor
 * @param {Object} game - The game instance
 */
export async function endPlayerTurn(game) {
  game.waitingForPlayerInput = false
  game.currentPlayerTurn = null
  await endTurn(game.eventQueue)
}
