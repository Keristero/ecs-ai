---
title: "Text Adventure Game Logic"
description: "Server-side game logic implementation patterns and guide"
audience: "existing-developers"
last_updated: "2025-10-15"
version: "1.0.0"
category: "examples"
cross_references:
  - "README.md"
  - "client.md"
  - "integration.md"
---

# Text Adventure Game Logic

## Overview

The text adventure game logic implements a complete turn-based RPG system using the ecs-ai framework. It demonstrates how to build complex game mechanics using Entity Component System patterns, WebSocket communication, and AI integration for dynamic narrative generation.

**Core Systems:**
- Turn-based gameplay with action queuing
- WebSocket server for real-time client communication
- AI narrator system for dynamic story generation
- Complete RPG mechanics (combat, inventory, movement)
- Modular component and system architecture

## Architecture

### ECS Component Design

The game logic uses a comprehensive set of components to model game entities:

```javascript
// Location and spatial components
const Room = defineComponent();
const Position = defineComponent();
const ConnectsTo = defineComponent();  // Room connections/exits

// Character and identity components
const Name = defineComponent();
const Player = defineComponent();
const Enemy = defineComponent();

// Game mechanics components
const Item = defineComponent();
const Inventory = defineComponent();
const HitPoints = defineComponent();
const MaxHitPoints = defineComponent();
const AttackPower = defineComponent();

// Turn system components
const ActionQueue = defineComponent();
const TurnComplete = defineComponent();
```

### System Architecture

The game implements a modular system architecture where each system handles specific game logic:

#### 1. **Turn System** (`turn_system.mjs`)
- **Purpose**: Manages turn-based gameplay flow
- **Responsibilities**: 
  - Processes action queues in order
  - Handles turn completion states
  - Coordinates system execution timing
  - Ensures fair turn distribution

```javascript
export function TurnSystem(world) {
    // Process queued actions for entities
    const query = defineQuery([ActionQueue, TurnComplete]);
    
    return (world) => {
        // Execute queued actions in turn order
        // Mark turns complete when actions processed
        // Advance to next player/entity turn
    };
}
```

#### 2. **Movement System** (`movement_system.mjs`)
- **Purpose**: Handles player and NPC movement between rooms
- **Responsibilities**:
  - Validates movement commands against room connections
  - Updates entity positions and room associations
  - Triggers room change events for UI updates
  - Manages spatial relationships between entities

#### 3. **Inventory System** (`inventory_system.mjs`)
- **Purpose**: Manages item pickup, drop, and inventory operations
- **Responsibilities**:
  - Processes pickup/drop action commands
  - Maintains entity-item relationships via ECS relations
  - Validates inventory constraints and item availability
  - Updates client with inventory changes

#### 4. **Player System** (`player_system.mjs`)
- **Purpose**: Handles player-specific logic and state management
- **Responsibilities**:
  - Processes player actions from WebSocket commands
  - Manages player session state and connection mapping
  - Validates player permissions and turn order
  - Coordinates player responses back to clients

#### 5. **NPC System** (`npc_system.mjs`)
- **Purpose**: Controls non-player character behavior and AI
- **Responsibilities**:
  - Implements enemy AI behavior patterns
  - Manages NPC action decision making
  - Handles NPC combat and interaction logic
  - Coordinates with turn system for NPC turns

#### 6. **AI Narrator System** (`ai_narrator_system.mjs`)
- **Purpose**: Generates dynamic story narration using AI
- **Responsibilities**:
  - Analyzes game events and generates contextual narration
  - Integrates with MCP server for AI text generation
  - Provides immersive storytelling based on player actions
  - Enhances game atmosphere with dynamic descriptions

#### 7. **Room Update System** (`room_update_system.mjs`)
- **Purpose**: Manages room state synchronization with clients
- **Responsibilities**:
  - Detects changes in room entity composition
  - Sends room updates to connected clients
  - Maintains client-server state consistency
  - Optimizes update frequency and data transfer

### WebSocket Server Architecture

The game implements a WebSocket server that manages real-time communication between clients and the ECS world:

```javascript
// WebSocket Manager handles client connections
export class WebSocketManager {
    constructor(port, gameWorld) {
        this.wss = new WebSocketServer({ port });
        this.clients = new Map();  // Track client connections
        this.gameWorld = gameWorld;
        
        this.setupConnectionHandling();
    }
    
    setupConnectionHandling() {
        this.wss.on('connection', (ws) => {
            // Register new client
            // Send initial game state
            // Setup message handlers
        });
    }
    
    broadcastToClients(event) {
        // Send events to all connected clients
        // Handle client disconnections gracefully
    }
}
```

### Action System Architecture

The game implements a comprehensive action system that validates and executes player commands:

#### Action Schema Definition
```javascript
// Actions define their structure and validation rules
export const MoveAction = {
    name: 'move',
    description: 'Move to a connected room',
    parameters: {
        direction: {
            type: 'string',
            description: 'Direction to move (north, south, east, west, up, down)',
            required: true
        }
    }
};

export const PickupAction = {
    name: 'pickup',
    description: 'Pick up an item',
    parameters: {
        target: {
            type: 'entity',
            description: 'Item entity to pick up',
            required: true
        }
    }
};
```

#### Action Processing Pipeline
1. **Command Parsing**: Client sends JSON action commands
2. **Schema Validation**: Actions validated against defined schemas
3. **Permission Checking**: Verify player can perform action
4. **State Validation**: Check game state allows action
5. **Execution**: Run action logic and update ECS world
6. **Event Generation**: Create events for client updates
7. **Response**: Send success/failure response to client

