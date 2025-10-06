# Text Adventure Game

A complete MUD-style text adventure game built with ECS (Entity Component System) architecture using bitECS. Features both browser and CLI interfaces, prefab system for reusable entities, and optional AI-generated descriptions.

## Quick Start

### 1. Start the Server
```bash
# From the root of the repo
GAME_LOGIC_FOLDER_PATH=./examples/text_adventure_logic pnpm start
```

The server will start on `http://localhost:6060` with:
- `/actions` - List all available player actions
- `/actions/{actionName}` - Execute a specific action
- `/tools` - ECS inspection tools

### 2. Play the Game

#### Browser Interface
```bash
# Serve the client
cd examples/text_adventure_client
python3 -m http.server 5500
# Open http://localhost:5500 in your browser
```

#### CLI Interface (Node.js)
```bash
cd examples/text_adventure_client
npm install
node cli.js
# or: npm start
```

## Game Features

✅ **Room navigation** with directional connections (north, south, east, west)  
✅ **Item management** - Pick up and drop items  
✅ **Combat system** - Fight enemies with attributes and hitpoints  
✅ **Enemy AI** - Enemies attack players automatically  
✅ **Inventory system** - Manage carried items  
✅ **Death & respawn** - Respawn in starting room when defeated  
✅ **String store** - Efficient storage for names and descriptions  
✅ **Prefab system** - Reusable entity templates with inheritance  
✅ **Two interfaces** - Browser terminal and CLI  
✅ **Command history** - Navigate previous commands  
✅ **Autocomplete** - Contextual command suggestions  

## Available Commands

- `help` - Show available commands
- `look` - Look around the current room
- `move <direction>` - Move in a direction (north, south, east, west)
- `pickup <itemId>` - Pick up an item
- `drop <itemId>` - Drop an item from inventory
- `attack <enemyId>` - Attack an enemy
- `clear` - Clear the terminal

## Game Architecture

### ECS Components (`text_adventure_logic/components/`)

All game entities use bitECS components:

- **Room** - Locations in the game world with IDs
- **Item** - Objects that can be picked up and dropped
- **Landmark** - Non-interactive objects for atmosphere
- **Enemy** - Hostile entities that can be fought
- **Player** - Player character with stats
- **Connection** - Directional links between rooms
- **Hitpoints** - Health tracking (max and current)
- **Attributes** - Stats (strength, dexterity, intelligence)
- **Name** - String-indexed entity names
- **Description** - String-indexed descriptions
- **Inventory** - Item ownership tracking

### Actions (`text_adventure_logic/actions/`)

Player-initiated actions automatically exposed as API endpoints:

- **move.mjs** - Navigate between rooms using connections
- **look.mjs** - Examine surroundings, items, enemies, and inventory
- **pickup.mjs** - Pick up items from the current room
- **drop.mjs** - Drop items in the current room
- **attack.mjs** - Combat with enemies using attributes
- **gameinfo.mjs** - Get player information

Each action is a function: `(game, params) => result`

### Systems (`text_adventure_logic/systems/`)

Automated game logic that runs after player actions:

- **enemy_turn_system** - AI-controlled enemy behavior and attacks
- **update.mjs** - Main update loop that runs all systems

### Prefabs (`text_adventure_logic/prefabs/`)

Reusable entity templates using bitECS prefab system:

- **goblin.mjs** - Weak common enemy (20 HP)
- **skeleton_warrior.mjs** - Stronger undead enemy (40 HP)
- **rusty_sword.mjs** - Basic weapon item
- **health_potion.mjs** - Consumable healing item

Prefabs are created with `addPrefab()` and instantiated using the `IsA()` relationship for component inheritance.

### Client Architecture (`text_adventure_client/`)

The client is split into three focused modules:

#### **core.js** - Universal Game Logic
- API communication (works in browser and Node.js)
- Command definitions in `COMMANDS` object (single source of truth)
- Command parsing (data-driven from COMMANDS)
- Game state management
- Room data formatting
- Help text generation (from COMMANDS)
- Autocomplete suggestions (from COMMANDS)

#### **interface.js** - Browser UI
- HTML terminal display
- DOM manipulation
- Autocomplete dropdown
- Keyboard event handlers
- Tab completion
- Retro terminal styling

#### **cli.js** - Node.js CLI
- Console terminal display
- ANSI color codes
- Readline for input
- Command history
- Ctrl+C graceful exit

## Game World

The default game includes:

