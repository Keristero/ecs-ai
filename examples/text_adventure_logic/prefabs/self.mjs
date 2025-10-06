import {addPrefab, addComponent, set} from 'bitecs'

/**
 * Player prefab - represents the player character
 * Note: respawnRoom should be set when placing the player in the world
 */
export default function create_self_prefab(world) {
    const {Player, Name, Description, Hitpoints, Attributes} = world.components
    
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
    
    return Self
}
