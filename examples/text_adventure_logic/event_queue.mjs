import {query} from 'bitecs'
import crypto from 'crypto'
import {EventEmitter} from 'events'
import Logger from '../../logger.mjs'

const logger = new Logger('EventQueue', 'cyan')

// Helper to get round state snapshot
export function getRoundStateSnapshot(queue) {
  const {game} = queue
  const currentActorEid = getCurrentActor(queue)
  
  // Build systems resolved status
  const systemsResolved = {}
  const systemNames = Object.keys(queue.systems)
  for (const systemName of systemNames) {
    systemsResolved[systemName] = queue.systemsResolved?.get(systemName) || false
  }
  
  return {
    playerId: game.playerId,
    currentActorEid: currentActorEid,
    events: queue.events,
    systemsResolved: systemsResolved
  }
}

export function createEventQueue(game) {
  const systems = game.world.systems || {}
  const emitter = new EventEmitter()
  
  return {
    events: [],
    systems,
    game,
    currentActorIndex: 0,
    actors: [],
    systemsResolved: new Map(), // Track which systems have resolved this turn
    emitter, // Event emitter for subscribing to events
    
    // Convenience methods for subscribing
    on: (eventName, listener) => emitter.on(eventName, listener),
    once: (eventName, listener) => emitter.once(eventName, listener),
    off: (eventName, listener) => emitter.off(eventName, listener),
    emit: (eventName, ...args) => emitter.emit(eventName, ...args)
  }
}

export async function queueEvent(queue, event) {
  // Only generate a GUID if the event doesn't already have one
  if (!event.guid) {
    event.guid = crypto.randomUUID()
  }
  
  // Log the event being queued
  logger.info(`Queuing event: ${event.type}:${event.name}`, {
    guid: event.guid,
    actor: event.turn?.actor_eid || event.action?.actor_eid,
    details: event.action?.details || event.system?.details || {}
  })
  
  queue.events.push(event)
  
  // Emit the event for subscribers (like WebSocket broadcasting)
  queue.emit('event', event)
  
  // Get system names for tracking
  const systemNames = Object.keys(queue.systems)
  const systemFunctions = Object.values(queue.systems)
  
  const systemResults = await Promise.all(
    systemFunctions.map(async (system, index) => {
      const result = await system({game: queue.game, event})
      // Mark this system as resolved
      queue.systemsResolved.set(systemNames[index], true)
      return result
    })
  )

  // Turn end events can't be responded to with another event (per spec)
  if (event.type === 'turn' && event.name === 'turn_end') {
    return
  }
  
  for (const result of systemResults) {
    if (result) {
      await queueEvent(queue, result)
    }
  }
}

function getActors(game) {
  const {world} = game
  const actors = query(world, [world.components.Actor])
  return [...actors].sort((a, b) => {
    const {Actor} = world.components
    return Actor.initiative[b] - Actor.initiative[a]
  })
}

export async function startRound(queue) {
  queue.actors = getActors(queue.game)
  queue.currentActorIndex = 0
  
  await queueEvent(queue, {
    type: 'round',
    name: 'round_start'
  })
  
  // Emit round state update
  const roundState = getRoundStateSnapshot(queue)
  queue.emit('round_state', roundState)
  
  if (queue.actors.length > 0) {
    await startTurn(queue)
  }
}

export async function startTurn(queue) {
  const actor = queue.actors[queue.currentActorIndex]
  
  // Reset system resolution tracking for new turn
  queue.systemsResolved.clear()
  
  await queueEvent(queue, {
    type: 'turn',
    name: 'turn_start',
    turn: {
      actor_eid: actor
    }
  })
  
  // Emit round state update
  const roundState = getRoundStateSnapshot(queue)
  queue.emit('round_state', roundState)
}

export async function endTurn(queue) {
  await queueEvent(queue, {
    type: 'turn',
    name: 'turn_end',
    turn: {
      actor_eid: queue.actors[queue.currentActorIndex]
    }
  })
  
  queue.currentActorIndex++
  
  if (queue.currentActorIndex < queue.actors.length) {
    await startTurn(queue)
  } else {
    await endRound(queue)
  }
  
  // Emit round state update
  const roundState = getRoundStateSnapshot(queue)
  queue.emit('round_state', roundState)
}

export async function endRound(queue) {
  await queueEvent(queue, {
    type: 'round',
    name: 'round_end'
  })
  
  queue.events = []
  
  // Emit round state update
  const roundState = getRoundStateSnapshot(queue)
  queue.emit('round_state', roundState)
}

export function getCurrentActor(queue) {
  return queue.actors[queue.currentActorIndex]
}
