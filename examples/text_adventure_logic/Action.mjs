import { create_event } from './EventQueue.mjs'

export const action_argument_schemas = {
    actor_eid: {type: 'number', description: 'The entity ID of the actor performing the action'},
}

export class Action {
    constructor(name, aliases, description,argument_schemas = {}) {
        this.name = name
        this.aliases = aliases
        this.description = description
        this.arguments = {
            actor_eid: action_argument_schemas.actor_eid
        }
    }
    async execute(game,args) {
        console.log(`Executing action: ${this.name}`)
        //console.log(`Validating arguments against schema...`)
        for(let arg_name in args) {
        }
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