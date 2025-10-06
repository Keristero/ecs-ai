# Command System

## Overview

All game commands are now defined in a single place: `core.js` in the `COMMANDS` object. Both the browser interface and CLI automatically load and use these commands.

## Command Definition Structure

Each command in the `COMMANDS` object has:

```javascript
commandName: {
    type: 'builtin' | 'action',  // builtin for UI commands, action for game actions
    description: 'Command description',
    usage: 'command <args>',     // How to use the command
    parse: (args) => {}          // Optional: for action commands, parses arguments
}
```

## Current Commands

All commands are defined in `core.js`:

- **help** - Show help text (builtin)
- **clear** - Clear terminal (builtin)
- **look** - Look around room (action)
- **move** - Move in direction (action)
- **pickup** - Pick up item (action)
- **drop** - Drop item (action)
- **attack** - Attack enemy (action)

## Adding New Commands

To add a new command, simply add it to the `COMMANDS` object in `core.js`:

```javascript
const COMMANDS = {
    // ... existing commands ...
    
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

Both the browser interface and CLI will automatically:
- Include it in the help text
- Parse it correctly
- Provide autocomplete suggestions
- Execute it via the API

No changes needed to `interface.js` or `cli.js`!

## Benefits

1. **Single Source of Truth** - Commands defined once
2. **Automatic Help** - Help text generated from command definitions
3. **Consistent Parsing** - Same parsing logic everywhere
4. **Easy Extension** - Add new commands in one place
5. **Type Safety** - Clear structure for command definitions

## How It Works

### core.js
- Defines `COMMANDS` object
- `parseCommand()` uses `COMMANDS` to parse input
- `getHelpText()` generates help from `COMMANDS`
- `getAutocompleteSuggestions()` uses `COMMANDS` for suggestions

### interface.js (Browser)
- Loads `core.js` as a script tag
- All core functions and `COMMANDS` available globally
- Calls `parseCommand()` to process user input
- Calls `getHelpText()` for help display
- Calls `getAutocompleteSuggestions()` for autocomplete

### cli.js (Node.js)
- Requires `core.js` as a module
- Gets `COMMANDS` and functions via `require('./core.js')`
- Uses same functions as browser interface
- Same behavior, different UI

## Example Flow

1. User types "move north"
2. Interface calls `parseCommand("move north")`
3. `parseCommand()` finds "move" in `COMMANDS`
4. Calls `COMMANDS.move.parse(['north'])`
5. Returns `{ type: 'action', action: 'move', params: { direction: 'north' } }`
6. Interface executes action via `executeAction()`
7. Server processes move and returns result
8. Interface displays result
