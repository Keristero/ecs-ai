import {initialize_game} from "../../game_framework/framework.mjs"
import {setup_world} from "./setup_world.mjs"

const game = await initialize_game()

const {world} = game

// Initialize the game world with entities
const entities = setup_world(game)
game.entities = entities

// Store the player ID for easy access
game.playerId = entities.player

export default game