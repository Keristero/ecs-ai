/**
 * Entity name mapping and validation helpers for dynamic action autocomplete
 */

/**
 * Get entity name for display (prioritizes Name component, falls back to entity ID)
 */
export function getEntityDisplayName(entity, eid) {
    if (entity.Name && entity.Name.value) {
        return entity.Name.value;
    }
    return `Entity ${eid}`;
}

/**
 * Get entity ID by name (case insensitive search)
 */
export function getEntityIdByName(entities, name) {
    const lowerName = name.toLowerCase();
    
    for (const [eid, entity] of Object.entries(entities)) {
        const entityName = getEntityDisplayName(entity, eid);
        if (entityName.toLowerCase() === lowerName) {
            return parseInt(eid);
        }
    }
    
    return null;
}

/**
 * Get all entities that match validation requirements
 */
export function getValidEntitiesForArgument(entities, argumentName, validation) {
    if (!validation) {
        return Object.keys(entities);
    }

    const validEntityIds = [];
    
    for (const [entityId, entityData] of Object.entries(entities)) {
        let isValid = true;
        
        // Check required components
        if (validation.components) {
            for (const component of validation.components) {
                if (!entityData[component]) {
                    isValid = false;
                    break;
                }
            }
        }
        
        // Check isTargetOf relations
        // Since all entities in the client's entity list came from the look command,
        // they are already in the current room, so this check passes
        if (isValid && validation.isTargetOf) {
            // Simplified client-side check - assume entities are in room
        }
        
        // Check other relation types (simplified for client-side)
        if (isValid && validation.relations) {
            // Simplified client-side check - assume relations are valid
        }
        
        if (isValid) {
            validEntityIds.push(entityId);
        }
    }
    
    return validEntityIds;
}

/**
 * Generate autocomplete suggestions for an entity argument
 */
export function getEntitySuggestions(entities, validation, argName, currentArgs = {}, inputText = '') {
    // Check if we have any entities to work with
    if (!entities || Object.keys(entities).length === 0) {
        return [{
            eid: null,
            displayName: '(perform "look" command first)',
            value: '(perform "look" command first)'
        }];
    }
    
    // Extract the validation rules for this specific argument
    const argValidation = validation?.[argName];
    const validEids = getValidEntitiesForArgument(entities, argName, argValidation);
    const suggestions = [];
    
    const lowerInput = inputText.toLowerCase();
    
    for (const eid of validEids) {
        const entity = entities[eid];
        if (!entity) continue;
        
        const displayName = getEntityDisplayName(entity, eid);
        
        // Filter by input text if provided
        if (!inputText || displayName.toLowerCase().includes(lowerInput)) {
            suggestions.push({
                eid,
                displayName,
                value: displayName // What gets inserted into input
            });
        }
    }
    
    // Sort suggestions by name
    suggestions.sort((a, b) => a.displayName.localeCompare(b.displayName));
    
    return suggestions;
}

/**
 * Parse user input and extract argument values, converting names to entity IDs where needed
 */
export function parseActionInput(input, actionSchema, entities) {
    const parts = input.trim().split(/\s+/);
    const actionName = parts[0];
    const argValues = parts.slice(1);
    
    if (!actionSchema) {
        return null;
    }
    
    const parsed = { actionName };
    
    // Use entityValidation to determine argument names (same fix as autocomplete)
    const entityValidation = actionSchema.options?.entityValidation || {};
    const argNames = Object.keys(entityValidation).filter(name => 
        name !== 'actor_eid' && name !== 'room_eid'
    );
    
    // Map argument values to schema fields
    for (let i = 0; i < Math.min(argValues.length, argNames.length); i++) {
        const argName = argNames[i];
        const argValue = argValues[i];
        
        // Check if this is an entity ID field (by name pattern)
        if (argName.endsWith('_eid') && argName !== 'actor_eid' && argName !== 'room_eid') {
            
            // Try to parse as number first (direct entity ID)
            const numericValue = parseInt(argValue);
            if (!isNaN(numericValue)) {
                parsed[argName] = numericValue;
            } else {
                // Try to find entity by name
                const entityId = getEntityIdByName(entities, argValue);
                if (entityId !== null) {
                    parsed[argName] = entityId;
                } else {
                    // Invalid entity name/ID
                    return null;
                }
            }
        } else {
            // Non-entity argument, use as-is
            parsed[argName] = argValue;
        }
    }
    
    return parsed;
}

export default {
    getEntityDisplayName,
    getEntityIdByName,
    getValidEntitiesForArgument,
    getEntitySuggestions,
    parseActionInput
};