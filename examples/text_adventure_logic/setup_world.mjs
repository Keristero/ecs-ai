import {addEntity, addComponent, observe, onSet, onGet, set, IsA} from 'bitecs'
import {InRoom} from './systems/text_adventure_systems.mjs'

// Setup string store observers for Name and Description components
function setupStringStoreObservers(world) {
    const {Name, Description, Connection, Hitpoints} = world.components
    
    // Use the string store from world (created during game init)
    const {getString, addString} = world.string_store
    
    // Observer for Name component - handles string storage
    observe(world, onSet(Name), (eid, params) => {
        if (params && params.value) {
            Name.stringIndex[eid] = addString(params.value)
        }
    })
    
    // Observer for Name component - enables prefab inheritance
    observe(world, onGet(Name), (eid) => ({
        value: getString(Name.stringIndex[eid])
    }))
    
    // Observer for Description component - handles string storage
    observe(world, onSet(Description), (eid, params) => {
        if (params && params.value) {
            Description.stringIndex[eid] = addString(params.value)
        }
    })
    
    // Observer for Description component - enables prefab inheritance
    observe(world, onGet(Description), (eid) => ({
        value: getString(Description.stringIndex[eid])
    }))
    
    // Observer for Hitpoints component - enables prefab inheritance
    observe(world, onSet(Hitpoints), (eid, params) => {
        if (params && params.max !== undefined) {
            Hitpoints.max[eid] = params.max
        }
        if (params && params.current !== undefined) {
            Hitpoints.current[eid] = params.current
        }
    })
    
    // Observer for Hitpoints component - enables prefab inheritance
    observe(world, onGet(Hitpoints), (eid) => ({
        max: Hitpoints.max[eid],
        current: Hitpoints.current[eid]
    }))
    
    // Observer for Connection direction - handles string storage
    observe(world, onSet(Connection), (eid, params) => {
        if (params && params.direction) {
            Connection.direction[eid] = addString(params.direction)
        }
        if (params && params.from !== undefined) {
            Connection.from[eid] = params.from
        }
        if (params && params.to !== undefined) {
            Connection.to[eid] = params.to
        }
    })
}

// Setup initial game world
function setup_world(game) {
    const {world, prefabs} = game
    const {Room, Item, Landmark, Enemy, Player, Connection, Hitpoints, Attributes, Name, Description, Pickup} = world.components
    
    // Setup string store observers before creating entities
    setupStringStoreObservers(world)
    
    // Store InRoom on world.systems for prefabs to access
    world.systems = {InRoom}
    
    // Create rooms
    const room1 = addEntity(world)
    addComponent(world, room1, Room)
    Room.id[room1] = 1
    addComponent(world, room1, set(Name, {value: "Starting Cave"}))
    addComponent(world, room1, set(Description, {value: "A dark, damp cave with rough stone walls."}))
    
    const room2 = addEntity(world)
    addComponent(world, room2, Room)
    Room.id[room2] = 2
    addComponent(world, room2, set(Name, {value: "Forest Path"}))
    addComponent(world, room2, set(Description, {value: "A narrow path through a dense forest."}))
    
    const room3 = addEntity(world)
    addComponent(world, room3, Room)
    Room.id[room3] = 3
    addComponent(world, room3, set(Name, {value: "Ancient Ruins"}))
    addComponent(world, room3, set(Description, {value: "Crumbling stone structures covered in moss."}))
    
    // Create connections between rooms
    const conn1 = addEntity(world)
    addComponent(world, conn1, set(Connection, {from: 1, to: 2, direction: "north"}))
    
    const conn2 = addEntity(world)
    addComponent(world, conn2, set(Connection, {from: 2, to: 1, direction: "south"}))
    
    const conn3 = addEntity(world)
    addComponent(world, conn3, set(Connection, {from: 2, to: 3, direction: "east"}))
    
    const conn4 = addEntity(world)
    addComponent(world, conn4, set(Connection, {from: 3, to: 2, direction: "west"}))
    
    // Create landmarks
    const landmark1 = addEntity(world)
    addComponent(world, landmark1, Landmark)
    Landmark.id[landmark1] = 1
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
    
    // Create player
    const player = addEntity(world)
    addComponent(world, player, Player)
    Player.id[player] = 1
    Player.respawnRoom[player] = 1
    addComponent(world, player, Hitpoints)
    Hitpoints.max[player] = 100
    Hitpoints.current[player] = 100
    addComponent(world, player, Attributes)
    Attributes.strength[player] = 5
    Attributes.dexterity[player] = 3
    Attributes.intelligence[player] = 2
    addComponent(world, player, set(Name, {value: "Player"}))
    addComponent(world, player, InRoom(room1))
    
    console.log("Game world initialized!")
    
    return {
        player,
        rooms: [room1, room2, room3],
        items: [item1, item2],
        enemies: [enemy1, enemy2],
        landmarks: [landmark1]
    }
}

export {
    setup_world
}
