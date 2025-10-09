import {initialize_game} from "../../game_framework/framework.mjs"
import {setup_world} from "./setup_world.mjs"
import {EventQueue} from "./EventQueue.mjs"
import {initializeWebSocket} from "./websocket_implementation.mjs"
import { create_event } from "./EventQueue.mjs"

const game = await initialize_game()

const {world} = game

// Initialize the game world with entities
const entities = setup_world(game)
game.entities = entities

game.event_queue = new EventQueue(game)

game.start = async function() {
    await initializeWebSocket(game)
    await game.event_queue.queue(create_event('game_start', 'The game has started', 'system'))
}

export default game