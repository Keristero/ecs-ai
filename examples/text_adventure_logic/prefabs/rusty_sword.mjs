import {addPrefab, addComponent, set} from 'bitecs'

/**
 * Rusty Sword item prefab
 * A basic weapon found in starting areas
 */
export default function create_rusty_sword_prefab(world, components) {
    const {Item, Pickup, Name, Description} = components
    
    const RustySword = addPrefab(world)
    addComponent(world, RustySword, Item)
    Item.id[RustySword] = 1
    addComponent(world, RustySword, Pickup)
    addComponent(world, RustySword, set(Name, {value: "rusty sword"}))
    addComponent(world, RustySword, set(Description, {value: "An old, rusty sword covered in grime."}))
    
    return RustySword
}
