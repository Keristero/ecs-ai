import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { initialize_game } from '../../game_framework/framework.mjs'
import { setup_world } from '../../examples/text_adventure_logic/setup_world.mjs'
import { 
  createEventQueue,
  queueEvent,
  getCurrentActor
} from '../../examples/text_adventure_logic/event_queue.mjs'
import { query } from 'bitecs'

describe('Actor Turn System - Initialization', () => {
  let testGame, eventQueue

  beforeEach(async () => {
    // Create a fresh game for each test
    testGame = await initialize_game()
    testGame.entities = setup_world(testGame)
    testGame.playerId = testGame.entities.player
    eventQueue = createEventQueue(testGame)
    testGame.eventQueue = eventQueue
  })

  it('should create event queue with correct structure', () => {
    assert.ok(eventQueue, 'Event queue should exist')
    assert.ok(Array.isArray(eventQueue.events), 'Events should be an array')
    assert.ok(eventQueue.systems, 'Systems should be loaded')
    assert.ok(eventQueue.game, 'Game reference should exist')
    assert.equal(eventQueue.currentActorIndex, 0, 'Should start with actor index 0')
    assert.ok(Array.isArray(eventQueue.actors), 'Actors should be an array')
  })

  it('should have Actor component on all combatants', () => {
    const {world, entities} = testGame
    const {Actor} = world.components
    
    // Player should have Actor component
    assert.ok(Actor.initiative[entities.player] !== undefined, 'Player should have Actor component')
    assert.equal(Actor.initiative[entities.player], 10, 'Player should have initiative 10')
    
    // All enemies should have Actor component
    for (const enemy of entities.enemies) {
      assert.ok(Actor.initiative[enemy] !== undefined, `Enemy ${enemy} should have Actor component`)
      assert.ok(Actor.initiative[enemy] > 0, `Enemy ${enemy} should have positive initiative`)
    }
  })

  it('should sort actors by initiative correctly', () => {
    const {world} = testGame
    const {Actor} = world.components
    
    // Get all actors
    const actors = query(world, [Actor])
    const sortedActors = [...actors].sort((a, b) => {
      return Actor.initiative[b] - Actor.initiative[a]
    })
    
    // Should have 4 actors (1 player + 3 enemies)
    assert.equal(sortedActors.length, 4, 'Should have 4 actors')
    
    // Player (initiative 10) should be first
    assert.equal(sortedActors[0], testGame.entities.player, 'Player should be first')
    
    // Verify descending initiative order
    for (let i = 0; i < sortedActors.length - 1; i++) {
      const currentInit = Actor.initiative[sortedActors[i]]
      const nextInit = Actor.initiative[sortedActors[i + 1]]
      assert.ok(currentInit >= nextInit, 
        `Initiative should be descending: ${currentInit} >= ${nextInit}`)
    }
  })
})

