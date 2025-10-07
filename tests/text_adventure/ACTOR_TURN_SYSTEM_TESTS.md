# Actor Turn System Tests

This document describes the comprehensive test suite for the event queue's actor turn system.

## Test File
`tests/text_adventure/actor_turn_system.test.mjs`

## Overview
The actor turn system manages turn-based gameplay in the text adventure game. It handles:
- Actor initialization and turn order based on initiative
- Event queue processing and system integration
- Player turn management (waiting for input)
- NPC turn management (automatic AI actions)
- Round start/end lifecycle

## Test Suites

### 1. Actor Turn System - Initialization (3 tests)
Tests the basic setup and configuration of the actor turn system.

#### ✓ should create event queue with correct structure
- Verifies event queue is created with all required properties
- Checks that events array, systems, game reference, and actor tracking are initialized

#### ✓ should have Actor component on all combatants
- Confirms player has Actor component with initiative 10
- Confirms all enemies have Actor component with positive initiative
- Validates that all combat participants are properly configured

#### ✓ should sort actors by initiative correctly
- Verifies 4 actors total (1 player + 3 enemies)
- Confirms player (initiative 10) is first in turn order
- Validates actors are sorted in descending initiative order

### 2. Actor Turn System - Event Queue (4 tests)
Tests the core event queueing and processing functionality.

#### ✓ should add GUID to queued events
- Confirms events receive a unique GUID when queued
- Validates GUID is a non-empty string

#### ✓ should process events through systems
- Tests that systems receive queued events
- Confirms system is called with correct event data
- Verifies system receives both game and event parameters

#### ✓ should propagate events returned by systems
- Tests that systems can return new events
- Confirms returned events are automatically queued and processed
- Validates event propagation chain works correctly

#### ✓ should not propagate turn_end events to systems
- Verifies turn_end events reach systems (for cleanup/logging)
- Confirms events returned by systems on turn_end are NOT propagated
- Validates the special turn_end behavior per specification

### 3. Actor Turn System - getCurrentActor (3 tests)
Tests the actor tracking functionality.

#### ✓ should return undefined when no actors are set
- Confirms safe behavior when actor list is empty
- Tests edge case of uninitialized actor system

#### ✓ should return current actor based on index
- Validates getCurrentActor returns the actor at current index
- Confirms first actor is the player (highest initiative)

#### ✓ should track actor index correctly
- Tests that actor index can be updated
- Confirms getCurrentActor reflects the updated index
- Validates multiple actor transitions

### 4. Actor Turn System - Player Turn System (3 tests)
Tests player-specific turn management.

#### ✓ should set waitingForPlayerInput flag on player turn_start
- Confirms `game.waitingForPlayerInput` is set to true on player's turn
- Validates `game.currentPlayerTurn` tracks the player entity
- Ensures system returns null (player action comes from client)

#### ✓ should not set waitingForPlayerInput for non-player entities
- Tests that enemy turns don't set the player input flag
- Confirms player tracking is null for non-player turns

#### ✓ should only respond to turn_start events
- Validates system ignores non-turn events
- Confirms system only processes turn_start events

### 5. Actor Turn System - NPC Turn System (2 tests)
Tests NPC/enemy turn management.

#### ✓ should only respond to turn_start events for enemies
- Confirms system ignores non-turn events
- Validates system ignores player turn_start events
- Ensures only enemy turns are processed

#### ✓ should recognize enemy entities
- Uses bitECS query to find all entities with Enemy component
- Confirms all test enemies are queryable
- Validates player does not have Enemy component

## Key Findings and Fixes

### Issue: Component Checking
**Problem**: The original player_turn_system and npc_turn_system used direct array access to check for components:
```javascript
if (!Player[actorEid]) return null
```

This doesn't work correctly for components with field schemas because bitECS stores component data in Structure of Arrays (SoA) format.

**Solution**: Use `hasComponent` from bitECS:
```javascript
if (!hasComponent(world, actorEid, Player)) return null
```

This is the proper way to check component presence and works for both tag components (no fields) and components with schemas.

### Architecture Insights

1. **Event-Driven Turn System**: The turn system is event-driven, with turn_start and turn_end events triggering appropriate systems.

2. **Player vs NPC Turns**: 
   - Player turns set a flag and wait for client input
   - NPC turns execute AI logic automatically
   - Both systems use the same turn_start event but filter by component

3. **Turn End Behavior**: The turn_end event is special - systems can receive it for cleanup but cannot propagate new events from it. This prevents infinite turn loops.

4. **Initiative-Based Turn Order**: Actors are sorted by initiative (highest first) at round start, determining turn order.

## Running the Tests

```bash
# Run all actor turn system tests
node --test tests/text_adventure/actor_turn_system.test.mjs

# Run a specific test by name pattern
node --test --test-name-pattern="should set waitingForPlayerInput" tests/text_adventure/actor_turn_system.test.mjs
```

## Test Results
- **Total Tests**: 15
- **Pass**: 15
- **Fail**: 0
- **Status**: ✅ All tests passing

## Future Test Additions

Potential areas for additional testing:
1. Full round execution (startRound → all turns → endRound)
2. Event queue clearing after round end
3. Multiple round cycles
4. NPC AI decision making (attack target selection)
5. Integration with combat system during NPC turns
6. Player action completion and turn progression
7. Edge cases: No actors, single actor, all NPCs, all players
