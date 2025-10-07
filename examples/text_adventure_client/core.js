const API_BASE_URL = 'http://localhost:6060';
const WS_URL = 'ws://localhost:6060';

const BUILTIN_COMMANDS = {
    help: { type: 'builtin', description: 'Show help', usage: 'help' },
    clear: { type: 'builtin', description: 'Clear terminal', usage: 'clear' }
};

const ENTITY_TYPES = {
    items: { label: 'Items', emptyMessage: null },
    enemies: { label: 'Enemies', emptyMessage: null },
    landmarks: { label: 'Landmarks', emptyMessage: null },
    inventory: { label: 'Inventory', emptyMessage: 'Inventory: empty' }
};

let ws = null;
let activeGameState = null;
let DYNAMIC_ACTIONS = {};
const wsEventListeners = { round_state: [], event: [] };


class GameState {
    constructor() {
        this.playerId = null;
        this.roundState = null;
        this.availableActions = [];
        this.commandHistory = [];
        this.historyIndex = -1;
        this.pendingActions = new Map();
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
        }
        this.historyIndex = this.commandHistory.length;
        return '';
    }

    updateRoundState(roundState) {
        this.roundState = roundState;
    }

    getCurrentRoomData() {
        if (!this.roundState?.events) return null;
        
        const lookEvents = this.roundState.events
            .filter(e => e.type === 'action' && e.name === 'look' && e.action?.success)
            .reverse();
        
        return lookEvents.length > 0 ? lookEvents[0].action.details : null;
    }

    getCurrentRoomId() {
        return this.getCurrentRoomData()?.roomId || null;
    }

    getEntityNameToIdMap() {
        const roomData = this.getCurrentRoomData();
        if (!roomData) return {};
        
        const entityMap = {};
        ['items', 'enemies', 'landmarks', 'inventory'].forEach(typeName => {
            (roomData[typeName] || []).forEach(entity => {
                if (entity.name && entity.id !== undefined) {
                    entityMap[entity.name.toLowerCase()] = entity.id;
                }
            });
        });
        
        return entityMap;
    }

    getEntityId(nameOrId) {
        const asNumber = Number(nameOrId);
        if (!isNaN(asNumber) && nameOrId !== '') return asNumber;
        
        const normalizedName = nameOrId.toLowerCase();
        if (normalizedName === 'self') return this.playerId;
        
        const entityMap = this.getEntityNameToIdMap();
        return entityMap[normalizedName] || nameOrId;
    }
}



function connectWebSocket() {
    return new Promise((resolve, reject) => {
        try {
            const WebSocketClass = typeof window !== 'undefined' && typeof WebSocket !== 'undefined' 
                ? WebSocket 
                : require('ws');
            
            ws = new WebSocketClass(WS_URL);
            
            ws.onopen = () => resolve(ws);
            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    handleWebSocketMessage(message);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            };
            ws.onclose = () => {
                ws = null;
            };
            
            setTimeout(() => {
                if (ws && ws.readyState !== 1) {
                    reject(new Error('WebSocket connection timeout'));
                }
            }, 5000);
        } catch (error) {
            reject(error);
        }
    });
}

function handleWebSocketMessage(message) {
    const { type, data } = message;
    
    switch (type) {
        case 'round_state':
            if (activeGameState) {
                activeGameState.updateRoundState(data);
            }
            triggerEventListeners('round_state', data);
            break;
            
        case 'event':
            if (activeGameState && data.guid && activeGameState.pendingActions.has(data.guid)) {
                activeGameState.pendingActions.delete(data.guid);
            }
            triggerEventListeners('event', data);
            break;
            
        case 'action_accepted':
            break;
            
        case 'error':
            console.error('Server error:', message.message);
            break;
    }
}

function addEventListener(eventType, handler) {
    if (wsEventListeners[eventType]) {
        wsEventListeners[eventType].push(handler);
    }
}

function removeEventListener(eventType, handler) {
    if (wsEventListeners[eventType]) {
        const index = wsEventListeners[eventType].indexOf(handler);
        if (index > -1) {
            wsEventListeners[eventType].splice(index, 1);
        }
    }
}

function triggerEventListeners(eventType, data) {
    if (wsEventListeners[eventType]) {
        wsEventListeners[eventType].forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error('Listener error:', error);
            }
        });
    }
}



async function fetchJSON(url) {
    const fetchFn = typeof fetch !== 'undefined' ? fetch : require('node-fetch');
    const response = await fetchFn(url);
    return await response.json();
}

