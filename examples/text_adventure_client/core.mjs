// Configuration for which events should be logged and which UI elements they update
export const eventConfig = {
    'action_result': {
        logMessage: true,
        updateUI: ['log'],
        messageColor: 'info'
    },
    'entity_update': {
        logMessage: false,
        updateUI: ['room-info', 'status', 'inventory']
    },
    'room_change': {
        logMessage: true,
        updateUI: ['room-info', 'log'],
        messageColor: 'success'
    },
    'combat_result': {
        logMessage: true,
        updateUI: ['log', 'status'],
        messageColor: 'error'
    },
    'item_picked_up': {
        logMessage: true,
        updateUI: ['log', 'inventory'],
        messageColor: 'success'
    },
    'item_dropped': {
        logMessage: true,
        updateUI: ['log', 'inventory'],
        messageColor: 'info'
    },
    'turn_start': {
        logMessage: false,
        updateUI: ['status']
    },
    'turn_end': {
        logMessage: false,
        updateUI: ['status']
    },
    'error': {
        logMessage: true,
        updateUI: ['log'],
        messageColor: 'error'
    }
};

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
    playerId: null,
    entities: new Map(),
    currentRoom: null,
    actionSchemas: null,
    isPlayerTurn: false
};

// Extract message from event based on event type
export const extractMessage = (event) => {
    const eventType = event.type;
    const eventData = event[eventType];
    return eventData?.message || null;
};

// Parse command input into action format
export const parseCommand = (input, actionSchemas) => {
    if (!input || !actionSchemas) return null;
    
    const words = input.trim().toLowerCase().split(/\s+/);
    if (words.length === 0) return null;
    
    const actionName = words[0];
    const schema = actionSchemas[actionName];
    
    if (!schema) return null;
    
    const action = { type: actionName };
    const args = words.slice(1);
    
    if (schema.parameters) {
        schema.parameters.forEach((param, index) => {
            if (args[index]) {
                action[param.name] = args[index];
            }
        });
    }
    
    return action;
};

// Get autocomplete suggestions for current input
export const getAutocompleteSuggestions = (input, actionSchemas) => {
    if (!input || !actionSchemas) return [];
    
    const words = input.trim().toLowerCase().split(/\s+/);
    const currentWordIndex = words.length - 1;
    
    if (currentWordIndex === 0) {
        // Suggest action names
        const prefix = words[0];
        return Object.keys(actionSchemas)
            .filter(name => name.startsWith(prefix))
            .map(name => ({ value: name, type: 'action' }));
    }
    
    const actionName = words[0];
    const schema = actionSchemas[actionName];
    
    if (!schema || !schema.parameters) return [];
    
    const paramIndex = currentWordIndex - 1;
    const param = schema.parameters[paramIndex];
    
    if (!param) return [];
    
    // Suggest based on parameter type
    const suggestions = [];
    const prefix = words[currentWordIndex];
    
    // Get relevant entities from state
    state.entities.forEach((entity, id) => {
        if (entity.name && entity.name.toLowerCase().startsWith(prefix)) {
            suggestions.push({ value: entity.name, type: param.name, entityId: id });
        }
    });
    
    return suggestions;
};

// Categorize entities in the current room
export const categorizeEntities = (roomEntities) => {
    const categories = {};
    const uncategorized = [];
    
    roomEntities.forEach(entity => {
        let categorized = false;
        
        for (const category of entityCategories) {
            if (entity[category.componentKey]) {
                if (!categories[category.name]) {
                    categories[category.name] = [];
                }
                categories[category.name].push(entity);
                categorized = true;
                break;
            }
        }
        
        if (!categorized) {
            uncategorized.push(entity);
        }
    });
    
    if (uncategorized.length > 0) {
        categories['???'] = uncategorized;
    }
    
    return categories;
};

// Update entity in state
export const updateEntity = (entityId, components) => {
    const existing = state.entities.get(entityId) || { id: entityId };
    state.entities.set(entityId, { ...existing, ...components });
};

// Get entities in current room
export const getRoomEntities = () => {
    if (!state.currentRoom) return [];
    
    return Array.from(state.entities.values())
        .filter(entity => entity.location?.roomId === state.currentRoom);
};

// Get player entity
export const getPlayer = () => {
    return state.playerId ? state.entities.get(state.playerId) : null;
};

// Get player inventory
export const getPlayerInventory = () => {
    const player = getPlayer();
    if (!player?.inventory) return [];
    
    return player.inventory.items
        .map(itemId => state.entities.get(itemId))
        .filter(Boolean);
};

// Get player stats for status bars
export const getPlayerStats = () => {
    const player = getPlayer();
    if (!player) return [];
    
    return statusBarConfig
        .map(config => {
            const component = player[config.component];
            if (!component) return null;
            
            return {
                label: config.label,
                className: config.className,
                current: component.current || 0,
                max: component.max || 100,
                percentage: Math.round(((component.current || 0) / (component.max || 1)) * 100)
            };
        })
        .filter(Boolean);
};

// Handle incoming event
export const handleEvent = (event) => {
    const eventType = event.type;
    
    // Handle round state updates
    if (eventType === 'round_state') {
        const { playerId, currentActorEid } = event.data;
        
        console.log(`Round state: playerId=${playerId}, currentActorEid=${currentActorEid}, myPlayerId=${state.playerId}`);
        
        // Check if it's this player's turn
        if (state.playerId && state.playerId === currentActorEid) {
            state.isPlayerTurn = true;
            console.log('It is YOUR turn!');
        } else {
            state.isPlayerTurn = false;
            console.log(`Waiting for actor ${currentActorEid}'s turn...`);
        }
        
        return {
            logMessage: false,
            updateUI: ['status']
        };
    }
    
    // Handle entity updates
    if (eventType === 'entity_update') {
        const { entityId, components } = event.entity_update;
        updateEntity(entityId, components);
    }
    
    // Handle room changes
    if (eventType === 'room_change') {
        state.currentRoom = event.room_change.roomId;
    }
    
    // Handle turn state from turn events
    if (eventType === 'turn' && event.name === 'turn_start') {
        if (event.turn.actor_eid === state.playerId) {
            state.isPlayerTurn = true;
        }
    }
    
    if (eventType === 'turn' && event.name === 'turn_end') {
        if (event.turn.actor_eid === state.playerId) {
            state.isPlayerTurn = false;
        }
    }
    
    return eventConfig[eventType] || null;
};
