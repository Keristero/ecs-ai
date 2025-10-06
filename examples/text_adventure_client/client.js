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
        getAllCommands: window.getAllCommands
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
        
        // Initialize game (this loads actions and gets player ID)
        const initResult = await core.initializeGame(gameState);
        
        if (initResult.success) {
            printLine(`Player ID: ${initResult.playerId}`, 'info');
            printLine(`Loaded ${initResult.actionsCount} actions`, 'success');
            
            // Display initial room
            if (initResult.initialRoom) {
                displayRoomInfo(initResult.initialRoom);
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
                if (result.message) {
                    printLine(result.message, 'success');
                }
                
                // Display room info if available
                if (result.roomId) {
                    displayRoomInfo(result);
                }
            }
            break;
            
        case 'error':
            printLine(parsed.message, 'error');
            break;
    }
}

// Autocomplete logic
function updateAutocomplete(input) {
    const suggestions = core.getAutocompleteSuggestions(input, gameState.currentRoomData);
    
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
