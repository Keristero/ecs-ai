import * as core from './core.mjs';

const elements = {
    log: document.getElementById('log'),
    terminalInput: document.getElementById('terminal-input'),
    autocomplete: document.getElementById('autocomplete'),
    roomContent: document.getElementById('room-content'),
    statusContent: document.getElementById('status-content'),
    inventoryContent: document.getElementById('inventory-content')
};

let ws = null;
let autocompleteIndex = -1;
let currentSuggestions = [];

const connectWebSocket = () => {
    // Connect to API server as configured in mise.toml (port 3000)
    const wsUrl = 'ws://127.0.0.1:6060';
    
    console.log('Connecting to:', wsUrl);
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('WebSocket connection established');
        logMessage('Connected to server', 'success');
    };
    
    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log('Received event:', data.type);
            handleServerEvent(data);
        } catch (error) {
            console.error('Error handling message:', error);
        }
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        logMessage('Connection error', 'error');
    };
    
    ws.onclose = () => {
        logMessage('Disconnected from server', 'error');
        setTimeout(connectWebSocket, 3000);
    };
};

const handleServerEvent = (message) => {
    // Handle both wrapped and unwrapped events
    let event = message;
    
    // If it's wrapped in a 'type' envelope, handle accordingly
    if (message.type === 'event' && message.data) {
        event = message.data;
    } else if (message.type === 'round_state' && message.data) {
        // Round state is handled directly
        event = message;
    }
    
    const config = core.handleEvent(event);
    
    if (config?.logMessage) {
        const extractedMessage = core.extractMessage(event);
        if (extractedMessage) {
            logMessage(extractedMessage, config.messageColor);
        }
    }
    
    if (config?.updateUI) {
        config.updateUI.forEach(updateUIElement);
    }
    
    if (event.type === 'player_connected') {
        core.state.playerId = event.player_connected.playerId;
        console.log('Player ID assigned:', core.state.playerId);
    }
    
    if (event.type === 'action_schemas') {
        core.state.actionSchemas = event.action_schemas.schemas;
        console.log('Action schemas received:', Object.keys(core.state.actionSchemas));
    }
};

const logMessage = (message, type = 'info') => {
    const div = document.createElement('div');
    div.className = `log-message log-${type}`;
    div.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    elements.log.appendChild(div);
    elements.log.scrollTop = elements.log.scrollHeight;
};

const updateUIElement = (elementName) => {
    switch (elementName) {
        case 'room-info':
            updateRoomInfo();
            break;
        case 'status':
            updateStatus();
            break;
        case 'inventory':
            updateInventory();
            break;
    }
};

const updateRoomInfo = () => {
    const roomEntities = core.getRoomEntities();
    const currentRoom = core.state.entities.get(core.state.currentRoom);
    
    let html = '<div class="room-name">Unknown</div>';
    html += '<div class="room-description">No room data</div>';
    
    if (currentRoom) {
        html = `<div class="room-name">${currentRoom.name || 'Unknown Room'}</div>`;
        html += `<div class="room-description">${currentRoom.description || ''}</div>`;
    }
    
    const categories = core.categorizeEntities(roomEntities.filter(e => e.id !== core.state.playerId));
    
    Object.entries(categories).forEach(([categoryName, entities]) => {
        html += `<div class="entity-category">`;
        html += `<div class="category-name">${categoryName}:</div>`;
        html += `<div class="entity-list">`;
        entities.forEach(entity => {
            html += `<div>- ${entity.name || 'Unknown'}</div>`;
        });
        html += `</div></div>`;
    });
    
    elements.roomContent.innerHTML = html;
};

