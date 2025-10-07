#!/usr/bin/env node

const readline = require('readline');
const core = require('./core.js');

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    cyan: '\x1b[36m'
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: colors.cyan + '> ' + colors.reset
});

let gameState = null;

function printLine(text, style = '') {
    const colorCode = {
        info: colors.cyan,
        success: colors.green,
        error: colors.red,
        dim: colors.dim
    }[style] || colors.reset;
    
    console.log(colorCode + text + colors.reset);
}

function displayRoomInfo(roomData) {
    core.formatRoomInfo(roomData).forEach(line => {
        let style = '';
        if (line.startsWith('===') || line.startsWith('Exits:') || 
            line.includes('Items:') || line.includes('Landmarks:') || 
            line.includes('Enemies:') || line.includes('Inventory:')) {
            style = 'info';
        } else if (line.startsWith('  •')) {
            style = 'dim';
        }
        printLine(line, style);
    });
}

function displayRoundState(roundState) {
    core.formatRoundState(roundState).forEach(line => {
        let style = '';
        if (line.startsWith('===')) style = 'info';
        else if (line.includes('YOUR TURN')) style = 'success';
        else if (line.includes('NPC TURN')) style = 'dim';
        printLine(line, style);
    });
    rl.prompt();
}

function displayEvent(event) {
    let eventDesc = `[Event] ${event.type}:${event.name}`;
    if (event.turn?.actor_eid !== undefined) {
        eventDesc += ` (Actor: ${event.turn.actor_eid})`;
    }
    printLine(eventDesc, 'dim');
    rl.prompt();
}

async function executeCommand(input) {
    const trimmed = input.trim();
    if (!trimmed) {
        rl.prompt();
        return;
    }
    
    const parsed = core.parseCommand(input, gameState);
    if (!parsed) {
        rl.prompt();
        return;
    }
    
    switch (parsed.type) {
        case 'help':
            core.getHelpText().forEach(line => printLine(line, 'info'));
            break;
            
        case 'clear':
            console.clear();
            break;
            
        case 'action':
            const result = await core.executeAction(gameState, parsed.action, parsed.params);
            if (!result.success) {
                printLine(result.message, 'error');
            }
            break;
            
        case 'error':
            printLine(parsed.message, 'error');
            break;
    }
    
    rl.prompt();
}

async function init() {
    gameState = new core.GameState();
    
    printLine('=== Text Adventure Game ===', 'info');
    printLine('Loading game...', 'info');
    
    try {
        core.addEventListener('round_state', displayRoundState);
        core.addEventListener('event', displayEvent);
        
        const initResult = await core.initializeGame(gameState);
        
        if (initResult.success) {
            printLine(`Player ID: ${initResult.playerId}`, 'info');
            printLine(`Loaded ${initResult.actionsCount} actions`, 'success');
            
            if (initResult.roundState) {
                displayRoundState(initResult.roundState);
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

process.on('SIGINT', () => {
    printLine('\nGoodbye!', 'info');
    process.exit(0);
});

(async () => {
    await init();
})();

