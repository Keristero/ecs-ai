import {addPrefab, addComponent, set} from 'bitecs'

/**
 * Rusty Sword item prefab
 * A basic weapon found in starting areas
 */
export default function create_rusty_sword_prefab(world) {
    const {Item, Name, Description, Usable} = world.components
    
    const RustySword = addPrefab(world)
    addComponent(world, RustySword, Item)
    addComponent(world, RustySword, set(Name, {value: "RustySword"}))
    addComponent(world, RustySword, set(Description, {value: "An old, rusty sword covered in grime."}))
    addComponent(world, RustySword, set(Usable, {
        targetComponent: 'Hitpoints', // Can only target entities with Enemy component
        modifyComponent: 'Hitpoints', // Modifies the Hitpoints component
        modifyField: 'current', // Specifically the 'current' field
        modifyAmount: -5 // Reduces by 5 (negative = damage)
    }))
    
    return RustySword
}
