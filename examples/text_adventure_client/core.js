/**
 * Core game logic - works in both browser and Node.js
 * No DOM or console-specific code
 */

// Configuration
const API_BASE_URL = 'http://localhost:6060';
const WS_URL = 'ws://localhost:6060';

// WebSocket connection
let ws = null;
let wsMessageHandlers = new Map();
let wsMessageId = 0;

// Store reference to the active game state instance
let activeGameState = null;

// GUID generation (browser and Node.js compatible)
function generateGUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for older environments
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Built-in commands that aren't actions
const BUILTIN_COMMANDS = {
    help: {
        type: 'builtin',
        description: 'Show this help',
        usage: 'help'
    },
    clear: {
        type: 'builtin',
        description: 'Clear the terminal',
        usage: 'clear'
    }
};

// Dynamic commands loaded from API (will be populated during initialization)
let DYNAMIC_ACTIONS = {};

// Event listeners for WebSocket events
const wsEventListeners = {
    round_state: [],  // Round state updates
    event: []         // Individual events as they happen
};

// Game state
class GameState {
    constructor() {
        this.playerId = null;
        this.roundState = null; // Store round/turn state - all game state derives from this
        this.availableActions = [];
        this.commandHistory = [];
        this.historyIndex = -1;
        this.pendingActions = new Map(); // Track actions by GUID: {guid: {action, params, timestamp}}
    }

    addToHistory(command) {
        this.commandHistory.push(command);
        this.historyIndex = this.commandHistory.length;
    }

    getPreviousCommand() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            return this.commandHistory[this.historyIndex];
        }
        return null;
    }

    getNextCommand() {
        if (this.historyIndex < this.commandHistory.length - 1) {
            this.historyIndex++;
            return this.commandHistory[this.historyIndex];
        } else {
            this.historyIndex = this.commandHistory.length;
            return '';
        }
    }
    
    // Update round state
    updateRoundState(roundState) {
        this.roundState = roundState;
    }
    
    // Get entity name to ID map from latest look event in round state
    getEntityNameToIdMap() {
        if (!this.roundState || !this.roundState.events) return {};
        
        const entityMap = {};
        
        // Find the most recent look event
        const lookEvents = this.roundState.events
            .filter(e => e.type === 'action' && e.name === 'look')
            .reverse(); // Most recent first
        
        if (lookEvents.length === 0) return {};
        
        const lookEvent = lookEvents[0];
        const roomData = lookEvent.action?.details;
        
        if (!roomData) return {};
        
        // Process all entity types
        const entityTypes = ['items', 'enemies', 'landmarks', 'inventory'];
        
        for (const typeName of entityTypes) {
            const entities = roomData[typeName] || [];
            entities.forEach(entity => {
                if (entity.name && entity.id !== undefined) {
                    // Store in lowercase for case-insensitive matching
                    const normalizedName = entity.name.toLowerCase();
                    entityMap[normalizedName] = entity.id;
                }
            });
        }
        
        return entityMap;
    }
    
    // Get current room data from latest look event in round state
    getCurrentRoomData() {
        if (!this.roundState || !this.roundState.events) return null;
        
        // Find the most recent look event
        const lookEvents = this.roundState.events
            .filter(e => e.type === 'action' && e.name === 'look')
            .reverse(); // Most recent first
        
        if (lookEvents.length === 0) return null;
        
        const lookEvent = lookEvents[0];
        return lookEvent.action?.details || null;
    }
    
    // Get current room ID from the most recent look event
    getCurrentRoomId() {
        const roomData = this.getCurrentRoomData();
        return roomData?.roomId || null;
    }
    
    // Filter events to only those in current room
    getEventsInCurrentRoom() {
        if (!this.roundState || !this.roundState.events) return [];
        
        const currentRoomId = this.getCurrentRoomId();
        if (currentRoomId === null) return this.roundState.events;
        
        return this.roundState.events.filter(event => {
            // Always include round and turn events (they're global)
            if (event.type === 'round' || event.type === 'turn') {
                return true;
            }
            
            // For action events, check if they happened in current room
            if (event.type === 'action') {
                const eventRoomId = event.action?.room_eid;
                return eventRoomId === currentRoomId || eventRoomId === undefined;
            }
            
            // For system events, check room_eid if present
            if (event.type === 'system') {
                const eventRoomId = event.system?.details?.room_eid;
                return eventRoomId === currentRoomId || eventRoomId === undefined;
            }
            
            // Include other event types by default
            return true;
        });
    }
    
    // Convert entity name to ID (returns the input if it's already an ID or not found)
    getEntityId(nameOrId) {
        // If it's already a number, return it
        const asNumber = Number(nameOrId);
        if (!isNaN(asNumber) && nameOrId !== '') {
            return asNumber;
        }
        
        // Special case: "self" always refers to the player
        const normalizedName = nameOrId.toLowerCase();
        if (normalizedName === 'self') {
            return this.playerId;
        }
        
        // Try to find by name (case-insensitive) from current entity map
        const entityMap = this.getEntityNameToIdMap();
        if (entityMap[normalizedName] !== undefined) {
            return entityMap[normalizedName];
        }
        
        // Return original if not found
        return nameOrId;
    }
}

