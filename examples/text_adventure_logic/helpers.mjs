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
 * Uses pure bitECS patterns with query and standard component access
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
        
        // Use ECS query to find all entities that have this relation with any target
        const entities_with_relation = query(world, [relation(Wildcard)])

        
        // Check if our entity has this relation
        if (entities_with_relation.includes(eid)) {
            results[relation_name] = {}
            
            // We need to find what entities our entity has relations WITH
            // Use a more efficient approach: collect all entities that appear in ANY relation query
            const allPossibleTargets = new Set()
            
            // Collect entities from all relation queries to build comprehensive target list
            for (const other_relation_name in world.relations) {
                const other_entities = query(world, [world.relations[other_relation_name](Wildcard)])
                other_entities.forEach(e => allPossibleTargets.add(e))
            }
            
            // Also add some buffer for recently created entities
            const maxKnownEntity = allPossibleTargets.size > 0 ? Math.max(...allPossibleTargets) : 0
            for (let i = maxKnownEntity + 1; i <= maxKnownEntity + 10; i++) {
                allPossibleTargets.add(i)
            }
            
            // Check each possible target using pure bitECS functions
            for (const potential_target of allPossibleTargets) {
                if (potential_target === eid) continue
                
                if (hasComponent(world, eid, relation(potential_target))) {
                    const relation_data = getComponent(world, eid, relation(potential_target))
                    results[relation_name][potential_target] = relation_data || {}
                }
            }
        }
    }
    
    return results
}