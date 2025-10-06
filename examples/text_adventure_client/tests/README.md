# Text Adventure Client Tests

Unit tests for the text adventure game client logic.

## Running Tests

Run all client tests:
```bash
npm run test:client
# or
pnpm test:client
```

Run all tests (including server tests):
```bash
npm test
# or
pnpm test
```

## Test Coverage

### Command Parsing
- ✓ Parse simple commands (e.g., `look`)
- ✓ Parse commands with arguments (e.g., `move north`)
- ✓ Parse commands with multiple arguments
- ✓ Handle extra whitespace

### Autocomplete
- ✓ Filter commands by prefix
- ✓ Match multiple commands
- ✓ Return empty for no matches
- ✓ Case insensitive matching

### Direction Suggestions
- ✓ Suggest directions for move command
- ✓ Don't suggest directions for other commands

### Command History
- ✓ Add commands to history
- ✓ Maintain command order
- ✓ Navigate through history (up/down arrows)

### Room Data Parsing
- ✓ Parse room with items
- ✓ Parse room with enemies
- ✓ Handle empty room

### Action Parameters
- ✓ Extract direction parameter
- ✓ Parse item ID as integer
- ✓ Detect invalid item ID
- ✓ Detect missing parameters

### API Request Building
- ✓ Build request with player ID
- ✓ Build request with action parameters
- ✓ Build request for pickup action

### Response Handling
- ✓ Detect successful response
- ✓ Detect failed response
- ✓ Extract error message
- ✓ Detect room update

### DOM Output Formatting
- ✓ Format entity with name and ID
- ✓ Format entity without name
- ✓ Format room header
- ✓ Format room header without name

### Input Validation
- ✓ Reject empty input
- ✓ Accept valid input
- ✓ Validate command exists
- ✓ Reject invalid command

## Test Framework

- **Mocha**: Test runner
- **Chai**: Assertion library
- **JSDOM**: DOM environment for testing

## Adding New Tests

1. Create test files in `examples/text_adventure_client/tests/`
2. Use `.test.mjs` extension
3. Import test utilities:
   ```javascript
   import { describe, it, beforeEach, afterEach } from 'mocha'
   import { expect } from 'chai'
   ```
4. Group related tests using `describe()` blocks
5. Write individual test cases with `it()`

## Example Test

```javascript
describe('Command Parsing', () => {
    it('should parse simple commands', () => {
        const input = 'look'
        const [command, ...args] = input.split(/\s+/)
        expect(command).to.equal('look')
        expect(args).to.be.empty
    })
})
```

## CI/CD Integration

These tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: pnpm test:client
```
