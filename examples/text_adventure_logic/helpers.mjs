import {addEntity, addComponent, hasComponent, getComponent, getRelationTargets, query, Wildcard} from 'bitecs'

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
    
    // Get all components for the entity
    for(const name in world.components){
        let component = world.components[name]
        if(hasComponent(world,eid,component)){
            results[name] = getComponent(world,eid,component)
        }
    }
    
    // Get all relations for the entity
    for(const name in world.relations){
        let relation = world.relations[name]
        
        // Check if this entity has any relation targets using query with Wildcard
        try {
            // Query to see if this entity has this relation with any target
            const entitiesWithRelation = query(world, [relation(Wildcard)])
            if(entitiesWithRelation.includes(eid)){
                // Entity has this relation with some target(s)
                results[name] = relation // Store the relation reference
            }
        } catch(e) {
            // Some relations might not support wildcard queries properly
            // Fall back to getRelationTargets approach
            try {
                const targets = getRelationTargets(world, eid, relation)
                if(targets && targets.length > 0){
                    results[name] = relation
                }
            } catch(e2) {
                // If both methods fail, skip this relation
            }
        }
    }
    
    return results
}

/**
 * Get relation data for an entity in the format: "RelationName": {targetEid: {relationData}}
 * @param {Object} world - The ECS world
 * @param {number} eid - Entity ID to get relations for
 * @param {string[]} relation_names - Optional array of relation names to filter by
 * @returns {Object} Map of relation names to their data
 */
export function get_relation_data_for_entity(world, eid, relation_names = []) {
    const results = {}
    
    // If no specific relations requested, use all relations
    const relations_to_check = relation_names.length > 0 ? 
        relation_names : 
        Object.keys(world.relations)
    
    for (const relation_name of relations_to_check) {
        const relation = world.relations[relation_name]
        if (!relation) continue
        
        try {
            // Try to get relation targets
            const targets = getRelationTargets(world, eid, relation)
            if (targets && targets.length > 0) {
                results[relation_name] = {}
                
                for (const target_eid of targets) {
                    // Get the relation data between eid and target_eid
                    const relation_data = getComponent(world, eid, relation(target_eid))
                    results[relation_name][target_eid] = relation_data || {}
                }
            } else {
                // If getRelationTargets returns empty array, also try fallback
                throw new Error('getRelationTargets returned empty array')
            }
        } catch (e) {
            // Fall back to query approach if getRelationTargets fails
            try {
                // Query all entities that have this relation
                const entities_with_relation = query(world, [relation(Wildcard)])
                
                // Check if our entity has this relation
                if (entities_with_relation.includes(eid)) {
                    results[relation_name] = {}
                    
                    // We need to find what targets this entity has for this relation
                    // Try querying all entities and check if our entity has relation with them
                    for (const potential_target of entities_with_relation) {
                        if (potential_target === eid) continue
                        
                        try {
                            // Check if relation exists between these entities
                            const relation_component = relation(potential_target)
                            if (getComponent(world, eid, relation_component) !== undefined) {
                                // Access relation data from the relation's field arrays
                                const relation_data = {}
                                
                                // Get the relation schema to know what fields exist
                                if (relation_component.direction && relation_component.direction[eid] !== undefined) {
                                    const directionIndex = relation_component.direction[eid]
                                    relation_data.direction = world.string_store.getString(directionIndex)
                                }
                                
                                // Add other fields if they exist in the relation schema
                                for (const field_name in relation_component) {
                                    if (field_name !== 'direction' && relation_component[field_name] && relation_component[field_name][eid] !== undefined) {
                                        const field_value = relation_component[field_name][eid]
                                        // Try to convert from string store if it's a number
                                        if (typeof field_value === 'number' && world.string_store) {
                                            try {
                                                relation_data[field_name] = world.string_store.getString(field_value)
                                            } catch (e3) {
                                                relation_data[field_name] = field_value
                                            }
                                        } else {
                                            relation_data[field_name] = field_value
                                        }
                                    }
                                }
                                
                                results[relation_name][potential_target] = relation_data
                            }
                        } catch (e2) {
                            // No relation data between these entities
                        }
                    }
                }
            } catch (e2) {
                // Both methods failed, skip this relation
                console.warn(`Could not get relation data for ${relation_name}:`, e2.message)
            }
        }
    }
    
    return results
}