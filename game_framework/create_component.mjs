import {observe, onSet, onGet, createRelation} from 'bitecs'
import { z } from 'zod'

function CreateRelation(options,schema=z.object({})){
    //options could be {autoRemoveSubject: true, exclusive: true}
    let data, storeTemplate = null
    
    // Only create a store if there are fields in the schema
    const hasFields = Object.keys(schema.shape).length > 0
    
    if(hasFields){
        // Create the store template - this defines what fields the store has
        storeTemplate = {}
        for(const key in schema.shape){
            storeTemplate[key] = []
        }
        
        // Store reference for observer setup
        let createdStores = new Map() // Track stores for each target
        
        // The store function must return a NEW store object each time it's called
        data = createRelation({
            store: () => {
                const newStore = {}
                for(const key in storeTemplate){
                    newStore[key] = []
                }
                return newStore
            },
            ...options
        })
        
        // Store reference to original relation for bitECS compatibility
        const originalRelation = data
        
        // Wrap the relation to track store creation while preserving bitECS compatibility
        data = new Proxy(originalRelation, {
            apply(target, thisArg, args) {
                const targetEid = args[0] // The target entity ID
                const store = Reflect.apply(target, thisArg, args)
                
                // Store the mapping for enableObservers
                if(targetEid !== undefined && !createdStores.has(targetEid)) {
                    createdStores.set(targetEid, store)
                }
                
                return store
            },
            get(target, prop) {
                // Preserve all bitECS properties and methods
                return Reflect.get(target, prop)
            }
        })
        
        // Expose the stores map for observer setup
        data._stores = createdStores
    }else{
        data = createRelation({...options})
    }
    
    const relation_metadata = {
        relation: data,
        data: data,
        storeTemplate: storeTemplate,
        schema: schema,
        enableObservers: function(world) {
            // Only set up observers if there are fields in the schema
            if (!hasFields) return
            
            const {getString, addString} = world.string_store
            
            // Set up observers on existing stores and future stores
            const setupObserversForStore = (store) => {
                if (store._hasObservers) return store
                
                observe(world, onSet(store), (eid, params) => {
                    if (!params) return
                    schema.parse(params)
                    
                    for(const param in params){
                        const fieldType = schema.shape[param]
                        if(fieldType._def?.typeName === 'ZodString'){
                            store[param][eid] = addString(params[param])
                        }
                        else if(fieldType._def?.typeName === 'ZodNumber'){
                            store[param][eid] = params[param]
                        }
                    }
                })
                
                // Add onGet observer for proper bitECS compatibility
                observe(world, onGet(store), (eid) => {
                    const result = {}
                    for(const field in schema.shape){
                        const fieldType = schema.shape[field]
                        if(fieldType._def?.typeName === 'ZodString'){
                            const stringIndex = store[field][eid]
                            if(stringIndex !== undefined) {
                                result[field] = getString(stringIndex)
                            }
                        }
                        else if(fieldType._def?.typeName === 'ZodNumber'){
                            result[field] = store[field][eid]
                        }
                    }
                    return result
                })
                
                store._hasObservers = true
                return store
            }
            
            // Set up observers on already created stores
            for(const store of data._stores.values()) {
                setupObserversForStore(store)
            }
            
            // Wrap the relation to add observers to newly created stores
            const originalRelation = data
            const wrappedRelation = function(targetEid) {
                const store = originalRelation(targetEid)
                return setupObserversForStore(store)
            }
            
            // Preserve all bitECS properties and prototype chain for full compatibility
            Object.setPrototypeOf(wrappedRelation, Object.getPrototypeOf(originalRelation))
            
            // Copy all enumerable and non-enumerable properties
            const descriptors = Object.getOwnPropertyDescriptors(originalRelation)
            for(const key in descriptors) {
                if(key !== 'length' && key !== 'name' && key !== 'prototype') {
                    Object.defineProperty(wrappedRelation, key, descriptors[key])
                }
            }
            
            // Ensure bitECS can recognize this as the same relation type
            wrappedRelation._bitECSRelation = true
            wrappedRelation._original = originalRelation
            
            // Update the relation in metadata
            relation_metadata.data = wrappedRelation
        }
    }
    
    return relation_metadata
}

function CreateComponent(schema=z.object({})){
    //Create a array of fields based on the schema
    const component_metadata = {schema}
    let data = {}

    for(const key in schema.shape){
        data[key] = []
    }
    
    component_metadata.enableObservers = function(world){
        const {getString, addString} = world.string_store
        
        // console.log('[CreateComponent] Setting up observers for component with schema:', Object.keys(schema.shape))
        
        observe(world, onSet(data), (eid, params) => {
            // console.log('[Observer onSet] Triggered for eid:', eid, 'params:', params)
            if (!params) return
            schema.parse(params)

            for(const param in params){
                const fieldType = schema.shape[param]
                //if its a string, use addString
                if(fieldType._def?.typeName === 'ZodString'){
                    // console.log('[Observer onSet] Setting string field', param, 'for eid', eid, 'value:', params[param])
                    data[param][eid] = addString(params[param])
                }
                //if its a number, just assign it
                else if(fieldType._def?.typeName === 'ZodNumber'){
                    // console.log('[Observer onSet] Setting number field', param, 'for eid', eid, 'value:', params[param])
                    data[param][eid] = params[param]
                }
            }
        })
        observe(world, onGet(data), (eid) => {
            // console.log('[Observer onGet] Triggered for eid:', eid)
            const result = {}
            for(const field in schema.shape){
                const fieldType = schema.shape[field]
                //if its a string, use getString
                if(fieldType._def?.typeName === 'ZodString'){
                    const stringIndex = data[field][eid]
                    result[field] = getString(stringIndex)
                    // console.log('[Observer onGet] String field', field, 'index:', stringIndex, 'value:', result[field])
                }
                //if its a number, just assign it
                else if(fieldType._def?.typeName === 'ZodNumber'){
                    result[field] = data[field][eid]
                    // console.log('[Observer onGet] Number field', field, 'value:', result[field])
                }
            }
            // console.log('[Observer onGet] Returning result:', result)
            return result
        })
    }
    component_metadata.data = data
    return component_metadata
}

export {CreateComponent,CreateRelation}