### Rooms
1. **Starting Cave** - A dark, damp cave (starting location)
2. **Forest Path** - A narrow path through a dense forest
3. **Ancient Ruins** - Crumbling stone structures covered in moss

### Items
- **Rusty Sword** [ID: varies] - An old, rusty sword covered in grime
- **Health Potion** [ID: varies] - A red potion that restores health

### Enemies
- **Goblin** [ID: varies] - A small, green-skinned creature (20 HP)
- **Skeleton Warrior** [ID: varies] - An animated skeleton warrior (40 HP)

### Landmarks
- **Ancient Altar** - A mysterious altar in the ruins

## API Examples

### Look Around
```bash
curl -X POST http://localhost:6060/actions/look \
  -H "Content-Type: application/json" \
  -d '{"playerId": 17}'
```

### Move North
```bash
curl -X POST http://localhost:6060/actions/move \
  -H "Content-Type: application/json" \
  -d '{"playerId": 17, "direction": "north"}'
```

### Attack Enemy
```bash
curl -X POST http://localhost:6060/actions/attack \
  -H "Content-Type: application/json" \
  -d '{"playerId": 17, "enemyId": 15}'
```

### Get Player Info
```bash
curl -X POST http://localhost:6060/actions/gameinfo \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Extending the Game

### Adding New Commands

All commands are defined in `text_adventure_client/core.js` in the `COMMANDS` object:

```javascript
const COMMANDS = {
    examine: {
        type: 'action',
        description: 'Examine an item or entity',
        usage: 'examine <targetId>',
        parse: (args) => {
            const targetId = parseInt(args[0]);
            if (isNaN(targetId)) {
                return { error: 'Usage: examine <targetId>' };
            }
            return { action: 'examine', params: { targetId } };
        }
    }
};
```

When you add a command to `COMMANDS`:
- Help text is automatically updated
- Autocomplete suggestions include it
- Both browser and CLI support it
- No changes needed to interface code

### Adding New Actions

1. Create a new file in `text_adventure_logic/actions/my_action.mjs`
2. Export a default function:

```javascript
/**
 * My custom action - does something cool
 * @param {Object} game - The game instance
 * @param {Object} params - Action parameters
 * @param {number} params.playerId - The player entity ID
 * @returns {Object} Action result with success status
 */
export default function my_action(game, params) {
    const {world} = game;
    const {playerId} = params;
    
    // Your logic here
    
    return {
        success: true,
        message: "Action completed!"
    };
}
```

3. Restart the server - action is now available at `/actions/my_action`

### Adding New Prefabs

1. Create `text_adventure_logic/prefabs/my_entity.mjs`:

```javascript
import {addPrefab, addComponent, set} from 'bitecs'

export default function create_my_entity_prefab(world, components) {
    const {Enemy, Hitpoints, Name, Description} = components
    
    const MyEntity = addPrefab(world)
    addComponent(world, MyEntity, Enemy)
    addComponent(world, MyEntity, set(Hitpoints, {max: 30, current: 30}))
    addComponent(world, MyEntity, set(Name, {value: "my entity"}))
    addComponent(world, MyEntity, set(Description, {value: "A cool entity."}))
    
    return MyEntity
}
```

2. Use it in `setup_world.mjs`:

```javascript
const entity = addEntity(world)
addComponent(world, entity, IsA(prefabs.my_entity))
addComponent(world, entity, InRoom(someRoom))
```

### Adding New Systems

1. Add system function to `text_adventure_logic/systems/text_adventure_systems.mjs`:

```javascript
export function my_system(world, components) {
    const {MyComponent} = components
    const entities = query(world, [MyComponent])
    
    entities.forEach(eid => {
        // Your system logic here
    })
}
```

2. Add to `systems/update.mjs`:

```javascript
import {my_system} from './text_adventure_systems.mjs'

export function update(world) {
    // ... existing systems ...
    my_system(world, world.components)
}
```

### Adding More Content

Edit `text_adventure_logic/setup_world.mjs` to add:

```javascript
// New room
const newRoom = addEntity(world)
addComponent(world, newRoom, Room)
Room.id[newRoom] = 4
addComponent(world, newRoom, set(Name, {value: "Treasure Room"}))
addComponent(world, newRoom, set(Description, {value: "Gold and jewels everywhere!"}))