// WebSocket connection management
function connectWebSocket() {
    return new Promise((resolve, reject) => {
        try {
            // Use native WebSocket in browser, ws in Node.js
            const WebSocketClass = typeof window !== 'undefined' && typeof WebSocket !== 'undefined' 
                ? WebSocket 
                : require('ws');
            ws = new WebSocketClass(WS_URL);
            
            ws.onopen = () => {
                console.log('WebSocket connected');
                resolve(ws);
            };
            
            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    console.log('WebSocket received:', message.type);
                    handleWebSocketMessage(message);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                triggerEventListeners('error', error);
                reject(error);
            };
            
            ws.onclose = () => {
                console.log('WebSocket disconnected');
                ws = null;
            };
            
            setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
        } catch (error) {
            console.error('WebSocket connection error:', error);
            reject(error);
        }
    });
}

// Handle incoming WebSocket messages
function handleWebSocketMessage(message) {
    console.log('handleWebSocketMessage called with:', message);
    const { type, data } = message;
    
    // Check if this is a response to a specific request (action results)
    if (message.messageId && wsMessageHandlers.has(message.messageId)) {
        console.log('Message is a response to request', message.messageId);
        const handler = wsMessageHandlers.get(message.messageId);
        wsMessageHandlers.delete(message.messageId);
        handler(message);
        return;
    }
    
    // Handle broadcast messages
    console.log('Processing broadcast message of type:', type);
    switch (type) {
        case 'round_state':
            // Full round state update
            console.log('Triggering round_state listeners with data:', data);
            triggerEventListeners('round_state', data);
            break;
        case 'event':
            // Individual event that just happened
            console.log('Triggering event listeners with data:', data);
            
            // Check if this event matches a pending action
            if (activeGameState && data.guid && activeGameState.pendingActions.has(data.guid)) {
                const pendingAction = activeGameState.pendingActions.get(data.guid);
                console.log('✓ Event matches pending action:', pendingAction.action, 'GUID:', data.guid);
                
                // Mark the action as confirmed by removing it from pending
                activeGameState.pendingActions.delete(data.guid);
                console.log('Confirmed action, remaining pending:', activeGameState.pendingActions.size);
            }
            
            triggerEventListeners('event', data);
            break;
        default:
            console.warn('Unknown message type:', type);
    }
}

// Send a message via WebSocket and wait for response
function sendWebSocketMessage(message) {
    return new Promise((resolve, reject) => {
        if (!ws || ws.readyState !== 1) { // 1 = WebSocket.OPEN
            reject(new Error('WebSocket not connected'));
            return;
        }
        
        const messageId = ++wsMessageId;
        message.messageId = messageId;
        
        // Store handler for response
        wsMessageHandlers.set(messageId, resolve);
        
        // Send message
        ws.send(JSON.stringify(message));
        
        // Timeout after 30 seconds
        setTimeout(() => {
            if (wsMessageHandlers.has(messageId)) {
                wsMessageHandlers.delete(messageId);
                reject(new Error('Request timeout'));
            }
        }, 30000);
    });
}

