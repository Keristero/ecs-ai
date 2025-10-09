import crypto from 'crypto'
import { EventEmitter } from 'events'
import Logger from '../../logger.mjs'
const logger = new Logger('EventQueue', 'yellow')
import { z } from 'zod'

//zod schema for event
let event_schema = z.object({
    name: z.string(),
    message: z.string(),
    type: z.enum(["action", "system"]),
    details: z.record(z.any())
})

export function create_event(event_name, message, event_type, details = {}) {
    const event = {
        name: event_name,
        message: message,
        type: event_type,
        details: details
    }
    return event
}

export class EventQueue {
    constructor(game) {
        this.events = [] // chronological list of events
        this.systems = game.world.systems || {}
        this.game = game
        this.emitter = new EventEmitter()
    }
    async queue(event) {
        let valid_event = event_schema.parse(event)
        logger.info('Event queued', valid_event)
        this.events.push(event)
        this.emitter.emit('event', event)

        // Get system names for tracking
        const systemNames = Object.keys(this.systems)
        const systemFunctions = Object.values(this.systems)

        let responses = {}

        for(const system_name in this.systems){
            console.log("Processing system:", system_name);
            let system = this.systems[system_name]
            responses[system_name] = await system.func({game: this.game, event})
        }

        await Promise.all(Object.values(responses))

        for(const system_name in responses){
            let result = responses[system_name]
            if(result != null){
                console.log(result)
                await this.queue(result.value)
            }
        }
    }
}