async function loadActionsMetadata() {
    try {
        const data = await fetchJSON(`${API_BASE_URL}/actions`);
        const actions = data.actions || [];
        
        DYNAMIC_ACTIONS = {};
        
        for (const action of actions) {
            const metadata = action.metadata;
            if (!metadata) continue;
            
            const name = action.handle || metadata.name;
            const actionDef = {
                type: 'action',
                handle: action.handle,
                name,
                description: metadata.description || action.description || '',
                usage: metadata.parameters ? `${name} ${metadata.parameters.map(p => `<${p}>`).join(' ')}` : name,
                parameters: metadata.parameters || [],
                autocompletes: metadata.autocompletes || [],
                summarizeWithAI: metadata.summarizeWithAI || false
            };
            
            DYNAMIC_ACTIONS[name] = actionDef;
            (metadata.aliases || []).forEach(alias => {
                DYNAMIC_ACTIONS[alias] = actionDef;
            });
        }
        
        return true;
    } catch (error) {
        console.error('Failed to load actions:', error);
        return false;
    }
}

function generateGuid() {
    return crypto.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

async function executeAction(state, actionName, params) {
    try {
        const guid = generateGuid();
        
        const convertedParams = {};
        for (const [key, value] of Object.entries(params)) {
            convertedParams[key] = key.endsWith('Id') && typeof value === 'string' 
                ? state.getEntityId(value) 
                : value;
        }
        
        if (!convertedParams.actorId) {
            convertedParams.actorId = state.playerId;
        }
        
        state.pendingActions.set(guid, {
            action: actionName,
            params: convertedParams,
            timestamp: Date.now()
        });
        
        if (!ws || ws.readyState !== 1) {
            throw new Error('WebSocket not connected');
        }
        
        ws.send(JSON.stringify({
            type: 'action',
            action: actionName,
            params: convertedParams,
            guid
        }));
        
        return { success: true, guid };
    } catch (error) {
        console.error('Action execution error:', error);
        return { success: false, message: error.message };
    }
}



async function initializeGame(state) {
    try {
        activeGameState = state;
        
        addEventListener('round_state', (roundState) => {
            state.playerId = roundState.playerId;
            state.updateRoundState(roundState);
        });
        
        await connectWebSocket();
        await new Promise(resolve => setTimeout(resolve, 100));
        await loadActionsMetadata();
        
        state.availableActions = Object.keys(DYNAMIC_ACTIONS).filter(key => 
            DYNAMIC_ACTIONS[key].name === key
        );
        
        await executeAction(state, 'look', {});
        await new Promise(resolve => setTimeout(resolve, 200));
        
        return {
            success: true,
            playerId: state.playerId,
            actionsCount: state.availableActions.length,
            roundState: state.roundState
        };
    } catch (error) {
        console.error('Initialization error:', error);
        return { success: false, error: error.message };
    }
}



function parseCommand(input, state = null) {
    const trimmed = input.trim();
    if (!trimmed) return null;
    
    const [command, ...args] = trimmed.split(/\s+/);
    const lowerCommand = command.toLowerCase();
    const allCommands = { ...BUILTIN_COMMANDS, ...DYNAMIC_ACTIONS };
    const cmdDef = allCommands[lowerCommand];
    
    if (!cmdDef) {
        return { type: 'error', message: `Unknown command: ${command}\nType "help" for available commands` };
    }
    
    if (cmdDef.type === 'builtin') {
        return { type: lowerCommand };
    }
    
    if (cmdDef.type === 'action') {
        const params = {};
        const parameters = cmdDef.parameters;
        
        if (parameters.length === 1 && args.length > 1) {
            params[parameters[0]] = args.join(' ');
        } else {
            for (let i = 0; i < parameters.length; i++) {
                if (args[i]) params[parameters[i]] = args[i];
            }
        }
        
        return { 
            type: 'action', 
            action: cmdDef.handle || cmdDef.name, 
            params,
            summarizeWithAI: cmdDef.summarizeWithAI 
        };
    }
    
    return { type: 'error', message: `Unknown command: ${command}` };
}



function getAutocompleteSuggestions(input, currentRoomData) {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) return [];
    
    const allCommands = { ...BUILTIN_COMMANDS, ...DYNAMIC_ACTIONS };
    const parts = trimmed.split(/\s+/);
    const commandPart = parts[0];
    
    if (input.includes(' ') && parts.length > 1) {
        const cmdDef = allCommands[commandPart];
        
        if (['move', 'go', 'walk', 'm'].includes(commandPart)) {
            const prefix = parts[parts.length - 1];
            const directions = ['north', 'south', 'east', 'west'];
            const availableDirections = currentRoomData?.exits 
                ? directions.filter(dir => currentRoomData.exits.includes(dir))
                : directions;
            
            return availableDirections
                .filter(dir => !prefix || dir.startsWith(prefix))
                .map(dir => ({ text: dir, display: dir }));
        }
        
        if (cmdDef?.type === 'action' && currentRoomData) {
            const prefix = parts[parts.length - 1];
            const suggestions = [];
            
            if (!prefix || 'self'.startsWith(prefix)) {
                suggestions.push({ text: 'Self', display: 'Self' });
            }
            
            const allEntities = [
                ...(currentRoomData.enemies || []),
                ...(currentRoomData.items || []),
                ...(currentRoomData.landmarks || []),
                ...(currentRoomData.inventory || [])
            ];
            
            allEntities.forEach(entity => {
                const name = entity.name || `Entity ${entity.id}`;
                if (!prefix || name.toLowerCase().startsWith(prefix)) {
                    suggestions.push({ text: name, display: name });
                }
            });
            
            return suggestions;
        }
    }
    
    return Object.keys(allCommands)
        .filter(cmd => cmd.startsWith(trimmed))
        .map(cmd => ({ text: cmd, display: cmd }));
}



