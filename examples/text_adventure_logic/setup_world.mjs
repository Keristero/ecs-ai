import {addEntity, addComponent, set, IsA} from 'bitecs'

// Setup initial game world
function setup_world(game) {
    const {world, prefabs} = game
    const {Room, Landmark, Player, Name, Description} = world.components
    const {Has, ConnectsTo} = world.relations

    // Player is now spawned dynamically on websocket connection
    
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
    addComponent(world, room3, Has(landmark1))
    
    // Create items using prefabs - instantiate from prefab templates
    const item1 = addEntity(world)
    addComponent(world, item1, IsA(prefabs.rusty_sword))
    addComponent(world, room1, Has(item1))
    
    const item2 = addEntity(world)
    addComponent(world, item2, IsA(prefabs.health_potion))
    addComponent(world, room2, Has(item2))
    
    // Create enemies using prefabs - instantiate from prefab templates
    /*
    const enemy1 = addEntity(world)
    addComponent(world, enemy1, IsA(prefabs.goblin))
    addComponent(world, room2, Has(enemy1))
    
    const enemy2 = addEntity(world)
    addComponent(world, enemy2, IsA(prefabs.skeleton_warrior))
    addComponent(world, room3, Has(enemy2))
    // Give this skeleton warrior a rusty sword
    const sword1 = addEntity(world)
    addComponent(world, sword1, IsA(prefabs.rusty_sword))
    addComponent(world, enemy2, Has(sword1))
    
    const enemy3 = addEntity(world)
    addComponent(world, enemy3, IsA(prefabs.skeleton_warrior))
    addComponent(world, room3, Has(enemy3))
    // Give this skeleton warrior a rusty sword
    const sword2 = addEntity(world)
    addComponent(world, sword2, IsA(prefabs.rusty_sword))
    addComponent(world, enemy3, Has(sword2))
    **/
    
    // Note: Player entity is no longer created here. It will be spawned dynamically
    // by the `player_spawn_system` in response to a websocket `player_connect` event.
    console.log("Game world initialized!")
    
    return {
        starting_room: room1 // Only return starting room for player spawning
    }
}

export {
    setup_world
}
