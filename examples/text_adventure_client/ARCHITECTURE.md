# Architecture Visualization

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         core.js                              │
│                   (11KB - Universal Logic)                   │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              COMMANDS Object                        │    │
│  │  Single source of truth for all game commands      │    │
│  │  • help, clear, look, move, pickup, drop, attack   │    │
│  │  • Type, description, usage, parse function        │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  • GameState class                                          │
│  • initializeGame() - Fetch player ID                       │
│  • executeAction() - Call game API                          │
│  • parseCommand() - Data-driven from COMMANDS               │
│  • getHelpText() - Generated from COMMANDS                  │
│  • getAutocompleteSuggestions() - From COMMANDS             │
│  • formatRoomInfo() - Format room display                   │
└──────────────────┬─────────────────┬────────────────────────┘
                   │                 │
         ┌─────────┴─────┐   ┌───────┴────────┐
         │               │   │                │
         ▼               │   ▼                │
┌─────────────────┐      │  ┌─────────────────┐
│  interface.js   │      │  │    cli.js       │
│  (6.3KB)        │      │  │    (4.7KB)      │
│                 │      │  │                 │
│  Browser UI     │      │  │  Terminal UI    │
│  • DOM output   │      │  │  • Console      │
│  • HTML input   │      │  │  • Readline     │
│  • CSS styling  │      │  │  • ANSI colors  │
│  • Autocomplete │      │  │  • Ctrl+C exit  │
│    dropdown     │      │  │                 │
└─────────────────┘      │  └─────────────────┘
         │               │           │
         │               │           │
         ▼               │           ▼
┌─────────────────┐      │  ┌─────────────────┐
│   index.html    │      │  │   Terminal      │
│   (2.5KB)       │      │  │   (Node.js)     │
│                 │      │  │                 │
│  <script> tags  │      │  │  $ node cli.js  │
│  • core.js      │      │  │  $ npm start    │
│  • interface.js │      │  │                 │
└─────────────────┘      │  └─────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   Game Server API     │
              │   localhost:6060      │
              │                       │
              │  • /actions/look      │
              │  • /actions/move      │
              │  • /actions/pickup    │
              │  • /actions/drop      │
              │  • /actions/attack    │
              │  • /actions/gameinfo  │
              └──────────────────────┘
```

## Command Flow

```
User Input: "move north"
      │
      ▼
┌──────────────────────────────────────────┐
│ Interface (browser or CLI)               │
│ • Receives user input                    │
│ • Calls parseCommand("move north")       │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│ core.js - parseCommand()                 │
│ 1. Split: ["move", "north"]              │
│ 2. Lookup: COMMANDS["move"]              │
│ 3. Call: COMMANDS.move.parse(["north"])  │
│ 4. Return: {                             │
│      type: 'action',                     │
│      action: 'move',                     │
│      params: { direction: 'north' }      │
│    }                                     │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│ core.js - executeAction()                │
│ • POST to /actions/move                  │
│ • Body: { playerId: 17, direction: 'n'} │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│ Game Server                              │
│ • Process move action                    │
│ • Update player location                 │
│ • Call look action                       │
│ • Return room data                       │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│ core.js - formatRoomInfo()               │
│ • Convert room data to text lines        │
│ • Return array of formatted strings      │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│ Interface (browser or CLI)               │
│ • Display formatted output               │
│ • Browser: Append to #terminal           │
│ • CLI: console.log with colors           │
└──────────────────────────────────────────┘
```

## Help Text Generation

```
User Input: "help"
      │
      ▼
┌──────────────────────────────────────────┐
│ Interface calls getHelpText()            │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│ core.js - getHelpText()                  │
│                                          │
│ const lines = ['Available commands:']   │
│                                          │
│ Object.entries(COMMANDS).forEach(...)   │
│   lines.push(                           │
│     `  ${cmd.usage} - ${cmd.description}`│
│   )                                     │
│                                          │
│ Returns:                                │
│   [                                     │
│     'Available commands:',              │
│     '  help - Show this help',          │
│     '  clear - Clear the terminal',     │
│     '  look - Look around the room',    │
│     '  move <dir> - Move in direction', │
│     ...                                 │
│   ]                                     │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│ Interface displays help lines            │
└──────────────────────────────────────────┘
```

## Autocomplete Flow

```
User typing: "mov"
      │
      ▼
┌──────────────────────────────────────────┐
│ Interface calls                          │
│ getAutocompleteSuggestions("mov", ...)   │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│ core.js - getAutocompleteSuggestions()  │
│                                          │
│ const commandNames = Object.keys(        │
│   COMMANDS                               │
│ )                                        │
│ // ['help', 'clear', 'look', 'move', ...]│
│                                          │
│ return commandNames.filter(              │
│   cmd => cmd.startsWith("mov")          │
│ )                                        │
│ // ['move']                              │
└──────────┬───────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│ Interface displays suggestions           │
│ • Browser: Show dropdown                 │
│ • CLI: (readline handles internally)     │
└──────────────────────────────────────────┘
```

## File Sizes & Responsibilities

| File | Size | Responsibility |
|------|------|----------------|
| **core.js** | 11KB | Game logic, COMMANDS, API calls |
| **interface.js** | 6.3KB | Browser UI, DOM manipulation |
| **cli.js** | 4.7KB | Terminal UI, readline, ANSI colors |
| **index.html** | 2.5KB | HTML page, loads scripts |
| **client.js** | 12KB | ⚠️ Old monolithic version (kept for reference) |

## Key Design Principles

1. **DRY (Don't Repeat Yourself)**
   - Commands defined once in `COMMANDS`
   - Used by parseCommand, getHelpText, getAutocompleteSuggestions

2. **Separation of Concerns**
   - core.js: Pure logic, no UI
   - interface.js: Browser UI only
   - cli.js: Terminal UI only

3. **Data-Driven Design**
   - Command behavior driven by `COMMANDS` object
   - Add command → Everything works automatically

4. **Platform Agnostic**
   - core.js works in browser and Node.js
   - Interfaces handle platform-specific details

5. **Single Responsibility**
   - Each module has one clear purpose
   - Easy to understand and maintain
