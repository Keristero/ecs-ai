import { describe, it, beforeEach } from 'mocha'
import { expect } from 'chai'
import path from 'path'
import { initialize_game } from '../game_framework/framework.mjs'
import { tool_defs, resource_defs } from '../game_framework/ecs_interface.mjs'
import { addEntity, hasComponent } from 'bitecs'

describe('ECS Interface tools', () => {
    let game
    let position
    let eid

    beforeEach(async () => {
        process.env.GAME_LOGIC_FOLDER_PATH = path.resolve('./tests/fixtures')
        game = await initialize_game()
        position = game.world.components.Position
        eid = addEntity(game.world)
    })

    it('addComponent tool attaches component to entity', async () => {
        const response = await tool_defs.addComponent.run({
            game,
            eid,
            component_name: 'Position'
        })

        expect(response.content[0].text).to.contain("Added component 'Position'")
        expect(hasComponent(game.world, eid, position)).to.be.true
    })

    it('addComponentWithValues tool sets component data on entity', async () => {
        const response = await tool_defs.addComponentWithValues.run({
            game,
            eid,
            component_name: 'Position',
            component_values: { x: 10, y: 20 }
        })

        expect(response.content[0].text).to.contain("Added component 'Position'")
        expect(hasComponent(game.world, eid, position)).to.be.true
        expect(position.x[eid]).to.equal(10)
        expect(position.y[eid]).to.equal(20)
    })

    it('addComponentWithValues overwrites existing values with plain object input', async () => {
        // Seed initial values to confirm they get replaced
        position.x[eid] = -1
        position.y[eid] = -1

        await tool_defs.addComponentWithValues.run({
            game,
            eid,
            component_name: 'Position',
            component_values: { x: 5, y: -3 }
        })

        expect(position.x[eid]).to.equal(5)
        expect(position.y[eid]).to.equal(-3)
    })
})

describe('ECS Interface resources', () => {
    let game

    beforeEach(async () => {
        process.env.GAME_LOGIC_FOLDER_PATH = path.resolve('./tests/fixtures')
        game = await initialize_game()
    })

    it('listComponents resource returns all available components', async () => {
        const response = await resource_defs.listComponents.run({
            game
        })

        expect(response.content[0].text).to.contain("Available components:")
        expect(response.content[0].text).to.contain("Position")
        expect(response.content[0].text).to.contain("Health")
    })
})
