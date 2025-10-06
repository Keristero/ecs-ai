import {addPrefab, addComponent, set} from 'bitecs'

/**
 * Skeleton Warrior enemy prefab
 * A stronger undead enemy found in ancient ruins
 */
export default function create_skeleton_warrior_prefab(world) {
    const {Enemy, Hitpoints, Name, Description, Ears} = world.components
    
    const SkeletonWarrior = addPrefab(world)
    addComponent(world, SkeletonWarrior, Enemy)
    addComponent(world, SkeletonWarrior, set(Hitpoints, {
        max: 30,
        current: 30
    }))
    addComponent(world, SkeletonWarrior, set(Name, {value: "SkeletonWarrior"}))
    addComponent(world, SkeletonWarrior, set(Description, {value: "An animated skeleton wielding a rusty blade."}))
    
    return SkeletonWarrior
}
