import {query, hasComponent, getComponent} from 'bitecs'
import {z} from 'zod'
import {
    findEntityByName,
    getAllComponentsData,
    getEntityName,
    successResult,
    failureResult
} from '../helpers.mjs'

/**
 * Inspect action - get detailed information about any named entity
 * Shows all component values for the entity
 * @param {Object} game - The game instance
 * @param {Object} params - Action parameters
 * @param {string} params.entityName - The name of the entity to inspect
 * @returns {Object} Detailed component information about the entity
 */
export default function inspect(game, params) {
    const {world} = game
    const {Name} = world.components
    
    // Find entity by name
    const targetEntity = findEntityByName(world, params.entityName)
    
    if (!targetEntity) {
        return failureResult(`No entity found with name "${params.entityName}"`)
    }
    
    // Get all components for this entity
    const entityComponents = getAllComponentsData(world, targetEntity)
    
    // Get relations
    const entityRelations = {}
    if (world.relations) {
        const relationNames = Object.keys(world.relations)
        
        for (const relationName of relationNames) {
            const relation = world.relations[relationName]
            const targets = []
            
            // Check all potential targets (first 1000 entity IDs)
            for (let potentialTarget = 0; potentialTarget < 1000; potentialTarget++) {
                if (!world[potentialTarget]) continue
                
                try {
                    if (hasComponent(world, targetEntity, relation(potentialTarget))) {
                        const relationStore = relation(potentialTarget)
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
                        const targetName = hasComponent(world, potentialTarget, Name)
                            ? (getComponent(world, potentialTarget, Name)?.value || potentialTarget)
                            : potentialTarget
                        
                        targets.push({
                            targetId: potentialTarget,
                            targetName,
                            data: Object.keys(relationData).length > 0 ? relationData : null
                        })
                    }
                } catch (e) {
                    // Relation check failed, skip
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
    
    // Return AI-friendly summary
    const componentCount = Object.keys(entityComponents).length
    const relationCount = Object.keys(entityRelations).length
    
    let summary = `Inspected "${params.entityName}" (Entity ID: ${targetEntity}). `
    summary += `Found ${componentCount} component${componentCount !== 1 ? 's' : ''}`
    
    if (relationCount > 0) {
        summary += ` and ${relationCount} relation${relationCount !== 1 ? 's' : ''}`
    }
    
    summary += '. Full details logged to console.'
    
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
