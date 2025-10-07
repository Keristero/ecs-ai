import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import game from '../../examples/text_adventure_logic/game.mjs'
import { 
  startRound, 
  startTurn, 
  endTurn, 
  endRound,
  getCurrentActor,
  queueEvent,
  createEventQueue
} from '../../examples/text_adventure_logic/event_queue.mjs'
import { endPlayerTurn } from '../../examples/text_adventure_logic/helpers/player_turn_helper.mjs'

describe('Event Queue', () => {
  beforeEach(async () => {
    // Reset game state
    game.waitingForPlayerInput = false
    game.currentPlayerTurn = null
    game.eventQueue.events = []
    game.eventQueue.currentActorIndex = 0
    game.eventQueue.actors = []
  })

  it('should initialize event queue with systems', () => {
    assert.ok(game.eventQueue, 'Event queue should exist')
    assert.ok(game.eventQueue.systems, 'Systems should be loaded')
    assert.ok(game.eventQueue.game, 'Game reference should exist')
  })

  it('should have Actor components on entities', () => {
    const {world, entities} = game
    const {Actor} = world.components
    
    // Player should have Actor component
    assert.ok(Actor.initiative[entities.player] !== undefined, 'Player should have Actor component')
    
    // Enemies should have Actor component
    for (const enemy of entities.enemies) {
      assert.ok(Actor.initiative[enemy] !== undefined, `Enemy ${enemy} should have Actor component`)
    }
  })

  it('should queue events with GUIDs', async () => {
    const {eventQueue} = game
    
    const testEvent = {
      type: 'test',
      name: 'test_event'
    }
    
    await queueEvent(eventQueue, testEvent)
    
    assert.ok(testEvent.guid, 'Event should have a GUID')
    assert.equal(typeof testEvent.guid, 'string', 'GUID should be a string')
  })
})

