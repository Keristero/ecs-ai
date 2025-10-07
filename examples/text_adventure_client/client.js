// Configuration
const API_BASE_URL = 'http://localhost:6060';

// Import core functions (when loaded in browser, core.js exports to window)
let core = null;

// Game state
let gameState = null;
let autocompleteIndex = -1;

// DOM elements
const terminal = document.getElementById('terminal');
const commandInput = document.getElementById('command-input');
const autocompleteDiv = document.getElementById('autocomplete');

// Load core module
window.addEventListener('DOMContentLoaded', () => {
    // In browser, core.js exports are available globally
    core = {
        GameState: window.GameState,
        loadActionsMetadata: window.loadActionsMetadata,
        initializeGame: window.initializeGame,
        executeAction: window.executeAction,
        parseCommand: window.parseCommand,
        getAutocompleteSuggestions: window.getAutocompleteSuggestions,
        getHelpText: window.getHelpText,
        formatRoomInfo: window.formatRoomInfo,
        formatRoundState: window.formatRoundState,
        getAllCommands: window.getAllCommands,
        addEventListener: window.addEventListener,
        removeEventListener: window.removeEventListener
    };
    
    // Start the game
    init();
});

// Initialize
async function init() {
    printLine('=== Text Adventure Game ===', 'info');
    printLine('Loading game...', 'info');
    
    try {
        // Initialize game state
        gameState = new core.GameState();
        
        // Set up WebSocket event listeners
        core.addEventListener('round_state', (roundState) => {
            displayRoundState(roundState);
        });
        
        core.addEventListener('event', (event) => {
            displayEvent(event);
        });
        
        // Initialize game (this connects WebSocket and loads actions)
        const initResult = await core.initializeGame(gameState);
        
        if (initResult.success) {
            printLine(`Player ID: ${initResult.playerId}`, 'info');
            printLine(`Loaded ${initResult.actionsCount} actions`, 'success');
            
            // Initial room info will come from look event in the event stream
            
            // Display initial round state (will also update from WebSocket)
            if (initResult.roundState) {
                displayRoundState(initResult.roundState);
            }
            
            printLine('Type "help" for available commands', 'info');
        } else {
            printLine(`Failed to initialize: ${initResult.error}`, 'error');
        }
    } catch (error) {
        printLine(`Failed to initialize: ${error.message}`, 'error');
    }
}

// Print a line to the terminal
function printLine(text, className = '') {
    const line = document.createElement('div');
    line.className = `output-line ${className}`;
    line.textContent = text;
    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
}

// Display room information (uses core.formatRoomInfo)
function displayRoomInfo(roomData) {
    const lines = core.formatRoomInfo(roomData);
    lines.forEach(line => {
        // Apply different styles based on line content
        let className = '';
        if (line.startsWith('===')) {
            className = 'info';
        } else if (line.startsWith('Exits:') || line.startsWith('Items:') || 
                   line.startsWith('Landmarks:') || line.startsWith('Enemies:') || 
                   line.startsWith('Inventory:')) {
            className = 'info';
        }
        printLine(line, className);
    });
}

// Display round state (NEW)
function displayRoundState(roundState) {
    const lines = core.formatRoundState(roundState);
    lines.forEach(line => {
        // Apply different styles based on line content
        let className = '';
        if (line.startsWith('===')) {
            className = 'info';
        } else if (line.includes('YOUR TURN')) {
            className = 'success';
        } else if (line.includes('NPC TURN')) {
            className = 'dim';
        } else if (line.includes('▶')) {
            className = 'success';
        }
        printLine(line, className);
    });
}

// Display individual event as it happens
function displayEvent(event) {
    // Filter: only show events in current room
    const currentRoomId = gameState.getCurrentRoomId();
    
    // Always show round/turn events (global)
    const isGlobalEvent = event.type === 'round' || event.type === 'turn';
    
    // Check if action event is in current room
    const isInCurrentRoom = event.action?.room_eid === currentRoomId || event.action?.room_eid === undefined;
    
    // Check if system event is in current room  
    const systemRoomId = event.system?.details?.room_eid;
    const isSystemInCurrentRoom = systemRoomId === currentRoomId || systemRoomId === undefined;
    
    if (!isGlobalEvent && !isInCurrentRoom && !isSystemInCurrentRoom) {
        // Event is in a different room, don't display
        return;
    }
    
    // For look events, display the full room info
    if (event.type === 'action' && event.name === 'look' && event.action?.success) {
        displayRoomInfo(event.action.details);
        return;
    }
    
    // For other events, show a brief description
    let eventDesc = `[${event.type}] ${event.name}`;
    
    if (event.action) {
        if (event.action.success) {
            eventDesc += ` ✓`;
            if (event.action.details?.message) {
                eventDesc += `: ${event.action.details.message}`;
            }
        } else {
            eventDesc += ` ✗`;
            if (event.action.details?.error) {
                eventDesc += `: ${event.action.details.error}`;
            }
        }
    }
    
    printLine(eventDesc, event.action?.success ? 'success' : 'dim');
}

