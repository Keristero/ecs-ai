import { expect } from 'chai';
import { createMinimalGame, spawnTestPlayer } from './fixtures/minimal_world.mjs';
import { getCurrentActor } from '../examples/text_adventure_logic/event_queue.mjs';

// NOTE: These tests validate the refactored flow where the player is only created via player_connect -> player_spawned.

describe('Minimal Turn System (Refactored)', function() {
  this.timeout(5000);
  let game;

  beforeEach(async () => {
    game = await createMinimalGame();
  });

  it('spawns player via event and assigns game.playerId', async () => {
    expect(game.playerId).to.be.undefined;
    const playerEid = await spawnTestPlayer(game);
    expect(playerEid).to.be.a('number');
    expect(game.playerId).to.equal(playerEid);
    // Ensure player_spawned event exists
    const spawnedEvent = game.eventQueue.events.find(e => e.type === 'system' && e.name === 'player_spawned');
    expect(spawnedEvent).to.exist;
  });

  it('starts a round automatically after first player spawn (if no active round)', async () => {
    await spawnTestPlayer(game);
    // turn_tracking_system should have started a round + first turn
    const roundStart = game.eventQueue.events.find(e => e.type === 'round' && e.name === 'round_start');
    const playerTurn = game.eventQueue.events.find(e => e.type === 'turn' && e.name === 'turn_start');
    expect(roundStart).to.exist;
    expect(playerTurn).to.exist;
    expect(playerTurn.turn.actor_eid).to.equal(game.playerId);
  });

  it('ensures current actor is the player when highest initiative', async () => {
    await spawnTestPlayer(game);
    // actor list should be sorted by initiative, player initiative is 10 (highest vs goblin 5, skeleton 3)
    const { eventQueue } = game;
  const firstTurn = game.eventQueue.events.find(e => e.type === 'turn' && e.name === 'turn_start');
  expect(firstTurn.turn.actor_eid).to.equal(game.playerId);
  });

  it('supports systems returning an array of events (regression test)', async () => {
    // Inject a temporary system that returns array
    let arrayHandled = false;
    game.eventQueue.systems.test_array = async ({ event }) => {
      if (event.type === 'system' && event.name === 'player_spawned') {
        arrayHandled = true;
        return [
          { type: 'system', name: 'array_event_one', system: { system_name: 'test', details: {} } },
          { type: 'system', name: 'array_event_two', system: { system_name: 'test', details: {} } }
        ];
      }
      return null;
    };
    await spawnTestPlayer(game);
    expect(arrayHandled).to.be.true;
    const ev1 = game.eventQueue.events.find(e => e.name === 'array_event_one');
    const ev2 = game.eventQueue.events.find(e => e.name === 'array_event_two');
    expect(ev1).to.exist;
    expect(ev2).to.exist;
  });
});