// Register event listener for WebSocket events
function addEventListener(eventType, handler) {
    console.log('addEventListener called for:', eventType);
    if (wsEventListeners[eventType]) {
        wsEventListeners[eventType].push(handler);
        console.log(`Added listener. Total listeners for ${eventType}:`, wsEventListeners[eventType].length);
    } else {
        console.error('Invalid event type:', eventType);
    }
}

// Remove event listener
function removeEventListener(eventType, handler) {
    if (wsEventListeners[eventType]) {
        const index = wsEventListeners[eventType].indexOf(handler);
        if (index > -1) {
            wsEventListeners[eventType].splice(index, 1);
        }
    }
}

// Trigger event listeners
function triggerEventListeners(eventType, data) {
    console.log(`triggerEventListeners called for type: ${eventType}, listeners count:`, wsEventListeners[eventType]?.length || 0);
    if (wsEventListeners[eventType]) {
        console.log('Calling', wsEventListeners[eventType].length, 'listeners');
        wsEventListeners[eventType].forEach((handler, index) => {
            console.log(`Calling listener ${index} for ${eventType}`);
            try {
                handler(data);
                console.log(`Listener ${index} completed successfully`);
            } catch (error) {
                console.error(`Listener ${index} threw error:`, error);
            }
        });
    } else {
        console.warn('No listeners registered for event type:', eventType);
    }
}

// Load actions from API and populate DYNAMIC_ACTIONS
async function loadActionsMetadata() {
    try {
        const data = await fetchJSON(`${API_BASE_URL}/actions`);
        const actions = data.actions || [];
        
        DYNAMIC_ACTIONS = {};
        
        for (const action of actions) {
            const metadata = action.metadata;
            if (!metadata) continue;
            
            const name = action.handle || metadata.name;
            const aliases = metadata.aliases || [];
            const parameters = metadata.parameters || [];
            const description = metadata.description || action.description || '';
            
            // Build usage string from parameters
            const paramStr = parameters.map(p => `<${p}>`).join(' ');
            const usage = paramStr ? `${name} ${paramStr}` : name;
            
            // Store action definition
            const actionDef = {
                type: 'action',
                handle: action.handle,
                name,
                description,
                usage,
                parameters,
                autocompletes: metadata.autocompletes || [],
                summarizeWithAI: metadata.summarizeWithAI || false
            };
            
            // Add action under its primary name
            DYNAMIC_ACTIONS[name] = actionDef;
            
            // Add action under all aliases
            for (const alias of aliases) {
                DYNAMIC_ACTIONS[alias] = actionDef;
            }
        }
        
        return true;
    } catch (error) {
        console.error('Failed to load actions metadata:', error);
        return false;
    }
}

