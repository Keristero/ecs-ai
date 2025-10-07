import {initialize_game} from "../../game_framework/framework.mjs"
import {setup_world} from "./setup_world.mjs"
import {createEventQueue, startRound} from "./event_queue.mjs"

const game = await initialize_game()

const {world} = game

// Initialize the game world with entities
const entities = setup_world(game)
game.entities = entities

// Store the player ID for easy access
game.playerId = entities.player

// Initialize event queue
game.eventQueue = createEventQueue(game)

// Start the first round automatically
await startRound(game.eventQueue)

// Add a no-op update function for compatibility with main.mjs
// This game is event-driven, so it doesn't use frame-based updates
game.update = function() {
    // No-op: This game uses event queue instead of update loops
    return game
}

export default game