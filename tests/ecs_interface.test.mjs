import { describe, it, beforeEach } from 'mocha'
import { expect } from 'chai'
import path from 'path'
import { initialize_game } from '../game_framework/framework.mjs'
import { tool_defs } from '../game_framework/ecs_interface.mjs'
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
            component_values: [
                { field: 'x', value: 10 },
                { field: 'y', value: 20 }
            ]
        })

        expect(response.content[0].text).to.contain("Added component 'Position'")
        expect(hasComponent(game.world, eid, position)).to.be.true
        expect(position.x[eid]).to.equal(10)
        expect(position.y[eid]).to.equal(20)
    })

    it('addComponentWithValues overwrites existing values with array input', async () => {
        // Seed initial values to confirm they get replaced
        position.x[eid] = -1
        position.y[eid] = -1

        await tool_defs.addComponentWithValues.run({
            game,
            eid,
            component_name: 'Position',
            component_values: [
                { field: 'x', value: 5 },
                { field: 'y', value: -3 }
            ]
        })

        expect(position.x[eid]).to.equal(5)
        expect(position.y[eid]).to.equal(-3)
    })

    it('addComponentWithValues accepts array-form component assignments', async () => {
        await tool_defs.addComponentWithValues.run({
            game,
            eid,
            component_name: 'Position',
            component_values: [
                { field: 'x', value: 12 },
                { field: 'y', value: 34 }
            ]
        })

        expect(position.x[eid]).to.equal(12)
        expect(position.y[eid]).to.equal(34)
    })

    it('listComponents tool returns all available components', async () => {
        const response = await tool_defs.listComponents.run({
            game
        })

        expect(response.content[0].text).to.contain("Available components:")
        expect(response.content[0].text).to.contain("Position")
        expect(response.content[0].text).to.contain("Health")
    })
})
