import { describe, it } from 'mocha'
import { expect } from 'chai'
import { createWorld, addEntity, addComponent, query, set } from 'bitecs'
import { initialize_game } from '../game_framework/framework.mjs'

describe('Move Action Tests', function () {
    let game

    beforeEach(async function () {
        // Create a game with the text adventure logic
        const gameLogicPath = './examples/text_adventure_logic/'
        game = await initialize_game(gameLogicPath)
        
        // Setup the world with initial entities
        const { setup_world } = await import('../examples/text_adventure_logic/setup_world.mjs')
        setup_world(game)
    })

    it('should successfully move player between connected rooms', async function () {
        const { world } = game
        const { Room, Player, Name } = world.components
        const { Has, ConnectsTo } = world.relations

        // Find the rooms
        const rooms = query(world, [Room])
        const room1 = rooms[0] // Starting Cave
        const room2 = rooms[1] // Forest Path

        // Create a player in room1
        const player = addEntity(world)
        addComponent(world, player, Player)
        addComponent(world, player, set(Name, { value: "Test Player" }))
        
        // Put player in room1
        addComponent(world, room1, Has(player))

        // Get the move action
        const moveAction = game.actions.move

        // Try to move north from room1 to room2
        const result = await moveAction.execute(game, {
            actor_eid: player,
            direction: 'north'
        })

        // Check that the action was successful
        expect(result.details.success).to.be.true
        expect(result.details.direction).to.equal('north')
        expect(result.details.from_room_eid).to.equal(room1)
        expect(result.details.to_room_eid).to.equal(room2)
    })

    it('should fail when trying to move in invalid direction', async function () {
        const { world } = game
        const { Room, Player, Name } = world.components
        const { Has } = world.relations

        // Find the rooms
        const rooms = query(world, [Room])
        const room1 = rooms[0] // Starting Cave

        // Create a player in room1
        const player = addEntity(world)
        addComponent(world, player, Player)
        addComponent(world, player, set(Name, { value: "Test Player" }))
        
        // Put player in room1
        addComponent(world, room1, Has(player))

        // Get the move action
        const moveAction = game.actions.move

        // Try to move in an invalid direction
        const result = await moveAction.execute(game, {
            actor_eid: player,
            direction: 'west'
        })

        // Check that the action failed with validation error
        expect(result.details.success).to.be.false
        expect(result.details.error).to.include('Invalid direction')
    })
})