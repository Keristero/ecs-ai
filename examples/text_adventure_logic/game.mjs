import {initialize_game} from "../../game_framework/framework.mjs"
import {setup_world} from "./setup_world.mjs"
import {EventQueue} from "./EventQueue.mjs"
import {WebSocketManager} from "./WebSocketManager.mjs"
import { create_event, EVENT_NAMES} from "./EventQueue.mjs"
import { sleep } from "./helpers.mjs"

const game = await initialize_game()

const {world} = game

// Initialize the game world with entities
const entities = setup_world(game)
game.entities = entities

game.start = async function() {
    game.event_queue = new EventQueue(game)
    game.ws_manager = new WebSocketManager(game)
    await game.event_queue.queue(create_event(EVENT_NAMES.GAME_START, 'The game has started', 'system'))
}

export default game