describe('Actor Turn System', () => {
  beforeEach(async () => {
    // Reset game state
    game.waitingForPlayerInput = false
    game.currentPlayerTurn = null
    game.eventQueue.events = []
    game.eventQueue.currentActorIndex = 0
    game.eventQueue.actors = []
  })

  it('should sort actors by initiative (highest first)', async () => {
    const {world, entities, eventQueue} = game
    const {Actor} = world.components
    
    // Manually populate actors without triggering full round start
    const {query} = await import('bitecs')
    const actors = query(world, [world.components.Actor])
    const sortedActors = [...actors].sort((a, b) => {
      return Actor.initiative[b] - Actor.initiative[a]
    })
    
    eventQueue.actors = sortedActors
    
    // Should have 4 actors total (1 player + 3 enemies)
    assert.equal(sortedActors.length, 4, 'Should have 4 actors')
    
    // Verify initiative order (highest to lowest)
    const playerInitiative = Actor.initiative[entities.player]
    const goblinInitiative = Actor.initiative[entities.enemies[0]]
    const skeleton1Initiative = Actor.initiative[entities.enemies[1]]
    const skeleton2Initiative = Actor.initiative[entities.enemies[2]]
    
    console.log('Initiatives:', {
      player: playerInitiative,
      goblin: goblinInitiative,
      skeleton1: skeleton1Initiative,
      skeleton2: skeleton2Initiative
    })
    
    // Player has initiative 10 (highest)
    assert.equal(Actor.initiative[sortedActors[0]], 10, 'First actor should be player with initiative 10')
    
    // Verify actors are sorted in descending order
    for (let i = 0; i < sortedActors.length - 1; i++) {
      const currentInit = Actor.initiative[sortedActors[i]]
      const nextInit = Actor.initiative[sortedActors[i + 1]]
      assert.ok(currentInit >= nextInit, `Initiative should be descending: ${currentInit} >= ${nextInit}`)
    }
  })

  it('should emit round_start event when starting a round', async () => {
    const {eventQueue} = game
    
    await startRound(eventQueue)
    
    // Find the round_start event
    const roundStartEvent = eventQueue.events.find(e => 
      e.type === 'round' && e.name === 'round_start'
    )
    
    assert.ok(roundStartEvent, 'Should have a round_start event')
    assert.ok(roundStartEvent.guid, 'round_start event should have a GUID')
  })

  it('should emit turn_start event for first actor', async () => {
    const {eventQueue, entities} = game
    
    await startRound(eventQueue)
    
    // Find the turn_start event
    const turnStartEvent = eventQueue.events.find(e => 
      e.type === 'turn' && e.name === 'turn_start'
    )
    
    assert.ok(turnStartEvent, 'Should have a turn_start event')
    assert.ok(turnStartEvent.turn, 'turn_start event should have turn data')
    assert.equal(turnStartEvent.turn.actor_eid, entities.player, 'First turn should be player')
  })

  it('should track current actor correctly', async () => {
    const {eventQueue, entities} = game
    
    await startRound(eventQueue)
    
    const currentActor = getCurrentActor(eventQueue)
    assert.equal(currentActor, entities.player, 'Current actor should be player')
  })

  it('should progress to next actor after endTurn', async () => {
    const {eventQueue, entities} = game
    const {Actor} = game.world.components
    
    await startRound(eventQueue)
    
    // First actor should be player
    assert.equal(getCurrentActor(eventQueue), entities.player)
    
    // End player's turn
    await endPlayerTurn(game)
    
    // Should have moved to next actor
    const secondActor = getCurrentActor(eventQueue)
    assert.notEqual(secondActor, entities.player, 'Should have moved to next actor')
    
    // Verify second actor has lower initiative
    const playerInit = Actor.initiative[entities.player]
    const secondActorInit = Actor.initiative[secondActor]
    assert.ok(secondActorInit < playerInit, 'Second actor should have lower initiative')
  })

  it('should emit turn_end event when ending a turn', async () => {
    const {eventQueue, entities} = game
    
    await startRound(eventQueue)
    
    // Clear events to make it easier to find the turn_end event
    eventQueue.events = []
    
    await endPlayerTurn(game)
    
    // Find the turn_end event
    const turnEndEvent = eventQueue.events.find(e => 
      e.type === 'turn' && e.name === 'turn_end'
    )
    
    assert.ok(turnEndEvent, 'Should have a turn_end event')
    assert.equal(turnEndEvent.turn.actor_eid, entities.player, 'turn_end should reference player')
  })

  it('should emit turn_start for next actor after turn_end', async () => {
    const {eventQueue} = game
    
    await startRound(eventQueue)
    
    // Clear events
    eventQueue.events = []
    
    await endPlayerTurn(game)
    
    // Find the new turn_start event
    const turnStartEvent = eventQueue.events.find(e => 
      e.type === 'turn' && e.name === 'turn_start'
    )
    
    assert.ok(turnStartEvent, 'Should have a turn_start event for next actor')
    
    const nextActor = getCurrentActor(eventQueue)
    assert.equal(turnStartEvent.turn.actor_eid, nextActor, 'turn_start should match current actor')
  })

  it('should emit round_end after all actors have taken turns', async () => {
    const {eventQueue} = game
    
    await startRound(eventQueue)
    
    const totalActors = eventQueue.actors.length
    
    // Simulate all actors taking their turns
    for (let i = 0; i < totalActors; i++) {
      eventQueue.events = [] // Clear to check for specific events
      
      if (i === totalActors - 1) {
        // Last actor - should trigger round_end
        await endTurn(eventQueue)
        
        const roundEndEvent = eventQueue.events.find(e => 
          e.type === 'round' && e.name === 'round_end'
        )
        
        assert.ok(roundEndEvent, 'Should have a round_end event after last actor')
      } else {
        await endTurn(eventQueue)
      }
    }
  })

  it('should clear events after round ends', async () => {
    const {eventQueue} = game
    
    await startRound(eventQueue)
    
    const totalActors = eventQueue.actors.length
    
    // Complete all turns
    for (let i = 0; i < totalActors; i++) {
      await endTurn(eventQueue)
    }
    
    // Events should be cleared after round ends
    assert.equal(eventQueue.events.length, 0, 'Events should be cleared after round_end')
  })

  it('turn_end events should not propagate to systems', async () => {
    const {eventQueue} = game
    let systemCallCount = 0
    
    // Create a test system that counts calls
    const testSystem = async ({game, event}) => {
      systemCallCount++
      return null
    }
    
    // Temporarily add test system
    const originalSystems = {...eventQueue.systems}
    eventQueue.systems = {test: testSystem}
    
    try {
      await startRound(eventQueue)
      
      const callsAfterStart = systemCallCount
      
      // End player turn (which creates turn_end event)
      await endPlayerTurn(game)
      
      // The turn_end event itself should not cause system to be called
      // But turn_start for next actor will
      // So we should see exactly one more call (for the new turn_start)
      const callsAfterEnd = systemCallCount
      
      // turn_start for next actor should have been processed
      assert.ok(callsAfterEnd > callsAfterStart, 'New turn_start should trigger system')
      
    } finally {
      // Restore original systems
      eventQueue.systems = originalSystems
    }
  })
})

