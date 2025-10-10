import {addEntity, addComponent, hasComponent, getComponent, getRelationTargets, query, Wildcard} from 'bitecs'

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
 * Check if an entity has any relations of a specific type
 * @param {Object} world - The ECS world
 * @param {number} eid - Entity ID
 * @param {Function} relation - The relation to check
 * @returns {boolean} True if entity has this relation type
 */
export function entity_has_relation(world, eid, relation) {
    const entitiesWithRelation = query(world, [relation(Wildcard)])
    return entitiesWithRelation.includes(eid)
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
 * Collect all possible entity IDs from relation queries
 * @param {Object} world - The ECS world
 * @returns {Set<number>} Set of all entity IDs that appear in relations
 */
export function collect_all_entity_targets(world) {
    const allPossibleTargets = new Set()
    
    for (const relation_name in world.relations) {
        const entities = query(world, [world.relations[relation_name](Wildcard)])
        entities.forEach(e => allPossibleTargets.add(e))
    }
    
    // Add buffer for recently created entities
    const maxKnownEntity = allPossibleTargets.size > 0 ? Math.max(...allPossibleTargets) : 0
    for (let i = maxKnownEntity + 1; i <= maxKnownEntity + 10; i++) {
        allPossibleTargets.add(i)
    }
    
    return allPossibleTargets
}

/**
 * Get all target entities for a specific relation from a source entity
 * @param {Object} world - The ECS world
 * @param {number} eid - Source entity ID
 * @param {Function} relation - The relation function
 * @param {Set<number>} possible_targets - Set of possible target entities to check
 * @returns {Object} Map of target entity IDs to their relation data
 */
export function get_relation_targets_with_data(world, eid, relation, possible_targets) {
    const targets = {}
    
    for (const potential_target of possible_targets) {
        if (potential_target === eid) continue
        
        if (hasComponent(world, eid, relation(potential_target))) {
            const relation_data = getComponent(world, eid, relation(potential_target))
            targets[potential_target] = relation_data || {}
        }
    }
    
    return targets
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
    
    // Collect all possible targets once for efficiency
    const allPossibleTargets = collect_all_entity_targets(world)
    
    for (const relation_name of relations_to_check) {
        const relation = world.relations[relation_name]
        if (!relation) continue
        
        // Check if our entity has this relation using utility function
        if (entity_has_relation(world, eid, relation)) {
            // Get all targets and their data for this relation
            results[relation_name] = get_relation_targets_with_data(world, eid, relation, allPossibleTargets)
        }
    }
    
    return results
}