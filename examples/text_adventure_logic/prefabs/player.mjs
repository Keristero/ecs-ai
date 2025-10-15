import {addPrefab, addComponent, set} from 'bitecs'

/**
 * Player prefab - represents the player character
 * Note: respawnRoom will be set when spawning the player
 */
export default function create_player_prefab(world, prefabs) {
    const {Player, Actor, Name, Description, Hitpoints, Attributes, Level} = world.components
    
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
    addComponent(world, Self, set(Level, {
        max: 999,
        current: 1,
        current_experience: 0,
        experience_threshhold: 10,
        threshhold_adjustment: 1.12
    }))
    
    return Self
}
