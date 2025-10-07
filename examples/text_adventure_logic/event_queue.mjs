import {query} from 'bitecs'
import crypto from 'crypto'

export function createEventQueue(game) {
  const systems = game.world.systems || {}
  
  return {
    events: [],
    systems,
    game,
    currentActorIndex: 0,
    actors: []
  }
}

export async function queueEvent(queue, event) {
  event.guid = crypto.randomUUID()
  queue.events.push(event)
  
  const systemResults = await Promise.all(
    Object.values(queue.systems).map(system => 
      system({game: queue.game, event})
    )
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
  
  if (queue.actors.length > 0) {
    await startTurn(queue)
  }
}

export async function startTurn(queue) {
  const actor = queue.actors[queue.currentActorIndex]
  
  await queueEvent(queue, {
    type: 'turn',
    name: 'turn_start',
    turn: {
      actor_eid: actor
    }
  })
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
}

export async function endRound(queue) {
  await queueEvent(queue, {
    type: 'round',
    name: 'round_end'
  })
  
  queue.events = []
}

export function getCurrentActor(queue) {
  return queue.actors[queue.currentActorIndex]
}