describe('Actor Turn System - Event Queue', () => {
  let testGame, eventQueue

  beforeEach(async () => {
    testGame = await initialize_game()
    testGame.entities = setup_world(testGame)
    testGame.playerId = testGame.entities.player
    eventQueue = createEventQueue(testGame)
    testGame.eventQueue = eventQueue
  })

  it('should add GUID to queued events', async () => {
    const testEvent = {
      type: 'test',
      name: 'test_event',
      data: {}
    }
    
    // Store original systems and replace with empty object to avoid side effects
    const originalSystems = eventQueue.systems
    eventQueue.systems = {}
    
    await queueEvent(eventQueue, testEvent)
    
    assert.ok(testEvent.guid, 'Event should have a GUID')
    assert.equal(typeof testEvent.guid, 'string', 'GUID should be a string')
    assert.ok(testEvent.guid.length > 0, 'GUID should not be empty')
    
    // Restore original systems
    eventQueue.systems = originalSystems
  })

  it('should process events through systems', async () => {
    let systemCalled = false
    let receivedEvent = null
    
    // Create a test system
    const testSystem = async ({game, event}) => {
      systemCalled = true
      receivedEvent = event
      return null
    }
    
    eventQueue.systems = { test: testSystem }
    
    const testEvent = {
      type: 'test',
      name: 'test_event'
    }
    
    await queueEvent(eventQueue, testEvent)
    
    assert.ok(systemCalled, 'System should have been called')
    assert.ok(receivedEvent, 'System should have received event')
    assert.equal(receivedEvent.type, 'test', 'System should receive correct event type')
  })

  it('should propagate events returned by systems', async () => {
    const events = []
    
    // System that returns a new event
    const propagatingSystem = async ({game, event}) => {
      if (event.type === 'first') {
        return {
          type: 'second',
          name: 'propagated_event'
        }
      }
      if (event.type === 'second') {
        events.push(event)
      }
      return null
    }
    
    eventQueue.systems = { propagating: propagatingSystem }
    
    await queueEvent(eventQueue, {
      type: 'first',
      name: 'initial_event'
    })
    
    // The second event should have been queued and processed
    assert.equal(events.length, 1, 'Propagated event should have been processed')
    assert.equal(events[0].type, 'second', 'Propagated event should have correct type')
  })

  it('should not propagate turn_end events to systems', async () => {
    let turnEndProcessedBySystem = false
    
    const trackingSystem = async ({game, event}) => {
      if (event.type === 'turn' && event.name === 'turn_end') {
        turnEndProcessedBySystem = true
        // System tries to return event on turn_end
        return {
          type: 'should_not_propagate',
          name: 'illegal_event'
        }
      }
      return null
    }
    
    eventQueue.systems = { tracking: trackingSystem }
    
    await queueEvent(eventQueue, {
      type: 'turn',
      name: 'turn_end',
      turn: {
        actor_eid: testGame.entities.player
      }
    })
    
    // System should have been called (turn_end events still go to systems)
    // But returned events should not propagate
    assert.ok(turnEndProcessedBySystem, 'turn_end event should reach systems')
    
    // Check that no should_not_propagate event exists in the queue
    const illegalEvent = eventQueue.events.find(e => e.name === 'illegal_event')
    assert.ok(!illegalEvent, 'Events returned on turn_end should not propagate')
  })
})

describe('Actor Turn System - getCurrentActor', () => {
  let testGame, eventQueue

  beforeEach(async () => {
    testGame = await initialize_game()
    testGame.entities = setup_world(testGame)
    testGame.playerId = testGame.entities.player
    eventQueue = createEventQueue(testGame)
    testGame.eventQueue = eventQueue
  })

  it('should return undefined when no actors are set', () => {
    const currentActor = getCurrentActor(eventQueue)
    assert.equal(currentActor, undefined, 'Should return undefined with no actors')
  })

  it('should return current actor based on index', () => {
    const {world} = testGame
    const {Actor} = world.components
    
    // Manually set up actors
    const actors = query(world, [Actor])
    eventQueue.actors = [...actors].sort((a, b) => 
      Actor.initiative[b] - Actor.initiative[a]
    )
    eventQueue.currentActorIndex = 0
    
    const currentActor = getCurrentActor(eventQueue)
    assert.equal(currentActor, eventQueue.actors[0], 'Should return first actor')
    assert.equal(currentActor, testGame.entities.player, 'First actor should be player')
  })

  it('should track actor index correctly', () => {
    const {world} = testGame
    const {Actor} = world.components
    
    // Set up actors
    const actors = query(world, [Actor])
    eventQueue.actors = [...actors].sort((a, b) => 
      Actor.initiative[b] - Actor.initiative[a]
    )
    
    // Move through actors
    eventQueue.currentActorIndex = 0
    assert.equal(getCurrentActor(eventQueue), eventQueue.actors[0])
    
    eventQueue.currentActorIndex = 1
    assert.equal(getCurrentActor(eventQueue), eventQueue.actors[1])
    
    eventQueue.currentActorIndex = 2
    assert.equal(getCurrentActor(eventQueue), eventQueue.actors[2])
  })
})

