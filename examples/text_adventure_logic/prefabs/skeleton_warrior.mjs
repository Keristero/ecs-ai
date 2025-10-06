import {addPrefab, addComponent, addEntity, set, IsA} from 'bitecs'

/**
 * Skeleton Warrior enemy prefab
 * A stronger undead enemy found in ancient ruins
 */
export default function create_skeleton_warrior_prefab(world, prefabs) {
    const {Enemy, Hitpoints, Name, Description, Ears, Eyes, Hands, Attributes} = world.components
    const {InInventory} = world.relations
    
    const SkeletonWarrior = addPrefab(world)
    addComponent(world, SkeletonWarrior, Enemy)
    addComponent(world, SkeletonWarrior, set(Hitpoints, {
        max: 30,
        current: 30
    }))
    addComponent(world, SkeletonWarrior, set(Attributes, {
        strength: 8,
        dexterity: 6,
        intelligence: 1
    }))
    addComponent(world, SkeletonWarrior, set(Eyes, {health: 0.2}))
    addComponent(world, SkeletonWarrior, set(Hands, {health: 0.2}))
    addComponent(world, SkeletonWarrior, set(Name, {value: "SkeletonWarrior"}))
    addComponent(world, SkeletonWarrior, set(Description, {value: "An animated skeleton"}))
    
    // Give the skeleton warrior a rusty sword in its inventory
    const sword = addEntity(world)
    addComponent(world, sword, IsA(prefabs.rusty_sword))
    addComponent(world, sword, InInventory(SkeletonWarrior))
    
    return SkeletonWarrior
}
