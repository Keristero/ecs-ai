import {addPrefab, addComponent, set} from 'bitecs'

/**
 * Goblin enemy prefab
 * A weak, common enemy found in forests and caves
 */
export default function create_goblin_prefab(world, prefabs) {
    const {Enemy, Actor, Hitpoints, Name, Description, Ears, Eyes, Hands, Attributes} = world.components
    
    const Goblin = addPrefab(world)
    addComponent(world, Goblin, Enemy)
    addComponent(world, Goblin, set(Actor, {
        initiative: 5 // Medium initiative
    }))
    addComponent(world, Goblin, set(Ears, {health: 1.0}))
    addComponent(world, Goblin, set(Eyes, {health: 1.0}))
    addComponent(world, Goblin, set(Hands, {health: 1.0}))
    addComponent(world, Goblin, set(Attributes, {
        strength: 5,
        dexterity: 8,
        intelligence: 3
    }))
    addComponent(world, Goblin, set(Hitpoints, {
        max: 20,
        current: 20
    }))
    addComponent(world, Goblin, set(Name, {value: "Goblin"}))
    addComponent(world, Goblin, set(Description, {value: "A small, green-skinned creature with sharp teeth."}))
    
    return Goblin
}
