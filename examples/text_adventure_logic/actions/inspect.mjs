import {hasComponent, getComponent} from 'bitecs'
import {z} from 'zod'
import {
    findEntityByName,
    getAllComponentsData,
    validateComponentForAction,
    successResult,
    failureResult
} from '../helpers.mjs'

/**
 * Inspect action - get detailed information about any named entity
 * Shows all component values and relations for the entity
 * Requires: Actor must have Eyes component with health >= 0.5
 * @param {Object} game - The game instance
 * @param {Object} params - Action parameters
 * @param {number} params.actorId - The entity performing the action (optional, defaults to game.playerId)
 * @param {string} params.entityName - The name of the entity to inspect
 * @returns {Object} Detailed component and relation information about the entity
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
    
    // Get all relations for this entity (simple iteration through all relation types and potential targets)
    const entityRelations = {}
    if (world.relations) {
        for (const [relationName, relation] of Object.entries(world.relations)) {
            const targets = []
            
            // Check potential targets (limit to reasonable range)
            for (let targetId = 0; targetId < 1000; targetId++) {
                try {
                    if (hasComponent(world, targetEntity, relation(targetId))) {
                        // Get target entity name if it has one
                        const targetName = hasComponent(world, targetId, Name)
                            ? (getComponent(world, targetId, Name)?.value || targetId)
                            : targetId
                        
                        targets.push({
                            targetId,
                            targetName
                        })
                    }
                } catch (e) {
                    // Relation check failed for this target, skip
                }
            }
            
            if (targets.length > 0) {
                entityRelations[relationName] = targets
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
    
    // Build summary message
    const componentCount = Object.keys(entityComponents).length
    const relationCount = Object.keys(entityRelations).length
    
    let summary = `Inspected "${params.entityName}" (ID: ${targetEntity}). `
    summary += `${componentCount} component${componentCount !== 1 ? 's' : ''}`
    
    if (relationCount > 0) {
        summary += `, ${relationCount} relation${relationCount !== 1 ? 's' : ''}`
    }
    
    summary += '. Details logged to console.'
    
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
