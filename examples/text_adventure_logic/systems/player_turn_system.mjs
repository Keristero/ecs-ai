import {query} from 'bitecs'
import {endTurn} from '../event_queue.mjs'

const player_turn_system = async ({game, event}) => {
  if (event.type !== 'turn' || event.name !== 'turn_start') return null
  
  const {world} = game
  const {Player} = world.components
  const actorEid = event.turn.actor_eid
  
  if (!Player[actorEid]) return null
  
  // Player turn - store that we're waiting for player input
  game.waitingForPlayerInput = true
  game.currentPlayerTurn = actorEid
  
  // The actual action will be invoked from the API/client
  // When an action completes, it should call endPlayerTurn
  
  return null
}

// Function to be called when player action completes
export async function endPlayerTurn(game) {
  game.waitingForPlayerInput = false
  game.currentPlayerTurn = null
  await endTurn(game.eventQueue)
}

export {player_turn_system}
