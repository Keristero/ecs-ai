import * as core from './core.mjs';

const elements = {
    log: document.getElementById('log'),
    terminal_input: document.getElementById('terminal-input'),
    autocomplete: document.getElementById('autocomplete'),
    room_content: document.getElementById('room-content'),
    status_content: document.getElementById('status-content'),
    inventory_content: document.getElementById('inventory-content')
};

const refresh_functions = {
    room_content: (state) => {
        elements.room_content.innerHTML = '';
        
        // Display Enemies
        let enemies = core.filter_and_format_entities(state.entities, ['Name','Enemy'], 'value');
        if(Object.keys(enemies).length > 0){
            let enemyHeader = document.createElement('div');
            enemyHeader.className = 'category-name';
            enemyHeader.textContent = 'Enemies:';
            elements.room_content.appendChild(enemyHeader);
            
            for(let eid in enemies){
                let div = document.createElement('div');
                div.textContent = `- ${enemies[eid]}`;
                elements.room_content.appendChild(div);
            }
        }
        
        // Display Items
        let items = core.filter_and_format_entities(state.entities, ['Name','Item'], 'value');
        if(Object.keys(items).length > 0){
            let itemHeader = document.createElement('div');
            itemHeader.className = 'category-name';
            itemHeader.textContent = 'Items:';
            elements.room_content.appendChild(itemHeader);
            
            for(let eid in items){
                let div = document.createElement('div');
                div.textContent = `- ${items[eid]}`;
                elements.room_content.appendChild(div);
            }
        }
    }
}

let ws = null;

const connect_websocket = () => {
    // Connect to API server as configured in mise.toml (port 3000)
    const wsUrl = 'ws://127.0.0.1:6060';
    
    console.log('Connecting to:', wsUrl);
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('WebSocket connection established');
        print_to_log('Connected to server', 'success');
    };
    
    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handle_server_event(data);
        } catch (error) {
            console.error('Error handling message:', error);
        }
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        print_to_log('Connection error', 'error');
    };
    
    ws.onclose = () => {
        print_to_log('Disconnected from server', 'error');
        setTimeout(connect_websocket, 3000);
    };
};

const handle_server_event = (event) => {
    const result = core.handle_event(event);

    if(!result){
        return
    }

    if(result.print){
        print_to_log(event.message, result.print_style);
    }

    if(result.refresh_ui_sections){
        for(const section of result.refresh_ui_sections){
            refresh_functions[section](core.state);
        }
    }
};

const print_to_log = (message, type = 'info') => {
    const div = document.createElement('div');
    div.className = `log-message log-${type}`;
    div.textContent = `${message}`;
    elements.log.appendChild(div);
    elements.log.scrollTop = elements.log.scrollHeight;
};

const handle_input = (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        submit_action();
    }
};

const submit_action = () => {
    const input = elements.terminal_input.value.trim()
    const action = core.handle_command(input, core.state.actionSchemas);
    
    if (!action) {
        print_to_log('Invalid command', 'error');
        elements.terminal_input.value = '';
        return;
    }
    
    elements.terminal_input.value = '';
    ws.send(JSON.stringify(action))
};

// Initialize
elements.terminal_input.addEventListener('keydown', handle_input);
//elements.terminalInput.addEventListener('blur', () => setTimeout(hideAutocomplete, 200));

connect_websocket();