const updateStatus = () => {
    const stats = core.getPlayerStats();
    
    if (stats.length === 0) {
        elements.statusContent.innerHTML = '<div class="waiting-indicator">Loading status...</div>';
        return;
    }
    
    let html = '';
    stats.forEach(stat => {
        html += `<div class="stat-bar">`;
        html += `<div class="stat-label">${stat.label}</div>`;
        html += `<div class="bar-container">`;
        html += `<div class="bar-fill ${stat.className}" style="width: ${stat.percentage}%"></div>`;
        html += `<div class="bar-text">${stat.current} / ${stat.max}</div>`;
        html += `</div></div>`;
    });
    
    if (!core.state.isPlayerTurn) {
        html += '<div class="waiting-indicator">Waiting for turn...</div>';
    }
    
    elements.statusContent.innerHTML = html;
};

const updateInventory = () => {
    const inventory = core.getPlayerInventory();
    
    if (inventory.length === 0) {
        elements.inventoryContent.innerHTML = '<div class="waiting-indicator">Empty</div>';
        return;
    }
    
    let html = '';
    inventory.forEach(item => {
        html += `<div class="item">- ${item.name || 'Unknown Item'}</div>`;
    });
    
    elements.inventoryContent.innerHTML = html;
};

const handleInput = (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        submitCommand();
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateAutocomplete(1);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateAutocomplete(-1);
    } else if (e.key === 'Tab') {
        e.preventDefault();
        acceptAutocomplete();
    } else {
        setTimeout(updateAutocomplete, 0);
    }
};

const submitCommand = () => {
    const input = elements.terminalInput.value.trim();
    if (!input) return;
    
    if (!core.state.isPlayerTurn) {
        logMessage('Not your turn!', 'error');
        return;
    }
    
    const action = core.parseCommand(input, core.state.actionSchemas);
    
    if (!action) {
        logMessage('Invalid command', 'error');
        elements.terminalInput.value = '';
        hideAutocomplete();
        return;
    }
    
    logMessage(`> ${input}`, 'info');
    
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'action',
            action: action
        }));
        core.state.isPlayerTurn = false;
        updateStatus();
    }
    
    elements.terminalInput.value = '';
    hideAutocomplete();
};

const updateAutocomplete = () => {
    const input = elements.terminalInput.value;
    currentSuggestions = core.getAutocompleteSuggestions(input, core.state.actionSchemas);
    autocompleteIndex = -1;
    
    if (currentSuggestions.length === 0) {
        hideAutocomplete();
        return;
    }
    
    let html = '';
    currentSuggestions.forEach((suggestion, index) => {
        html += `<div class="autocomplete-item" data-index="${index}">${suggestion.value}</div>`;
    });
    
    elements.autocomplete.innerHTML = html;
    elements.autocomplete.style.display = 'block';
    
    elements.autocomplete.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('click', () => {
            autocompleteIndex = parseInt(item.dataset.index);
            acceptAutocomplete();
        });
    });
};

const navigateAutocomplete = (direction) => {
    if (currentSuggestions.length === 0) return;
    
    autocompleteIndex = (autocompleteIndex + direction + currentSuggestions.length) % currentSuggestions.length;
    
    elements.autocomplete.querySelectorAll('.autocomplete-item').forEach((item, index) => {
        item.classList.toggle('selected', index === autocompleteIndex);
    });
};

const acceptAutocomplete = () => {
    if (autocompleteIndex < 0 || autocompleteIndex >= currentSuggestions.length) return;
    
    const suggestion = currentSuggestions[autocompleteIndex];
    const words = elements.terminalInput.value.trim().split(/\s+/);
    words[words.length - 1] = suggestion.value;
    elements.terminalInput.value = words.join(' ') + ' ';
    
    hideAutocomplete();
    elements.terminalInput.focus();
};

// Hide autocomplete
const hideAutocomplete = () => {
    elements.autocomplete.style.display = 'none';
    elements.autocomplete.innerHTML = '';
    currentSuggestions = [];
    autocompleteIndex = -1;
};

// Initialize
elements.terminalInput.addEventListener('keydown', handleInput);
elements.terminalInput.addEventListener('blur', () => setTimeout(hideAutocomplete, 200));

connectWebSocket();
