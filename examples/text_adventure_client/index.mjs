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
};

const logMessage = (message, type = 'info') => {
    const div = document.createElement('div');
    div.className = `log-message log-${type}`;
    div.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    elements.log.appendChild(div);
    elements.log.scrollTop = elements.log.scrollHeight;
};

const handleInput = (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        submit_action();
    }
};

const submit_action = () => {
    const input = elements.terminalInput.value.trim()
    const action = core.handleCommand(input, core.state.actionSchemas);
    
    if (!action) {
        logMessage('Invalid command', 'error');
        elements.terminalInput.value = '';
        return;
    }
    
    elements.terminalInput.value = '';

    ws.send(JSON.stringify(action))
};

// Initialize
elements.terminalInput.addEventListener('keydown', handleInput);
//elements.terminalInput.addEventListener('blur', () => setTimeout(hideAutocomplete, 200));

connectWebSocket();
