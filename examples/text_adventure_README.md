# Text Adventure Game - Full Implementation

This is a complete MUD-style text adventure game built with ECS (Entity Component System) architecture using bitECS.

## Architecture

### ECS Components (`components/`)
- **Room**: Defines locations in the game world
- **Item**: Objects that can be picked up and dropped
- **Landmark**: Non-interactive objects for room description context
- **Enemy**: Hostile entities that attack players
- **Player**: Player character with stats and inventory
- **Connection**: Links between rooms with directions
- **Hitpoints**: Health tracking for players and enemies
- **Attributes**: Stats (strength, dexterity, intelligence)

### Actions (`actions/`)
Player actions are automatically exposed as API endpoints:
- **move**: Navigate between rooms
- **look**: Examine current room and surroundings
- **pickup**: Take an item from the room
- **drop**: Drop an item in the current room
- **attack**: Combat with enemies

### Systems (`systems/`)
Automated game logic that runs after player actions:
- **enemy_turn_system**: AI-controlled enemy behavior and attacks

### Game World Setup (`setup_world.mjs`)
Initializes the game with:
- 3 interconnected rooms
- 2 items (rusty sword, health potion)
- 2 enemies (goblin, skeleton warrior)
- 1 landmark (ancient altar)
- 1 player character

## Running the Game

### 1. Start the API Server
```bash
pnpm start
```

The API will start on `http://localhost:3000` with:
- `/actions` - List all available player actions
- `/actions/{actionName}` - Execute a specific action
- `/tools` - ECS inspection tools
- `/health` - Health check endpoint

### 2. Open the Client
Open `examples/text_adventure_client/index.html` in a web browser or serve it with a simple HTTP server:

```bash
cd examples/text_adventure_client
python3 -m http.server 8080
```

Then navigate to `http://localhost:8080`

## Playing the Game

### Commands
- `help` - Show available commands
- `look` - Examine your surroundings
- `move <direction>` - Move north, south, east, or west
- `pickup <itemId>` - Pick up an item (use the ID shown in brackets)
- `drop <itemId>` - Drop an item from your inventory
- `attack <enemyId>` - Attack an enemy (use the ID shown in brackets)
- `clear` - Clear the terminal

### Features
- **Contextual Autocomplete**: Press Tab to autocomplete commands, use arrow keys to navigate suggestions
- **Command History**: Use Up/Down arrows to navigate through previous commands
- **Real-time Combat**: Enemies attack back after your turn
- **Inventory System**: Pick up and drop items as you explore
- **Death & Respawn**: Respawn in the starting room when defeated

## API Examples

### Look around
```bash
curl -X POST http://localhost:3000/actions/look \
  -H "Content-Type: application/json" \
  -d '{"playerId": 1}'
```

### Move north
```bash
curl -X POST http://localhost:3000/actions/move \
  -H "Content-Type: application/json" \
  -d '{"playerId": 1, "direction": "north", "getString": {}}'
```

### Attack enemy
```bash
curl -X POST http://localhost:3000/actions/attack \
  -H "Content-Type: application/json" \
  -d '{"playerId": 1, "enemyId": 5}'
```

## Extending the Game

### Adding New Actions
1. Create a new file in `examples/text_adventure_logic/actions/`
2. Export a default function: `(game, params) => result`
3. Add JSDoc comments for automatic API documentation
4. The action will be automatically exposed as an API endpoint

### Adding New Systems
1. Create system functions in `examples/text_adventure_logic/systems/text_adventure_systems.mjs`
2. Export the system function
3. Add it to `systems/update.mjs` to run it each game tick

### Adding More Rooms/Entities
Edit `examples/text_adventure_logic/setup_world.mjs` to add:
- More rooms with descriptions
- Additional items with properties
- New enemies with different stats
- More landmarks for atmosphere

## AI Integration

The game supports AI-generated room descriptions via the `/agent/prompt` endpoint. The client can request natural language descriptions of rooms based on:
- Current room name and description
- Items present
- Landmarks
- Enemies
- Player inventory

This allows for dynamic, context-aware storytelling that enhances the text adventure experience.
