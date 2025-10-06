import {addPrefab, addComponent, set} from 'bitecs'

/**
 * Rusty Sword item prefab
 * A basic weapon found in starting areas
 */
export default function create_rusty_sword_prefab(world, components) {
    const {Item, Name, Description} = components
    
    const RustySword = addPrefab(world)
    addComponent(world, RustySword, set(Item, {id: 1}))
    addComponent(world, RustySword, set(Name, {value: "rusty sword"}))
    addComponent(world, RustySword, set(Description, {value: "An old, rusty sword covered in grime."}))
    
    return RustySword
}
