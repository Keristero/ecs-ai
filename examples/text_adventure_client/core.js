/**
 * Core game logic - works in both browser and Node.js
 * No DOM or console-specific code
 */

// Configuration
const API_BASE_URL = 'http://localhost:6060';

// Command definitions
const COMMANDS = {
    help: {
        type: 'builtin',
        description: 'Show this help',
        usage: 'help'
    },
    clear: {
        type: 'builtin',
        description: 'Clear the terminal',
        usage: 'clear'
    },
    look: {
        type: 'action',
        description: 'Look around the room',
        usage: 'look',
        parse: (args) => ({ action: 'look', params: {} })
    },
    move: {
        type: 'action',
        description: 'Move in a direction (north, south, east, west)',
        usage: 'move <direction>',
        parse: (args) => {
            const direction = args[0];
            if (!direction) {
                return { error: 'Usage: move <direction>' };
            }
            return { action: 'move', params: { direction } };
        }
    },
    pickup: {
        type: 'action',
        description: 'Pick up an item',
        usage: 'pickup <itemId>',
        parse: (args) => {
            const itemId = parseInt(args[0]);
            if (isNaN(itemId)) {
                return { error: 'Usage: pickup <itemId>' };
            }
            return { action: 'pickup', params: { itemId } };
        }
    },
    drop: {
        type: 'action',
        description: 'Drop an item',
        usage: 'drop <itemId>',
        parse: (args) => {
            const itemId = parseInt(args[0]);
            if (isNaN(itemId)) {
                return { error: 'Usage: drop <itemId>' };
            }
            return { action: 'drop', params: { itemId } };
        }
    },
    attack: {
        type: 'action',
        description: 'Attack an enemy',
        usage: 'attack <enemyId>',
        parse: (args) => {
            const enemyId = parseInt(args[0]);
            if (isNaN(enemyId)) {
                return { error: 'Usage: attack <enemyId>' };
            }
            return { action: 'attack', params: { enemyId } };
        }
    }
};

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
        
        // Load available actions
        const actionsData = await fetchJSON(`${API_BASE_URL}/actions`);
        state.availableActions = actionsData.actions || [];
        
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

// Parse command into action and parameters
function parseCommand(input) {
    const trimmed = input.trim();
    if (!trimmed) return null;
    
    const [command, ...args] = trimmed.split(/\s+/);
    const lowerCommand = command.toLowerCase();
    
    // Check if command exists in COMMANDS
    const cmdDef = COMMANDS[lowerCommand];
    
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
        
        return { type: 'action', action: parsed.action, params: parsed.params };
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
    
    // Get all command names
    const commandNames = Object.keys(COMMANDS);
    
    // Contextual suggestions for move command
    if (trimmed.startsWith('move ')) {
        const prefix = trimmed.substring(5);
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
            .map(dir => `move ${dir}`);
    }
    
    // Basic command matching
    return commandNames.filter(cmd => cmd.startsWith(trimmed));
}

// Format help text
function getHelpText() {
    const lines = ['Available commands:'];
    
    // Generate help from COMMANDS definition
    Object.entries(COMMANDS).forEach(([name, cmd]) => {
        lines.push(`  ${cmd.usage} - ${cmd.description}`);
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
    
    // Landmarks
    if (roomData.landmarks && roomData.landmarks.length > 0) {
        lines.push('Landmarks:');
        roomData.landmarks.forEach(landmark => {
            if (landmark.name) {
                lines.push(`  • ${landmark.name}`);
                if (landmark.description) {
                    lines.push(`    ${landmark.description}`);
                }
            } else {
                lines.push(`  • Landmark [${landmark.id}]`);
            }
        });
        lines.push('');
    }
    
    // Items
    if (roomData.items && roomData.items.length > 0) {
        lines.push('Items:');
        roomData.items.forEach(item => {
            if (item.name) {
                lines.push(`  • ${item.name} [${item.id}]`);
                if (item.description) {
                    lines.push(`    ${item.description}`);
                }
            } else {
                lines.push(`  • Item [${item.id}]`);
            }
        });
        lines.push('');
    }
    
    // Enemies
    if (roomData.enemies && roomData.enemies.length > 0) {
        lines.push('Enemies:');
        roomData.enemies.forEach(enemy => {
            if (enemy.name) {
                lines.push(`  • ${enemy.name} [${enemy.id}]`);
                if (enemy.description) {
                    lines.push(`    ${enemy.description}`);
                }
            } else {
                lines.push(`  • Enemy [${enemy.id}]`);
            }
        });
        lines.push('');
    }
    
    // Inventory
    if (roomData.inventory && roomData.inventory.length > 0) {
        lines.push('Inventory:');
        roomData.inventory.forEach(item => {
            if (item.name) {
                lines.push(`  • ${item.name} [${item.id}]`);
            } else {
                lines.push(`  • Item [${item.id}]`);
            }
        });
    } else {
        lines.push('Inventory: empty');
    }
    
    return lines;
}

// Export for both CommonJS (Node.js) and ES modules (browser)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        COMMANDS,
        GameState,
        initializeGame,
        executeAction,
        parseCommand,
        getAutocompleteSuggestions,
        getHelpText,
        formatRoomInfo
    };
}
