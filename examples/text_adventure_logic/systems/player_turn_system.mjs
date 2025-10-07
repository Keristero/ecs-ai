import {query, hasComponent} from 'bitecs'

const player_turn_system = async ({game, event}) => {
  if (event.type !== 'turn' || event.name !== 'turn_start') return null
  
  const {world} = game
  const {Player} = world.components
  const actorEid = event.turn.actor_eid
  
  if (!hasComponent(world, actorEid, Player)) return null
  
  // Player turn - store that we're waiting for player input
  game.waitingForPlayerInput = true
  game.currentPlayerTurn = actorEid
  
  // The actual action will be invoked from the API/client
  // When an action completes, it should call endPlayerTurn from helpers/player_turn_helper.mjs
  
  return null
}

export {player_turn_system}
