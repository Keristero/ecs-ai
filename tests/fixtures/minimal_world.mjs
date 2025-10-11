import { initialize_game } from '../../game_framework/framework.mjs';
import { setup_world } from '../../examples/text_adventure_logic/setup_world.mjs';
import { EventQueue } from '../../examples/text_adventure_logic/EventQueue.mjs';

/**
 * Creates an isolated game instance with:
 *  - base world (rooms, enemies, items) via setup_world
 *  - event queue initialized (no player yet)
 *  - ability to spawn a player through standard system event (player_connect)
 */
export async function createMinimalGame() {
  const game = await initialize_game();
  game.entities = setup_world(game);
  game.eventQueue = new EventQueue(game);
  // Do not force testMode here; rely on env variable GAME_TEST_MODE or NODE_ENV=test.
  return game;
}

export async function spawnTestPlayer(game) {
  const connectEvent = {
    type: 'system',
    name: 'player_connect',
    system: { system_name: 'test', details: { ws_id: 'test_ws' } }
  };
  await game.eventQueue.queue(connectEvent);
  // After processing we expect a player_spawned event and game.playerId set
  return game.playerId;
}
