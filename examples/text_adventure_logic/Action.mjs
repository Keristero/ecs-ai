import { create_event } from './EventQueue.mjs'
import { z } from 'zod'

export const action_argument_schemas = {
    actor_eid: z.number().int().nonnegative().describe("Entity ID")
}

export class Action {
    constructor(name, aliases, description,argument_schemas = {}) {
        this.name = name
        this.aliases = aliases
        this.description = description
        this.argument_schema = z.object({
            actor_eid: action_argument_schemas.actor_eid,
            ...argument_schemas
        })
    }
    async execute(game,args) {
        console.log(`Executing action: ${this.name}`)
        let valid_event = this.argument_schema.parse(args)
        //console.log(`Validating arguments against schema...`)
        return await this.func(game,args)
    }
    create_event(actor_eid, message, more_details = {}) {
        const event = create_event(this.name, message, "action",{
            actor_eid,
            ...more_details
        })
        return event
    }
}

export default Action