import { create_event } from './EventQueue.mjs'

class System {
    constructor(name) {
        this.name = name
        this.event_whitelist = null
    }
    handle_event({game,event}){
        if(this.event_whitelist != null){
            if(!this.event_whitelist.includes(event.name)){
                //if the system has a whitelist, and the event is not in it, ignore the event
                return null
            }
        }
        return this.func({game,event})
    }
    async func({ game, event }) {
        throw Error("not implemented") //should return either null or a valid event object
    }
    create_event(event_name, message, more_details = {}) {
        const event = create_event(event_name, message, "system",{
            system: this.name,
            ...more_details
        })
        return event
    }
}

export default System