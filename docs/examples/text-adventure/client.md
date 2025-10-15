# Text Adventure Client Implementation

## Overview

The text adventure client is a browser-based retro-styled terminal interface that connects to the ecs-ai game server via WebSocket. It demonstrates how to build a functional programming-based client that interfaces with the ECS framework through real-time communication.

**Key Technologies:**
- Vanilla JavaScript with ES modules
- WebSocket for real-time server communication
- Functional HTML composition patterns
- CSS-based retro terminal styling
- Autocomplete system with entity context awareness

## Architecture

### Functional Programming Approach

The client is built using functional programming principles with pure functions for state management and UI composition:

```javascript
// Functional HTML composition utilities
const createElement = (tagName, attributes = {}, children = []) => {
    const element = document.createElement(tagName);
    // Set attributes and children functionally
    return element;
};

// Pure functions for UI updates
const refresh_functions = {
    room_content: (state) => { /* Update room display */ },
    inventory: (state) => { /* Update inventory display */ },
    status: (state) => { /* Update status bars */ }
};
```

### Three-Layer Client Architecture

1. **Core Logic Layer** (`core.mjs`)
   - State management and event handling
   - Command parsing and validation
   - Entity relationship traversal
   - Event configuration and routing

2. **UI Layer** (`index.mjs`)
   - DOM manipulation and rendering
   - WebSocket connection management
   - User input handling
   - Real-time UI updates

3. **Helper Systems** (`autocomplete.mjs`, `entity_helpers.mjs`)
   - Autocomplete functionality with context awareness
   - Entity formatting and display utilities
   - User experience enhancements

### State Management Pattern

The client maintains a centralized state object that gets updated through event handlers:

```javascript
export const state = {
    room: {},           // Current room entities
    player_eid: null,   // Player entity ID
    room_data: null,    // Room metadata (exits, connections)
    actions: {}         // Available action schemas
};
```

## Setup

### Prerequisites

1. **Server Running**: Ensure the ecs-ai API server is running on port 3000
2. **Modern Browser**: Chrome, Firefox, Safari, or Edge with ES module support

### Running the Client

1. **Direct File Access** (Development):
   ```bash
   # Navigate to client directory
   cd examples/text_adventure_client
   
   # Open in browser (file:// protocol)
   open index.html  # macOS
   xdg-open index.html  # Linux
   ```

2. **Local HTTP Server** (Recommended):
   ```bash
   # From client directory, serve files
   python -m http.server 8080
   # or
   npx serve .
   
   # Open http://localhost:8080
   ```

3. **Connection Configuration**:
   ```javascript
   // WebSocket connection (in index.mjs)
   const wsUrl = 'ws://127.0.0.1:6060';  // Matches server port
   ```

## Key Features

### 1. Retro Terminal Styling

The client provides an authentic retro computer terminal experience:

- **Dark brown/amber color scheme** inspired by classic terminals
- **Monospace typography** for consistent character alignment
- **Split-panel layout**: command log on left, game state on right
- **Progress bars** for player stats with color-coded backgrounds
- **Responsive design** that maintains retro aesthetics

```css
/* Example retro styling */
body {
    font-family: 'Courier New', monospace;
    background: #2a1f0f;
    color: #e4d4b4;
}

.panel {
    background: #1a140f;
    border: 2px solid #5a4a3a;
}
```

### 2. Real-Time WebSocket Communication

**Connection Management:**
```javascript
const connect_websocket = () => {
    ws = new WebSocket('ws://127.0.0.1:6060');
    
    ws.onopen = () => { /* Connection established */ };
    ws.onmessage = (event) => { 
        const data = JSON.parse(event.data);
        handle_server_event(data);
    };
    ws.onclose = () => { 
        // Auto-reconnection with 3-second delay
        setTimeout(connect_websocket, 3000);
    };
};
```

**Event Handling:**
- Server events update client state and trigger UI refreshes
- Action submissions send JSON commands to server
- Automatic reconnection on connection loss

### 3. Dynamic UI Updates

The client uses a declarative refresh system that updates specific UI sections based on server events:

```javascript
// Event triggers specific UI section updates
if (result.refresh_ui_sections) {
    for (const section of result.refresh_ui_sections) {
        refresh_functions[section](core.state);
    }
}

// Sections: 'room_content', 'inventory', 'status'
```

### 4. Intelligent Autocomplete System

**Context-Aware Suggestions:**
- Analyzes current room entities for relevant targets
- Suggests valid actions based on game state
- Filters suggestions by user input
- Keyboard navigation (arrow keys, tab completion)

```javascript
// Autocomplete integration
autocomplete = new AutocompleteSystem(elements, core.state);
```

### 5. Command Parsing and Validation

**Action Command Flow:**
1. User types command in terminal input
2. Core.mjs parses command against action schemas
3. Validation ensures proper syntax and target availability
4. Valid commands sent to server as JSON actions
5. Server response updates game state and UI

```javascript
const submit_action = () => {
    const input = elements.terminal_input.value.trim();
    const action = core.handle_command(input);
    
    if (!action) {
        print_to_log('Invalid command', 'error');
        return;
    }
    
    ws.send(JSON.stringify(action));
};
```

### 6. Entity Relationship Display

**Room Information Display:**
- **Exits**: Shows available directions and connections
- **Enemies**: Lists hostile entities in current room
- **Items**: Shows pickable items (excluding player inventory)

**Inventory Management:**
- Real-time inventory updates
- Visual distinction between room items and carried items
- Empty state handling

**Status Monitoring:**
- **Progress bars** for health, mana, stamina
- **Numeric displays** for other stats
- **Color-coded bars** by stat type

### 7. Functional Programming Patterns

**Pure UI Functions:**
```javascript
// Pure function that returns UI elements
const createStatusBar = (statusItem) => {
    const label = createElement('div', { className: 'stat-label' }, statusItem.label);
    const barFill = createElement('div', {
        className: `bar-fill ${statusItem.className}`,
        style: `width: ${statusItem.percentage}%`
    });
    return createElement('div', { className: 'stat-bar' }, [label, barContainer]);
};
```

**Immutable State Updates:**
```javascript
// State updates through event handlers, not direct mutation
const handle_server_event = (event) => {
    const result = core.handle_event(event);  // Pure function
    // Apply side effects only after state calculation
    if (result.refresh_ui_sections) {
        updateUI(result.refresh_ui_sections);
    }
};
```

## Integration Points

### With ECS Framework
- **Entity Traversal**: Uses `get_related_entities()` for inventory and room queries
- **Component Filtering**: Filters entities by components like `Name`, `Item`, `Enemy`
- **Event System**: Responds to ECS system events for real-time updates

### With Game Logic
- **Action Schemas**: Dynamically receives available actions from server
- **Turn System**: Integrates with server turn-based gameplay
- **State Synchronization**: Maintains client state synchronized with server ECS world

### Browser APIs
- **WebSocket API**: Real-time bidirectional communication
- **DOM API**: Functional HTML composition and manipulation
- **Local Storage**: Could be extended for client-side preferences