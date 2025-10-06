import {addPrefab, addComponent, set} from 'bitecs'

/**
 * Player prefab - represents the player character
 * Note: respawnRoom should be set when placing the player in the world
 */
export default function create_self_prefab(world, prefabs) {
    const {Player, Name, Description, Hitpoints, Attributes, Ears, Eyes, Hands} = world.components
    
    const Self = addPrefab(world)
    addComponent(world, Self, set(Player, {
        respawnRoom: 0 // Default value, should be overridden when placing player
    }))
    addComponent(world, Self, set(Name, {value: "Self"}))
    addComponent(world, Self, set(Description, {value: "It's you!"}))
    addComponent(world, Self, set(Hitpoints, {
        max: 100,
        current: 100
    }))
    addComponent(world, Self, set(Attributes, {
        strength: 10,
        dexterity: 10,
        intelligence: 10
    }))
    
    // Sensory and physical components (fully healthy)
    addComponent(world, Self, set(Ears, {health: 1.0}))
    addComponent(world, Self, set(Eyes, {health: 1.0}))
    addComponent(world, Self, set(Hands, {health: 1.0}))
    
    return Self
}
