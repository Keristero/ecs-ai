// Configuration for which events should be logged and which UI elements they update
export const event_type_config = {
    'action_schemas': {
        log_event: true,
        handle(event) {
            state.actions = event.details;
            console.log('Action schemas updated:', state.actions);
        }
    },
    'system': {
        log_event: true,
        handle(event) {
            if(system_event_config[event.name]) {
                const config = system_event_config[event.name];
                if (config && config.handle) {
                    config.handle(event);
                }
            }else{
                console.warn('Unhandled event name:', event.name);
            }
        }
    },
    'action': {
        log_event: true,
        handle(event) {
            if(action_event_config[event.name]) {
                const config = action_event_config[event.name];
                if (config.print_own_actions && event.details.actor_eid === state.player_eid) {
                    console.log('You perform the action:', event.name);
                }
                if (config && config.handle) {
                    config.handle(event);
                }
            }else{
                console.warn('Unhandled event name:', event.name);
            }
        }
    },
};

export const system_event_config = {
    'game_start':{
        handle(event){

        }
    },
    'actor_turn_change':{
        handle(event){
        }
    },
    'identify_player':{
        handle(event){
            console.log(`Our player eid is ${event.details.eid}`);
            state.player_eid = event.details.eid
        }
    }
}

export const action_event_config = {
    'look':{
        print_own_actions: true,
        handle(event){
        }
    }
}

// Configuration for entity categories based on components
export const entityCategories = [
    { name: 'NPCs', componentKey: 'npc' },
    { name: 'Items', componentKey: 'item' },
    { name: 'Enemies', componentKey: 'enemy' },
    { name: 'Exits', componentKey: 'exit' }
];

// Configuration for status bars
export const statusBarConfig = [
    { component: 'health', label: 'Health', className: 'health' },
    { component: 'mana', label: 'Mana', className: 'mana' },
    { component: 'stamina', label: 'Stamina', className: 'stamina' }
];

// Client state
export const state = {
    entities: new Map(),
    actions: {},
    player_eid: null
};

// Handle incoming event
export const handleEvent = (event) => {
    if(event_type_config[event.type]) {
        const config = event_type_config[event.type];
        if(config.logMessage) {
            console.log(event)
        }
        if (config && config.handle) {
            config.handle(event);
        }
    }else{
        console.log('Unhandled event type:', event.type);
    }
};


export const handleCommand = (command) => {
    console.log(command)
    let parsed_command = command.split(' ')[0]
    let args = {
        actor_eid: state.player_eid
    }
    if(state.actions[parsed_command]){
        console.log('Recognised input:', parsed_command)
        let action = state.actions[parsed_command]
        let message = {
            name: action.name,
            type: 'action',
            args: args
        }
        //now we would validate the arguments
        return message
    }
}