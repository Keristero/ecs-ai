// Configuration
const API_BASE_URL = 'http://localhost:6060';
let PLAYER_ID = null; // Will be fetched from server

// Game state
let currentRoomData = null;
let availableActions = [];
let commandHistory = [];
let historyIndex = -1;
let autocompleteIndex = -1;

// DOM elements
const terminal = document.getElementById('terminal');
const commandInput = document.getElementById('command-input');
const autocompleteDiv = document.getElementById('autocomplete');

// Initialize
async function init() {
    printLine('=== Text Adventure Game ===', 'info');
    printLine('Loading game...', 'info');
    
    try {
        // Get player ID from server
        const gameInfoResponse = await fetch(`${API_BASE_URL}/actions/gameinfo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        const gameInfo = await gameInfoResponse.json();
        if (gameInfo.result && gameInfo.result.playerId) {
            PLAYER_ID = gameInfo.result.playerId;
            printLine(`Player ID: ${PLAYER_ID}`, 'info');
        } else {
            printLine('Warning: Could not get player ID, using default', 'error');
            PLAYER_ID = 1;
        }
        
        // Load available actions
        await loadActions();
        printLine(`Loaded ${availableActions.length} actions`, 'success');
        
        // Look around to get initial room info
        await executeAction('look', {});
        
        printLine('Type "help" for available commands', 'info');
    } catch (error) {
        printLine(`Failed to initialize: ${error.message}`, 'error');
    }
}

// Load available actions from API
async function loadActions() {
    const response = await fetch(`${API_BASE_URL}/actions`);
    const data = await response.json();
    availableActions = data.actions || [];
}

// Print a line to the terminal
function printLine(text, className = '') {
    const line = document.createElement('div');
    line.className = `output-line ${className}`;
    line.textContent = text;
    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
}

// Execute an action via API
async function executeAction(actionName, params) {
    try {
        const response = await fetch(`${API_BASE_URL}/actions/${actionName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId: PLAYER_ID, ...params })
        });
        
        const data = await response.json();
        
        if (data.result) {
            const result = data.result;
            
            if (result.success === false) {
                printLine(result.message, 'error');
                return result;
            }
            
            if (result.message) {
                printLine(result.message, 'success');
            }
            
            // Update room data if this was a look action or movement
            if (actionName === 'look' || (result.roomId && actionName === 'move')) {
                currentRoomData = result;
                displayRoomInfo(result);
            }
            
            return result;
        }
    } catch (error) {
        printLine(`Action failed: ${error.message}`, 'error');
        return { success: false };
    }
}

// Display room information
function displayRoomInfo(roomData) {
    if (!roomData || !roomData.success) return;
    
    printLine('', '');
    
    // Room name and description
    if (roomData.roomName) {
        printLine(`=== ${roomData.roomName} ===`, 'info');
    } else {
        printLine(`=== Room ${roomData.roomId} ===`, 'info');
    }
    
    if (roomData.roomDescription) {
        printLine(roomData.roomDescription, '');
        printLine('', '');
    }
    
    // Exits
    if (roomData.exits && roomData.exits.length > 0) {
        printLine(`Exits: ${roomData.exits.join(', ')}`, 'info');
        printLine('', '');
    }
    
    // Landmarks
    if (roomData.landmarks && roomData.landmarks.length > 0) {
        printLine('Landmarks:', 'info');
        roomData.landmarks.forEach(landmark => {
            if (landmark.name) {
                printLine(`  • ${landmark.name}`, '');
                if (landmark.description) {
                    printLine(`    ${landmark.description}`, '');
                }
            } else {
                printLine(`  • Landmark [${landmark.id}]`, '');
            }
        });
        printLine('', '');
    }
    
    // Items
    if (roomData.items && roomData.items.length > 0) {
        printLine('Items:', 'info');
        roomData.items.forEach(item => {
            if (item.name) {
                printLine(`  • ${item.name} [${item.id}]`, '');
                if (item.description) {
                    printLine(`    ${item.description}`, '');
                }
            } else {
                printLine(`  • Item [${item.id}]`, '');
            }
        });
        printLine('', '');
    }
    
    // Enemies
    if (roomData.enemies && roomData.enemies.length > 0) {
        printLine('Enemies:', 'info');
        roomData.enemies.forEach(enemy => {
            if (enemy.name) {
                printLine(`  • ${enemy.name} [${enemy.id}]`, '');
                if (enemy.description) {
                    printLine(`    ${enemy.description}`, '');
                }
            } else {
                printLine(`  • Enemy [${enemy.id}]`, '');
            }
        });
        printLine('', '');
    }
    
    // Inventory
    if (roomData.inventory && roomData.inventory.length > 0) {
        printLine('Inventory:', 'info');
        roomData.inventory.forEach(item => {
            if (item.name) {
                printLine(`  • ${item.name} [${item.id}]`, '');
            } else {
                printLine(`  • Item [${item.id}]`, '');
            }
        });
    } else {
        printLine('Inventory: empty', 'info');
    }
}

