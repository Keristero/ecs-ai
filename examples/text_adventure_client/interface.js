/**
 * Browser interface for the text adventure game
 * Handles all DOM manipulation and browser-specific functionality
 */

// Import core game logic from inline script tag
// GameState, initializeGame, executeAction, parseCommand, etc. will be available globally

// Global state
let gameState = null;
let autocompleteIndex = -1;

// DOM elements
const terminal = document.getElementById('terminal');
const commandInput = document.getElementById('command-input');
const autocompleteDiv = document.getElementById('autocomplete');

// Print a line to the terminal
function printLine(text, className = '') {
    const line = document.createElement('div');
    line.className = `output-line ${className}`;
    line.textContent = text;
    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
}

// Print multiple lines
function printLines(lines, className = '') {
    lines.forEach(line => printLine(line, className));
}

// Clear the terminal
function clearTerminal() {
    terminal.innerHTML = '';
}

// Display room information
function displayRoomInfo(roomData) {
    const lines = formatRoomInfo(roomData);
    lines.forEach(line => {
        // Apply different styles based on line content
        let className = '';
        if (line.startsWith('===') || line.startsWith('Exits:') || 
            line.startsWith('Items:') || line.startsWith('Landmarks:') || 
            line.startsWith('Enemies:') || line.startsWith('Inventory:')) {
            className = 'info';
        }
        printLine(line, className);
    });
}

// Update autocomplete dropdown
function updateAutocomplete(input) {
    const suggestions = getAutocompleteSuggestions(input, gameState.currentRoomData);
    
    if (suggestions.length > 0) {
        autocompleteDiv.innerHTML = suggestions
            .map((suggestion, idx) => {
                // Handle both string and object suggestions
                const displayText = typeof suggestion === 'string' ? suggestion : suggestion.display;
                const valueText = typeof suggestion === 'string' ? suggestion : suggestion.text;
                return `<div class="autocomplete-item ${idx === 0 ? 'selected' : ''}" data-value="${valueText}" data-index="${idx}">${displayText}</div>`;
            })
            .join('');
        autocompleteDiv.style.display = 'block';
        autocompleteIndex = 0; // Select first item by default
    } else {
        autocompleteDiv.innerHTML = '';
        autocompleteDiv.style.display = 'none';
        autocompleteIndex = -1;
    }
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
    const items = autocompleteDiv.querySelectorAll('.autocomplete-item');
    if (items.length === 0) return;
    
    // Get selected item or first item if none selected
    let selected = autocompleteDiv.querySelector('.autocomplete-item.selected');
    if (!selected && items.length > 0) {
        selected = items[0];
    }
    
    if (selected) {
        const completionText = selected.getAttribute('data-value') || selected.textContent;
        
        // Replace only the current word being typed
        const currentValue = commandInput.value;
        const parts = currentValue.split(/\s+/);
        
        // Replace the last part (current word) with the completion
        parts[parts.length - 1] = completionText;
        
        // Reconstruct the command
        commandInput.value = parts.join(' ');
        
        autocompleteDiv.innerHTML = '';
        autocompleteDiv.style.display = 'none';
        autocompleteIndex = -1;
    }
}

// Execute command and display result
async function executeCommand(input) {
    const trimmed = input.trim();
    if (!trimmed) return;
    
    // Show command in terminal
    printLine(`> ${trimmed}`, 'prompt');
    
    // Add to history
    gameState.addToHistory(trimmed);
    
    // Parse command
    const parsed = parseCommand(input, gameState);
    
    if (!parsed) return;
    
    // Handle different command types
    switch (parsed.type) {
        case 'help':
            const helpLines = getHelpText();
            printLines(helpLines, 'info');
            break;
            
        case 'clear':
            clearTerminal();
            break;
            
        case 'action':
            const result = await executeAction(gameState, parsed.action, parsed.params);
            
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

// Initialize the game
async function init() {
    gameState = new GameState();
    
    printLine('=== Text Adventure Game ===', 'info');
    printLine('Loading game...', 'info');
    
    const initResult = await initializeGame(gameState);
    
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
        autocompleteDiv.style.display = 'none';
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
            if (prev !== null) {
                commandInput.value = prev;
                updateAutocomplete(prev); // Update autocomplete for history command
            }
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (autocompleteDiv.children.length > 0) {
            selectAutocomplete('down');
        } else {
            const next = gameState.getNextCommand();
            commandInput.value = next;
            updateAutocomplete(next); // Update autocomplete for history command
        }
    } else if (e.key === 'Escape') {
        // Clear autocomplete on Escape
        autocompleteDiv.innerHTML = '';
        autocompleteDiv.style.display = 'none';
        autocompleteIndex = -1;
    }
});

// Click to select autocomplete
autocompleteDiv.addEventListener('click', (e) => {
    if (e.target.classList.contains('autocomplete-item')) {
        const completionText = e.target.getAttribute('data-value') || e.target.textContent;
        
        // Replace only the current word being typed
        const currentValue = commandInput.value;
        const parts = currentValue.split(/\s+/);
        
        // Replace the last part (current word) with the completion
        parts[parts.length - 1] = completionText;
        
        // Reconstruct the command
        commandInput.value = parts.join(' ');
        
        autocompleteDiv.innerHTML = '';
        autocompleteDiv.style.display = 'none';
        commandInput.focus();
    }
});

// Start the game
init();
