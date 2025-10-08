import crypto from 'crypto'
import {EventEmitter} from 'events'
import Logger from '../../logger.mjs'

const logger = new Logger('EventQueue', 'cyan')

export function createEventQueue(game) {
  const systems = game.world.systems || {}
  const emitter = new EventEmitter()
  if (typeof game.testMode === 'undefined') {
    const envFlag = process.env.GAME_TEST_MODE || process.env.NODE_ENV
    game.testMode = envFlag === 'test'
  }
  return {
    events: [], // chronological list of events (can be trimmed by higher-level orchestrators)
    systems,
    game,
    systemsResolved: new Map(), // per-event system resolution tracking (generic, not turn-specific)
    emitter,
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
      queue.systemsResolved.set(systemNames[index], true)
      return result
    })
  )
  
  for (const result of systemResults) {
    if (!result) continue
    // Support systems returning an array of events
    if (Array.isArray(result)) {
      for (const subEvent of result) {
        if (subEvent) {
          await queueEvent(queue, subEvent)
        }
      }
    } else {
      await queueEvent(queue, result)
    }
  }
}
// Note: All turn / round / player waiting logic has been moved to a dedicated
// turn_system. This queue now focuses solely on dispatching events to systems
// and recursively enqueuing any resulting events.
