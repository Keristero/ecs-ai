import {expect} from 'chai'
import game from '../../examples/text_adventure_logic/game.mjs'
import speak from '../../examples/text_adventure_logic/actions/speak.mjs'
import move from '../../examples/text_adventure_logic/actions/move.mjs'

describe('Speak Action', function() {
    
    it('should allow player to speak in a room', function() {
        const event = speak(game, {
            playerId: game.playerId,
            dialogue: "Hello, is anyone there?"
        })
        
        expect(event.action.success).to.be.true
        expect(event.action.details.dialogue).to.equal("Hello, is anyone there?")
        expect(event.action.details.message).to.include('You say:')
        expect(event.action.details.message).to.include("Hello, is anyone there?")
        expect(event.action.room_eid).to.be.a('number')
    })
    
    it('should include room and actor context in speak event', function() {
        const speakEvent = speak(game, {
            playerId: game.playerId,
            dialogue: "Where am I?"
        })
        
        expect(speakEvent.action.success).to.be.true
        expect(speakEvent.action.room_eid).to.be.a('number')
        expect(speakEvent.action.actor_eid).to.equal(game.playerId)
        expect(speakEvent.action.details.dialogue).to.equal("Where am I?")
    })
})
