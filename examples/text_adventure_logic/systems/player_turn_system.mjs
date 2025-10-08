import { hasComponent } from 'bitecs'
import { waitForActorAction, endTurn, queueEvent } from '../event_queue.mjs'
import { action_defs } from '../../../game_framework/actions_interface.mjs'

// Player turn system now intentionally minimal:
// - For real gameplay: does nothing (the original turn_start event is already broadcast)
// - For test mode: immediately emits a synthetic turn_end to advance automation
const player_turn_system = async ({ game, event }) => {
  if (event.type !== 'turn' || event.name !== 'turn_start') return null
  const { world } = game
  const { Player } = world.components
  const actorEid = event.turn.actor_eid
  if (!hasComponent(world, actorEid, Player)) return null

  if (game.testMode) {
    return { type: 'turn', name: 'turn_end', turn: { actor_eid: actorEid, reason: 'test_mode_auto_advance' } }
  }

  // Wait for player action, disconnect, or timeout
  ;(async () => {
    const result = await waitForActorAction(game.eventQueue, actorEid, { timeoutMs: 60000 })
    if (result.type === 'action') {
      const actionObj = result.payload
      const actionName = actionObj.type
      const def = action_defs[actionName]
      if (def) {
        try {
          const event = await def.run({ game, actorId: actorEid, ...actionObj })
          if (event) await queueEvent(game.eventQueue, event)
        } catch (e) {
          await queueEvent(game.eventQueue, {
            type: 'system',
            name: 'action_error',
            system: { system_name: 'player_turn', details: { message: e.message } }
          })
        }
      } else {
        await queueEvent(game.eventQueue, {
          type: 'system',
          name: 'unknown_action',
          system: { system_name: 'player_turn', details: { action: actionName } }
        })
      }
    } else if (result.type === 'disconnect') {
      await queueEvent(game.eventQueue, {
        type: 'system',
        name: 'actor_disconnected',
        system: { system_name: 'player_turn', details: { actor_eid: actorEid } }
      })
    } else if (result.type === 'timeout') {
      await queueEvent(game.eventQueue, {
        type: 'system',
        name: 'turn_timeout',
        system: { system_name: 'player_turn', details: { actor_eid: actorEid } }
      })
    }
    await endTurn(game.eventQueue)
  })()

  return null
}

export { player_turn_system }
