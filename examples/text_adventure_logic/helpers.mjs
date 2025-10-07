import {query, hasComponent, getComponent, addComponent, removeComponent} from 'bitecs'

/**
 * Game helpers - Common ECS query utilities for text adventure
 * These functions are pure and functional, leveraging ECS patterns
 */

// ==================== Entity Query Helpers ====================

/**
 * Find the room that contains a specific entity
 * @param {Object} world - The ECS world
 * @param {number} entityId - Entity to find room for
 * @returns {number|null} Room entity ID or null if not found
 */
export function findEntityRoom(world, entityId) {
    const {Has} = world.relations
    const {Room} = world.components
    const rooms = query(world, [Room])
    
    // Find which room Has this entity
    return rooms.find(room => {
        return hasComponent(world, room, Has(entityId))
    }) ?? null
}

/**
 * Get all entities in a specific room
 * @param {Object} world - The ECS world
 * @param {number} roomId - Room entity ID
 * @returns {Array<number>} Array of entity IDs in the room
 */
export function getEntitiesInRoom(world, roomId) {
    const {Has} = world.relations
    const entities = []
    // Iterate through potential entity IDs to find what the room Has
    for (let eid = 0; eid < 1000; eid++) {
        if (hasComponent(world, roomId, Has(eid))) {
            entities.push(eid)
        }
    }
    return entities
}

/**
 * Get all items in an entity's inventory
 * @param {Object} world - The ECS world
 * @param {number} entityId - Entity ID (player or any entity with inventory)
 * @returns {Array<number>} Array of entity IDs in inventory
 */
export function getInventoryItems(world, entityId) {
    const {Has} = world.relations
    const {Item} = world.components
    // Find all items that the entity Has
    const allItems = query(world, [Item])
    return allItems.filter(itemId => hasComponent(world, entityId, Has(itemId)))
}

/**
 * Check if two entities are in the same room
 * @param {Object} world - The ECS world
 * @param {number} entity1 - First entity ID
 * @param {number} entity2 - Second entity ID
 * @returns {boolean} True if in same room
 */
export function areInSameRoom(world, entity1, entity2) {
    const room1 = findEntityRoom(world, entity1)
    const room2 = findEntityRoom(world, entity2)
    return room1 !== null && room1 === room2
}

/**
 * Find entity by name (case-insensitive)
 * @param {Object} world - The ECS world
 * @param {string} name - Entity name to search for
 * @param {Array<Object>} componentFilters - Optional array of components entities must have
 * @returns {number|null} Entity ID or null if not found
 */
export function findEntityByName(world, name, componentFilters = []) {
    const {Name} = world.components
    const components = [Name, ...componentFilters]
    const entities = query(world, components)
    
    return entities.find(e => {
        const entityName = getComponent(world, e, Name)?.value || ''
        return entityName.toLowerCase() === name.toLowerCase()
    }) ?? null
}

// ==================== Component Data Helpers ====================

/**
 * Get entity name safely
 * @param {Object} world - The ECS world
 * @param {number} entityId - Entity ID
 * @param {string} fallback - Fallback if no name (default: "Entity {id}")
 * @returns {string} Entity name
 */
export function getEntityName(world, entityId, fallback = null) {
    const {Name} = world.components
    if (!hasComponent(world, entityId, Name)) {
        return fallback ?? `Entity ${entityId}`
    }
    return getComponent(world, entityId, Name)?.value || fallback || `Entity ${entityId}`
}

/**
 * Get entity description safely
 * @param {Object} world - The ECS world
 * @param {number} entityId - Entity ID
 * @returns {string} Entity description or empty string
 */
export function getEntityDescription(world, entityId) {
    const {Description} = world.components
    if (!hasComponent(world, entityId, Description)) {
        return ''
    }
    return getComponent(world, entityId, Description)?.value || ''
}

/**
 * Get all component data for an entity
 * @param {Object} world - The ECS world
 * @param {number} entityId - Entity ID
 * @returns {Object} Map of component names to their data
 */
export function getAllComponentsData(world, entityId) {
    const entityComponents = {}
    const componentNames = Object.keys(world.components)
    
    for (const componentName of componentNames) {
        const component = world.components[componentName]
        if (hasComponent(world, entityId, component)) {
            entityComponents[componentName] = getComponent(world, entityId, component) || {}
        }
    }
    
    return entityComponents
}

// ==================== Relation Helpers ====================

/**
 * Find rooms connected to a room in a specific direction
 * @param {Object} world - The ECS world
 * @param {number} roomId - Current room entity ID
 * @param {string} direction - Direction to check
 * @returns {Array<number>} Array of connected room IDs
 */
export function findConnectedRoom(world, roomId, direction) {
    const {ConnectsTo} = world.relations
    const {Room} = world.components
    
    return query(world, [Room]).filter(targetRoom => {
        // Check if roomId has a ConnectsTo relation targeting this room
        const hasRelation = query(world, [ConnectsTo(targetRoom)]).includes(roomId)
        if (!hasRelation) return false
        
        // Get the direction from the relation data
        const directionIndex = ConnectsTo(targetRoom).direction[roomId]
        if (directionIndex === undefined) return false
        
        const roomDirection = world.string_store.getString(directionIndex)
        return roomDirection === direction
    })
}

/**
 * Get all exits from a room
 * @param {Object} world - The ECS world
 * @param {number} roomId - Room entity ID
 * @returns {Array<{direction: string, targetRoom: number}>} Array of exits
 */
