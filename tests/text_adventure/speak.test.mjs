import {expect} from 'chai'
import game from '../../examples/text_adventure_logic/game.mjs'
import speak from '../../examples/text_adventure_logic/actions/speak.mjs'
import move from '../../examples/text_adventure_logic/actions/move.mjs'

describe('Speak Action', function() {
    
    it('should allow player to speak in a room', function() {
        const result = speak(game, {
            playerId: game.playerId,
            dialogue: "Hello, is anyone there?"
        })
        
        expect(result.success).to.be.true
        expect(result.dialogue).to.equal("Hello, is anyone there?")
        expect(result.message).to.include('You say:')
        expect(result.message).to.include("Hello, is anyone there?")
    })
    
    it('should list entities with Ears that can hear', function() {
        // Move to Forest Path where the goblin is
        move(game, {playerId: game.playerId, direction: 'north'})
        
        const result = speak(game, {
            playerId: game.playerId,
            dialogue: "Greetings, creature!"
        })
        
        expect(result.success).to.be.true
        expect(result.listeners).to.be.an('array')
        expect(result.listenerCount).to.be.greaterThan(0)
        
        // Should have Goblin as listener
        const goblinListener = result.listeners.find(l => l.name === 'Goblin')
        expect(goblinListener).to.exist
        expect(goblinListener.name).to.equal('Goblin')
    })
    
    it('should not include the speaker in listeners', function() {
        const result = speak(game, {
            playerId: game.playerId,
            dialogue: "Talking to myself"
        })
        
        expect(result.success).to.be.true
        // Speaker should not be in listeners
        const selfListener = result.listeners.find(l => l.id === game.playerId)
        expect(selfListener).to.be.undefined
    })
    
    it('should handle empty room with no listeners', function() {
        // Move back to Starting Cave (no entities with Ears)
        move(game, {playerId: game.playerId, direction: 'south'})
        
        const result = speak(game, {
            playerId: game.playerId,
            dialogue: "Echo... echo..."
        })
        
        expect(result.success).to.be.true
        expect(result.listenerCount).to.equal(0)
        expect(result.listeners).to.be.an('array').that.is.empty
    })
    
    it('should include room context in result', function() {
        const result = speak(game, {
            playerId: game.playerId,
            dialogue: "Where am I?"
        })
        
        expect(result.success).to.be.true
        expect(result.roomId).to.be.a('number')
        expect(result.roomName).to.be.a('string')
        expect(result.speakerId).to.equal(game.playerId)
    })
})
