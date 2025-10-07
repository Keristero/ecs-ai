import {query} from 'bitecs'

const player_turn_system = ({game, event}) => {
  if (event.type !== 'turn' || event.name !== 'turn_start') return null
  
  const {world} = game
  const {Player} = world.components
  const actorEid = event.turn.actor_eid
  
  if (!Player[actorEid]) return null
  
  // Player turn handling - wait for client input
  // This will be implemented when we add the websocket API
  
  return null
}

export {player_turn_system}
