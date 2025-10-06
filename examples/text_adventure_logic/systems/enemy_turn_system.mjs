import {query} from 'bitecs'

// Enemy AI turn system - runs after player actions
const enemy_turn_system = (game) => {
    const {world} = game
    const {InRoom} = world.relations
    const enemies = query(world, [world.components.Enemy, world.components.Hitpoints])
    
    for (const entity of enemies) {
        const {Hitpoints} = world.components
        if (Hitpoints.current[entity] <= 0) continue
        
        // Find players in the same room as this enemy
        const enemyRoom = query(world, [world.components.Room]).find(room => {
            const entities_in_room = query(world, [InRoom(room)])
            return entities_in_room.includes(entity)
        })
        
        if (!enemyRoom) continue
        
        const players_in_room = query(world, [world.components.Player, InRoom(enemyRoom)])
        
        if (players_in_room.length > 0) {
            // Attack a random player in the room
            const target = players_in_room[Math.floor(Math.random() * players_in_room.length)]
            const damage = Math.floor(Math.random() * 5) + 1
            Hitpoints.current[target] = Math.max(0, Hitpoints.current[target] - damage)
            console.log(`Enemy ${entity} attacks player ${target} for ${damage} damage!`)
        }
    }
}

export {
    enemy_turn_system
}
