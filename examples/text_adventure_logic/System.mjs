import { create_event } from './EventQueue.mjs'

class System {
    constructor(name) {
        this.name = name
    }
    async func({ game, event }) {
        return null //returns either null or a valid event object
    }
    create_event(event_name, message, more_details = {}) {
        const event = create_event(event_name, this.name, message, "system", more_details)
        return event
    }
}

export default System