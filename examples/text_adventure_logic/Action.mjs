import { create_event, EVENT_TYPES } from './EventQueue.mjs'
import { z } from 'zod'
import { query } from 'bitecs'

export const action_argument_schemas = {
    actor_eid: z.number().int().nonnegative().describe("Entity ID"),
    room_eid: z.number().int().nonnegative().nullable().describe("Room Entity ID (null if not in a room)"),
    target_eid: z.number().int().nonnegative().describe("Target Entity ID")
}

export class Action {
    constructor(name, aliases, description, argument_schemas = {}, options = {}) {
        this.name = name
        this.aliases = aliases
        this.description = description
        this.options = {
            includeActorRoom: false,
            entityValidation: {}, // Map of argument names to required components/relations
            ...options
        }
        
        // Build the argument schema based on options
        let schema_fields = {
            actor_eid: action_argument_schemas.actor_eid,
            ...argument_schemas
        }
        
        // Add room_eid to schema if includeActorRoom is enabled
        if (this.options.includeActorRoom) {
            schema_fields.room_eid = action_argument_schemas.room_eid
        }
        
        this.argument_schema = z.object(schema_fields)
    }
    
    async execute(game, args) {
        try {
            // Auto-add actor's room if enabled
            if (this.options.includeActorRoom) {
                args = await this._addActorRoom(game, args)
            }
            
            // Validate arguments against schema
            this.argument_schema.parse(args)
            
            // Validate entity requirements
            await this._validateEntityRequirements(game, args)
            
            // Execute the action and ensure it has a success flag
            const result = await this.func(game, args)
            
            // Add success flag if not already present
            if (result && typeof result === 'object' && result.details) {
                result.details.success = result.details.success !== undefined ? result.details.success : true
            }
            
            return result
            
        } catch (error) {
            // Return standardized failure event for validation errors
            
            const actor_eid = args.actor_eid || null
            return this.create_event(
                actor_eid,
                `Failed to ${this.name}: ${error.message}`,
                {
                    success: false,
                    error: error.message
                }
            )
        }
    }
    
    async _addActorRoom(game, args) {
        const { world } = game
        const { Room } = world.components
        const { Has } = world.relations
        const { actor_eid } = args
        
        // Find which room contains the actor
        // We need to find rooms that have a Has(actor_eid) relation
        const rooms = query(world, [Room, Has(actor_eid)])
        const room_eid = rooms[0] || null
        
        return {
            ...args,
            room_eid
        }
    }
    
    async _validateEntityRequirements(game, args) {
        const { world } = game
        const { hasComponent, getRelationTargets } = await import('bitecs')
        
        for (const [argName, requirements] of Object.entries(this.options.entityValidation)) {
            const entityId = args[argName]
            if (entityId === undefined || entityId === null) continue
            
            // Validate required components
            if (requirements.components) {
                for (const componentName of requirements.components) {
                    const component = world.components[componentName]
                    if (!component) {
                        throw new Error(`Component ${componentName} not found in world`)
                    }
                    if (!hasComponent(world, entityId, component)) {
                        throw new Error(`Entity ${entityId} must have component ${componentName}`)
                    }
                }
            }
            
            // Validate required relations
            if (requirements.relations) {
                for (const relationName of requirements.relations) {
                    const relation = world.relations[relationName]
                    if (!relation) {
                        throw new Error(`Relation ${relationName} not found in world`)
                    }
                    const targets = getRelationTargets(world, entityId, relation)
                    if (targets.length === 0) {
                        throw new Error(`Entity ${entityId} must have relation ${relationName}`)
                    }
                }
            }
            
            // Validate that entity must be a target of specific relations
            if (requirements.isTargetOf) {
                for (const relationSpec of requirements.isTargetOf) {
                    const { relation: relationName, source } = relationSpec
                    const relation = world.relations[relationName]
                    if (!relation) {
                        throw new Error(`Relation ${relationName} not found in world`)
                    }
                    
                    let sourceEntityId = source
                    if (typeof source === 'string') {
                        // Source is another argument name
                        sourceEntityId = args[source]
                    }
                    
                    const targets = getRelationTargets(world, sourceEntityId, relation)
                    if (!targets.includes(entityId)) {
                        throw new Error(`Entity ${entityId} must be a target of ${relationName} from entity ${sourceEntityId}`)
                    }
                }
            }
            
            // Validate relation values (for string/value arguments)
            if (requirements.relationValues) {
                for (const valueSpec of requirements.relationValues) {
                    const { relation: relationName, source, valueField } = valueSpec
                    const relation = world.relations[relationName]
                    if (!relation) {
                        throw new Error(`Relation ${relationName} not found in world`)
                    }
                    
                    let sourceEntityId = source
                    if (typeof source === 'string') {
                        // Source is another argument name
                        sourceEntityId = args[source]
                    }
                    
                    // Get the argument value to validate
                    const argValue = args[argName]
                    
                    // Get relation data to check if the value is valid
                    try {
                        const { get_relation_data_for_entity } = await import('./helpers.mjs')
                        const relationData = get_relation_data_for_entity(world, sourceEntityId, [relationName])
                        
                        const validValues = []
                        if (relationData[relationName]) {
                            for (const [entityId, data] of Object.entries(relationData[relationName])) {
                                if (data[valueField]) {
                                    validValues.push(data[valueField])
                                }
                            }
                        }
                        
                        if (!validValues.includes(argValue)) {
                            const validOptions = validValues.join(', ')
                            throw new Error(`Invalid ${argName} '${argValue}'. Valid options: ${validOptions}`)
                        }
                    } catch (error) {
                        if (error.message.startsWith('Invalid')) {
                            throw error
                        }
                        throw new Error(`Failed to validate ${argName}: ${error.message}`)
                    }
                }
            }
        }
    }
    create_event(actor_eid, message, more_details = {}) {
        const event = create_event(this.name, message, EVENT_TYPES.ACTION, {
            actor_eid,
            success: true, // Default to success
            ...more_details
        })
        return event
    }
}

export default Action