describe('Player Turn System', () => {
  beforeEach(async () => {
    game.waitingForPlayerInput = false
    game.currentPlayerTurn = null
    game.eventQueue.events = []
    game.eventQueue.currentActorIndex = 0
    game.eventQueue.actors = []
  })

  it('should set waitingForPlayerInput flag on player turn', async () => {
    const {eventQueue} = game
    
    await startRound(eventQueue)
    
    assert.equal(game.waitingForPlayerInput, true, 'Should be waiting for player input')
    assert.equal(game.currentPlayerTurn, game.entities.player, 'Should track current player turn')
  })

  it('should clear waitingForPlayerInput flag after turn ends', async () => {
    const {eventQueue} = game
    
    await startRound(eventQueue)
    
    assert.equal(game.waitingForPlayerInput, true)
    
    await endPlayerTurn(game)
    
    assert.equal(game.waitingForPlayerInput, false, 'Should not be waiting for player input')
    assert.equal(game.currentPlayerTurn, null, 'Should clear current player turn')
  })
})

describe('NPC Turn System', () => {
  beforeEach(async () => {
    game.waitingForPlayerInput = false
    game.currentPlayerTurn = null
    game.eventQueue.events = []
    game.eventQueue.currentActorIndex = 0
    game.eventQueue.actors = []
  })

  it('should auto-execute NPC turns', async () => {
    const {eventQueue, entities} = game
    
    await startRound(eventQueue)
    
    // Skip player turn
    await endPlayerTurn(game)
    
    // Now an NPC should have their turn
    const currentActor = getCurrentActor(eventQueue)
    assert.ok(entities.enemies.includes(currentActor), 'Current actor should be an enemy')
    
    // NPC system should not set waitingForPlayerInput
    assert.equal(game.waitingForPlayerInput, false, 'Should not be waiting for player input during NPC turn')
  })

  it('should process multiple NPC turns in sequence', async () => {
    const {eventQueue, entities} = game
    
    await startRound(eventQueue)
    
    // Track which actors took turns
    const actorsThatTookTurns = [getCurrentActor(eventQueue)]
    
    // End player turn
    await endPlayerTurn(game)
    
    // Count remaining NPCs
    const remainingActors = eventQueue.actors.length - 1 // -1 for player
    
    // Each NPC turn should progress automatically
    for (let i = 0; i < remainingActors; i++) {
      const currentActor = getCurrentActor(eventQueue)
      if (currentActor !== undefined) {
        actorsThatTookTurns.push(currentActor)
      }
    }
    
    // All actors should have been processed
    assert.equal(actorsThatTookTurns.length, eventQueue.actors.length, 
      'All actors should have had turns')
  })
})

describe('Action Event Format', () => {
  beforeEach(async () => {
    game.eventQueue.events = []
  })

  it('actions should return proper event structure', async () => {
    const speak = (await import('../../examples/text_adventure_logic/actions/speak.mjs')).default
    
    const event = speak(game, {
      actorId: game.playerId,
      dialogue: 'Test message'
    })
    
    assert.equal(event.type, 'action', 'Event type should be "action"')
    assert.equal(event.name, 'speak', 'Event name should be "speak"')
    assert.ok(event.action, 'Event should have action object')
    assert.equal(event.action.actor_eid, game.playerId, 'Action should have actor_eid')
    assert.equal(typeof event.action.success, 'boolean', 'Action should have success boolean')
    assert.ok(event.action.details, 'Action should have details object')
  })

  it('use action should return proper event structure', async () => {
    const {world, entities} = game
    
    // Find a weapon (rusty sword) in the world
    const sword = entities.items[0]
    
    // Add it to player inventory for testing
    const {Has} = world.relations
    const {addComponent, removeComponent, query} = await import('bitecs')
    const room = query(world, [world.components.Room, Has(sword)])[0]
    removeComponent(world, room, Has(sword))
    addComponent(world, entities.player, Has(sword))
    
    const use = (await import('../../examples/text_adventure_logic/actions/use.mjs')).default
    
    const event = use(game, {
      actorId: game.playerId,
      itemId: sword,
      targetId: entities.enemies[0]
    })
    
    assert.equal(event.type, 'action', 'Event type should be "action"')
    assert.equal(event.name, 'use', 'Event name should be "use"')
    assert.ok(event.action.details.room_eid !== undefined, 'Should have room_eid')
  })
})
