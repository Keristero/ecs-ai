import { hasComponent } from 'bitecs'
import { create_system_event } from '../event_helpers.mjs'

// Player Turn System responsibilities:
// - On turn_start for a Player actor: wait for externally submitted action, timeout, or disconnect.
// - Emits system events for timeout/disconnect and always emits turn_end when resolved.
// - Does NOT execute the action itself (another system can translate action events to results).

function ctx(game) {
  if (!game.playerTurnCtx) game.playerTurnCtx = { waiters: new Map() }
  return game.playerTurnCtx
}

function waitFor(game, actorEid, { timeoutMs = 60000 } = {}) {
  const c = ctx(game)
  if (c.waiters.has(actorEid)) return c.waiters.get(actorEid).promise
  let resolved = false
  let timer
  const promise = new Promise(resolve => {
    timer = setTimeout(() => {
      if (resolved) return
      resolved = true
      c.waiters.delete(actorEid)
      resolve({ kind: 'timeout' })
    }, timeoutMs)
    c.waiters.set(actorEid, {
      resolve: (payload) => {
        if (resolved) return
        resolved = true
        clearTimeout(timer)
        c.waiters.delete(actorEid)
        resolve({ kind: 'action', payload })
      },
      disconnect: () => {
        if (resolved) return
        resolved = true
        clearTimeout(timer)
        c.waiters.delete(actorEid)
        resolve({ kind: 'disconnect' })
      },
      promise
    })
  })
  return promise
}

function submitPlayerAction(game, actorEid, actionObj) {
  const w = ctx(game).waiters.get(actorEid)
  if (w) w.resolve(actionObj)
}

function notifyPlayerDisconnect(game, actorEid) {
  const w = ctx(game).waiters.get(actorEid)
  if (w) w.disconnect()
}

const player_turn_system = async ({ game, event }) => {
  if (event.type !== 'round' || event.name !== 'round_info') return null
  const { world } = game
  const { Player } = world.components
  const actorEid = event.round.actor_eid
  if (!Player || !hasComponent(world, actorEid, Player)) return null

  ;(async () => {
    const result = await waitFor(game, actorEid, { timeoutMs: 60000 })
    // Map result categories to optional system events by returning arrays
    const events = []
    if (result.kind === 'disconnect') {
      events.push(create_system_event('actor_disconnected', `Player ${actorEid} disconnected`, 'player_turn', { actor_eid: actorEid }))
    } else if (result.kind === 'timeout') {
      events.push(create_system_event('turn_timeout', `Player ${actorEid} turn timed out`, 'player_turn', { actor_eid: actorEid }))
    }
    events.push(create_system_event('turn_complete', `Turn completed for actor ${actorEid}`, 'player_turn', { actor_eid: actorEid }))
    // Return array of events to enqueue
    return events
  })()

  return null
}

export { player_turn_system, submitPlayerAction, notifyPlayerDisconnect }
