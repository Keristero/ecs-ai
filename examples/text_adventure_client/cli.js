#!/usr/bin/env node

/**
 * CLI interface for the text adventure game (Node.js)
 * Uses readline for terminal input/output
 */

const readline = require('readline');
const core = require('./core.js');

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: colors.cyan + '> ' + colors.reset
});

// Game state
let gameState = null;

// Print colored line
function printLine(text, style = '') {
    let colorCode = colors.reset;
    
    switch (style) {
        case 'info':
            colorCode = colors.cyan;
            break;
        case 'success':
            colorCode = colors.green;
            break;
        case 'error':
            colorCode = colors.red;
            break;
        case 'prompt':
            colorCode = colors.yellow;
            break;
        case 'dim':
            colorCode = colors.dim;
            break;
    }
    
    console.log(colorCode + text + colors.reset);
}

// Print multiple lines
function printLines(lines, style = '') {
    lines.forEach(line => printLine(line, style));
}

// Display room information
function displayRoomInfo(roomData) {
    const lines = core.formatRoomInfo(roomData);
    lines.forEach(line => {
        // Apply different styles based on line content
        let style = '';
        if (line.startsWith('===')) {
            style = 'info';
        } else if (line.startsWith('Exits:') || line.startsWith('Items:') || 
                   line.startsWith('Landmarks:') || line.startsWith('Enemies:') || 
                   line.startsWith('Inventory:')) {
            style = 'info';
        } else if (line.startsWith('  •')) {
            style = 'dim';
        }
        printLine(line, style);
    });
}

// Execute command
async function executeCommand(input) {
    const trimmed = input.trim();
    if (!trimmed) {
        rl.prompt();
        return;
    }
    
    // Parse command
    const parsed = core.parseCommand(input, gameState);
    
    if (!parsed) {
        rl.prompt();
        return;
    }
    
    // Handle different command types
    switch (parsed.type) {
        case 'help':
            const helpLines = core.getHelpText();
            printLines(helpLines, 'info');
            break;
            
        case 'clear':
            console.clear();
            break;
            
        case 'action':
            const result = await core.executeAction(gameState, parsed.action, parsed.params);
            
            if (result.success === false) {
                printLine(result.message, 'error');
            } else {
                if (result.message) {
                    printLine(result.message, 'success');
                }
                
                // Display room info if available
                if (result.roomId) {
                    displayRoomInfo(result);
                }
            }
            break;
            
        case 'error':
            printLine(parsed.message, 'error');
            break;
    }
    
    rl.prompt();
}

// Initialize game
async function init() {
    gameState = new core.GameState();
    
    printLine('=== Text Adventure Game ===', 'info');
    printLine('Loading game...', 'info');
    
    try {
        const initResult = await core.initializeGame(gameState);
        
        if (initResult.success) {
            printLine(`Player ID: ${initResult.playerId}`, 'info');
            printLine(`Loaded ${initResult.actionsCount} actions`, 'success');
            
            // Display initial room
            if (initResult.initialRoom) {
                displayRoomInfo(initResult.initialRoom);
            }
            
            printLine('Type "help" for available commands', 'info');
            printLine('');
        } else {
            printLine(`Failed to initialize: ${initResult.error}`, 'error');
        }
    } catch (error) {
        printLine(`Failed to initialize: ${error.message}`, 'error');
    }
    
    rl.prompt();
}

// Setup readline event handlers
rl.on('line', async (input) => {
    if (gameState) {
        gameState.addToHistory(input);
    }
    await executeCommand(input);
});

rl.on('close', () => {
    printLine('\nGoodbye!', 'info');
    process.exit(0);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
    printLine('\nGoodbye!', 'info');
    process.exit(0);
});

// Start the game (don't prompt until init completes)
(async () => {
    await init();
})();
