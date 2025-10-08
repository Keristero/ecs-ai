import { query, hasComponent } from 'bitecs'
import { queueEvent } from '../event_queue.mjs'
import { action_defs } from '../../../game_framework/actions_interface.mjs'
import Logger from '../../../logger.mjs'

const logger = new Logger('TurnSystem','green')

// The turn system centralizes:
// - actor initiative ordering per round
// - emitting round_start / turn_start / turn_end / round_end events
// - awaiting player input / handling NPC auto resolution
// - timeout + disconnect handling
// It is intentionally decoupled from the event queue (which only dispatches events)

export function createTurnSystem(game, { playerActionTimeoutMs = 60000 } = {}) {
  const state = {
    actors: [],
    currentIndex: -1,
    waiting: new Map(), // actorEid -> waiter record { resolve, timer }
    active: false
  }

  function getActors() {
    const { world } = game
    if (!world?.components?.Actor) return []
    const arr = query(world, [world.components.Actor])
    const { Actor } = world.components
    return [...arr].sort((a, b) => Actor.initiative[b] - Actor.initiative[a])
  }

  async function startRound() {
    state.actors = getActors()
    state.currentIndex = -1
    state.active = true
    await queueEvent(game.eventQueue, { type: 'round', name: 'round_start' })
    await nextTurn()
  }

  async function endRound() {
    await queueEvent(game.eventQueue, { type: 'round', name: 'round_end' })
    state.active = false
  }

  async function nextTurn() {
    state.currentIndex++
    if (state.currentIndex >= state.actors.length) {
      await endRound()
      return
    }
    const actor = state.actors[state.currentIndex]
    await queueEvent(game.eventQueue, { type: 'turn', name: 'turn_start', turn: { actor_eid: actor } })
    await resolveTurn(actor)
  }

  function waitForPlayerAction(actorEid) {
    if (state.waiting.has(actorEid)) return state.waiting.get(actorEid).promise
    let resolved = false
    let timer
    const promise = new Promise(resolve => {
      timer = setTimeout(() => {
        if (resolved) return
        resolved = true
        state.waiting.delete(actorEid)
        resolve({ kind: 'timeout' })
      }, playerActionTimeoutMs)
      state.waiting.set(actorEid, {
        resolve: (payload) => {
          if (resolved) return
          resolved = true
          clearTimeout(timer)
          state.waiting.delete(actorEid)
          resolve({ kind: 'action', payload })
        },
        disconnect: () => {
          if (resolved) return
            resolved = true
            clearTimeout(timer)
            state.waiting.delete(actorEid)
            resolve({ kind: 'disconnect' })
        },
        promise
      })
    })
    return promise
  }

  async function resolveTurn(actorEid) {
    const { world } = game
    const { Player, Enemy } = world.components

    // Player-controlled actor -> await external action
    if (Player && hasComponent(world, actorEid, Player)) {
      const result = await waitForPlayerAction(actorEid)
      if (result.kind === 'action') {
        await runAction(actorEid, result.payload)
      } else if (result.kind === 'disconnect') {
        await queueEvent(game.eventQueue, { type: 'system', name: 'actor_disconnected', system: { system_name: 'turn_system', details: { actor_eid: actorEid } } })
      } else if (result.kind === 'timeout') {
        await queueEvent(game.eventQueue, { type: 'system', name: 'turn_timeout', system: { system_name: 'turn_system', details: { actor_eid: actorEid } } })
      }
      await endTurn(actorEid)
      return
    }

    // NPC actor -> run simple placeholder or allow existing npc_turn_system to react via turn_start
    if (Enemy && hasComponent(world, actorEid, Enemy)) {
      // Let other systems (npc_turn_system) act on turn_start; we just end turn after a microtask
      queueMicrotask(async () => {
        await endTurn(actorEid)
      })
      return
    }

    // Default: just end turn
    await endTurn(actorEid)
  }

  async function runAction(actorEid, actionObj) {
    const actionName = actionObj.type
    const def = action_defs[actionName]
    if (!def) {
      await queueEvent(game.eventQueue, { type: 'system', name: 'unknown_action', system: { system_name: 'turn_system', details: { action: actionName } } })
      return
    }
    try {
      const evt = await def.run({ game, actorId: actorEid, ...actionObj })
      if (evt) await queueEvent(game.eventQueue, evt)
    } catch (e) {
      await queueEvent(game.eventQueue, { type: 'system', name: 'action_error', system: { system_name: 'turn_system', details: { message: e.message, action: actionName } } })
    }
  }

  async function endTurn(actorEid) {
    await queueEvent(game.eventQueue, { type: 'turn', name: 'turn_end', turn: { actor_eid: actorEid } })
    await nextTurn()
  }

  function submitPlayerAction(actorEid, actionObj) {
    const waiter = state.waiting.get(actorEid)
    if (waiter) waiter.resolve(actionObj)
  }

  function notifyDisconnect(actorEid) {
    const waiter = state.waiting.get(actorEid)
    if (waiter) waiter.disconnect()
  }

  return {
    startRound,
    submitPlayerAction,
    notifyDisconnect,
    isActive: () => state.active,
    getCurrentActor: () => state.actors[state.currentIndex],
    getActors: () => [...state.actors]
  }
}

export default createTurnSystem
