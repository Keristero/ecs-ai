import { query } from 'bitecs'
import { create_system_event } from '../event_helpers.mjs'

function ctx(game) {
  if (!game.turnContext) game.turnContext = { active: false, actors: [], index: -1, round: 0 }
  return game.turnContext
}

function computeActors(game) {
  const { world } = game
  const { Actor } = world.components
  if (!Actor) return []
  const arr = query(world, [Actor])
  return [...arr].sort((a, b) => Actor.initiative[b] - Actor.initiative[a])
}

function buildRoundInfo(game, { newRound }) {
  const c = ctx(game)
  const actor = c.actors[c.index] ?? null
  return create_system_event('round_info', `Round ${c.round}, Turn ${c.index}, Actor ${actor}`, 'turn_system', {
    actor_eid: actor,
    new_round: newRound,
    round_index: c.round,
    turn_index: c.index,
    total_actors: c.actors.length
  })
}

function advance(game) {
  const c = ctx(game)
  c.index++
  if (c.index >= c.actors.length) {
    // End current round and start new one automatically if actors exist
    c.round++
    c.actors = computeActors(game)
    c.index = 0
    if (c.actors.length === 0) {
      c.active = false
      return null
    }
    return buildRoundInfo(game, { newRound: true })
  }
  return buildRoundInfo(game, { newRound: false })
}

const turn_system = async ({ game, event }) => {
  const c = ctx(game)
  // Start first round once a player spawns (or any actor exists) and not active
  if (!c.active && event.type === 'system' && event.name === 'player_spawned') {
    c.active = true
    c.round = 0
    c.actors = computeActors(game)
    c.index = 0
    if (c.actors.length === 0) {
      c.active = false
      return null
    }
    return buildRoundInfo(game, { newRound: true })
  }

  if (!c.active) return null

  // React to a completed turn
  if (event.type === 'turn' && event.name === 'turn_complete') {
    // Validate actor matches current
    const actor = c.actors[c.index]
    if (event.turn?.actor_eid !== actor) {
      // Ignore out-of-order completions
      return null
    }
    return advance(game)
  }

  return null
}

export { turn_system }
