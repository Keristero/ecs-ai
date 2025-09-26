import {query} from 'bitecs'

const enemy_turn_system = (game) => {
    const {world} = game
	const enemies = query(world, [world.components.Enemy, world.components.Hitpoints])

	for (const entity of enemies) {
        console.log(`Enemy entity ${entity} takes its turn.`)
	}
}

export {
    enemy_turn_system
}