## Setup and Configuration

### Game World Initialization

```javascript
// setup_world.mjs creates the initial game state
export function setupWorld() {
    const world = createWorld();
    
    // Add all component definitions
    registerComponents(world);
    
    // Create initial rooms and connections
    setupRooms(world);
    
    // Spawn initial entities (items, enemies)
    spawnInitialEntities(world);
    
    // Initialize all systems
    registerSystems(world);
    
    return world;
}
```

### Server Startup Process

1. **World Creation**: Initialize ECS world with components and systems
2. **WebSocket Server**: Start WebSocket server on configured port
3. **Event Queue**: Initialize event processing queue
4. **System Registration**: Register all game systems with world
5. **Initial State**: Create starting game state (rooms, items, NPCs)

### Development Configuration

```javascript
// Environment configuration for development
export const config = {
    websocket: {
        port: 6060,
        host: '127.0.0.1'
    },
    game: {
        maxPlayers: 10,
        turnTimeoutMs: 30000,
        autoSaveIntervalMs: 60000
    },
    ai: {
        narratorEnabled: true,
        mcpServerUrl: 'http://localhost:3001'
    }
};
```

## Game Mechanics

### Turn-Based Combat System

The game implements a complete turn-based combat system:

```javascript
// Combat resolution example
export function resolveCombat(attacker, defender, world) {
    const attackerPower = attacker.AttackPower?.value || 1;
    const defenderHP = defender.HitPoints?.value || 1;
    
    // Calculate damage with random element
    const damage = Math.floor(attackerPower * (0.8 + Math.random() * 0.4));
    
    // Apply damage
    const newHP = Math.max(0, defenderHP - damage);
    defender.HitPoints.value = newHP;
    
    // Generate combat event for narration
    return {
        type: 'combat_result',
        attacker: attacker.Name?.value,
        defender: defender.Name?.value,
        damage: damage,
        defenderHP: newHP
    };
}
```

### Inventory and Item System

Items are managed through ECS relations and component properties:

```javascript
// Item pickup mechanics
export function pickupItem(playerEid, itemEid, world) {
    // Validate item exists and is accessible
    if (!hasComponent(world, itemEid, Item)) {
        return { success: false, reason: 'Item not found' };
    }
    
    // Create inventory relationship
    addRelation(world, playerEid, 'Has', itemEid);
    
    // Remove item from room location
    removeComponent(world, itemEid, Position);
    
    return { success: true, item: getComponent(world, itemEid, Name) };
}
```

### Room and Movement System

Rooms are connected through the ConnectsTo component:

```javascript
// Room connection example
const room1 = addEntity(world);
const room2 = addEntity(world);

// Create bidirectional connection
addComponent(world, room1, ConnectsTo, {
    north: { target: room2, direction: 'north' }
});
addComponent(world, room2, ConnectsTo, {
    south: { target: room1, direction: 'south' }
});
```

### AI Integration

The AI narrator system enhances gameplay with dynamic storytelling:

```javascript
// AI narrator integration
export function generateNarration(gameEvent, context) {
    const prompt = `
        Game Context: ${context.roomDescription}
        Recent Action: ${gameEvent.description}
        Generate atmospheric narration for this fantasy adventure.
    `;
    
    // Send to MCP server for AI generation
    return mcpClient.callTool('generate_text', { prompt });
}
```

## Testing Strategies

### Unit Testing Components

```javascript
// Component testing example
describe('HitPoints Component', () => {
    it('should correctly apply damage', () => {
        const world = createWorld();
        const entity = addEntity(world);
        addComponent(world, entity, HitPoints, { value: 100 });
        
        // Apply damage
        applyDamage(entity, 25, world);
        
        expect(getComponent(world, entity, HitPoints).value).to.equal(75);
    });
});
```

### Integration Testing Systems

```javascript
// System integration testing
describe('Movement System', () => {
    it('should move player between connected rooms', () => {
        const world = setupTestWorld();
        const player = createTestPlayer(world);
        
        // Execute move action
        const result = executeAction(player, 'move', { direction: 'north' }, world);
        
        expect(result.success).to.be.true;
        expect(getPlayerRoom(player, world)).to.equal(northRoom);
    });
});
```

### WebSocket Testing

```javascript
// WebSocket communication testing
describe('WebSocket Integration', () => {
    it('should broadcast room updates to clients', async () => {
        const mockClient = new MockWebSocketClient();
        const world = setupTestWorld();
        
        // Trigger room change
        movePlayerToRoom(testPlayer, newRoom, world);
        
        // Verify client received update
        await mockClient.waitForMessage('room_update');
        expect(mockClient.lastMessage.type).to.equal('room_update');
    });
});
```

## Performance Considerations

### ECS Query Optimization

- Use targeted queries with specific component combinations
- Avoid broad queries that iterate over many entities
- Cache query results where appropriate for frequently accessed data

### WebSocket Optimization

- Batch updates to reduce message frequency
- Only send relevant data to each client
- Implement heartbeat/keepalive for connection management
- Use binary encoding for large data transfers

### Memory Management

- Remove unused entities and components promptly
- Clear old event history to prevent memory leaks
- Optimize component data structures for memory usage

This game logic implementation demonstrates how to build a complete RPG system using ECS patterns while maintaining clean separation of concerns and supporting real-time multiplayer gameplay through WebSocket communication.

## See Also

- [Text Adventure Overview](README.md)
- [Client Implementation](client.md)
- [Integration Guide](integration.md)

---

*Generated from ecs-ai project documentation consolidation*
*Last updated: 2025-10-15*