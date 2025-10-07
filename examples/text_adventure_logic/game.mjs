import {initialize_game} from "../../game_framework/framework.mjs"
import {setup_world} from "./setup_world.mjs"
import {createEventQueue} from "./event_queue.mjs"

const game = await initialize_game()

const {world} = game

// Initialize the game world with entities
const entities = setup_world(game)
game.entities = entities

// Store the player ID for easy access
game.playerId = entities.player

// Initialize event queue
game.eventQueue = createEventQueue(game)

export default game