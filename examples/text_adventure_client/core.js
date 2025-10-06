/**
 * Core game logic - works in both browser and Node.js
 * No DOM or console-specific code
 */

// Configuration
const API_BASE_URL = 'http://localhost:6060';

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

// Game state
class GameState {
    constructor() {
        this.playerId = null;
        this.currentRoomData = null;
        this.availableActions = [];
        this.commandHistory = [];
        this.historyIndex = -1;
        this.entityNameToIdMap = {}; // Maps entity names to their IDs
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
    
    // Update entity name to ID mapping from room data
    updateEntityMap(roomData) {
        this.entityNameToIdMap = {};
        
        if (!roomData) return;
        
        // Process all entity types
        const entityTypes = ['items', 'enemies', 'landmarks', 'inventory'];
        
        for (const typeName of entityTypes) {
            const entities = roomData[typeName] || [];
            entities.forEach(entity => {
                if (entity.name && entity.id !== undefined) {
                    // Store in lowercase for case-insensitive matching
                    const normalizedName = entity.name.toLowerCase();
                    this.entityNameToIdMap[normalizedName] = entity.id;
                }
            });
        }
    }
    
    // Convert entity name to ID (returns the input if it's already an ID or not found)
    getEntityId(nameOrId) {
        // If it's already a number, return it
        const asNumber = Number(nameOrId);
        if (!isNaN(asNumber) && nameOrId !== '') {
            return asNumber;
        }
        
        // Try to find by name (case-insensitive)
        const normalizedName = nameOrId.toLowerCase();
        if (this.entityNameToIdMap[normalizedName] !== undefined) {
            return this.entityNameToIdMap[normalizedName];
        }
        
        // Return original if not found
        return nameOrId;
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
        // Load actions metadata first
        await loadActionsMetadata();
        
        // Get player ID from server
        const gameInfo = await fetchJSON(`${API_BASE_URL}/actions/gameinfo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        
        if (gameInfo.result && gameInfo.result.playerId) {
            state.playerId = gameInfo.result.playerId;
        } else {
            state.playerId = 1; // Default fallback
        }
        
        // Store available actions count
        state.availableActions = Object.keys(DYNAMIC_ACTIONS).filter(key => {
            // Count unique actions (not aliases)
            return DYNAMIC_ACTIONS[key].name === key;
        });
        
        // Look around to get initial room info
        const lookResult = await executeAction(state, 'look', {});
        
        return {
            success: true,
            playerId: state.playerId,
            actionsCount: state.availableActions.length,
            initialRoom: lookResult
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// Execute an action via API
async function executeAction(state, actionName, params) {
    try {
        // Convert entity names to IDs in params
        const convertedParams = {};
        for (const [key, value] of Object.entries(params)) {
            // Try to convert to entity ID if it's a string
            convertedParams[key] = state.getEntityId(value);
        }
        
        const data = await fetchJSON(`${API_BASE_URL}/actions/${actionName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId: state.playerId, ...convertedParams })
        });
        
        if (data.result) {
            const result = data.result;
            
            // Update room data if this was a look action or movement
            if (actionName === 'look' || (result.roomId && actionName === 'move')) {
                state.currentRoomData = result;
                state.updateEntityMap(result);
            }
            
            // Check if we should summarize with AI
            const actionDef = DYNAMIC_ACTIONS[actionName];
            if (actionDef && actionDef.summarizeWithAI && result.success) {
                try {
                    const aiSummary = await summarizeWithAI(actionName, convertedParams, result);
                    if (aiSummary) {
                        // Replace the message with the AI summary
                        result.message = aiSummary;
                    }
                } catch (error) {
                    console.error('AI summarization failed:', error);
                    // Continue with original message
                }
            }
            
            return result;
        }
        
        return { success: false, message: 'No result returned' };
    } catch (error) {
        return { 
            success: false, 
            message: `Action failed: ${error.message}` 
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
        const entityMap = state?.entityNameToIdMap || {};
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
                .map(dir => ({ text: `${commandPart} ${dir}`, display: `${commandPart} ${dir}` }));
        }
        
        if (cmdDef && cmdDef.type === 'action' && cmdDef.autocompletes) {
            const paramIndex = parts.length - 2; // Current parameter being completed
            const paramPrefix = parts[parts.length - 1];
            
            // Special handling for 'use' command second parameter
            // Show all entities in room (enemies, items, landmarks) as potential targets
            if ((commandPart === 'use' || commandPart === 'u' || commandPart === 'apply' || commandPart === 'attack') && paramIndex === 1) {
                const suggestions = [];
                
                if (currentRoomData) {
                    // Get all targetable entities (enemies, items in room, landmarks)
                    const allEntities = [
                        ...(currentRoomData.enemies || []),
                        ...(currentRoomData.items || []),
                        ...(currentRoomData.landmarks || [])
                    ];
                    
                    // Build complete command with previous parameter
                    const previousParams = parts.slice(1, -1).join(' ');
                    
                    allEntities.forEach(entity => {
                        const entityName = entity.name || `Entity ${entity.id}`;
                        const lowerName = entityName.toLowerCase();
                        
                        // Match by name, not ID
                        if (!paramPrefix || lowerName.startsWith(paramPrefix)) {
                            const suggestion = `${commandPart} ${previousParams} ${entityName}`;
                            suggestions.push({
                                text: suggestion,
                                display: suggestion
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
                                const suggestion = `${commandPart} ${entityName}`;
                                suggestions.push({
                                    text: suggestion,
                                    display: suggestion
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
        getAllCommands,
        getEntitiesByType,
        getEntitiesByComponent,
        formatEntity,
        formatEntityCollection
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
    window.getAllCommands = getAllCommands;
    window.getEntitiesByType = getEntitiesByType;
    window.getEntitiesByComponent = getEntitiesByComponent;
    window.formatEntity = formatEntity;
    window.formatEntityCollection = formatEntityCollection;
}
