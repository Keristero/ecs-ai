import {query, hasComponent, getComponent} from 'bitecs'
import {z} from 'zod'

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
    const entities = query(world, [Name])
    const targetEntity = entities.find(e => {
        const name = getComponent(world, e, Name)?.value || ''
        return name.toLowerCase() === params.entityName.toLowerCase()
    })
    
    if (!targetEntity) {
        return {
            success: false,
            message: `No entity found with name "${params.entityName}"`
        }
    }
    
    // Get all components for this entity
    const entityComponents = {}
    const componentNames = Object.keys(world.components)
    
    for (const componentName of componentNames) {
        const component = world.components[componentName]
        
        if (hasComponent(world, targetEntity, component)) {
            // Get component data using getComponent (triggers onGet observers)
            const componentData = getComponent(world, targetEntity, component)
            
            // Store the component data
            entityComponents[componentName] = componentData || {}
        }
    }
    
    // Also check relations
    const entityRelations = {}
    if (world.relations) {
        const relationNames = Object.keys(world.relations)
        
        for (const relationName of relationNames) {
            const relation = world.relations[relationName]
            
            // Check if this entity has any targets for this relation
            // We need to check all entities to see if targetEntity relates to them
            const targets = []
            
            // For each potential target, check if targetEntity has relation to it
            const allEntities = []
            for (let i = 0; i < 1000; i++) { // Check first 1000 entity IDs
                if (world[i]) allEntities.push(i)
            }
            
            for (const potentialTarget of allEntities) {
                try {
                    if (hasComponent(world, targetEntity, relation(potentialTarget))) {
                        // Get relation data if it has a store
                        const relationStore = relation(potentialTarget)
                        const relationData = {}
                        
                        // Check if store has fields
                        if (relationStore && typeof relationStore === 'object') {
                            for (const key in relationStore) {
                                if (Array.isArray(relationStore[key]) && relationStore[key][targetEntity] !== undefined) {
                                    const value = relationStore[key][targetEntity]
                                    // Try to convert string indices to actual strings
                                    if (typeof value === 'number' && world.string_store) {
                                        relationData[key] = world.string_store.getString(value) || value
                                    } else {
                                        relationData[key] = value
                                    }
                                }
                            }
                        }
                        
                        // Get target entity name if it has one
                        let targetName = potentialTarget
                        if (hasComponent(world, potentialTarget, Name)) {
                            targetName = getComponent(world, potentialTarget, Name)?.value || potentialTarget
                        }
                        
                        targets.push({
                            targetId: potentialTarget,
                            targetName: targetName,
                            data: Object.keys(relationData).length > 0 ? relationData : null
                        })
                    }
                } catch (e) {
                    // Relation check failed, skip this target
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
    
    return {
        success: true,
        message: summary,
        entityId: targetEntity,
        entityName: params.entityName,
        components: entityComponents,
        relations: entityRelations
    }
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
