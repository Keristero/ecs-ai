import {queueEvent} from './event_queue.mjs'
import {endPlayerTurn} from './helpers/player_turn_helper.mjs'

/**
 * Invoke a player action and queue the resulting event
 * Should be called from the API when a player performs an action
 */
export async function invokePlayerAction(game, actionFn, params) {
  if (!game.waitingForPlayerInput) {
    throw new Error('Not currently waiting for player input')
  }
  
  // Call the action
  const event = actionFn(game, params)
  
  // Queue the event (this will trigger all systems)
  await queueEvent(game.eventQueue, event)
  
  // End the player's turn
  await endPlayerTurn(game)
  
  return event
}
