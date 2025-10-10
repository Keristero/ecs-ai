import { create_event } from './EventQueue.mjs'
import { z } from 'zod'
import { query } from 'bitecs'

export const action_argument_schemas = {
    actor_eid: z.number().int().nonnegative().describe("Entity ID"),
    room_eid: z.number().int().nonnegative().nullable().describe("Room Entity ID (null if not in a room)")
}

export class Action {
    constructor(name, aliases, description, argument_schemas = {}, options = {}) {
        this.name = name
        this.aliases = aliases
        this.description = description
        this.options = {
            includeActorRoom: false,
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
    create_event(actor_eid, message, more_details = {}) {
        const event = create_event(this.name, message, "action", {
            actor_eid,
            success: true, // Default to success
            ...more_details
        })
        return event
    }
}

export default Action