export function getRoomExits(world, roomId) {
    const {ConnectsTo} = world.relations
    const {Room} = world.components
    const exits = []
    
    const allRooms = query(world, [Room])
    
    for (const targetRoom of allRooms) {
        const entitiesConnectingToTarget = query(world, [ConnectsTo(targetRoom)])
        if (entitiesConnectingToTarget.includes(roomId)) {
            const directionIndex = ConnectsTo(targetRoom).direction[roomId]
            if (directionIndex !== undefined) {
                const direction = world.string_store.getString(directionIndex)
                exits.push({direction, targetRoom})
            }
        }
    }
    
    return exits
}

// ==================== Validation Helpers ====================

/**
 * Validate that an entity exists and has required components
 * @param {Object} world - The ECS world
 * @param {number} entityId - Entity ID to validate
 * @param {Array<Object>} requiredComponents - Array of required components
 * @returns {{valid: boolean, error: string|null}} Validation result
 */
export function validateEntity(world, entityId, requiredComponents = []) {
    // Check if any component exists for this entity (basic existence check)
    const allComponents = Object.values(world.components)
    const exists = allComponents.some(comp => hasComponent(world, entityId, comp))
    
    if (!exists) {
        return {valid: false, error: `Entity ${entityId} not found`}
    }
    
    // Check required components
    for (const component of requiredComponents) {
        if (!hasComponent(world, entityId, component)) {
            const componentName = Object.keys(world.components).find(
                key => world.components[key] === component
            ) || 'Unknown'
            return {valid: false, error: `Entity missing required component: ${componentName}`}
        }
    }
    
    return {valid: true, error: null}
}

/**
 * Check if an item is in player's inventory
 * @param {Object} world - The ECS world
 * @param {number} playerId - Player entity ID
 * @param {number} itemId - Item entity ID
 * @returns {boolean} True if item is in player's inventory
 */
export function hasItemInInventory(world, playerId, itemId) {
    const items = getInventoryItems(world, playerId)
    return items.includes(itemId)
}

/**
 * Check if an entity is in a specific room
 * @param {Object} world - The ECS world
 * @param {number} roomId - Room entity ID
 * @param {number} entityId - Entity to check
 * @returns {boolean} True if entity is in room
 */
export function isInRoom(world, roomId, entityId) {
    const entities = getEntitiesInRoom(world, roomId)
    return entities.includes(entityId)
}

/**
 * Check if a component with health is functional (health >= 0.5)
 * @param {Object} world - The ECS world
 * @param {number} entityId - Entity ID
 * @param {Object} component - Component to check (e.g., Ears, Eyes, Hands)
 * @returns {{functional: boolean, health: number}} Health status
 */
export function checkComponentHealth(world, entityId, component) {
    if (!hasComponent(world, entityId, component)) {
        return {functional: false, health: 0, reason: 'missing'}
    }
    
    const componentData = getComponent(world, entityId, component)
    const health = componentData?.health ?? 1.0
    
    return {
        functional: health >= 0.5,
        health,
        reason: health < 0.5 ? 'impaired' : 'healthy'
    }
}

/**
 * Validate entity has required sensory/physical component and it's functional
 * @param {Object} world - The ECS world
 * @param {number} entityId - Entity ID
 * @param {Object} component - Component to validate (e.g., Ears, Eyes, Hands)
 * @param {string} componentName - Human-readable component name
 * @param {string} actionName - Name of the action requiring this component
 * @returns {{valid: boolean, warning: string|null, error: string|null}} Validation result
 */
export function validateComponentForAction(world, entityId, component, componentName, actionName) {
    const healthStatus = checkComponentHealth(world, entityId, component)
    
    if (healthStatus.reason === 'missing') {
        return {
            valid: false,
            warning: null,
            error: `Cannot ${actionName}: entity lacks ${componentName} component`
        }
    }
    
    if (!healthStatus.functional) {
        return {
            valid: false,
            warning: null,
            error: `Cannot ${actionName}: ${componentName} too damaged (${(healthStatus.health * 100).toFixed(0)}% health, needs 50%+)`
        }
    }
    
    // Functional but slightly impaired
    if (healthStatus.health < 0.75) {
        return {
            valid: true,
            warning: `${componentName} partially impaired (${(healthStatus.health * 100).toFixed(0)}% health)`,
            error: null
        }
    }
    
    return {valid: true, warning: null, error: null}
}

// ==================== Format Helpers ====================

/**
 * Format entity for display with name and description
 * @param {Object} world - The ECS world
 * @param {number} entityId - Entity ID
 * @returns {{id: number, name: string, description: string}} Formatted entity
 */
export function formatEntityDisplay(world, entityId) {
    return {
        id: entityId,
        name: getEntityName(world, entityId),
        description: getEntityDescription(world, entityId)
    }
}

/**
 * Format multiple entities for display
 * @param {Object} world - The ECS world
 * @param {Array<number>} entityIds - Array of entity IDs
 * @returns {Array<{id: number, name: string, description: string}>} Formatted entities
 */
export function formatEntitiesDisplay(world, entityIds) {
    return entityIds.map(id => formatEntityDisplay(world, id))
}

// ==================== Action Result Helpers ====================

/**
 * Create a success result
 * @param {string} message - Success message
 * @param {Object} additionalData - Additional data to include
 * @returns {Object} Success result
 */
export function successResult(message, additionalData = {}) {
    return {
        success: true,
        message,
        ...additionalData
    }
}

/**
 * Create a failure result
 * @param {string} message - Error message
 * @param {Object} additionalData - Additional data to include
 * @returns {Object} Failure result
 */
export function failureResult(message, additionalData = {}) {
    return {
        success: false,
        message,
        ...additionalData
    }
}
