# Text Adventure Client Implementation

## Overview

The text adventure client is a browser-based terminal interface that connects to the ecs-ai game server via WebSockets.
I've tried to make everything in the client as configuration driven as possible to make adding new game features easier.

**Key Technologies:**
- Vanilla JavaScript with ES modules
- WebSocket for real-time server communication
- Autocomplete system with entity context awareness

## Architecture
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

The client currently maintains a centralized state object that gets updated through event handlers, I'd like to make this more automatic eventually
```