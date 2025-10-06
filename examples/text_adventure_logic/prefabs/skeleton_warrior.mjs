import {addPrefab, addComponent, set} from 'bitecs'

/**
 * Skeleton Warrior enemy prefab
 * A stronger undead enemy found in ancient ruins
 */
export default function create_skeleton_warrior_prefab(world, components) {
    const {Enemy, Hitpoints, Name, Description} = components
    
    const SkeletonWarrior = addPrefab(world)
    addComponent(world, SkeletonWarrior, Enemy)
    addComponent(world, SkeletonWarrior, Hitpoints)
    Hitpoints.max[SkeletonWarrior] = 30
    Hitpoints.current[SkeletonWarrior] = 30
    addComponent(world, SkeletonWarrior, set(Name, {value: "skeleton warrior"}))
    addComponent(world, SkeletonWarrior, set(Description, {value: "An animated skeleton wielding a rusty blade."}))
    
    return SkeletonWarrior
}
