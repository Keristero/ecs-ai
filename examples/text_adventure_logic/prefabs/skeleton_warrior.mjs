import {addPrefab, addComponent, addEntity, set, IsA} from 'bitecs'

/**
 * Skeleton Warrior enemy prefab
 * A stronger undead enemy found in ancient ruins
 */
export default function create_skeleton_warrior_prefab(world, prefabs) {
    const {Enemy, Actor, Hitpoints, Name, Description, Ears, Eyes, Hands, Attributes} = world.components
    
    const SkeletonWarrior = addPrefab(world)
    addComponent(world, SkeletonWarrior, Enemy)
    addComponent(world, SkeletonWarrior, set(Actor, {
        initiative: 3 // Low initiative - slower
    }))
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
    
    // Note: Inventory items (like weapons) should be added when instantiating
    // skeleton warriors in setup_world, not in the prefab template
    
    return SkeletonWarrior
}
