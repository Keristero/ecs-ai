const terminal = document.getElementById('terminal');
const commandInput = document.getElementById('command-input');
const autocompleteDiv = document.getElementById('autocomplete');

let gameState = null;
let autocompleteIndex = -1;

function printLine(text, className = '') {
    const line = document.createElement('div');
    line.className = `output-line ${className}`;
    line.textContent = text;
    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
}

function displayRoomInfo(roomData) {
    const lines = formatRoomInfo(roomData);
    lines.forEach(line => {
        let className = '';
        if (line.startsWith('===') || line.startsWith('Exits:') || 
            line.includes('Items:') || line.includes('Landmarks:') || 
            line.includes('Enemies:') || line.includes('Inventory:')) {
            className = 'info';
        }
        printLine(line, className);
    });
}

function displayRoundState(roundState) {
    const lines = formatRoundState(roundState);
    lines.forEach(line => {
        let className = '';
        if (line.startsWith('===')) className = 'info';
        else if (line.includes('YOUR TURN')) className = 'success';
        else if (line.includes('NPC TURN')) className = 'dim';
        else if (line.includes('▶')) className = 'success';
        printLine(line, className);
    });
}

function displayEvent(event) {
    const currentRoomId = gameState.getCurrentRoomId();
    const isGlobalEvent = event.type === 'round' || event.type === 'turn';
    const isInCurrentRoom = event.action?.room_eid === currentRoomId || event.action?.room_eid === undefined;
    const systemRoomId = event.system?.details?.room_eid;
    const isSystemInCurrentRoom = systemRoomId === currentRoomId || systemRoomId === undefined;
    
    if (!isGlobalEvent && !isInCurrentRoom && !isSystemInCurrentRoom) return;
    
    if (event.type === 'action' && event.name === 'look' && event.action?.success) {
        displayRoomInfo(event.action.details);
        return;
    }
    
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

async function executeCommand(input) {
    const trimmed = input.trim();
    if (!trimmed) return;
    
    printLine(`> ${trimmed}`, 'prompt');
    gameState.addToHistory(trimmed);
    
    const parsed = parseCommand(input, gameState);
    if (!parsed) return;
    
    switch (parsed.type) {
        case 'help':
            getHelpText().forEach(line => printLine(line, 'info'));
            break;
            
        case 'clear':
            terminal.innerHTML = '';
            break;
            
        case 'action':
            const result = await executeAction(gameState, parsed.action, parsed.params);
            if (result.success === false) {
                printLine(result.message, 'error');
            } else {
                printLine(`Action sent: ${parsed.action}`, 'dim');
            }
            break;
            
        case 'error':
            printLine(parsed.message, 'error');
            break;
    }
}

function updateAutocomplete(input) {
    const currentRoomData = gameState.getCurrentRoomData();
    const suggestions = getAutocompleteSuggestions(input, currentRoomData);
    
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

function selectAutocomplete(direction) {
    const items = autocompleteDiv.querySelectorAll('.autocomplete-item');
    if (items.length === 0) return;
    
    items.forEach(item => item.classList.remove('selected'));
    
    if (direction === 'down') {
        autocompleteIndex = (autocompleteIndex + 1) % items.length;
    } else if (direction === 'up') {
        autocompleteIndex = autocompleteIndex <= 0 ? items.length - 1 : autocompleteIndex - 1;
    }
    
    items[autocompleteIndex].classList.add('selected');
}

function applyAutocomplete() {
    const selected = autocompleteDiv.querySelector('.autocomplete-item.selected');
    if (selected) {
        const text = selected.getAttribute('data-text') || selected.textContent;
        commandInput.value = text;
        autocompleteDiv.innerHTML = '';
    }
}

async function init() {
    printLine('=== Text Adventure Game ===', 'info');
    printLine('Loading game...', 'info');
    
    try {
        gameState = new GameState();
        
        addEventListener('round_state', displayRoundState);
        addEventListener('event', displayEvent);
        
        const initResult = await initializeGame(gameState);
        
        if (initResult.success) {
            printLine(`Player ID: ${initResult.playerId}`, 'info');
            printLine(`Loaded ${initResult.actionsCount} actions`, 'success');
            
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

commandInput.addEventListener('input', (e) => updateAutocomplete(e.target.value));

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
            if (prev) commandInput.value = prev;
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (autocompleteDiv.children.length > 0) {
            selectAutocomplete('down');
        } else {
            commandInput.value = gameState.getNextCommand();
        }
    }
});

autocompleteDiv.addEventListener('click', (e) => {
    if (e.target.classList.contains('autocomplete-item')) {
        const text = e.target.getAttribute('data-text') || e.target.textContent;
        commandInput.value = text;
        autocompleteDiv.innerHTML = '';
        commandInput.focus();
    }
});

window.addEventListener('DOMContentLoaded', init);
