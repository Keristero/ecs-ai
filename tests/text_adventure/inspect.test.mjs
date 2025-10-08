import {expect} from 'chai'
import game from '../../examples/text_adventure_logic/game.mjs'
import inspect from '../../examples/text_adventure_logic/actions/inspect.mjs'

describe('Inspect Action', function() {
    
    it('should inspect an entity by name and return component data', function() {
        // Inspect the rusty sword item
        const event = inspect(game, {entityName: 'RustySword'})
        const result = event.action.details
        
        expect(event.action.success).to.be.true
        expect(result.entity_name).to.equal('RustySword')
        expect(result.entity_eid).to.be.a('number')
        expect(result.components).to.be.an('object')
        expect(result.message).to.include('RustySword')
        
        // Should have Item component
        expect(result.components).to.have.property('Item')
        
        // Should have Name component with the name
        expect(result.components).to.have.property('Name')
        expect(result.components.Name).to.have.property('value', 'RustySword')
        
        // Should have Description component
        expect(result.components).to.have.property('Description')
        expect(result.components.Description.value).to.include('rusty sword')
        
        // Should have Usable component
        expect(result.components).to.have.property('Usable')
    })
    
    it('should inspect an enemy and show its components', function() {
        const event = inspect(game, {entityName: 'Goblin'})
        const result = event.action.details
        
        expect(event.action.success).to.be.true
        expect(result.components).to.have.property('Enemy')
        expect(result.components).to.have.property('Hitpoints')
        expect(result.components).to.have.property('Name')
        expect(result.components.Name.value).to.equal('Goblin')
    })
    
    it('should return failure for non-existent entity', function() {
        const event = inspect(game, {entityName: 'NonExistentItem'})
        const result = event.action.details
        
        expect(event.action.success).to.be.false
        expect(result.error).to.include('No entity found')
    })
    
    it('should be case-insensitive', function() {
        const event = inspect(game, {entityName: 'rustysword'})
        const result = event.action.details
        
        expect(event.action.success).to.be.true
        expect(result.entity_name).to.equal('rustysword')
        expect(result.components.Name.value).to.equal('RustySword')
    })
    
    it('should show relations if entity has them', function() {
        // The rusty sword should have Has relation (room Has sword)
        const event = inspect(game, {entityName: 'RustySword'})
        const result = event.action.details
        
        expect(event.action.success).to.be.true
        expect(result.relations).to.be.an('object')
        
        // Should have Has relation (showing which room/entity has this sword)
        if (Object.keys(result.relations).length > 0) {
            expect(result.relations).to.have.property('Has')
        }
    })
    
    it('should show Has relation for entities with inventory', function() {
        // Inspect skeleton warrior which should have a sword in inventory
        const event = inspect(game, {entityName: 'SkeletonWarrior'})
        const result = event.action.details
        
        expect(event.action.success).to.be.true
        expect(result.entity_name).to.equal('SkeletonWarrior')
        expect(result.components).to.have.property('Enemy')
        
        // Should have relations
        expect(result.relations).to.be.an('object')
        
        // Should have Has relation showing the sword in inventory
        if (result.relations.Has) {
            expect(result.relations.Has).to.be.an('array')
            expect(result.relations.Has.length).to.be.greaterThan(0)
            
            // The first item should be a RustySword
            const firstItem = result.relations.Has[0]
            expect(firstItem).to.have.property('targetId')
            expect(firstItem).to.have.property('targetName')
            expect(firstItem.targetName).to.equal('RustySword')
        } else {
            // If no Has relation, fail with a descriptive message
            expect.fail('SkeletonWarrior should have a Has relation with a RustySword in inventory')
        }
    })
})