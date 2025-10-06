import {addPrefab, addComponent, set} from 'bitecs'

/**
 * Health Potion item prefab
 * A consumable that restores health
 */
export default function create_health_potion_prefab(world) {
    const {Item, Name, Description, Usable} = world.components
    
    const HealthPotion = addPrefab(world)
    addComponent(world, HealthPotion, Item)
    addComponent(world, HealthPotion, set(Name, {value: "HealthPotion"}))
    addComponent(world, HealthPotion, set(Description, {value: "A small vial filled with red liquid."}))
    addComponent(world, HealthPotion, set(Usable, {
        targetComponent: 'Hitpoints', // Can target any entity with Hitpoints (including self)
        modifyComponent: 'Hitpoints', // Modifies the Hitpoints component
        modifyField: 'current', // Specifically the 'current' field
        modifyAmount: 20 // Adds 20 (positive = healing)
    }))
    
    return HealthPotion
}
