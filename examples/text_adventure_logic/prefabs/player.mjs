import {addPrefab, addComponent, set} from 'bitecs'

/**
 * Player prefab - represents the player character
 * Note: respawnRoom will be set when spawning the player
 */
export default function create_player_prefab(world, prefabs) {
    const {Player, Actor, Name, Description, Hitpoints, Attributes, Ears, Eyes, Hands} = world.components
    
    const Self = addPrefab(world)
    addComponent(world, Self, set(Player, {
        respawnRoom: 0 // Will be set to actual starting room when player is spawned
    }))
    addComponent(world, Self, set(Actor, {
        initiative: 10 // High initiative - player goes first
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
