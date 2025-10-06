import {query, hasComponent, getComponent} from 'bitecs'
import {z} from 'zod'
import {
    findEntityByName,
    getAllComponentsData,
    getEntityName,
    validateComponentForAction,
    successResult,
    failureResult
} from '../helpers.mjs'

/**
 * Inspect action - get detailed information about any named entity
 * Shows all component values for the entity
 * Requires: Actor must have Eyes component with health >= 0.5
 * @param {Object} game - The game instance
 * @param {Object} params - Action parameters
 * @param {number} params.actorId - The entity performing the action (optional, defaults to game.playerId)
 * @param {string} params.entityName - The name of the entity to inspect
 * @returns {Object} Detailed component information about the entity
 */
export default function inspect(game, params) {
    const actorId = params.actorId ?? game.playerId
    const {world} = game
    const {Name, Eyes} = world.components
    
    // Validate actor has functional Eyes
    const eyesValidation = validateComponentForAction(world, actorId, Eyes, 'Eyes', 'inspect')
    if (!eyesValidation.valid) {
        return failureResult(eyesValidation.error)
    }
    
    // Find entity by name
    const targetEntity = findEntityByName(world, params.entityName)
    
    if (!targetEntity) {
        return failureResult(`No entity found with name "${params.entityName}"`)
    }
    
    // Get all components for this entity
    const entityComponents = getAllComponentsData(world, targetEntity)
    
    // Get relations - both outgoing (from this entity) and incoming (to this entity)
    const entityRelations = {}
    if (world.relations) {
        const relationNames = Object.keys(world.relations)
        
        for (const relationName of relationNames) {
            const relation = world.relations[relationName]
            const outgoingTargets = []
            const incomingSubjects = []
            
            // Check all potential entities (first 1000 entity IDs)
            for (let potentialEntityId = 0; potentialEntityId < 1000; potentialEntityId++) {
                if (!world[potentialEntityId]) continue
                
                try {
                    // Check outgoing: targetEntity has relation to potentialEntityId
                    if (hasComponent(world, targetEntity, relation(potentialEntityId))) {
                        const relationStore = relation(potentialEntityId)
                        const relationData = {}
                        
                        // Extract relation store data
                        if (relationStore && typeof relationStore === 'object') {
                            for (const key in relationStore) {
                                if (Array.isArray(relationStore[key]) && relationStore[key][targetEntity] !== undefined) {
                                    const value = relationStore[key][targetEntity]
                                    // Convert string indices to actual strings
                                    relationData[key] = typeof value === 'number' && world.string_store
                                        ? (world.string_store.getString(value) || value)
                                        : value
                                }
                            }
                        }
                        
                        // Get target entity name
                        const targetName = hasComponent(world, potentialEntityId, Name)
                            ? (getComponent(world, potentialEntityId, Name)?.value || potentialEntityId)
                            : potentialEntityId
                        
                        outgoingTargets.push({
                            targetId: potentialEntityId,
                            targetName,
                            data: Object.keys(relationData).length > 0 ? relationData : null
                        })
                    }
                    
                    // Check incoming: potentialEntityId has relation to targetEntity
                    if (hasComponent(world, potentialEntityId, relation(targetEntity))) {
                        const relationStore = relation(targetEntity)
                        const relationData = {}
                        
                        // Extract relation store data
                        if (relationStore && typeof relationStore === 'object') {
                            for (const key in relationStore) {
                                if (Array.isArray(relationStore[key]) && relationStore[key][potentialEntityId] !== undefined) {
                                    const value = relationStore[key][potentialEntityId]
                                    // Convert string indices to actual strings
                                    relationData[key] = typeof value === 'number' && world.string_store
                                        ? (world.string_store.getString(value) || value)
                                        : value
                                }
                            }
                        }
                        
                        // Get subject entity name
                        const subjectName = hasComponent(world, potentialEntityId, Name)
                            ? (getComponent(world, potentialEntityId, Name)?.value || potentialEntityId)
                            : potentialEntityId
                        
                        incomingSubjects.push({
                            subjectId: potentialEntityId,
                            subjectName,
                            data: Object.keys(relationData).length > 0 ? relationData : null
                        })
                    }
                } catch (e) {
                    // Relation check failed, skip
                }
            }
            
            // Add outgoing relations
            if (outgoingTargets.length > 0) {
                entityRelations[relationName] = outgoingTargets
            }
            
            // Add incoming relations with a special naming to distinguish them
            if (incomingSubjects.length > 0) {
                // For inventory, this shows "what items are in this entity's inventory"
                entityRelations[`${relationName}_incoming`] = incomingSubjects
            }
        }
    }
    
    // Log detailed information to console
    console.log('\n=== ENTITY INSPECTION ===')
    console.log(`Entity: ${params.entityName} (ID: ${targetEntity})`)
    console.log('\nComponents:')
    console.log(JSON.stringify(entityComponents, null, 2))
    
    if (Object.keys(entityRelations).length > 0) {
        console.log('\nRelations:')
        console.log(JSON.stringify(entityRelations, null, 2))
    }
    console.log('========================\n')
    
    // Return AI-friendly summary
    const componentCount = Object.keys(entityComponents).length
    const relationCount = Object.keys(entityRelations).length
    
    let summary = `Inspected "${params.entityName}" (Entity ID: ${targetEntity}). `
    summary += `Found ${componentCount} component${componentCount !== 1 ? 's' : ''}`
    
    if (relationCount > 0) {
        summary += ` and ${relationCount} relation${relationCount !== 1 ? 's' : ''}`
    }
    
    summary += '. Full details logged to console.'
    
    // Add warning if Eyes impaired
    if (eyesValidation.warning) {
        summary += ` (${eyesValidation.warning})`
    }
    
    return successResult(summary, {
        entityId: targetEntity,
        entityName: params.entityName,
        components: entityComponents,
        relations: entityRelations
    })
}

// Action metadata for dynamic command generation and autocomplete
export const metadata = {
    name: 'inspect',
    aliases: ['view', 'check'],
    description: 'Inspect a named entity to see all its component values',
    parameters: ['entityName'],
    autocompletes: [
        ['Name'] // entityName parameter: must have Name component
    ],
    inputSchema: z.object({
        entityName: z.string().min(1, 'Entity name is required')
    }),
    summarizeWithAI: true // Enable AI summarization of inspection results
}
