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
    }else{
        data = createRelation({...options})
    }
    return {
        relation: data,
        data: data,
        storeTemplate: storeTemplate
    }
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
        
        console.log('[CreateComponent] Setting up observers for component with schema:', Object.keys(schema.shape))
        
        observe(world, onSet(data), (eid, params) => {
            console.log('[Observer onSet] Triggered for eid:', eid, 'params:', params)
            if (!params) return
            schema.parse(params)

            for(const param in params){
                const fieldType = schema.shape[param]
                //if its a string, use addString
                if(fieldType._def?.typeName === 'ZodString'){
                    console.log('[Observer onSet] Setting string field', param, 'for eid', eid, 'value:', params[param])
                    data[param][eid] = addString(params[param])
                }
                //if its a number, just assign it
                else if(fieldType._def?.typeName === 'ZodNumber'){
                    console.log('[Observer onSet] Setting number field', param, 'for eid', eid, 'value:', params[param])
                    data[param][eid] = params[param]
                }
            }
        })
        observe(world, onGet(data), (eid) => {
            console.log('[Observer onGet] Triggered for eid:', eid)
            const result = {}
            for(const field in schema.shape){
                const fieldType = schema.shape[field]
                //if its a string, use getString
                if(fieldType._def?.typeName === 'ZodString'){
                    const stringIndex = data[field][eid]
                    result[field] = getString(stringIndex)
                    console.log('[Observer onGet] String field', field, 'index:', stringIndex, 'value:', result[field])
                }
                //if its a number, just assign it
                else if(fieldType._def?.typeName === 'ZodNumber'){
                    result[field] = data[field][eid]
                    console.log('[Observer onGet] Number field', field, 'value:', result[field])
                }
            }
            console.log('[Observer onGet] Returning result:', result)
            return result
        })
    }
    component_metadata.data = data
    return component_metadata
}

export {CreateComponent,CreateRelation}