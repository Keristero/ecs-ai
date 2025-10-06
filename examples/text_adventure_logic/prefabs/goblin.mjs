import {addPrefab, addComponent, set} from 'bitecs'

/**
 * Goblin enemy prefab
 * A weak, common enemy found in forests and caves
 */
export default function create_goblin_prefab(world) {
    const {Enemy, Hitpoints, Name, Description, Ears} = world.components
    
    const Goblin = addPrefab(world)
    addComponent(world, Goblin, Enemy)
    addComponent(world, Goblin, Ears)
    addComponent(world, Goblin, set(Hitpoints, {
        max: 20,
        current: 20
    }))
    addComponent(world, Goblin, set(Name, {value: "Goblin"}))
    addComponent(world, Goblin, set(Description, {value: "A small, green-skinned creature with sharp teeth."}))
    
    return Goblin
}