// Parse action arguments based on parameter list and current room state
// This needs access to the entity map to intelligently match multi-word entity names
function parseActionArgs(actionName, parameters, args, entityMap = {}) {
    const params = {};
    
    // If there's only one parameter expected and multiple args, join them
    // This handles multi-word entity names like "rusty sword"
    if (parameters.length === 1 && args.length > 1) {
        const joined = args.join(' ');
        params[parameters[0]] = joined;
        return { action: actionName, params };
    }
    
    // For multiple parameters with multiple args, try to match known entity names
    if (parameters.length > 1 && args.length >= parameters.length) {
        const allWords = args.join(' ').toLowerCase();
        const knownEntityNames = Object.keys(entityMap);
        
        // Try to find entity names in the input
        let remainingText = allWords;
        const matchedEntities = [];
        
        // Sort entity names by length (longest first) to match "rusty sword" before "rusty"
        const sortedNames = knownEntityNames.sort((a, b) => b.length - a.length);
        
        for (const entityName of sortedNames) {
            const index = remainingText.indexOf(entityName);
            if (index !== -1) {
                matchedEntities.push({
                    name: entityName,
                    position: index
                });
                // Remove matched entity from remaining text
                remainingText = remainingText.substring(0, index) + 
                               ' '.repeat(entityName.length) + 
                               remainingText.substring(index + entityName.length);
            }
        }
        
        // Sort matches by position in the original text
        matchedEntities.sort((a, b) => a.position - b.position);
        
        // Assign matched entities to parameters
        if (matchedEntities.length > 0) {
            for (let i = 0; i < parameters.length && i < matchedEntities.length; i++) {
                params[parameters[i]] = matchedEntities[i].name;
            }
            return { action: actionName, params };
        }
        
        // Fallback: if no entities matched, try a simple split heuristic
        // Assume last word is the last parameter, everything else is the first
        if (parameters.length === 2) {
            const lastWord = args[args.length - 1];
            const firstWords = args.slice(0, -1).join(' ');
            params[parameters[0]] = firstWords;
            params[parameters[1]] = lastWord;
            return { action: actionName, params };
        }
    }
    
    // Otherwise, map args to parameters one-to-one
    for (let i = 0; i < parameters.length; i++) {
        const paramName = parameters[i];
        const argValue = args[i];
        
        if (argValue === undefined) {
            // Optional parameters might not be provided
            continue;
        }
        
        // Store as-is for now - will be converted during executeAction
        params[paramName] = argValue;
    }
    
    return { action: actionName, params };
}

// Get all available commands (builtin + dynamic)
function getAllCommands() {
    return { ...BUILTIN_COMMANDS, ...DYNAMIC_ACTIONS };
}

// Entity collection helpers
// Define entity types and their display properties
const ENTITY_TYPES = {
    items: {
        label: 'Items',
        singularLabel: 'item',
        componentType: 'Item'
    },
    enemies: {
        label: 'Enemies',
        singularLabel: 'enemy',
        componentType: 'Enemy'
    },
    landmarks: {
        label: 'Landmarks',
        singularLabel: 'landmark',
        componentType: 'Landmark'
    },
    inventory: {
        label: 'Inventory',
        singularLabel: 'item',
        componentType: 'Item',
        emptyMessage: 'Inventory: empty'
    }
};

// Get all entities of a specific type from room data
function getEntitiesByType(roomData, typeName) {
    if (!roomData) return [];
    return roomData[typeName] || [];
}

// Get all entities matching a component type
function getEntitiesByComponent(roomData, componentType) {
    if (!roomData) return [];
    
    const results = [];
    
    // Special handling for 'Name' component - return all named entities
    if (componentType === 'Name') {
        // Get all entities from all types
        for (const [typeName] of Object.entries(ENTITY_TYPES)) {
            const entities = getEntitiesByType(roomData, typeName);
            results.push(...entities);
        }
        return results;
    }
    
    for (const [typeName, typeConfig] of Object.entries(ENTITY_TYPES)) {
        if (typeConfig.componentType === componentType) {
            const entities = getEntitiesByType(roomData, typeName);
            results.push(...entities);
        }
    }
    
    return results;
}

// Format a single entity for display
function formatEntity(entity, indent = '  ') {
    const lines = [];
    const name = entity.name || `Entity ${entity.id}`;
    lines.push(`${indent}• ${name}`);
    
    if (entity.description) {
        lines.push(`${indent}  ${entity.description}`);
    }
    
    return lines;
}

// Format a collection of entities for display
function formatEntityCollection(roomData, typeName) {
    const typeConfig = ENTITY_TYPES[typeName];
    if (!typeConfig) return [];
    
    const entities = getEntitiesByType(roomData, typeName);
    
    if (entities.length === 0) {
        if (typeConfig.emptyMessage) {
            return [typeConfig.emptyMessage];
        }
        return [];
    }
    
    const lines = [`${typeConfig.label}:`];
    
    entities.forEach(entity => {
        lines.push(...formatEntity(entity));
    });
    
    lines.push(''); // Empty line after section
    return lines;
}

