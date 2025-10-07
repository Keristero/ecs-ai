let terminal;
let commandInput;
let autocompleteDiv;
let gameState = null;
let autocompleteIndex = -1;

function printLine(text, className = '') {
    if (!terminal) return;
    
    const line = document.createElement('div');
    line.className = `output-line ${className}`;
    line.textContent = text;
    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
}

function displayEvent(event) {
    // Handle look action - display full room details
    if (event.type === 'action' && event.name === 'look' && event.action?.success) {
        displayRoomInfo(event.action.details);
        return;
    }
    
    // Filter events by current room (skip events from other rooms)
    const currentRoomId = gameState.getCurrentRoomId();
    const isGlobalEvent = event.type === 'round' || event.type === 'turn';
    const eventRoomId = event.action?.room_eid || event.system?.details?.room_eid;
    const isInCurrentRoom = !eventRoomId || eventRoomId === currentRoomId;
    
    if (!isGlobalEvent && !isInCurrentRoom) return;
    
    // Display event summary
    const status = event.action?.success ? ' ✓' : event.action?.success === false ? ' ✗' : '';
    const message = event.action?.details?.message || event.action?.details?.error || '';
    const eventDesc = `[${event.type}] ${event.name}${status}${message ? `: ${message}` : ''}`;
    
    printLine(eventDesc, event.action?.success ? 'success' : 'dim');
}

function displayRoomInfo(details) {
    if (!details) return;
    
    const lines = [];
    
    // Room header
    lines.push('', `=== ${details.room_name || 'Unknown Room'} ===`);
    
    // Room description
    if (details.room_description) {
        lines.push(details.room_description, '');
    }
    
    // Exits
    if (details.exits?.length > 0) {
        lines.push(`Exits: ${details.exits.join(', ')}`, '');
    }
    
    // Display entity lists
    const entityTypes = [
        { key: 'landmarks', label: 'Landmarks' },
        { key: 'items', label: 'Items' },
        { key: 'enemies', label: 'Enemies' },
        { key: 'inventory', label: 'Inventory', emptyMsg: 'Inventory: empty' }
    ];
    
    entityTypes.forEach(({ key, label, emptyMsg }) => {
        const entities = details[key] || [];
        
        if (entities.length === 0) {
            if (emptyMsg) lines.push(emptyMsg);
            return;
        }
        
        lines.push(`${label}:`);
        entities.forEach(entity => {
            lines.push(`  • ${entity.name || entity.id}`);
            if (entity.description) lines.push(`    ${entity.description}`);
        });
        lines.push('');
    });
    
    // Display message if any
    if (details.message) {
        lines.push(details.message);
    }
    
    // Print all lines
    lines.forEach(line => {
        const className = line.startsWith('===') || line.startsWith('Exits:') || 
                         line.match(/^(Landmarks|Items|Enemies|Inventory):$/) ? 'info' : '';
        printLine(line, className);
    });
}

function displayRoundState(roundState) {
    if (!roundState) return;
    
    const lines = [];
    lines.push('', '=== Round State ===');
    
    // Current turn indicator
    const isPlayerTurn = roundState.currentActorEid === roundState.playerId;
    lines.push(isPlayerTurn ? '👤 YOUR TURN' : `🤖 NPC TURN (Entity ${roundState.currentActorEid})`);
    lines.push('');
    
    // Systems status
    if (roundState.systemsResolved && Object.keys(roundState.systemsResolved).length > 0) {
        lines.push('Systems Status:');
        Object.entries(roundState.systemsResolved).forEach(([systemName, resolved]) => {
            lines.push(`  ${resolved ? '✅' : '⏳'} ${systemName}: ${resolved ? 'resolved' : 'pending'}`);
        });
        lines.push('');
    }
    
    // Event count
    lines.push(`Events this round: ${roundState.events?.length || 0}`, '');
    
    // Print lines
    lines.forEach(line => {
        let className = '';
        if (line.startsWith('===')) className = 'info';
        else if (line.includes('YOUR TURN')) className = 'success';
        else if (line.includes('NPC TURN')) className = 'dim';
        printLine(line, className);
    });
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
            if (!result.success) {
                printLine(result.message, 'error');
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
                const display = typeof suggestion === 'string' ? suggestion : (suggestion.display || text);
                return `<div class="autocomplete-item ${idx === 0 ? 'selected' : ''}" data-value="${text}">${display}</div>`;
            })
            .join('');
        autocompleteDiv.style.display = 'block';
        autocompleteIndex = 0;
    } else {
        autocompleteDiv.innerHTML = '';
        autocompleteDiv.style.display = 'none';
        autocompleteIndex = -1;
    }
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
    if (!selected) return;
    
    const text = selected.getAttribute('data-value') || selected.textContent;
    const currentValue = commandInput.value;
    const parts = currentValue.split(/\s+/);
    parts[parts.length - 1] = text;
    commandInput.value = parts.join(' ');
    
    autocompleteDiv.innerHTML = '';
    autocompleteDiv.style.display = 'none';
    autocompleteIndex = -1;
}

async function init() {
    terminal = document.getElementById('terminal');
    commandInput = document.getElementById('command-input');
    autocompleteDiv = document.getElementById('autocomplete');
    
    if (!terminal || !commandInput || !autocompleteDiv) {
        console.error('Required DOM elements not found');
        alert('Failed to initialize: Required DOM elements not found');
        return;
    }
    
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
            printLine('Type "help" for available commands', 'info');
            setupEventListeners();
        } else {
            printLine(`Failed to initialize: ${initResult.error}`, 'error');
        }
    } catch (error) {
        console.error('Initialization error:', error);
        printLine(`Failed to initialize: ${error.message}`, 'error');
    }
}

function setupEventListeners() {
    commandInput.addEventListener('input', (e) => updateAutocomplete(e.target.value));

    commandInput.addEventListener('keydown', async (e) => {
        const autocompleteVisible = autocompleteDiv.children.length > 0;
        
        switch (e.key) {
            case 'Enter':
                e.preventDefault();
                const command = commandInput.value;
                commandInput.value = '';
                autocompleteDiv.innerHTML = '';
                autocompleteDiv.style.display = 'none';
                await executeCommand(command);
                break;
                
            case 'Tab':
                e.preventDefault();
                applyAutocomplete();
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                if (autocompleteVisible) {
                    selectAutocomplete('up');
                } else {
                    const prev = gameState.getPreviousCommand();
                    if (prev) {
                        commandInput.value = prev;
                        updateAutocomplete(prev);
                    }
                }
                break;
                
            case 'ArrowDown':
                e.preventDefault();
                if (autocompleteVisible) {
                    selectAutocomplete('down');
                } else {
                    const next = gameState.getNextCommand();
                    commandInput.value = next;
                    updateAutocomplete(next);
                }
                break;
                
            case 'Escape':
                autocompleteDiv.innerHTML = '';
                autocompleteDiv.style.display = 'none';
                autocompleteIndex = -1;
                break;
        }
    });

    autocompleteDiv.addEventListener('click', (e) => {
        if (e.target.classList.contains('autocomplete-item')) {
            const text = e.target.getAttribute('data-value') || e.target.textContent;
            const currentValue = commandInput.value;
            const parts = currentValue.split(/\s+/);
            parts[parts.length - 1] = text;
            commandInput.value = parts.join(' ');
            
            autocompleteDiv.innerHTML = '';
            autocompleteDiv.style.display = 'none';
            commandInput.focus();
        }
    });
}

init()
