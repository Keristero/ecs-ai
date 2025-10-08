import {initialize_game} from "../../game_framework/framework.mjs"
import {setup_world} from "./setup_world.mjs"
import {createEventQueue, startRound} from "./event_queue.mjs"
import {initializeWebSocket, startFirstRound} from "./websocket_implementation.mjs"

const game = await initialize_game()

const {world} = game

// Initialize the game world with entities
const entities = setup_world(game)
game.entities = entities

// Store the player ID for easy access
game.playerId = entities.player

// Initialize event queue
game.eventQueue = createEventQueue(game)

// Don't start the round here - let the API server start it after WebSocket is ready
// This ensures game.broadcastEvent is set before any events are queued

// Add a no-op update function for compatibility with main.mjs
// This game is event-driven, so it doesn't use frame-based updates
game.start = async function() {
    // Set up WebSocket if HTTP server is available (after API server starts)
    if (game.httpServer && !game.wsInitialized) {
        await initializeWebSocket(game)
        await startFirstRound(game)
        game.wsInitialized = true
    }
}

export default game