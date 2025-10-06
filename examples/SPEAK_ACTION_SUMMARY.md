# Speak Action - Implementation Summary

## Overview
Added a new `speak` action that allows the player to say dialogue in their current room. Any entities with the `Ears` component will be listed as listeners, and the AI summary decides if they should respond.

## Components Added

### Ears Component
- **Location**: `/examples/text_adventure_logic/components/text_adventure_components.mjs`
- **Purpose**: Marks entities that can hear dialogue
- **Type**: Empty component (tag component)
- **Usage**: Add to any entity that should be able to hear player speech

## Action Details

### Speak Action
- **Location**: `/examples/text_adventure_logic/actions/speak.mjs`
- **Command**: `speak`, `say`, `talk`, `shout`
- **Parameters**: 
  - `dialogue` (string): What the player wants to say
- **Features**:
  - Lists all entities with Ears in the current room
  - Excludes the speaker from listeners
  - Logs full dialogue context to console
  - Returns listener details with names and descriptions
  - AI summarization enabled for narrative responses

### Return Data Structure
```javascript
{
    success: true,
    message: 'You say: "Hello!"',
    dialogue: "Hello!",
    roomId: 5,
    roomName: "Starting Cave",
    speakerId: 13,
    listeners: [
        {
            id: 11,
            name: "Goblin",
            description: "A small, green-skinned creature..."
        }
    ],
    listenerCount: 1
}
```

## Updated Entities

### Prefabs with Ears
- **Goblin** (`/prefabs/goblin.mjs`)
- **Skeleton Warrior** (`/prefabs/skeleton_warrior.mjs`)

Both enemy types can now hear player dialogue and potentially respond.

## Client Support

The client already handles multi-word input correctly:
- Single parameter actions join all args into one string
- Works for: `speak Hello world!` → dialogue: "Hello world!"

## AI Integration

The action includes `summarizeWithAI: true`, which means:
1. Player says dialogue
2. System lists who heard it
3. AI receives full context (speaker, dialogue, listeners with descriptions)
4. AI generates narrative response, potentially including NPC reactions

### Example AI Response Flow
```
Player: > speak Hello, can you help me?

Console logs:
=== DIALOGUE ===
Room: Forest Path
Speaker: Player (ID: 13)
Dialogue: "Hello, can you help me?"
Listeners: Goblin
================

AI-generated narrative:
"You call out to the goblin. The small green creature turns 
its head toward you, baring its sharp teeth in what might 
be a smile or a grimace. 'Help? Goblins no help humans!' 
it hisses before scurrying back into the shadows."
```

## Testing

### Test Coverage (`/tests/text_adventure/speak.test.mjs`)
- ✅ Basic speaking functionality
- ✅ Lists entities with Ears
- ✅ Excludes speaker from listeners
- ✅ Handles empty rooms (no listeners)
- ✅ Includes room context in results

**All 20 tests passing** (15 existing + 5 new)

## Usage Examples

```javascript
// Simple greeting
> speak Hello!

// Multi-word dialogue
> speak Is anyone there?

// Question to NPCs
> say Can you help me find the exit?

// Shouting
> shout Look out behind you!
```

## Future Enhancements

Potential improvements:
1. Add dialogue history system
2. Create Mouth component for entities that can speak back
3. Add personality/mood components for varied NPC responses
4. Implement conversation state tracking
5. Add volume modifiers (whisper, normal, shout) affecting range
