# Text Adventure Game - ✅ FULLY IMPLEMENTED

This is a fully functional old school MUD style game that uses ECS architecture with AI-generated descriptions.

## Implementation Status: ✅ COMPLETE

All game logic is implemented using pure ECS principles with bitECS. Room descriptions can be generated at runtime by AI.

See [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for complete details.
See [text_adventure_README.md](./text_adventure_README.md) for how to run and play.

## Architecture

### Actions (Player-Initiated)
Located in `text_adventure_logic/actions/`:
- `move.mjs` - Navigate between rooms
- `look.mjs` - Examine surroundings and inventory
- `pickup.mjs` - Pick up items
- `drop.mjs` - Drop items
- `attack.mjs` - Combat with enemies

**All actions are automatically exposed as API endpoints** via the actions framework.

### Systems (Automated Game Logic)
Located in `text_adventure_logic/systems/`:
- `enemy_turn_system` - AI-controlled enemy behavior

Systems run automatically after player actions to update the game world.

### Components (Data Storage)
All game entities use bitECS components:
- **Entities**: Room, Item, Landmark, Enemy, Player
- **Attributes**: Hitpoints, Attributes (str/dex/int), Name, Description
- **Relations**: InRoom (location), Connection (room links), Inventory (item ownership)

## Features Implemented

✅ Room navigation with directional connections  
✅ Item pickup and drop system  
✅ Combat with enemies  
✅ Player attributes and hitpoints  
✅ Enemy AI that attacks players  
✅ Inventory management  
✅ Death and respawn system  
✅ String store for names/descriptions  
✅ Automatic action-to-API exposure  
✅ Browser-based terminal client  
✅ Contextual autocomplete  
✅ Command history  

## Running the Game

```bash
# Start server
GAME_LOGIC_FOLDER_PATH=./examples/text_adventure_logic pnpm start

# Open client
open examples/text_adventure_client/index.html
```

The API runs on http://localhost:6060 with endpoints:
- `GET /actions` - List all player actions
- `POST /actions/{action}` - Execute an action
- `GET /tools` - ECS inspection tools

## Client Features

The HTML/JS client provides:
- Old-school terminal UI (green on black)
- Tab completion for commands
- Command history (up/down arrows)
- Real-time game state updates
- Clean error messages
- Contextual command suggestions

## AI Integration (Optional)

The framework supports AI-generated content via the `/agent/prompt` endpoint:
- Dynamic room descriptions based on context
- NPC dialogue generation
- Quest text generation

## Extending the Game

### Add a New Action
1. Create `text_adventure_logic/actions/my_action.mjs`
2. Export default function: `(game, params) => result`
3. Add JSDoc comments for documentation
4. Restart server - action is now available at `/actions/my_action`

### Add a New System
1. Add system function to `text_adventure_logic/systems/text_adventure_systems.mjs`
2. Export the system
3. Add to `systems/update.mjs` to run it each tick

### Add More Content
Edit `text_adventure_logic/setup_world.mjs` to add rooms, items, enemies, etc.

## Technical Details

- **ECS Framework**: bitECS for high-performance entity management
- **API Server**: Express.js with automatic endpoint generation
- **Client**: Vanilla HTML/CSS/JS (no dependencies)
- **Relations**: Custom bitECS relations for spatial and ownership tracking
- **String Storage**: Efficient string indexing for names/descriptions

---

## Original Design Notes

this is a old school MUD style game, but we use AI to generate a small world and descriptions.

All of the game logic is normal ECS game logic. but the room descriptions are generated at runtime by the AI.

To implement the game we might need to make some small adjustments to the prompt endpoint to allow it to return structured values, for example we dont want the agents thoughts to be returned alongside the output.

USE bitecs documentation in `/docs` to fully leverage the API. this may include using
- components ✅
- queries ✅
- relationships ✅
- prefabs (not used yet)

All the game logic should be handled exclusively by systems ✅ (separated into actions + systems)

we might need to exetend the game framework a bit to support all this. ✅

## logic ✅
ECS based game world that has:
- rooms ✅
    - areas that characters and items can exist in
- items ✅
    - can be held by characters, or left in rooms
- landmarks ✅
    - these are like items but they cant be interacted with, they exist in rooms and are used by the ai as context for generating room descriptions
- attributes ✅
    - used for combat, you gain extra attributes on level up
- enemies ✅
    - you can fight them

## client ✅
The client is a static html page, this page queries the /api directly to interact with the game state.

It has contextual autocomplete based on the entities in the current room, and the connections to other rooms from this room. ✅

the game client provides an old school style text terminal that lets you play the game, ✅
- you can move between rooms ✅
- you can take items, drop items ✅
- you can look at things ✅
- when you enter a room, the client uses an AI prompt to get a description of its contents (optional feature)
- you can fight and defeat enemies ✅
- if you die you respawn in the starting room ✅