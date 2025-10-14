// Configuration for which events should be logged and which UI elements they update
export const event_type_config = {
    'action_schemas': {
        debug_log: true,
        handle(event) {
            state.actions = event.details;
            console.log('Action schemas updated:', state.actions);
            
            // Initialize autocomplete system after actions are loaded
            if (window.initializeAutocompleteWhenReady) {
                window.initializeAutocompleteWhenReady();
            }
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
        debug_log: false,
        handle(event) {
            let res = generic_config_handler(event,action_event_config,'name');
            let is_own_action = event.details.actor_eid === state.player_eid
            if(is_own_action){
                res.print = true
                res.debug_log = true
            }
            if(res.details && event.details.success === false){
                res.print_style = 'error'
            }
            return res
        }
    }
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
    },
    'look_result':{
        handle(event){
            // Only update state if this involves the current player
            if(event.details.actor_eid === state.player_eid){
                // Clear existing entities first to avoid showing entities from other rooms
                state.entities = {}
                
                // Add all room entities (server now only sends actual room entities)
                console.log('Look result event - updating entities:', event.details.entities);
                for(let eid in event.details.entities){
                    state.entities[eid] = event.details.entities[eid]
                }
                console.log('Updated state.entities:', state.entities);
                 
                // Update player inventory from the player entity's Has relations
                const playerEntity = event.details.entities[state.player_eid];
                if (playerEntity) {
                    // Always clear inventory first, then rebuild from current Has relations
                    state.inventory = {};
                    
                    // Check for Has relation directly on the entity (flattened structure)
                    if (playerEntity.Has) {
                        console.log('Updating inventory from player Has relations:', playerEntity.Has);
                        
                        // Player's Has relations now contain complete entity data (depth=2)
                        for (let itemEid in playerEntity.Has) {
                            const itemData = playerEntity.Has[itemEid];
                            // The item data is now embedded in the relation (thanks to depth=2)
                            state.inventory[itemEid] = itemData;
                        }
                    } else {
                        console.log('Player has no Has relations - inventory cleared');
                    }
                    console.log('Updated inventory state:', state.inventory);
                }
                
                return event_response({
                    print: true,
                    print_style: 'info',
                    refresh_ui_sections: ['room_content', 'inventory', 'status']
                })
            }
            // Don't refresh UI for other players' look results
            return event_response({})
        }
    }
}

export const action_event_config = {
    'look':{
        handle(event){
            // Look actions just print the message - state updates handled by look_result system
            return event_response({
                print_style: 'info'
            })
        }
    },
    'pickup':{
        handle(event){
            // Only respond to the current player's actions
            if(event.details.actor_eid === state.player_eid){
                return event_response({
                    print: true,
                    print_style: event.details.success ? 'success' : 'error'
                })
            }
            return event_response({})
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

// Configuration for status bars - supports different display types and colors
export const statusBarConfig = [
    // Bar-type components (with max/current values)
    { 
        component: 'Hitpoints', 
        label: 'Health', 
        className: 'hitpoints',
        displayType: 'bar',
        color: '#e74c3c',
        fields: ['current', 'max']
    },
    { 
        component: 'mana', 
        label: 'Mana', 
        className: 'mana',
        displayType: 'bar',
        color: '#3498db',
        fields: ['current', 'max']
    },
    { 
        component: 'stamina', 
        label: 'Stamina', 
        className: 'stamina',
        displayType: 'bar',
        color: '#f39c12',
        fields: ['current', 'max']
    },
    // Number-type components (individual numeric values)
    { 
        component: 'Attributes', 
        label: 'Strength', 
        className: 'strength',
        displayType: 'number',
        color: '#c0392b',
        field: 'strength'
    },
    { 
        component: 'Attributes', 
        label: 'Dexterity', 
        className: 'dexterity',
        displayType: 'number',
        color: '#27ae60',
        field: 'dexterity'
    },
    { 
        component: 'Attributes', 
        label: 'Intelligence', 
        className: 'intelligence',
        displayType: 'number',
        color: '#8e44ad',
        field: 'intelligence'
    },
    { 
        component: 'Actor', 
        label: 'Initiative', 
        className: 'initiative',
        displayType: 'number',
        color: '#16a085',
        field: 'initiative'
    }
];

// Client state
export const state = {
    entities: {},
    actions: {},
    player_eid: null,
    inventory: {}, // Track player's inventory items
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
    console.log('Processing command:', command);
    
    const parts = command.trim().split(/\s+/);
    const actionName = parts[0];
    
    // Find the action (by name or alias)
    let action = null;
    let actionKey = null;
    
    // Look for exact key match first
    if (state.actions[actionName]) {
        action = state.actions[actionName];
        actionKey = actionName;
    } else {
        // Look for action by name or alias
        for (const [key, act] of Object.entries(state.actions)) {
            if (act.name === actionName || (act.aliases && act.aliases.includes(actionName))) {
                action = act;
                actionKey = key;
                break;
            }
        }
    }
    
    if (!action) {
        console.log('Unrecognized action:', actionName);
        return null;
    }
    
    console.log('Recognized action:', action.name);
    
    // Parse arguments using entity helpers
    const { parseActionInput } = window.entityHelpers || {};
    if (!parseActionInput) {
        console.error('Entity helpers not loaded');
        return null;
    }
    
    const parsed = parseActionInput(command, action, state.entities, state.inventory);
    if (!parsed) {
        console.log('Failed to parse action arguments');
        return null;
    }
    
    // Build final arguments
    const args = {
        actor_eid: state.player_eid,
        ...parsed
    };
    
    // Remove the action name from args
    delete args.actionName;
    
    const message = {
        name: action.name,
        type: 'action',
        args: args
    };
    
    console.log('Sending action:', message);
    return message;
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

// Inventory helper functions
export const get_inventory_items = function(){
    return filter_entities_by_component(state.inventory, ['Item']);
}

export const get_inventory_item_names = function(){
    return filter_and_format_entities(state.inventory, ['Name'], 'value');
}

// Status helper functions
export const get_player_status = function(){
    const playerEntity = state.entities[state.player_eid];
    if (!playerEntity) return {};
    
    const status = [];
    
    // Build status data using the enhanced declarative statusBarConfig
    for (const statusConfig of statusBarConfig) {
        const componentData = playerEntity[statusConfig.component];
        if (componentData) {
            let statusItem = {
                label: statusConfig.label,
                className: statusConfig.className,
                displayType: statusConfig.displayType,
                color: statusConfig.color
            };
            
            if (statusConfig.displayType === 'bar' && statusConfig.fields) {
                // Bar display: extract current and max values
                const [currentField, maxField] = statusConfig.fields;
                if (componentData[currentField] !== undefined && componentData[maxField] !== undefined) {
                    statusItem.current = componentData[currentField];
                    statusItem.max = componentData[maxField];
                    statusItem.percentage = Math.round((statusItem.current / statusItem.max) * 100);
                    status.push(statusItem);
                }
            } else if (statusConfig.displayType === 'number' && statusConfig.field) {
                // Number display: extract single field value
                if (componentData[statusConfig.field] !== undefined) {
                    statusItem.value = componentData[statusConfig.field];
                    status.push(statusItem);
                }
            }
        }
    }
    
    return status;
}