describe('Actor Turn System - Player Turn System', () => {
  let testGame, eventQueue

  beforeEach(async () => {
    testGame = await initialize_game()
    testGame.entities = setup_world(testGame)
    testGame.playerId = testGame.entities.player
    eventQueue = createEventQueue(testGame)
    testGame.eventQueue = eventQueue
    testGame.waitingForPlayerInput = false
    testGame.currentPlayerTurn = null
  })

  it('should set waitingForPlayerInput flag on player turn_start', async () => {
    // Import the system module which exports both the system and helper function
    const playerTurnModule = await import('../../examples/text_adventure_logic/systems/player_turn_system.mjs')
    const player_turn_system = playerTurnModule.player_turn_system
    
    const result = await player_turn_system({
      game: testGame,
      event: {
        type: 'turn',
        name: 'turn_start',
        turn: {
          actor_eid: testGame.entities.player
        }
      }
    })
    
    assert.equal(testGame.waitingForPlayerInput, true, 'Should be waiting for player input')
    assert.equal(testGame.currentPlayerTurn, testGame.entities.player, 'Should track current player')
    assert.equal(result, null, 'System should return null (player action comes from client)')
  })

  it('should not set waitingForPlayerInput for non-player entities', async () => {
    const {player_turn_system} = await import('../../examples/text_adventure_logic/systems/player_turn_system.mjs')
    
    await player_turn_system({
      game: testGame,
      event: {
        type: 'turn',
        name: 'turn_start',
        turn: {
          actor_eid: testGame.entities.enemies[0]
        }
      }
    })
    
    assert.equal(testGame.waitingForPlayerInput, false, 'Should not be waiting for player input')
    assert.equal(testGame.currentPlayerTurn, null, 'Should not track non-player')
  })

  it('should only respond to turn_start events', async () => {
    const {player_turn_system} = await import('../../examples/text_adventure_logic/systems/player_turn_system.mjs')
    
    const result = await player_turn_system({
      game: testGame,
      event: {
        type: 'action',
        name: 'speak'
      }
    })
    
    assert.equal(result, null, 'Should return null for non-turn_start events')
    assert.equal(testGame.waitingForPlayerInput, false, 'Should not set flag for other events')
  })
})

describe('Actor Turn System - NPC Turn System', () => {
  let testGame, eventQueue

  beforeEach(async () => {
    testGame = await initialize_game()
    testGame.entities = setup_world(testGame)
    testGame.playerId = testGame.entities.player
    eventQueue = createEventQueue(testGame)
    testGame.eventQueue = eventQueue
  })

  it('should only respond to turn_start events for enemies', async () => {
    const {npc_turn_system} = await import('../../examples/text_adventure_logic/systems/npc_turn_system.mjs')
    
    // Test with non-turn event
    const result1 = await npc_turn_system({
      game: testGame,
      event: {
        type: 'action',
        name: 'speak'
      }
    })
    
    assert.equal(result1, null, 'Should return null for non-turn events')
    
    // Test with player turn_start
    const result2 = await npc_turn_system({
      game: testGame,
      event: {
        type: 'turn',
        name: 'turn_start',
        turn: {
          actor_eid: testGame.entities.player
        }
      }
    })
    
    assert.equal(result2, null, 'Should return null for player turns')
  })

  it('should recognize enemy entities', async () => {
    const {world, entities} = testGame
    const {Enemy} = world.components
    
    // Enemy is a tag component (empty object), so we need to check using query
    const { query } = await import('bitecs')
    const enemiesInWorld = query(world, [Enemy])
    
    // Verify test setup - enemies should be queryable with Enemy component
    for (const enemy of entities.enemies) {
      assert.ok(enemiesInWorld.includes(enemy), `Entity ${enemy} should be an enemy`)
    }
    
    // Player should not have Enemy component
    assert.ok(!enemiesInWorld.includes(entities.player), 'Player should not have Enemy component')
  })
})
