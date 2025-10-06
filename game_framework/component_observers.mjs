import {observe, onSet, onGet} from 'bitecs'

/**
 * Setup observers for all components with metadata
 * This automatically creates onSet and onGet observers based on component metadata
 * 
 * Call this once during world initialization. After setup, bitECS's getComponent()
 * will automatically trigger the onGet observers.
 * 
 * @param {Object} world - The bitECS world
 * @param {Object} componentMetadata - Metadata defining component fields
 * 
 * Component metadata format:
 * {
 *   ComponentName: {
 *     stringFields: ['field1', 'field2'],  // Fields that store strings via string store
 *     numberFields: ['field3', 'field4'],  // Fields that store numbers directly
 *     schema: zodSchema                     // Optional Zod schema for validation
 *   }
 * }
 */
function setupComponentObservers(world, componentMetadata) {
    const {getString, addString} = world.string_store
    
    if (!getString || !addString) {
        throw new Error('World must have string_store with getString and addString methods')
    }
    
    for (const [componentName, metadata] of Object.entries(componentMetadata)) {
        const component = world.components[componentName]
        if (!component) {
            console.warn(`Component ${componentName} not found in world, skipping observer setup`)
            continue
        }
        
        const stringFields = metadata.stringFields || []
        const numberFields = metadata.numberFields || []
        
        // Only setup observers if there are fields defined
        if (stringFields.length === 0 && numberFields.length === 0) {
            continue
        }
        
        // Setup onSet observer
        observe(world, onSet(component), (eid, params) => {
            if (!params) return
            
            // Validate with schema if available (Zod or other)
            if (metadata.schema && typeof metadata.schema.parse === 'function') {
                try {
                    metadata.schema.parse(params)
                } catch (error) {
                    console.error(`Component ${componentName} validation failed:`, error.message)
                    return
                }
            }
            
            // Handle string fields
            for (const field of stringFields) {
                if (params[field] !== undefined) {
                    // For single string fields like 'value', store in stringIndex
                    const indexField = field === 'value' ? 'stringIndex' : field
                    component[indexField][eid] = addString(params[field])
                }
            }
            
            // Handle number fields
            for (const field of numberFields) {
                if (params[field] !== undefined) {
                    component[field][eid] = params[field]
                }
            }
        })
        
        // Setup onGet observer
        observe(world, onGet(component), (eid) => {
            const result = {}
            
            // Handle string fields
            for (const field of stringFields) {
                const indexField = field === 'value' ? 'stringIndex' : field
                const stringIndex = component[indexField][eid]
                result[field] = getString(stringIndex)
            }
            
            // Handle number fields
            for (const field of numberFields) {
                result[field] = component[field][eid]
            }
            
            return result
        })
    }
}

export {
    setupComponentObservers
}
