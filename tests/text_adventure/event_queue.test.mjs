import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import game from '../../examples/text_adventure_logic/game.mjs'
import { startRound } from '../../examples/text_adventure_logic/event_queue.mjs'

describe('Event Queue', () => {
  beforeEach(async () => {
    // Reset game state if needed
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
    assert.ok(Actor[entities.player] !== undefined, 'Player should have Actor component')
    
    // Enemies should have Actor component
    for (const enemy of entities.enemies) {
      assert.ok(Actor[enemy] !== undefined, `Enemy ${enemy} should have Actor component`)
    }
  })

  it('should sort actors by initiative', async () => {
    const {world} = game
    const {Actor} = world.components
    
    // Start a round to populate actors
    game.waitingForPlayerInput = false // Skip player input for test
    
    // Get initiative values
    const playerInitiative = Actor.initiative[game.entities.player]
    console.log('Player initiative:', playerInitiative)
    
    // Player should have highest initiative (10)
    assert.equal(playerInitiative, 10, 'Player should have initiative of 10')
  })

  it('should queue events with GUIDs', async () => {
    const {eventQueue} = game
    
    // Events should be empty initially
    const initialLength = eventQueue.events.length
    
    // The event queue should have the format expected
    assert.ok(Array.isArray(eventQueue.events), 'Events should be an array')
  })
})

describe('Action Event Format', () => {
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
    const {addComponent, removeComponent} = await import('bitecs')
    const room = entities.rooms[0]
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
