import { enemy_turn_system } from "./text_adventure_systems.mjs"

const update = (game) => {
	enemy_turn_system(game)
}

export {update}