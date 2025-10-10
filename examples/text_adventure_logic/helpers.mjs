import {addEntity, addComponent, hasComponent, getComponent} from 'bitecs'

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * @param {Object} world - The ECS world
 * @param {number} eid - Entity ID
 * @returns {Object} Map of component names to their data
 */
export function get_components_for_entity(world, eid, component_names=[]) {
    const results = {}
    
    for (const component_name of component_names) {
        let component = world.components[component_name]
        results[component_name] = getComponent(world, eid, component)
    }
    
    return results
}

export function get_all_components_and_relations(world,eid){
    const results = {}
    for(const name in world.components){
        let component = world.components[name]
        if(hasComponent(world,eid,component)){
            results[name] = getComponent(world,eid,component)
        }
    }
    for(const name in world.relations){
        let relation = world.relations[name]
        if(hasComponent(world,eid,relation)){
            results[name] = getComponent(world,eid,relation)
        }
    }
    console.log(JSON.stringify(results,null,2))
    return results
}