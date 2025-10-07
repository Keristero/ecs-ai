# Client Refactoring Summary

## Overview
Refactored the client to follow a pure event-driven architecture where **all game state is derived from the event stream**. This eliminates redundant state storage and ensures a single source of truth.

## Key Principle
**All game state comes from events** - the client no longer stores duplicate game state or processes action results for state updates.

## Changes Made

### 1. GameState Class Simplification
**Removed:**
- `currentRoomData` - redundant storage
- `entityNameToIdMap` - redundant storage

**Added:**
- `getEntityNameToIdMap()` - derives entity map from look events
- `getCurrentRoomData()` - derives room data from look events  
- `getCurrentRoomId()` - gets current room ID from look events
- `getEventsInCurrentRoom()` - filters events to current room only

### 2. Action Execution Flow
**Before:**
```
Client → Action → Server → Action Result with room_state → Client stores room_state
```

**After:**
```
Client → Action with GUID → Server → action_accepted acknowledgment
                                    → Event queued → Broadcast to all clients
Client receives event → Updates display from event
```

### 3. Server Changes
- Changed `action_result` to `action_accepted` (simple acknowledgment)
- Server no longer sends game state in response
- All game state flows through event broadcasts
- Added `messageId` to error responses for proper error handling

### 4. Event Filtering
Client now filters events to only show:
- Global events (round/turn) - always shown
- Events in the current room (action.room_eid matches)
- System events in current room (system.details.room_eid matches)

This prevents clutter from events happening in other rooms.

### 5. Display Logic
**Look Events:**
- Automatically display full room info when look event received
- Room info is formatted from `event.action.details`

**Other Action Events:**
- Show brief description with success/failure indicator
- Show event message if available
- Filter out events from other rooms

### 6. GUID Correlation System
- Client generates GUID for each action
- GUID flows through: client → server → event → broadcast → back to client
- Client tracks pending actions by GUID
- When event with matching GUID received, client confirms action completed

## Benefits

1. **Single Source of Truth:** Events are the only source of game state
2. **No Redundancy:** Client doesn't duplicate server state
3. **Automatic Sync:** All clients automatically sync through event broadcasts
4. **Simpler Code:** Less state management, fewer edge cases
5. **Better Multiplayer:** Multiple clients naturally stay in sync
6. **Room Filtering:** Players only see relevant events in their current room

## Testing Checklist

- [ ] Actions send and receive GUID correctly
- [ ] Look events display full room info
- [ ] Other action events show brief descriptions
- [ ] Events from other rooms are filtered out
- [ ] Entity name to ID conversion works from cached look events
- [ ] Autocomplete uses current room data from events
- [ ] Multiple clients stay in sync through broadcasts
- [ ] Pending actions are tracked and confirmed via GUID

## Architecture Diagram

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       │ WebSocket
       │
       ▼
┌─────────────┐      ┌──────────────┐
│   Server    │─────▶│ Event Queue  │
│ (WebSocket) │      │  (bitECS)    │
└─────────────┘      └──────┬───────┘
       │                    │
       │                    │ Systems process events
       │                    │
       │             ┌──────▼───────┐
       └────────────▶│   Broadcast  │
         Broadcasts  │  to all WS   │
         events      │   clients    │
                     └──────────────┘
```

## Code Examples

### Getting Current Room Data (from events)
```javascript
const roomData = gameState.getCurrentRoomData();
// Finds most recent look event and returns action.details
```

### Filtering Events
```javascript
const relevantEvents = gameState.getEventsInCurrentRoom();
// Returns only events in player's current room
```

### Displaying Events
```javascript
// Look events show full room info
if (event.type === 'action' && event.name === 'look') {
    displayRoomInfo(event.action.details);
}

// Other events show brief description  
// Filtered by room automatically
```
