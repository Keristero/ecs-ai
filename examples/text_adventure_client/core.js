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
                summarizeWithAI: metadata.summarizeWithAI || false,
                parse: (args) => parseActionArgs(name, parameters, args)
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

// Parse action arguments based on parameter list
function parseActionArgs(actionName, parameters, args) {
    const params = {};
    
    for (let i = 0; i < parameters.length; i++) {
        const paramName = parameters[i];
        const argValue = args[i];
        
        if (argValue === undefined) {
            // Optional parameters might not be provided
            continue;
        }
        
        // Try to parse as number if it looks like a number
        const numValue = Number(argValue);
        if (!isNaN(numValue) && argValue !== '') {
            params[paramName] = numValue;
        } else {
            params[paramName] = argValue;
        }
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
    const name = entity.name || `${entity.type || 'Entity'} [${entity.id}]`;
    lines.push(`${indent}• ${name}${entity.id !== undefined ? ` [${entity.id}]` : ''}`);
    
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
        const data = await fetchJSON(`${API_BASE_URL}/actions/${actionName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId: state.playerId, ...params })
        });
        
        if (data.result) {
            const result = data.result;
            
            // Update room data if this was a look action or movement
            if (actionName === 'look' || (result.roomId && actionName === 'move')) {
                state.currentRoomData = result;
            }
            
            // Check if we should summarize with AI
            const actionDef = DYNAMIC_ACTIONS[actionName];
            if (actionDef && actionDef.summarizeWithAI && result.success) {
                try {
                    const aiSummary = await summarizeWithAI(actionName, params, result);
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
function parseCommand(input) {
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
        const parsed = cmdDef.parse(args);
        
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
        
        if (cmdDef && cmdDef.type === 'action' && cmdDef.autocompletes) {
            const paramIndex = parts.length - 2; // Current parameter being completed
            const paramPrefix = parts[parts.length - 1];
            
            if (paramIndex < cmdDef.autocompletes.length) {
                const requiredComponents = cmdDef.autocompletes[paramIndex];
                
                // Get entities from room data that match required components
                const suggestions = [];
                
                if (currentRoomData && requiredComponents.length > 0) {
                    // For each required component, find matching entities
                    for (const componentType of requiredComponents) {
                        const entities = getEntitiesByComponent(currentRoomData, componentType);
                        
                        entities.forEach(entity => {
                            const entityName = entity.name || ENTITY_TYPES[entity.type]?.singularLabel || 'entity';
                            const suggestion = `${commandPart} ${entity.id}`;
                            
                            if (!paramPrefix || entity.id.toString().startsWith(paramPrefix)) {
                                suggestions.push({
                                    text: suggestion,
                                    display: `${suggestion} (${entityName})`
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
        
        // Special handling for move command directions
        if (commandPart === 'move' || commandPart === 'm') {
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
