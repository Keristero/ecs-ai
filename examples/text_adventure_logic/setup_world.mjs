import {addEntity, addComponent, set, IsA} from 'bitecs'

// Setup initial game world
function setup_world(game) {
    const {world, prefabs} = game
    const {Room, Landmark, Player, Name, Description} = world.components
    const {InRoom, ConnectsTo} = world.relations
    
    // Create rooms
    const room1 = addEntity(world)
    addComponent(world, room1, Room)
    addComponent(world, room1, set(Name, {value: "Starting Cave"}))
    addComponent(world, room1, set(Description, {value: "A dark, damp cave with rough stone walls."}))
    
    const room2 = addEntity(world)
    addComponent(world, room2, Room)
    addComponent(world, room2, set(Name, {value: "Forest Path"}))
    addComponent(world, room2, set(Description, {value: "A narrow path through a dense forest."}))
    
    const room3 = addEntity(world)
    addComponent(world, room3, Room)
    addComponent(world, room3, set(Name, {value: "Ancient Ruins"}))
    addComponent(world, room3, set(Description, {value: "Crumbling stone structures covered in moss."}))
    
    // Create connections between rooms using ConnectsTo relation
    // Now we can use the clean set() syntax!
    addComponent(world, room1, set(ConnectsTo(room2), {direction: "north"}))
    addComponent(world, room2, set(ConnectsTo(room1), {direction: "south"}))
    addComponent(world, room2, set(ConnectsTo(room3), {direction: "east"}))
    addComponent(world, room3, set(ConnectsTo(room2), {direction: "west"}))
    
    // Create landmarks
    const landmark1 = addEntity(world)
    addComponent(world, landmark1, Landmark)
    addComponent(world, landmark1, set(Name, {value: "ancient altar"}))
    addComponent(world, landmark1, InRoom(room3))
    
    // Create items using prefabs - instantiate from prefab templates
    const item1 = addEntity(world)
    addComponent(world, item1, IsA(prefabs.rusty_sword))
    addComponent(world, item1, InRoom(room1))
    
    const item2 = addEntity(world)
    addComponent(world, item2, IsA(prefabs.health_potion))
    addComponent(world, item2, InRoom(room2))
    
    // Create enemies using prefabs - instantiate from prefab templates
    const enemy1 = addEntity(world)
    addComponent(world, enemy1, IsA(prefabs.goblin))
    addComponent(world, enemy1, InRoom(room2))
    
    const enemy2 = addEntity(world)
    addComponent(world, enemy2, IsA(prefabs.skeleton_warrior))
    addComponent(world, enemy2, InRoom(room3))
    // Give this skeleton warrior a rusty sword
    const sword1 = addEntity(world)
    addComponent(world, sword1, IsA(prefabs.rusty_sword))
    const {Has} = world.relations
    addComponent(world, enemy2, Has(sword1))
    
    const enemy3 = addEntity(world)
    addComponent(world, enemy3, IsA(prefabs.skeleton_warrior))
    addComponent(world, enemy3, InRoom(room3))
    // Give this skeleton warrior a rusty sword
    const sword2 = addEntity(world)
    addComponent(world, sword2, IsA(prefabs.rusty_sword))
    addComponent(world, enemy3, Has(sword2))
    
    // Create player using prefab
    const player = addEntity(world)
    addComponent(world, player, IsA(prefabs.self))
    Player.respawnRoom[player] = room1  // entity ID of respawn room
    addComponent(world, player, InRoom(room1))
    
    console.log("Game world initialized!")
    
    return {
        player,
        rooms: [room1, room2, room3],
        items: [item1, item2],
        enemies: [enemy1, enemy2, enemy3],
        landmarks: [landmark1]
    }
}

export {
    setup_world
}