function getHelpText() {
    const lines = ['Available commands:'];
    const allCommands = { ...BUILTIN_COMMANDS, ...DYNAMIC_ACTIONS };
    const seen = new Set();
    
    Object.entries(allCommands).forEach(([key, cmd]) => {
        const displayName = cmd.name || key;
        if (seen.has(displayName)) return;
        seen.add(displayName);
        
        const aliases = cmd.aliases?.length > 0 ? ` (aliases: ${cmd.aliases.join(', ')})` : '';
        lines.push(`  ${cmd.usage}${aliases} - ${cmd.description}`);
    });
    
    return lines;
}

function formatRoomInfo(roomData) {
    if (!roomData || !roomData.success) return [];
    
    const lines = ['', `=== ${roomData.roomName || `Room ${roomData.roomId}`} ===`];
    
    if (roomData.roomDescription) {
        lines.push(roomData.roomDescription, '');
    }
    
    if (roomData.exits?.length > 0) {
        lines.push(`Exits: ${roomData.exits.join(', ')}`, '');
    }
    
    ['landmarks', 'items', 'enemies', 'inventory'].forEach(typeName => {
        const typeConfig = ENTITY_TYPES[typeName];
        const entities = roomData[typeName] || [];
        
        if (entities.length === 0) {
            if (typeConfig.emptyMessage) lines.push(typeConfig.emptyMessage);
            return;
        }
        
        lines.push(`${typeConfig.label}:`);
        entities.forEach(entity => {
            lines.push(`  • ${entity.name || `Entity ${entity.id}`}`);
            if (entity.description) lines.push(`    ${entity.description}`);
        });
        lines.push('');
    });
    
    return lines;
}

function formatRoundState(roundState) {
    if (!roundState) return [];
    
    const lines = ['', '=== Round State ==='];
    
    const isPlayerTurn = roundState.currentActorEid === roundState.playerId;
    lines.push(isPlayerTurn ? '👤 YOUR TURN' : `🤖 NPC TURN (Entity ${roundState.currentActorEid})`);
    lines.push('');
    
    if (roundState.systemsResolved && Object.keys(roundState.systemsResolved).length > 0) {
        lines.push('Systems Status:');
        Object.entries(roundState.systemsResolved).forEach(([systemName, resolved]) => {
            lines.push(`  ${resolved ? '✅' : '⏳'} ${systemName}: ${resolved ? 'resolved' : 'pending'}`);
        });
        lines.push('');
    }
    
    const eventCount = roundState.events?.length || 0;
    lines.push(`Events this round: ${eventCount}`, '');
    
    return lines;
}

function getAllCommands() {
    return { ...BUILTIN_COMMANDS, ...DYNAMIC_ACTIONS };
}

function getEntitiesByType(roomData, typeName) {
    return roomData?.[typeName] || [];
}



if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        GameState,
        initializeGame,
        executeAction,
        parseCommand,
        getAutocompleteSuggestions,
        getHelpText,
        formatRoomInfo,
        formatRoundState,
        getAllCommands,
        getEntitiesByType,
        addEventListener,
        removeEventListener
    };
}

if (typeof window !== 'undefined') {
    Object.assign(window, {
        GameState,
        initializeGame,
        executeAction,
        parseCommand,
        getAutocompleteSuggestions,
        getHelpText,
        formatRoomInfo,
        formatRoundState,
        getAllCommands,
        getEntitiesByType,
        addEventListener,
        removeEventListener
    });
}