// Connection from another room
const connection = addEntity(world)
addComponent(world, connection, set(Connection, {from: 3, to: 4, direction: "north"}))
```

## Technical Details

### ECS Framework
- **bitECS** - High-performance ECS with sparse set storage
- **Prefab system** - Entity templates with component inheritance
- **Relations** - Custom bitECS relations for spatial and ownership tracking
- **String store** - Efficient string indexing with observers
- **Observers** - onSet/onGet for component inheritance and validation

### Server
- **Express.js** - API server
- **Automatic endpoints** - Actions auto-exposed as POST endpoints
- **ECS inspection** - Tools endpoint for debugging
- **CORS enabled** - Browser client support

### Client
- **Vanilla JS** - No framework dependencies
- **Modular design** - Core logic shared between interfaces
- **Command system** - Data-driven from COMMANDS object
- **Fetch API** - HTTP communication with server

### Key Patterns

#### String Store with Observers
```javascript
// Setup observers for string components
observe(world, onSet(Name), (eid, params) => {
    if (params && params.value) {
        Name.stringIndex[eid] = addString(params.value)
    }
})

observe(world, onGet(Name), (eid) => ({
    value: getString(Name.stringIndex[eid])
}))
```

#### Prefab Inheritance
```javascript
// Create prefab
const GoblinPrefab = addPrefab(world)
addComponent(world, GoblinPrefab, set(Hitpoints, {max: 20, current: 20}))

// Instantiate from prefab
const goblin = addEntity(world)
addComponent(world, goblin, IsA(GoblinPrefab)) // Inherits Hitpoints
```

#### Component Access
```javascript
// Direct access (no inheritance)
const hp = Hitpoints.current[eid]

// Using getComponent (triggers onGet, handles inheritance)
const hpData = getComponent(world, eid, Hitpoints)
const hp = hpData.current
```

## AI Integration (Optional)

The framework supports AI-generated content via MCP server:
- Dynamic room descriptions based on context
- NPC dialogue generation
- Quest text generation

Access via the `/agent/prompt` endpoint with game state context.

## Client Features

### Browser Interface
- 🎨 Retro terminal styling (green on black)
- 📝 Tab completion for commands
- ⬆️⬇️ Command history with arrow keys
- 🔍 Contextual autocomplete suggestions
- 📊 Real-time game state updates
- ⚠️ Clean error messages

### CLI Interface
- 🌈 ANSI colored output
- 📝 Command history via readline
- ⌨️ Native terminal feel
- 🚪 Ctrl+C graceful exit
- 🎨 Color-coded messages (info, success, error)

## Project Structure

```
examples/
├── text_adventure_README.md         # This file (main documentation)
├── text_adventure.md                # Implementation status
├── IMPLEMENTATION_SUMMARY.md        # Complete implementation details
├── text_adventure_logic/            # Game logic (server-side)
│   ├── actions/                     # Player actions → API endpoints
│   │   ├── move.mjs
│   │   ├── look.mjs
│   │   ├── pickup.mjs
│   │   ├── drop.mjs
│   │   ├── attack.mjs
│   │   └── gameinfo.mjs
│   ├── components/                  # ECS components
│   │   └── text_adventure_components.mjs
│   ├── systems/                     # Game systems
│   │   ├── text_adventure_systems.mjs
│   │   └── update.mjs
│   ├── prefabs/                     # Entity templates
│   │   ├── goblin.mjs
│   │   ├── skeleton_warrior.mjs
│   │   ├── rusty_sword.mjs
│   │   └── health_potion.mjs
│   ├── setup_world.mjs              # World initialization
│   └── game.mjs                     # Game instance
└── text_adventure_client/           # Client interfaces
    ├── core.js                      # Universal game logic
    ├── interface.js                 # Browser UI
    ├── cli.js                       # Node.js CLI
    ├── index.html                   # Browser page
    └── package.json                 # CLI dependencies
```

## Development Tips

### Debugging
- Use `GET /tools` endpoint to inspect ECS state
- Check browser console for client errors
- Server logs show action execution details
- Use `getComponent()` to properly read inherited component values

### Testing Actions
```bash
# Quick test of an action
curl -X POST http://localhost:6060/actions/look \
  -H "Content-Type: application/json" \
  -d '{"playerId": 17}' | jq
```

### Adding Test Content
The fastest way to test new features is to add them in `setup_world.mjs` where the game world is initialized.

### Performance
- bitECS uses sparse set storage for fast queries
- Prefabs are excluded from queries automatically
- String store reduces memory for repeated strings
- Systems only run on entities with required components

## License

See the main repository license.

---

**Status**: ✅ Fully Implemented  
**Version**: 2.0 (with prefab system and dual interfaces)  
**Last Updated**: October 2025
