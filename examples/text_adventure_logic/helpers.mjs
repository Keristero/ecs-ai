import {addEntity, addComponent, hasComponent, getComponent, getRelationTargets, query, Wildcard, Or} from 'bitecs'

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get all components that an entity has
 * @param {Object} world - The ECS world
 * @param {number} eid - Entity ID
 * @returns {Object} Map of component names to their data
 */
export function get_all_components_for_entity(world, eid) {
    const results = {}
    
    for (const name in world.components) {
        const component = world.components[name]
        if (hasComponent(world, eid, component)) {
            results[name] = getComponent(world, eid, component)
        }
    }
    
    return results
}

/**
 * Check if an entity has a specific relation with any targets
 */
export function entity_has_relation(world, source_eid, relation) {
    const targets = getRelationTargets(world, source_eid, relation);
    return targets.length > 0;
}

/**
 * Get all relations that an entity has (just the names and references)
 * @param {Object} world - The ECS world
 * @param {number} eid - Entity ID
 * @returns {Object} Map of relation names to their references
 */
export function get_all_relations_for_entity(world, eid) {
    const results = {}
    
    for (const name in world.relations) {
        const relation = world.relations[name]
        if (entity_has_relation(world, eid, relation)) {
            results[name] = relation
        }
    }
    
    return results
}

/**
 * Get entities that are targets of a relation for a given source entity with their relation data
 */
export function get_relation_targets_with_data(world, source_eid, relation) {
    const targets = {};
    const target_entities = getRelationTargets(world, source_eid, relation);
    
    for (const target_entity of target_entities) {
        // Use getComponent to trigger observers and get transformed data
        const relationComponent = relation(target_entity);
        const data = getComponent(world, source_eid, relationComponent);
        if (data !== undefined) {
            targets[target_entity] = data;
        }
    }
    
    return targets;
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

export function get_all_components_and_relations(world, eid) {
    // Get all components using utility function
    const components = get_all_components_for_entity(world, eid)
    
    // Get all relations using utility function
    const relations = get_all_relations_for_entity(world, eid)
    
    // Combine components and relations
    return { ...components, ...relations }
}

/**
 * Get all entities that are sources of a given relation (using Wildcard pattern)
 */
export function get_relation_sources(world, relation) {
    return query(world, [relation(Wildcard)]);
}

/**
 * Get all entities that are targets of a given relation (using Wildcard pattern)
 */
export function get_relation_targets_all(world, relation) {
    return query(world, [Wildcard(relation)]);
}

/**
 * Get relation data for a specific entity pair
 */
export function get_relation_data_for_pair(world, source_eid, target_eid, relation) {
    // Use getComponent to trigger observers and get transformed data
    const relationComponent = relation(target_eid);
    return getComponent(world, source_eid, relationComponent);
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
        
        // Check if our entity has this relation using utility function
        if (entity_has_relation(world, eid, relation)) {
            // Get all targets and their data for this relation using bitECS queries
            results[relation_name] = get_relation_targets_with_data(world, eid, relation)
        }
    }
    
    return results
}