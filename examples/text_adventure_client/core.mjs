// Configuration for which events should be logged and which UI elements they update
export const event_type_config = {
    'action_schemas': {
        debug_log: true,
        handle(event) {
            state.actions = event.details;
            console.log('Action schemas updated:', state.actions);
        }
    },
    'system': {
        debug_log: true,
        handle(event) {
            let res = generic_config_handler(event,system_event_config,'name');
            return res
        }
    },
    'action': {
        debug_log: true,
        handle(event) {
            let res = generic_config_handler(event,action_event_config,'name');
            res.is_own_action = event.details.actor_eid === state.player_eid
            if(res.is_own_action){
                res.print = true
            }
            if(res.details && event.details.success === false){
                res.print_style = 'error'
            }
            return res
        }
    },
    'narration': {
        debug_log: false,
        handle(event) {
            return event_response({
                message: event.details.text,
                print: true,
                print_style: 'narration'
            });
        }
    },
};

export const system_event_config = {
    'game_start':{
        handle(event){
            return event_response({
                print:true,
                print_style:'success'
            })
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
    },
    'ai_narrative':{
        handle(event){
            return event_response({
                print:true,
                print_style:'narration'
            })
        }
    }
}

export const action_event_config = {
    'look':{
        handle(event){
            for(let eid in event.details.entities){
                state.entities[eid] = event.details.entities[eid]
            }
            return event_response({
                refresh_ui_sections:['room_content']
            })
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
    entities: {},
    actions: {},
    player_eid: null,
};

function event_response(args){
    let defaults = {
        message:"DEFAULT MESSAGE",
        print:false,
        print_style:'info',
        refresh_ui_sections:[]
    }
    Object.assign(defaults,args)
    return defaults
}

function generic_config_handler(event,config,discriminator='type'){
    if(config[event[discriminator]]) {
        const c = config[event[discriminator]];
        if(c.debug_log) {
            console.log(event)
        }
        if (c && c.handle) {
            return c.handle(event);
        }
    }else{
        console.log(`Unhandled event ${discriminator}:`, event[discriminator]);
    }
}

// Handle incoming event
export const handle_event = (event) => {
    return generic_config_handler(event,event_type_config,'type');
};


export const handle_command = (command) => {
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

export const filter_entities_by_component = function(entities, componentKeys){
    let out = {}
    for(let eid in entities){
        // Check if entity has ALL specified components
        let hasAllComponents = true;
        for(let componentKey of componentKeys){
            if(!entities[eid][componentKey]){
                hasAllComponents = false;
                break;
            }
        }
        if(hasAllComponents){
            out[eid] = entities[eid]
        }
    }
    return out
}

export const filter_and_format_entities = function(entities, componentKeys, componentProperty){
    let filtered = filter_entities_by_component(entities, componentKeys);
    let out = {}
    for(let eid in filtered){
        // Find the first component that has the requested property
        for(let componentKey of componentKeys){
            if(filtered[eid][componentKey] && filtered[eid][componentKey][componentProperty] != undefined){
                out[eid] = filtered[eid][componentKey][componentProperty]
                break; // Stop after finding the first valid property
            }
        }
    }
    return out
}