// Fetch wrapper that works in both environments
async function fetchJSON(url, options = {}) {
    let fetchFn;
    
    // Use global fetch (browser) or require node-fetch (Node.js)
    if (typeof fetch !== 'undefined') {
        fetchFn = fetch;
    } else {
        // In Node.js, require node-fetch
        try {
            fetchFn = require('node-fetch');
        } catch (e) {
            throw new Error('node-fetch is required for Node.js. Run: npm install node-fetch@2');
        }
    }
    
    const response = await fetchFn(url, options);
    return await response.json();
}

// Initialize game
async function initializeGame(state) {
    try {
        console.log('Initializing game...');
        
        // Store reference to active game state
        activeGameState = state;
        
        // Register listener for round state updates (includes playerId)
        console.log('Registering round_state listener');
        addEventListener('round_state', (roundState) => {
            console.log('Round state listener triggered with:', roundState);
            state.playerId = roundState.playerId;
            console.log('Set playerId to:', state.playerId);
            state.updateRoundState(roundState);
            console.log('Updated game state round state');
        });
        
        // Register listener for individual events
        console.log('Registering event listener');
        addEventListener('event', (event) => {
            console.log('Event listener triggered:', event.type, event.name);
            // Events will be handled by client UI
        });
        
        // Connect WebSocket (will receive initial round_state with playerId)
        console.log('Connecting to WebSocket...');
        await connectWebSocket();
        console.log('WebSocket connected successfully');
        
        // Wait a moment for initial round_state message
        console.log('Waiting for initial round_state...');
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log('Wait complete, playerId should be set');
        
        // Load actions metadata from HTTP endpoint (one-time load)
        console.log('Loading actions metadata...');
        await loadActionsMetadata();
        console.log('Actions loaded');
        
        console.log('Player ID:', state.playerId);
        
        // Store available actions count
        state.availableActions = Object.keys(DYNAMIC_ACTIONS).filter(key => {
            // Count unique actions (not aliases)
            return DYNAMIC_ACTIONS[key].name === key;
        });
        console.log('Available actions:', state.availableActions.length);
        
        // Look around to get initial room info
        console.log('Executing look action...');
        await executeAction(state, 'look', {});
        console.log('Look action sent');
        
        // Wait for round state to update with look event
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const result = {
            success: true,
            playerId: state.playerId,
            actionsCount: state.availableActions.length,
            roundState: state.roundState
        };
        console.log('initializeGame returning:', result);
        return result;
    } catch (error) {
        console.error('Initialization error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Execute an action via WebSocket
async function executeAction(state, actionName, params) {
    try {
        console.log('executeAction called:', actionName, 'with params:', params);
        
        // Generate GUID for this action
        const actionGuid = generateGUID();
        console.log('Generated action GUID:', actionGuid);
        
        // Convert entity names to IDs in params
        const convertedParams = {};
        for (const [key, value] of Object.entries(params)) {
            // Only convert to entity ID if the parameter name ends with "Id"
            if (key.endsWith('Id') && typeof value === 'string') {
                convertedParams[key] = state.getEntityId(value);
            } else {
                convertedParams[key] = value;
            }
        }
        console.log('Converted params:', convertedParams);
        
        // Add actorId if not provided
        if (!convertedParams.actorId) {
            convertedParams.actorId = state.playerId;
            console.log('Added actorId:', convertedParams.actorId);
        }
        
        // Track this pending action
        state.pendingActions.set(actionGuid, {
            action: actionName,
            params: convertedParams,
            timestamp: Date.now()
        });
        console.log('Tracked pending action, total pending:', state.pendingActions.size);
        
        // Send action via WebSocket with GUID
        console.log('Sending WebSocket message with GUID:', {type: 'action', action: actionName, params: convertedParams, guid: actionGuid});
        const response = await sendWebSocketMessage({
            type: 'action',
            action: actionName,
            params: convertedParams,
            guid: actionGuid  // Include GUID so server can use it for the event
        });
        console.log('Received WebSocket response:', response);
        
        if (response.type === 'action_accepted') {
            console.log('Action accepted by server');
            // All game state comes from events broadcast by the server
            return {
                success: true,
                guid: actionGuid,
                message: 'Action sent successfully'
            };
        } else if (response.type === 'error') {
            console.error('Received error response:', response.message);
            // Remove from pending on error
            state.pendingActions.delete(actionGuid);
            return {
                success: false,
                message: response.message
            };
        }
        
        console.log('Unknown response type, returning as-is');
        return response;
    } catch (error) {
        console.error('Action execution error:', error);
        return {
            success: false,
            message: error.message
        };
    }
}

// Summarize action result with AI
async function summarizeWithAI(actionName, params, result) {
    try {
        const prompt = `You are narrating a text adventure game. The player just performed the action "${actionName}" with the following result:

${JSON.stringify(result, null, 2)}

Please provide a breif, engaging narrative description (1-2 sentences) of what happened. Focus on the story, not the technical details.
Dont think or anything, just respond with the narrative:`;

        const response = await fetchJSON(`${API_BASE_URL}/agent/prompt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                stream: false
            })
        });
        
        let ai_description = response.message.content;
        
        // Remove <think> tags and their content
        ai_description = ai_description.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        
        return ai_description;
        
    } catch (error) {
        console.error('AI summarization request failed:', error);
        return null;
    }
}

// Parse command into action and parameters
function parseCommand(input, state = null) {
    const trimmed = input.trim();
    if (!trimmed) return null;
    
    const [command, ...args] = trimmed.split(/\s+/);
    const lowerCommand = command.toLowerCase();
    
    // Get all available commands
    const allCommands = getAllCommands();
    
    // Check if command exists
    const cmdDef = allCommands[lowerCommand];
    
    if (!cmdDef) {
        return { 
            type: 'error', 
            message: `Unknown command: ${command}\nType "help" for available commands` 
        };
    }
    
    // Handle builtin commands
    if (cmdDef.type === 'builtin') {
        return { type: lowerCommand };
    }
    
    // Handle action commands
    if (cmdDef.type === 'action') {
        // Pass entity map to help with parsing multi-word entity names
        const entityMap = state?.getEntityNameToIdMap() || {};
        const parsed = parseActionArgs(cmdDef.name, cmdDef.parameters, args, entityMap);
        
        if (parsed.error) {
            return { type: 'error', message: parsed.error };
        }
        
        return { 
            type: 'action', 
            action: cmdDef.handle || cmdDef.name, 
            params: parsed.params,
            summarizeWithAI: cmdDef.summarizeWithAI 
        };
    }
    
    return { 
        type: 'error', 
        message: `Unknown command: ${command}\nType "help" for available commands` 
    };
}

// Get autocomplete suggestions
function getAutocompleteSuggestions(input, currentRoomData) {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) return [];
    
    const allCommands = getAllCommands();
    const commandNames = Object.keys(allCommands);
    
    // Check if we're completing a command with parameters
    const parts = trimmed.split(/\s+/);
    const commandPart = parts[0];
    
    // If we have a space, we're completing parameters
    if (input.includes(' ') && parts.length > 1) {
        const cmdDef = allCommands[commandPart];
        
        // Special handling for move command directions
        if (commandPart === 'move' || commandPart === 'go' || commandPart === 'walk' || commandPart === 'm') {
            const prefix = parts[parts.length - 1];
            const directions = ['north', 'south', 'east', 'west'];
            
            // Filter by available exits if we have room data
            let availableDirections = directions;
            if (currentRoomData && currentRoomData.exits) {
                availableDirections = directions.filter(dir => 
                    currentRoomData.exits.includes(dir)
                );
            }
            
            return availableDirections
                .filter(dir => !prefix || dir.startsWith(prefix))
                .map(dir => ({ 
                    text: dir,  // Only the direction word
                    display: dir 
                }));
        }
        
        if (cmdDef && cmdDef.type === 'action' && cmdDef.autocompletes) {
            const paramIndex = parts.length - 2; // Current parameter being completed
            const paramPrefix = parts[parts.length - 1];
            
            // Special handling for 'use' command second parameter
            // Show all entities in room (enemies, items, landmarks) as potential targets
            if ((commandPart === 'use' || commandPart === 'u' || commandPart === 'apply' || commandPart === 'attack') && paramIndex === 1) {
                const suggestions = [];
                
                // Always add "Self" as an option
                if (!paramPrefix || 'self'.startsWith(paramPrefix)) {
                    suggestions.push({
                        text: 'Self',
                        display: 'Self'
                    });
                }
                
                if (currentRoomData) {
                    // Get all targetable entities (enemies, items in room, landmarks)
                    const allEntities = [
                        ...(currentRoomData.enemies || []),
                        ...(currentRoomData.items || []),
                        ...(currentRoomData.landmarks || [])
                    ];
                    
                    allEntities.forEach(entity => {
                        const entityName = entity.name || `Entity ${entity.id}`;
                        const lowerName = entityName.toLowerCase();
                        
                        // Match by name, not ID
                        if (!paramPrefix || lowerName.startsWith(paramPrefix)) {
                            suggestions.push({
                                text: entityName,  // Only the entity name
                                display: entityName
                            });
                        }
                    });
                }
                
                if (suggestions.length > 0) {
                    return suggestions;
                }
            }
            
            if (paramIndex < cmdDef.autocompletes.length) {
                const requiredComponents = cmdDef.autocompletes[paramIndex];
                
                // Get entities from room data that match required components
                const suggestions = [];
                
                if (currentRoomData && requiredComponents.length > 0) {
                    // For each required component, find matching entities
                    for (const componentType of requiredComponents) {
                        const entities = getEntitiesByComponent(currentRoomData, componentType);
                        
                        entities.forEach(entity => {
                            const entityName = entity.name || `Entity ${entity.id}`;
                            const lowerName = entityName.toLowerCase();
                            
                            // Match by name, not ID
                            if (!paramPrefix || lowerName.startsWith(paramPrefix)) {
                                suggestions.push({
                                    text: entityName,  // Only the entity name
                                    display: entityName
                                });
                            }
                        });
                    }
                }
                
                if (suggestions.length > 0) {
                    return suggestions;
                }
            }
        }
    }
    
    // Basic command name matching
    const matchingCommands = commandNames
        .filter(cmd => cmd.startsWith(trimmed))
        .map(cmd => ({ text: cmd, display: cmd }));
    
    return matchingCommands;
}

// Format help text
function getHelpText() {
    const lines = ['Available commands:'];
    
    const allCommands = getAllCommands();
    const seen = new Set(); // Track commands we've already shown
    
    // Generate help from command definitions
    Object.entries(allCommands).forEach(([key, cmd]) => {
        // Only show each unique command once (skip aliases)
        const displayName = cmd.name || key;
        if (seen.has(displayName)) return;
        seen.add(displayName);
        
        const aliases = cmd.aliases && cmd.aliases.length > 0 
            ? ` (aliases: ${cmd.aliases.join(', ')})` 
            : '';
        lines.push(`  ${cmd.usage}${aliases} - ${cmd.description}`);
    });
    
    return lines;
}

// Format room data into lines of text
function formatRoomInfo(roomData) {
    if (!roomData || !roomData.success) return [];
    
    const lines = [];
    
    lines.push(''); // Empty line before room info
    
    // Room name and description
    if (roomData.roomName) {
        lines.push(`=== ${roomData.roomName} ===`);
    } else {
        lines.push(`=== Room ${roomData.roomId} ===`);
    }
    
    if (roomData.roomDescription) {
        lines.push(roomData.roomDescription);
        lines.push('');
    }
    
    // Exits
    if (roomData.exits && roomData.exits.length > 0) {
        lines.push(`Exits: ${roomData.exits.join(', ')}`);
        lines.push('');
    }
    
    // Use entity helpers for all entity types
    const entityOrder = ['landmarks', 'items', 'enemies', 'inventory'];
    
    for (const typeName of entityOrder) {
        const entityLines = formatEntityCollection(roomData, typeName);
        if (entityLines.length > 0) {
            lines.push(...entityLines);
        }
    }
    
    return lines;
}

// Format round state into lines of text
function formatRoundState(roundState) {
    if (!roundState) return [];
    
    const lines = [];
    
    lines.push(''); // Empty line before round state
    lines.push('=== Round State ===');
    
    // Current turn info
    const isPlayerTurn = roundState.currentActorEid === roundState.playerId;
    const turnIndicator = isPlayerTurn ? '👤 YOUR TURN' : `🤖 NPC TURN (Entity ${roundState.currentActorEid})`;
    lines.push(turnIndicator);
    
    lines.push('');
    
    // Systems resolution status
    if (roundState.systemsResolved && Object.keys(roundState.systemsResolved).length > 0) {
        lines.push('Systems Status:');
        for (const [systemName, resolved] of Object.entries(roundState.systemsResolved)) {
            const status = resolved ? '✅' : '⏳';
            const statusText = resolved ? 'resolved' : 'pending';
            lines.push(`  ${status} ${systemName}: ${statusText}`);
        }
        lines.push('');
    }
    
    // Events list
    if (roundState.events && roundState.events.length > 0) {
        lines.push(`Events this round (${roundState.events.length}):`);
        roundState.events.forEach(event => {
            let eventDesc = `  • ${event.type}:${event.name}`;
            if (event.turn && event.turn.actor_eid !== undefined) {
                eventDesc += ` (Actor: ${event.turn.actor_eid})`;
            }
            lines.push(eventDesc);
        });
        lines.push('');
    } else {
        lines.push('No events yet this round');
        lines.push('');
    }
    
    return lines;
}

// Export for both CommonJS (Node.js) and ES modules (browser)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        BUILTIN_COMMANDS,
        DYNAMIC_ACTIONS,
        ENTITY_TYPES,
        GameState,
        loadActionsMetadata,
        initializeGame,
        executeAction,
        summarizeWithAI,
        parseCommand,
        getAutocompleteSuggestions,
        getHelpText,
        formatRoomInfo,
        formatRoundState,
        getAllCommands,
        getEntitiesByType,
        getEntitiesByComponent,
        formatEntity,
        formatEntityCollection,
        addEventListener,
        removeEventListener
    };
}

// Also export to window for browser usage
if (typeof window !== 'undefined') {
    window.BUILTIN_COMMANDS = BUILTIN_COMMANDS;
    window.DYNAMIC_ACTIONS = DYNAMIC_ACTIONS;
    window.ENTITY_TYPES = ENTITY_TYPES;
    window.GameState = GameState;
    window.loadActionsMetadata = loadActionsMetadata;
    window.initializeGame = initializeGame;
    window.executeAction = executeAction;
    window.summarizeWithAI = summarizeWithAI;
    window.parseCommand = parseCommand;
    window.getAutocompleteSuggestions = getAutocompleteSuggestions;
    window.getHelpText = getHelpText;
    window.formatRoomInfo = formatRoomInfo;
    window.formatRoundState = formatRoundState;
    window.getAllCommands = getAllCommands;
    window.getEntitiesByType = getEntitiesByType;
    window.getEntitiesByComponent = getEntitiesByComponent;
    window.formatEntity = formatEntity;
    window.formatEntityCollection = formatEntityCollection;
    window.addEventListener = addEventListener;
    window.removeEventListener = removeEventListener;
}
