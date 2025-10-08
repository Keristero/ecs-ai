import {query, hasComponent} from 'bitecs'

const player_turn_system = async ({game, event}) => {
  if (event.type !== 'turn' || event.name !== 'turn_start') return null
  
  const {world} = game
  const {Player} = world.components
  const actorEid = event.turn.actor_eid
  
  if (!hasComponent(world, actorEid, Player)) return null

  // In test mode we don't block the event loop waiting for client input.
  // This allows automated tests to advance immediately after a turn_start.
  if (game.testMode) {
    // Immediately emit synthetic turn_end to advance if desired
    return [{
      type: 'turn',
      name: 'turn_end',
      turn: { actor_eid: actorEid, reason: 'test_mode_auto_advance' }
    }]
  }
  
  // Emit turn_start event for the client
  const turnStartEvent = {
    type: 'turn_start',
    turn_start: {
      playerId: actorEid,
      message: `It's your turn!`
    }
  };
  
  // Initialize pending actions map if it doesn't exist
  if (!game.pendingPlayerActions) {
    game.pendingPlayerActions = new Map();
  }
  
  // Wait for player action with timeout
  const timeout = 60000; // 60 seconds
  const minWait = 10000; // 10 seconds minimum
  const startTime = Date.now();
  const checkInterval = 100; // Check every 100ms
  
  while (Date.now() - startTime < timeout) {
    const elapsed = Date.now() - startTime;
    
    // Check if we have a pending action for this player
    if (game.pendingPlayerActions.has(actorEid)) {
      // Ensure minimum wait time has passed
      if (elapsed < minWait) {
        await new Promise(resolve => setTimeout(resolve, minWait - elapsed));
      }
      
      const action = game.pendingPlayerActions.get(actorEid);
      game.pendingPlayerActions.delete(actorEid);
      
      // Emit turn_end event
      const turnEndEvent = {
        type: 'turn_end',
        turn_end: {
          playerId: actorEid
        }
      };
      
      // Return the action to be processed and the events
      return [
        turnStartEvent,
        {
          type: 'player_action',
          player_action: {
            playerId: actorEid,
            action: action
          }
        },
        turnEndEvent
      ];
    }
    
    // Wait before checking again
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  // Timeout - skip turn but ensure minimum wait time
  const elapsed = Date.now() - startTime;
  if (elapsed < minWait) {
    await new Promise(resolve => setTimeout(resolve, minWait - elapsed));
  }
  
  return [
    turnStartEvent,
    {
      type: 'turn_end',
      turn_end: {
        playerId: actorEid,
        reason: 'timeout'
      }
    }
  ];
}

export {player_turn_system}
