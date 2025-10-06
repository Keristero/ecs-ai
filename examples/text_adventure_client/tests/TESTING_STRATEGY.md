# Testing Strategy for Text Adventure Client

## Current Test Coverage

The current test suite (`client.test.mjs`) covers the **core logic patterns** used in the client:
- Command parsing algorithms
- Autocomplete filtering logic
- History navigation patterns
- Data structure parsing
- Validation rules

These tests validate that the **logic patterns work correctly** without requiring the actual DOM or client code.

## Why This Approach?

The client is currently written as a single-file browser script (`client.js`) that directly manipulates the DOM and has global state. This makes it challenging to unit test directly without:
1. Refactoring it into importable modules
2. Dependency injection for DOM/fetch
3. Separating concerns (logic vs. presentation)

## Benefits of Current Tests

✅ **Fast**: No browser required  
✅ **Reliable**: Pure logic, no network/DOM dependencies  
✅ **Documentation**: Tests show how each piece should work  
✅ **Regression Prevention**: Catches logic errors before browser testing  

## Future Improvements

To test the actual client code, consider:

### 1. Refactor Client to Modules

```javascript
// client-logic.mjs - Pure functions
export function parseCommand(input) {
    const [command, ...args] = input.trim().split(/\s+/)
    return { command: command.toLowerCase(), args }
}

export function filterCommands(input, commands) {
    return commands.filter(cmd => cmd.startsWith(input.toLowerCase()))
}

// client.js - UI layer
import { parseCommand, filterCommands } from './client-logic.mjs'
```

### 2. Add Integration Tests

```javascript
describe('Client Integration', () => {
    it('should handle full command execution flow', async () => {
        const client = new GameClient(mockFetch, mockDOM)
        await client.executeCommand('look')
        expect(client.currentRoom).to.exist
    })
})
```

### 3. Add E2E Tests with Puppeteer

```javascript
describe('E2E Tests', () => {
    it('should play through a game scenario', async () => {
        await page.goto('http://localhost:5500')
        await page.type('#command-input', 'look')
        await page.keyboard.press('Enter')
        const output = await page.$eval('#terminal', el => el.textContent)
        expect(output).to.include('Starting Cave')
    })
})
```

## Test Pyramid

```
     /\
    /E2E\      <- Few, slow, comprehensive
   /------\
  /Integ-  \   <- Some, medium speed
 /----------\
/Unit Tests  \ <- Many, fast, focused
--------------
```

Current: ✅ Strong foundation with unit tests  
Next: 🔄 Add integration tests  
Future: 🎯 Add E2E tests for critical paths

## Running Different Test Levels

```bash
# Unit tests (current)
pnpm test:client

# Integration tests (future)
pnpm test:client:integration

# E2E tests (future)
pnpm test:client:e2e

# All client tests
pnpm test:client:all
```

## Recommended Next Steps

1. **Extract pure functions** from `client.js` into `client-logic.mjs`
2. **Write integration tests** for the extracted functions
3. **Add E2E tests** for critical user journeys:
   - Login and look around
   - Pick up an item
   - Move between rooms
   - Combat with an enemy

## Testing Best Practices

### ✅ Good Tests
- Test behavior, not implementation
- One assertion per test (generally)
- Clear test names describing behavior
- Independent tests (no shared state)

### ❌ Avoid
- Testing implementation details
- Brittle tests that break on refactoring
- Tests that depend on execution order
- Tests that require manual setup

## Resources

- [Mocha Documentation](https://mochajs.org/)
- [Chai Assertions](https://www.chaijs.com/)
- [JSDOM for Node Testing](https://github.com/jsdom/jsdom)
- [Testing Best Practices](https://testingjavascript.com/)
