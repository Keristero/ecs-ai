import * as core from './core.mjs';
import AutocompleteSystem from './autocomplete.mjs';
import entityHelpers from './entity_helpers.mjs';

// Make entity helpers available globally for core.mjs
window.entityHelpers = entityHelpers;

// Functional HTML composition utilities
const createElement = (tagName, attributes = {}, children = []) => {
    const element = document.createElement(tagName);
    
    // Set attributes
    for (const [key, value] of Object.entries(attributes)) {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'style') {
            element.style.cssText = value;
        } else {
            element.setAttribute(key, value);
        }
    }
    
    // Add children (can be string, element, or array of elements)
    if (typeof children === 'string') {
        element.textContent = children;
    } else if (children instanceof HTMLElement) {
        element.appendChild(children);
    } else if (Array.isArray(children)) {
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof HTMLElement) {
                element.appendChild(child);
            }
        });
    }
    
    return element;
};

const appendChildren = (parent, children) => {
    if (Array.isArray(children)) {
        children.forEach(child => {
            if (child instanceof HTMLElement) {
                parent.appendChild(child);
            }
        });
    } else if (children instanceof HTMLElement) {
        parent.appendChild(children);
    }
};

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
        let enemies = core.filter_and_format_entities(state.room, ['Name','Enemy'], 'value');
        if(Object.keys(enemies).length > 0){
            const enemyHeader = createElement('div', { className: 'category-name' }, 'Enemies:');
            elements.room_content.appendChild(enemyHeader);
            
            const enemyItems = Object.values(enemies).map(name => 
                createElement('div', {}, `- ${name}`)
            );
            appendChildren(elements.room_content, enemyItems);
        }
        
        // Display Items (exclude items in player's inventory)
        let allItems = core.filter_entities_by_component(state.room, ['Name','Item']);
        let inventory = core.get_related_entities(['room', state.player_eid, 'Has']);
        let roomItems = {};
        for (let eid in allItems) {
            // Only show items that are NOT in the player's inventory
            if (!inventory[eid]) {
                roomItems[eid] = allItems[eid].Name.value;
            }
        }
        
        if(Object.keys(roomItems).length > 0){
            const itemHeader = createElement('div', { className: 'category-name' }, 'Items:');
            elements.room_content.appendChild(itemHeader);
            
            const itemElements = Object.values(roomItems).map(name =>
                createElement('div', {}, `- ${name}`)
            );
            appendChildren(elements.room_content, itemElements);
        }
    },
    inventory: (state) => {
        // Check if inventory element exists, if not create it or skip
        if (!elements.inventory_content) {
            console.log('No inventory UI element found - inventory update skipped');
            return;
        }
        
        elements.inventory_content.innerHTML = '';
        
        // Display inventory items using traversal function
        let inventory = core.get_related_entities(['room', state.player_eid, 'Has']);
        let items = core.filter_and_format_entities(inventory, ['Name','Item'], 'value');
        if(Object.keys(items).length > 0){
            const inventoryHeader = createElement('div', { className: 'category-name' }, 'Inventory:');
            elements.inventory_content.appendChild(inventoryHeader);
            
            const itemElements = Object.values(items).map(name =>
                createElement('div', {}, `- ${name}`)
            );
            appendChildren(elements.inventory_content, itemElements);
        } else {
            const emptyDiv = createElement('div', { className: 'empty-message' }, 'Inventory is empty');
            elements.inventory_content.appendChild(emptyDiv);
        }
    },
    status: (state) => {
        // Check if status element exists, if not skip
        if (!elements.status_content) {
            console.log('No status UI element found - status update skipped');
            return;
        }
        
        elements.status_content.innerHTML = '';
        
        // Get player status using the declarative helper
        const statusItems = core.get_player_status();
        
        if (statusItems.length > 0) {
            const statusHeader = createElement('div', { className: 'category-name' }, 'Status:');
            elements.status_content.appendChild(statusHeader);
            
            const statusElements = statusItems.map(statusItem => {
                if (statusItem.displayType === 'bar') {
                    // Create progress bar display using functional HTML composition
                    const label = createElement('div', { className: 'stat-label' }, statusItem.label);
                    
                    const barFill = createElement('div', {
                        className: `bar-fill ${statusItem.className}`,
                        style: `width: ${statusItem.percentage}%`
                    });
                    
                    const barText = createElement('div', { className: 'bar-text' }, `${statusItem.current}/${statusItem.max}`);
                    
                    const barContainer = createElement('div', { className: 'bar-container' }, [barFill, barText]);
                    
                    return createElement('div', { className: `stat-bar ${statusItem.className}` }, [label, barContainer]);
                } else if (statusItem.displayType === 'number') {
                    // Create number display using functional HTML composition
                    const label = createElement('div', { className: 'status-label' }, `${statusItem.label}:`);
                    
                    const value = createElement('div', {
                        className: 'status-value',
                        style: `color: ${statusItem.color}`
                    }, statusItem.value.toString());
                    
                    return createElement('div', { className: `status-item ${statusItem.className}` }, [label, value]);
                }
            });
            
            appendChildren(elements.status_content, statusElements);
        } else {
            const emptyDiv = createElement('div', { className: 'empty-message' }, 'No status data available');
            elements.status_content.appendChild(emptyDiv);
        }
    }
}

let ws = null;
let autocomplete = null;

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
    const action = core.handle_command(input);
    
    if (!action) {
        print_to_log('Invalid command', 'error');
        elements.terminal_input.value = '';
        return;
    }
    
    elements.terminal_input.value = '';
    ws.send(JSON.stringify(action))
};

const initialize_autocomplete = () => {
    if (!autocomplete && elements.terminal_input && elements.autocomplete && 
        core.state.actions && Object.keys(core.state.actions).length > 0) {
        autocomplete = new AutocompleteSystem(elements, core.state);
        console.log('Autocomplete system initialized');
        return true;
    }
    return false;
};

// Make this available for core.mjs to call when actions are loaded
window.initializeAutocompleteWhenReady = () => {
    initialize_autocomplete();
};

// Initialize
elements.terminal_input.addEventListener('keydown', handle_input);

connect_websocket();

// Try to initialize autocomplete when DOM is ready (but it might wait for actions)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize_autocomplete);
} else {
    initialize_autocomplete();
}
