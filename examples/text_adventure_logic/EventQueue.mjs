import crypto from 'crypto'
import { EventEmitter } from 'events'
import Logger from '../../logger.mjs'
const logger = new Logger('EventQueue', 'yellow')
import { z } from 'zod'

export const EVENT_TYPES = {
    ACTION: 'action',
    SYSTEM: 'system'
}

export const EVENT_NAMES = {
    // System events
    GAME_START: 'game_start',
    ACTOR_TURN_CHANGE: 'actor_turn_change',
    IDENTIFY_PLAYER: 'identify_player',
    ROOM_UPDATE: 'room_update',
    INVENTORY_UPDATE: 'inventory_update',
    MOVEMENT_UPDATE: 'movement_update',
    // Action events
    LOOK: 'look',
    PICKUP: 'pickup', 
    DROP: 'drop',
    MOVE: 'move',
}

//zod schema for event
let event_schema = z.object({
    name: z.string(), // Allow any string for custom system events
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
        this.systems = game.systems || {}
        this.game = game
        this.emitter = new EventEmitter()
    }
    async queue(event) {
        let valid_event = event_schema.parse(event)
        logger.info('Event queued', valid_event)
        this.events.push(event)
        this.emitter.emit('event', event)

        // Sort systems by priority (lower number = higher priority)
        const sortedSystems = Object.entries(this.systems)
            .sort(([nameA, systemA], [nameB, systemB]) => {
                const priorityA = systemA.priority ?? 0
                const priorityB = systemB.priority ?? 0
                return priorityA - priorityB
            })

        let responses = {}

        for(const [system_name, system] of sortedSystems){
            logger.info("Processing system:", system_name, "priority:", system.priority ?? 0);
            responses[system_name] = await system.handle_event({game: this.game, event})
        }

        await Promise.all(Object.values(responses))

        for(const system_name in responses){
            let result = responses[system_name]
            if(result != null){
                await this.queue(result)
            }
        }
    }
}