// Parse and execute command
async function executeCommand(input) {
    const trimmed = input.trim();
    if (!trimmed) return;
    
    printLine(`> ${trimmed}`, 'prompt');
    commandHistory.push(trimmed);
    historyIndex = commandHistory.length;
    
    const [command, ...args] = trimmed.split(/\s+/);
    const lowerCommand = command.toLowerCase();
    
    // Built-in commands
    if (lowerCommand === 'help') {
        printLine('Available commands:', 'info');
        printLine('  help - Show this help', '');
        printLine('  look - Look around the room', '');
        printLine('  move <direction> - Move in a direction (north, south, east, west)', '');
        printLine('  pickup <itemId> - Pick up an item', '');
        printLine('  drop <itemId> - Drop an item', '');
        printLine('  attack <enemyId> - Attack an enemy', '');
        printLine('  clear - Clear the terminal', '');
        return;
    }
    
    if (lowerCommand === 'clear') {
        terminal.innerHTML = '';
        return;
    }
    
    // Action commands
    if (lowerCommand === 'look') {
        await executeAction('look', {});
        return;
    }
    
    if (lowerCommand === 'move') {
        const direction = args[0];
        if (!direction) {
            printLine('Usage: move <direction>', 'error');
            return;
        }
        await executeAction('move', { direction });
        return;
    }
    
    if (lowerCommand === 'pickup') {
        const itemId = parseInt(args[0]);
        if (isNaN(itemId)) {
            printLine('Usage: pickup <itemId>', 'error');
            return;
        }
        await executeAction('pickup', { itemId });
        return;
    }
    
    if (lowerCommand === 'drop') {
        const itemId = parseInt(args[0]);
        if (isNaN(itemId)) {
            printLine('Usage: drop <itemId>', 'error');
            return;
        }
        await executeAction('drop', { itemId });
        return;
    }
    
    if (lowerCommand === 'attack') {
        const enemyId = parseInt(args[0]);
        if (isNaN(enemyId)) {
            printLine('Usage: attack <enemyId>', 'error');
            return;
        }
        await executeAction('attack', { enemyId });
        return;
    }
    
    printLine(`Unknown command: ${command}`, 'error');
    printLine('Type "help" for available commands', 'info');
}

// Autocomplete logic
function updateAutocomplete(input) {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) {
        autocompleteDiv.innerHTML = '';
        return;
    }
    
    const commands = ['help', 'look', 'move', 'pickup', 'drop', 'attack', 'clear'];
    const matches = commands.filter(cmd => cmd.startsWith(trimmed));
    
    // Add contextual suggestions based on current room
    if (trimmed.startsWith('move ')) {
        const directions = ['north', 'south', 'east', 'west'];
        autocompleteDiv.innerHTML = directions
            .map((dir, idx) => `<div class="autocomplete-item" data-index="${idx}">move ${dir}</div>`)
            .join('');
        return;
    }
    
    if (matches.length > 0) {
        autocompleteDiv.innerHTML = matches
            .map((cmd, idx) => `<div class="autocomplete-item" data-index="${idx}">${cmd}</div>`)
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
        commandInput.value = selected.textContent;
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
        } else if (historyIndex > 0) {
            historyIndex--;
            commandInput.value = commandHistory[historyIndex];
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (autocompleteDiv.children.length > 0) {
            selectAutocomplete('down');
        } else if (historyIndex < commandHistory.length - 1) {
            historyIndex++;
            commandInput.value = commandHistory[historyIndex];
        } else {
            historyIndex = commandHistory.length;
            commandInput.value = '';
        }
    }
});

// Click to select autocomplete
autocompleteDiv.addEventListener('click', (e) => {
    if (e.target.classList.contains('autocomplete-item')) {
        commandInput.value = e.target.textContent;
        autocompleteDiv.innerHTML = '';
        commandInput.focus();
    }
});

// Start the game
init();
