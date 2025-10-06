import {addPrefab, addComponent, set} from 'bitecs'

/**
 * Health Potion item prefab
 * A consumable that restores health
 */
export default function create_health_potion_prefab(world, components) {
    const {Item, Name, Description} = components
    
    const HealthPotion = addPrefab(world)
    addComponent(world, HealthPotion, set(Item, {id: 2}))
    addComponent(world, HealthPotion, set(Name, {value: "health potion"}))
    addComponent(world, HealthPotion, set(Description, {value: "A small vial filled with red liquid."}))
    
    return HealthPotion
}