// Parse and execute command
async function executeCommand(input) {
    const trimmed = input.trim();
    if (!trimmed) return;
    
    printLine(`> ${trimmed}`, 'prompt');
    gameState.addToHistory(trimmed);
    
    // Parse command using core
    const parsed = core.parseCommand(input, gameState);
    
    if (!parsed) {
        return;
    }
    
    // Handle different command types
    switch (parsed.type) {
        case 'help':
            const helpLines = core.getHelpText();
            helpLines.forEach(line => printLine(line, 'info'));
            break;
            
        case 'clear':
            terminal.innerHTML = '';
            break;
            
        case 'action':
            const result = await core.executeAction(gameState, parsed.action, parsed.params);
            
            if (result.success === false) {
                printLine(result.message, 'error');
            } else {
                // Don't display anything here - all game state comes from events
                // Events will be broadcast and handled by displayEvent()
                printLine(`Action sent: ${parsed.action}`, 'dim');
            }
            break;
            
        case 'error':
            printLine(parsed.message, 'error');
            break;
    }
}

// Autocomplete logic
function updateAutocomplete(input) {
    const currentRoomData = gameState.getCurrentRoomData();
    const suggestions = core.getAutocompleteSuggestions(input, currentRoomData);
    
    if (suggestions.length > 0) {
        autocompleteDiv.innerHTML = suggestions
            .map((suggestion, idx) => {
                const text = typeof suggestion === 'string' ? suggestion : suggestion.text;
                const display = typeof suggestion === 'string' ? suggestion : (suggestion.display || suggestion.text);
                return `<div class="autocomplete-item" data-index="${idx}" data-text="${text}">${display}</div>`;
            })
            .join('');
    } else {
        autocompleteDiv.innerHTML = '';
    }
    
    autocompleteIndex = -1;
}

// Select autocomplete item
function selectAutocomplete(direction) {
    const items = autocompleteDiv.querySelectorAll('.autocomplete-item');
    if (items.length === 0) return;
    
    // Remove previous selection
    items.forEach(item => item.classList.remove('selected'));
    
    // Update index
    if (direction === 'down') {
        autocompleteIndex = (autocompleteIndex + 1) % items.length;
    } else if (direction === 'up') {
        autocompleteIndex = autocompleteIndex <= 0 ? items.length - 1 : autocompleteIndex - 1;
    }
    
    // Add selection
    items[autocompleteIndex].classList.add('selected');
}

// Apply autocomplete selection
function applyAutocomplete() {
    const selected = autocompleteDiv.querySelector('.autocomplete-item.selected');
    if (selected) {
        const text = selected.getAttribute('data-text') || selected.textContent;
        commandInput.value = text;
        autocompleteDiv.innerHTML = '';
    }
}

// Event listeners
commandInput.addEventListener('input', (e) => {
    updateAutocomplete(e.target.value);
});

commandInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const command = commandInput.value;
        commandInput.value = '';
        autocompleteDiv.innerHTML = '';
        await executeCommand(command);
    } else if (e.key === 'Tab') {
        e.preventDefault();
        applyAutocomplete();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (autocompleteDiv.children.length > 0) {
            selectAutocomplete('up');
        } else {
            const prev = gameState.getPreviousCommand();
            if (prev) {
                commandInput.value = prev;
            }
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (autocompleteDiv.children.length > 0) {
            selectAutocomplete('down');
        } else {
            const next = gameState.getNextCommand();
            commandInput.value = next;
        }
    }
});

// Click to select autocomplete
autocompleteDiv.addEventListener('click', (e) => {
    if (e.target.classList.contains('autocomplete-item')) {
        const text = e.target.getAttribute('data-text') || e.target.textContent;
        commandInput.value = text;
        autocompleteDiv.innerHTML = '';
        commandInput.focus();
    }
});
