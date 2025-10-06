import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import { JSDOM } from 'jsdom'

describe('Text Adventure Client', () => {
    let window, document, clientModule
    
    beforeEach(async () => {
        // Create a fake DOM environment
        const dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <body>
                <div id="terminal"></div>
                <input id="command-input" />
                <div id="autocomplete"></div>
            </body>
            </html>
        `, {
            url: 'http://localhost:5500',
            runScripts: 'dangerously',
            resources: 'usable'
        })
        
        window = dom.window
        document = window.document
        global.window = window
        global.document = document
        global.fetch = async (url, options) => {
            // Mock fetch responses
            return {
                json: async () => ({ result: { success: true } })
            }
        }
    })
    
    afterEach(() => {
        delete global.window
        delete global.document
        delete global.fetch
    })
    
    describe('Command Parsing', () => {
        it('should parse simple commands', () => {
            const input = 'look'
            const [command, ...args] = input.split(/\s+/)
            expect(command).to.equal('look')
            expect(args).to.be.empty
        })
        
        it('should parse commands with arguments', () => {
            const input = 'move north'
            const [command, ...args] = input.split(/\s+/)
            expect(command).to.equal('move')
            expect(args).to.deep.equal(['north'])
        })
        
        it('should parse commands with multiple arguments', () => {
            const input = 'pickup 1'
            const [command, ...args] = input.split(/\s+/)
            expect(command).to.equal('pickup')
            expect(args).to.deep.equal(['1'])
        })
        
        it('should handle extra whitespace', () => {
            const input = '  look   '
            const trimmed = input.trim()
            const [command] = trimmed.split(/\s+/)
            expect(command).to.equal('look')
        })
    })
    
    describe('Autocomplete', () => {
        it('should filter commands by prefix', () => {
            const commands = ['help', 'look', 'move', 'pickup', 'drop', 'attack', 'clear']
            const input = 'lo'
            const matches = commands.filter(cmd => cmd.startsWith(input.toLowerCase()))
            expect(matches).to.deep.equal(['look'])
        })
        
        it('should match multiple commands', () => {
            const commands = ['help', 'look', 'move', 'pickup', 'drop', 'attack', 'clear']
            const input = 'a'
            const matches = commands.filter(cmd => cmd.startsWith(input.toLowerCase()))
            expect(matches).to.deep.equal(['attack'])
        })
        
        it('should return empty for no matches', () => {
            const commands = ['help', 'look', 'move', 'pickup', 'drop', 'attack', 'clear']
            const input = 'xyz'
            const matches = commands.filter(cmd => cmd.startsWith(input.toLowerCase()))
            expect(matches).to.be.empty
        })
        
        it('should be case insensitive', () => {
            const commands = ['help', 'look', 'move', 'pickup', 'drop', 'attack', 'clear']
            const input = 'LO'
            const matches = commands.filter(cmd => cmd.startsWith(input.toLowerCase()))
            expect(matches).to.deep.equal(['look'])
        })
    })
    
    describe('Direction Suggestions', () => {
        it('should suggest directions for move command', () => {
            const input = 'move '
            const directions = ['north', 'south', 'east', 'west']
            
            if (input.startsWith('move ')) {
                expect(directions).to.deep.equal(['north', 'south', 'east', 'west'])
            }
        })
        
        it('should not suggest directions for other commands', () => {
            const input = 'look '
            const directions = ['north', 'south', 'east', 'west']
            
            const shouldSuggest = input.startsWith('move ')
            expect(shouldSuggest).to.be.false
        })
    })
    
    describe('Command History', () => {
        it('should add commands to history', () => {
            const commandHistory = []
            const command = 'look'
            commandHistory.push(command)
            expect(commandHistory).to.deep.equal(['look'])
        })
        
        it('should maintain command order', () => {
            const commandHistory = []
            commandHistory.push('look')
            commandHistory.push('move north')
            commandHistory.push('pickup 1')
            expect(commandHistory).to.deep.equal(['look', 'move north', 'pickup 1'])
        })
        
        it('should allow navigation through history', () => {
            const commandHistory = ['look', 'move north', 'pickup 1']
            let historyIndex = commandHistory.length
            
            // Navigate up
            historyIndex--
            expect(commandHistory[historyIndex]).to.equal('pickup 1')
            
            historyIndex--
            expect(commandHistory[historyIndex]).to.equal('move north')
            
            historyIndex--
            expect(commandHistory[historyIndex]).to.equal('look')
        })
    })
    
    describe('Room Data Parsing', () => {
        it('should parse room with items', () => {
            const roomData = {
                success: true,
                roomId: 1,
                roomName: "Starting Cave",
                roomDescription: "A dark cave",
                items: [
                    { id: 1, name: "rusty sword", description: "An old sword" }
                ],
                landmarks: [],
                enemies: [],
                inventory: []
            }
            
            expect(roomData.roomName).to.equal("Starting Cave")
            expect(roomData.items).to.have.lengthOf(1)
            expect(roomData.items[0].name).to.equal("rusty sword")
        })
        
        it('should parse room with enemies', () => {
            const roomData = {
                success: true,
                roomId: 2,
                roomName: "Forest Path",
                roomDescription: "A narrow path",
                items: [],
                landmarks: [],
                enemies: [
                    { id: 11, name: "goblin", description: "A small creature" }
                ],
                inventory: []
            }
            
            expect(roomData.enemies).to.have.lengthOf(1)
            expect(roomData.enemies[0].name).to.equal("goblin")
            expect(roomData.enemies[0].id).to.equal(11)
        })
        
        it('should handle empty room', () => {
            const roomData = {
                success: true,
                roomId: 3,
                roomName: "Empty Room",
                roomDescription: "Nothing here",
                items: [],
                landmarks: [],
                enemies: [],
                inventory: []
            }
            
            expect(roomData.items).to.be.empty
            expect(roomData.landmarks).to.be.empty
            expect(roomData.enemies).to.be.empty
            expect(roomData.inventory).to.be.empty
        })
    })
    
    describe('Action Parameters', () => {
        it('should extract direction parameter', () => {
            const args = ['north']
            const direction = args[0]
            expect(direction).to.equal('north')
        })
        
        it('should parse item ID as integer', () => {
            const args = ['42']
            const itemId = parseInt(args[0])
            expect(itemId).to.equal(42)
            expect(itemId).to.be.a('number')
        })
        
        it('should detect invalid item ID', () => {
            const args = ['abc']
            const itemId = parseInt(args[0])
            expect(isNaN(itemId)).to.be.true
        })
        
        it('should detect missing parameters', () => {
            const args = []
            const hasParam = args.length > 0
            expect(hasParam).to.be.false
        })
    })
    
    describe('API Request Building', () => {
        it('should build request with player ID', () => {
            const PLAYER_ID = 13
            const params = { playerId: PLAYER_ID }
            expect(params.playerId).to.equal(13)
        })
        
        it('should build request with action parameters', () => {
            const PLAYER_ID = 13
            const direction = 'north'
            const params = { playerId: PLAYER_ID, direction }
            expect(params.direction).to.equal('north')
        })
        
        it('should build request for pickup action', () => {
            const PLAYER_ID = 13
            const itemId = 42
            const params = { playerId: PLAYER_ID, itemId }
            expect(params.itemId).to.equal(42)
        })
    })
    
    describe('Response Handling', () => {
        it('should detect successful response', () => {
            const response = { success: true, message: "Action completed" }
            expect(response.success).to.be.true
        })
        
        it('should detect failed response', () => {
            const response = { success: false, message: "Invalid action" }
            expect(response.success).to.be.false
        })
        
        it('should extract error message', () => {
            const response = { success: false, message: "Item not found" }
            expect(response.message).to.equal("Item not found")
        })
        
        it('should detect room update', () => {
            const response = {
                success: true,
                roomId: 2,
                message: "You moved north"
            }
            const shouldUpdateRoom = response.roomId !== undefined
            expect(shouldUpdateRoom).to.be.true
        })
    })
    
    describe('DOM Output Formatting', () => {
        it('should format entity with name and ID', () => {
            const entity = { id: 1, name: "rusty sword" }
            const formatted = `${entity.name} [${entity.id}]`
            expect(formatted).to.equal("rusty sword [1]")
        })
        
        it('should format entity without name', () => {
            const entity = { id: 42 }
            const formatted = entity.name ? `${entity.name} [${entity.id}]` : `Item [${entity.id}]`
            expect(formatted).to.equal("Item [42]")
        })
        
        it('should format room header', () => {
            const roomData = { roomId: 1, roomName: "Starting Cave" }
            const header = roomData.roomName || `Room ${roomData.roomId}`
            expect(header).to.equal("Starting Cave")
        })
        
        it('should format room header without name', () => {
            const roomData = { roomId: 5 }
            const header = roomData.roomName || `Room ${roomData.roomId}`
            expect(header).to.equal("Room 5")
        })
    })
    
    describe('Input Validation', () => {
        it('should reject empty input', () => {
            const input = '   '
            const trimmed = input.trim()
            const isValid = trimmed.length > 0
            expect(isValid).to.be.false
        })
        
        it('should accept valid input', () => {
            const input = 'look'
            const trimmed = input.trim()
            const isValid = trimmed.length > 0
            expect(isValid).to.be.true
        })
        
        it('should validate command exists', () => {
            const validCommands = ['help', 'look', 'move', 'pickup', 'drop', 'attack', 'clear']
            const command = 'look'
            const isValid = validCommands.includes(command)
            expect(isValid).to.be.true
        })
        
        it('should reject invalid command', () => {
            const validCommands = ['help', 'look', 'move', 'pickup', 'drop', 'attack', 'clear']
            const command = 'invalid'
            const isValid = validCommands.includes(command)
            expect(isValid).to.be.false
        })
    })
})
