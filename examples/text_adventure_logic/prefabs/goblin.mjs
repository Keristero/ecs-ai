import {addPrefab, addComponent, set} from 'bitecs'

/**
 * Goblin enemy prefab
 * A weak, common enemy found in forests and caves
 */
export default function create_goblin_prefab(world, components) {
    const {Enemy, Hitpoints, Name, Description} = components
    
    const Goblin = addPrefab(world)
    addComponent(world, Goblin, Enemy)
    addComponent(world, Goblin, Hitpoints)
    Hitpoints.max[Goblin] = 20
    Hitpoints.current[Goblin] = 20
    addComponent(world, Goblin, set(Name, {value: "goblin"}))
    addComponent(world, Goblin, set(Description, {value: "A small, green-skinned creature with sharp teeth."}))
    
    return Goblin
}
