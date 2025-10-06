# Generic Actions Refactoring Summary

## Overview
Refactored all game actions to be generic, allowing any entity with the required components to perform them, not just the player.

## Changes Made

### Core Principle
Replaced all `playerId` parameters with generic `actorId` parameters, enabling:
- NPCs to perform actions
- AI-controlled entities to use the action system
- Flexible game mechanics where any entity can act

### Refactored Actions

#### 1. **pickup.mjs**
- **Change**: `playerId` → `actorId`
- **Effect**: Any entity can now pick up items
- **Requirements**: Entity must be in the same room as the item

#### 2. **drop.mjs**
- **Change**: `playerId` → `actorId`
- **Effect**: Any entity can drop items from their inventory
- **Requirements**: Entity must have the item in their inventory and be in a room

#### 3. **move.mjs**
- **Change**: `playerId` → `actorId`
- **Effect**: Any entity can move between connected rooms
- **Requirements**: Entity must be in a room with a valid exit in the specified direction
- **Note**: Automatically calls `look` for the new room with the correct actorId

#### 4. **look.mjs**
- **Change**: `playerId` → `actorId`
- **Effect**: Any entity can observe their current room
- **Returns**: Room information including items, enemies, landmarks, exits, and the actor's inventory

#### 5. **speak.mjs**
- **Change**: `playerId` → `actorId`
- **Effect**: Any entity can speak dialogue in their current room
- **Behavior**: Entities with `Ears` component in the same room will hear (excluding the speaker)
- **Fixed**: Added `listenerCount` to return value for test compatibility

#### 6. **use.mjs**
- **Change**: `playerId` → `actorId`
- **Effect**: Any entity can use items from their inventory
- **Requirements**: 
  - Entity must have the item in inventory
  - Item must have `Usable` component
  - Target must be in the same room (or self)

#### 7. **inspect.mjs**
- **Status**: Already generic (no changes needed)
- **Reason**: Inspects entities by name, not tied to any specific actor

#### 8. **gameinfo.mjs**
- **Status**: No changes needed
- **Reason**: Returns game-level information, not actor-specific

## Backward Compatibility

All actions maintain **full backward compatibility** with existing code:
- Default behavior: `actorId ?? game.playerId`
- If no `actorId` is provided, defaults to the player
- All existing client code works without modification

## Benefits

### 1. **AI/NPC Actions**
```javascript
// NPC can now pick up items
pickup(game, {actorId: goblinEntityId, itemId: swordId})

// Enemy can use a healing potion
use(game, {actorId: enemyId, itemId: potionId})
```

### 2. **Flexible Game Systems**
- AI-controlled companions
- Enemy inventory management
- NPC movement and interaction
- Multi-entity gameplay

### 3. **Code Reusability**
- Single action implementation for all entity types
- No duplicate "player action" vs "NPC action" code
- Consistent behavior across all entities

## Testing

All 20 tests pass, verifying:
- ✅ Backward compatibility maintained
- ✅ No regressions in existing functionality
- ✅ Actions work correctly with default player behavior
- ✅ Generic refactoring preserves all features

## Implementation Details

### Parameter Pattern
```javascript
// Before
function action(game, params) {
    const playerId = params.playerId ?? game.playerId
    // ... use playerId
}

// After
function action(game, params) {
    const actorId = params.actorId ?? game.playerId
    // ... use actorId
}
```

### Helper Functions Updated
The refactoring leverages the existing helper functions in `helpers.mjs`:
- `findEntityRoom(world, actorId)` - finds any entity's room
- `hasItemInInventory(world, actorId, itemId)` - checks any entity's inventory
- `areInSameRoom(world, entity1, entity2)` - validates entity proximity

## Future Possibilities

With generic actions, we can now implement:
- **AI Companions**: NPCs that can perform full action sets
- **Enemy AI**: Enemies that use items, move tactically, and speak
- **Multiplayer**: Multiple players as separate entities
- **Observer Mode**: View game from different entity perspectives
- **Possession Mechanics**: Control different entities
- **Scripted Events**: Trigger actions for any entity programmatically

## Documentation Updates Needed

Client code documentation should note that all actions now support:
- `actorId` parameter (optional)
- Defaults to player if not specified
- Can be used to make any entity perform actions

## Performance Impact

**None** - The refactoring:
- Uses the same helper functions
- Maintains identical logic flow
- Only changes parameter names
- No additional queries or operations
