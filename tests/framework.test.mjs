import { describe, it, beforeEach } from 'mocha'
import { expect } from 'chai'
import { initialize_game } from '../game_framework/framework.mjs'
import { addEntity, addComponent, hasComponent, query } from 'bitecs'
import path from 'path'

describe('Game Framework', () => {
    beforeEach(async () => {
        // Seed environment with test fixtures before importing the framework module
        process.env.GAME_LOGIC_FOLDER_PATH = path.resolve('./tests/fixtures');
    })

    describe('initialize_game', () => {
        it('should initialize a game with world and components', async () => {
            const game = await initialize_game()
            
            // Verify basic game structure
            expect(game).to.have.property('world')
            expect(game).to.have.property('update')
            expect(game.world).to.have.property('components')
        })
    })
})