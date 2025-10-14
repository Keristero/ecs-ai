# Functional Entity Query System

## Overview

The new functional query system replaces individual hardcoded functions with a composable, functional approach to querying entities from the hierarchical room state.

## Key Benefits

1. **Composable**: Build complex queries by combining simple operations
2. **Reusable**: Same query logic works for room entities, inventory, or any entity set
3. **Functional**: Pure functions that are easy to test and reason about
4. **Extensible**: Easy to add new selectors and transformers
5. **Type-safe**: Clear interfaces for entity operations

## Core Concepts

### Query Builder
```javascript
const query = createEntityQuery(roomState, playerId);
```

### Base Selectors
- `query.all()` - All entities in the room state
- `query.player()` - The player entity
- `query.inRoom()` - Entities physically in the room (not in inventory)
- `query.inInventory()` - Items in player's inventory

### Transformers
- `query.withComponents([...components])` - Filter entities by components
- `query.extractComponent(component, property)` - Extract component properties
- `query.extractStatus(statusConfig)` - Extract status information

### Composition with Pipe
```javascript
const roomItemNames = pipe(
    query.inRoom,
    query.withComponents(['Item']),
    query.extractComponent('Name', 'value')
)();
```

## Migration from Old System

### Before
```javascript
export const get_room_entities = function() {
    const result = {};
    for (const [eid, entity] of Object.entries(state.roomState)) {
        const playerEntity = state.roomState[state.player_eid];
        const isInPlayerInventory = playerEntity?.relations?.Has?.[eid];
        if (!isInPlayerInventory) {
            result[eid] = entity;
        }
    }
    return result;
}

export const get_player_inventory = function() {
    // ... complex implementation
}

export const get_player_status = function() {
    // ... complex status extraction logic
}
```

### After
```javascript
// Simple, clear implementations using composition
export const get_room_entities = () => query().inRoom();
export const get_player_inventory = () => query().inInventory();  
export const get_player_status = () => query().extractStatus(statusBarConfig)(query().player());

// New composable queries that weren't possible before
export const get_room_items = () => pipe(
    query().inRoom,
    query().withComponents(['Item'])
)();

export const get_room_npcs = () => pipe(
    query().inRoom,
    query().withComponents(['npc'])
)();
```

## Advanced Usage

### Custom Query Builders
```javascript
const createItemQuery = (location) => pipe(
    location,
    query().withComponents(['Item']),
    query().extractComponent('Name', 'value')
);

// Use with any location
const roomItems = createItemQuery(query().inRoom)();
const inventoryItems = createItemQuery(query().inInventory)();
```

### Multi-step Compositions
```javascript
const getHostileNPCsInRoom = () => pipe(
    query().inRoom,
    query().withComponents(['npc']),
    (entities) => Object.fromEntries(
        Object.entries(entities).filter(([eid, entity]) => 
            entity.npc?.hostile === true
        )
    )
)();
```

### Status Processing
```javascript
const getPlayerHealthPercentage = () => pipe(
    query().player,
    (player) => {
        const hp = player.Hitpoints;
        return hp ? Math.round((hp.current / hp.max) * 100) : 0;
    }
)();
```

## Implementation Details

The system works by:

1. **Query Factory**: `createEntityQuery()` creates a query object with access to room state and player ID
2. **Pure Functions**: All selectors and transformers are pure functions
3. **Lazy Evaluation**: Operations are only executed when called
4. **Functional Composition**: `pipe()` function enables clean chaining of operations
5. **Backwards Compatibility**: Old function names still work, now implemented with the new system

## Testing

The system is fully testable due to its functional nature:

```javascript
// Mock data
const mockRoomState = { /* ... */ };
const mockPlayerId = 1;

// Test queries
const testQuery = createEntityQuery(mockRoomState, mockPlayerId);
const roomEntities = testQuery.inRoom();
// Assert expected results...
```

This approach makes the codebase more maintainable, testable, and extensible while preserving all existing functionality.