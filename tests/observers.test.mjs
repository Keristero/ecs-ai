#!/usr/bin/env node
/**
 * Test script for CreateRelation and CreateComponent observers
 * Tests that observers are set up correctly and can be read back using helper functions
 */

import {createWorld, addEntity, addComponent, hasComponent, query, set, IsA, Wildcard} from 'bitecs'
import {CreateComponent, CreateRelation} from '../game_framework/create_component.mjs'
import {z} from 'zod'
import {expect} from 'chai'
import {get_components_for_entity, get_all_components_and_relations, get_relation_data_for_entity, get_all_components_for_entity, entity_has_relation, get_all_relations_for_entity, get_relation_targets_with_data} from '../examples/text_adventure_logic/helpers.mjs'

describe('CreateComponent and CreateRelation Observer Tests', function() {
    let world

    // Helper to create a test world with string store (mirrors framework setup)
    function createTestWorld() {
        const world = createWorld()
        
        // Initialize string store like in framework.mjs
        const stringStore = []
        const addString = (str) => {
            const index = stringStore.length
            stringStore.push(str)
            return index
        }
        const getString = (index) => stringStore[index] || ''
        
        world.string_store = {
            getString,
            addString,
            store: stringStore
        }

        world.components = {}
        world.relations = {}
        
        return world
    }

    // Test fixture setup that mirrors the current game structure
    function setupTestFixture() {
        const world = createTestWorld()
        
        // Create components (mirrors text_adventure_components.mjs)
        const componentDefs = {
            Room: CreateComponent(),
            Landmark: CreateComponent(),
            Player: CreateComponent(z.object({
                respawnRoom: z.number().int().nonnegative()
            })),
            Name: CreateComponent(z.object({
                value: z.string()
            })),
            Description: CreateComponent(z.object({
                value: z.string()
            })),
            Hitpoints: CreateComponent(z.object({
                max: z.number().int().positive(),
                current: z.number().int().nonnegative()
            })),
            Item: CreateComponent(),
            Enemy: CreateComponent()
        }
        
        // Create relations (mirrors text_adventure_relations.mjs)
        const relationDefs = {
            Has: CreateRelation({}),
            ConnectsTo: CreateRelation({}, z.object({
                direction: z.string()
            }))
        }
        
        // Enable observers for all components and relations
        for(const name in componentDefs) {
            world.components[name] = componentDefs[name].data
            componentDefs[name].enableObservers(world)
        }
        
        for(const name in relationDefs) {
            world.relations[name] = relationDefs[name].data
            if(relationDefs[name].enableObservers) {
                relationDefs[name].enableObservers(world)
                // Update reference after observers are enabled (may be wrapped)
                world.relations[name] = relationDefs[name].data
            }
        }
        
        // Create some basic prefabs
        const prefabs = {
            rusty_sword: addEntity(world),
            health_potion: addEntity(world)
        }
        
        // Add components to prefabs to make them templates  
        const {Item, Name, Description} = world.components
        
        addComponent(world, prefabs.rusty_sword, Item)
        addComponent(world, prefabs.rusty_sword, set(Name, {value: "rusty sword"}))
        addComponent(world, prefabs.rusty_sword, set(Description, {value: "A weathered blade with rust spots"}))
        
        addComponent(world, prefabs.health_potion, Item)
        addComponent(world, prefabs.health_potion, set(Name, {value: "health potion"}))
        addComponent(world, prefabs.health_potion, set(Description, {value: "A red liquid in a small vial"}))
        
        world.prefabs = prefabs
        return world
    }

    // Helper functions to reduce duplication
    function createRoom(name, description) {
        const {Room, Name, Description} = world.components
        const room = addEntity(world)
        addComponent(world, room, Room)
        addComponent(world, room, set(Name, {value: name}))
        addComponent(world, room, set(Description, {value: description}))
        return room
    }

    function createPlayer(respawnRoom) {
        const {Player, Name, Hitpoints} = world.components
        const player = addEntity(world)
        addComponent(world, player, set(Player, {respawnRoom}))
        addComponent(world, player, set(Name, {value: "Hero"}))
        addComponent(world, player, set(Hitpoints, {max: 100, current: 100}))
        return player
    }

    function connectRooms(room1, room2, direction1, direction2) {
        const {ConnectsTo} = world.relations
        addComponent(world, room1, set(ConnectsTo(room2), {direction: direction1}))
        addComponent(world, room2, set(ConnectsTo(room1), {direction: direction2}))
    }

    beforeEach(() => {
        world = setupTestFixture()
    })

    describe('CreateComponent Observer Tests', function() {
        it('should handle string field components', function() {
            const room = createRoom("Test Room", "A test room for testing")
            
            const roomComponents = get_components_for_entity(world, room, ['Room', 'Name', 'Description'])
            expect(roomComponents.Name.value).to.equal('Test Room')
            expect(roomComponents.Description.value).to.equal('A test room for testing')
        })

        it('should handle number field components', function() {
            const {Player, Hitpoints} = world.components
            const player = addEntity(world)
            addComponent(world, player, set(Player, {respawnRoom: 1}))
            addComponent(world, player, set(Hitpoints, {max: 100, current: 85}))
            
            const playerComponents = get_components_for_entity(world, player, ['Player', 'Hitpoints'])
            expect(playerComponents.Player.respawnRoom).to.equal(1)
            expect(playerComponents.Hitpoints.max).to.equal(100)
            expect(playerComponents.Hitpoints.current).to.equal(85)
        })

        it('should handle components without schema fields', function() {
            const {Item} = world.components
            const item = addEntity(world)
            addComponent(world, item, Item)
            
            const itemComponents = get_components_for_entity(world, item, ['Item'])
            expect(itemComponents).to.have.property('Item')
        })

        it('should handle mixed component types', function() {
            const {Enemy, Name, Hitpoints} = world.components
            const enemy = addEntity(world)
            addComponent(world, enemy, Enemy)
            addComponent(world, enemy, set(Name, {value: "Goblin"}))
            addComponent(world, enemy, set(Hitpoints, {max: 50, current: 50}))
            
            const enemyComponents = get_components_for_entity(world, enemy, ['Enemy', 'Name', 'Hitpoints'])
            expect(enemyComponents.Name.value).to.equal('Goblin')
            expect(enemyComponents.Hitpoints.max).to.equal(50)
            expect(enemyComponents.Hitpoints.current).to.equal(50)
        })
    })

    describe('CreateRelation Observer Tests', function() {
        it('should handle relations without data', function() {
            const {Has} = world.relations
            const room = addEntity(world)
            const item = addEntity(world)
            
            addComponent(world, room, Has(item))
            
            expect(hasComponent(world, room, Has(item))).to.be.true
            const roomData = get_all_components_and_relations(world, room)
            expect(roomData).to.have.property('Has')
        })

        it('should handle relations with string data', function() {
            const {ConnectsTo} = world.relations
            const room1 = addEntity(world)
            const room2 = addEntity(world)
            
            addComponent(world, room1, set(ConnectsTo(room2), {direction: "north"}))
            
            const direction = world.string_store.getString(ConnectsTo(room2).direction[room1])
            expect(direction).to.equal("north")
            
            const roomData = get_all_components_and_relations(world, room1)
            expect(roomData).to.have.property('ConnectsTo')
        })

        it('should handle bidirectional relations', function() {
            const room1 = createRoom("Room 1", "First room")
            const room2 = createRoom("Room 2", "Second room")
            
            connectRooms(room1, room2, "north", "south")
            
            const {ConnectsTo} = world.relations
            const northDirection = world.string_store.getString(ConnectsTo(room2).direction[room1])
            const southDirection = world.string_store.getString(ConnectsTo(room1).direction[room2])
            
            expect(northDirection).to.equal("north")
            expect(southDirection).to.equal("south")
        })

        it('should work with wildcard queries', function() {
            const {Has, ConnectsTo} = world.relations
            const room1 = addEntity(world)
            const room2 = addEntity(world)
            const item1 = addEntity(world)
            const item2 = addEntity(world)
            
            // Create Has relations
            addComponent(world, room1, Has(item1))
            addComponent(world, room2, Has(item2))
            
            // Create ConnectsTo relation
            addComponent(world, room1, set(ConnectsTo(room2), {direction: "north"}))
            
            const entitiesWithHas = query(world, [Has(Wildcard)])
            const entitiesWithConnectsTo = query(world, [ConnectsTo(Wildcard)])
            
            expect(entitiesWithHas).to.have.lengthOf(2)
            expect(entitiesWithHas).to.include(room1)
            expect(entitiesWithHas).to.include(room2)
            
            expect(entitiesWithConnectsTo).to.have.lengthOf(1)
            expect(entitiesWithConnectsTo).to.include(room1)
        })
    })

    describe('Helper Functions Integration Tests', function() {
        it('should return components and relations for an entity', function() {
            const {Has} = world.relations
            const room = createRoom("Starting Cave", "A dark, damp cave")
            const item = addEntity(world)
            
            addComponent(world, room, Has(item))
            const roomData = get_all_components_and_relations(world, room)
            
            expect(roomData).to.have.property('Room')
            expect(roomData).to.have.property('Name')
            expect(roomData).to.have.property('Description')
            expect(roomData).to.have.property('Has')
            expect(roomData.Name.value).to.equal('Starting Cave')
            expect(roomData.Description.value).to.equal('A dark, damp cave')
        })

        it('should work in a complete world setup mirroring setup_world.mjs', function() {
            const {Room, Landmark, Name, Description} = world.components
            const {Has, ConnectsTo} = world.relations
            
            // Create rooms exactly like setup_world.mjs
            const room1 = createRoom("Starting Cave", "A dark, damp cave with rough stone walls.")
            const room2 = createRoom("Forest Path", "A narrow path through a dense forest.")
            const room3 = createRoom("Ancient Ruins", "Crumbling stone structures covered in moss.")
            
            // Create connections exactly like setup_world.mjs
            connectRooms(room1, room2, "north", "south")
            connectRooms(room2, room3, "east", "west")
            
            // Create landmarks exactly like setup_world.mjs
            const landmark1 = addEntity(world)
            addComponent(world, landmark1, Landmark)
            addComponent(world, landmark1, set(Name, {value: "ancient altar"}))
            addComponent(world, room3, Has(landmark1))
            
            // Create items using prefabs exactly like setup_world.mjs
            const item1 = addEntity(world)
            addComponent(world, item1, IsA(world.prefabs.rusty_sword))
            addComponent(world, room1, Has(item1))
            
            const item2 = addEntity(world)
            addComponent(world, item2, IsA(world.prefabs.health_potion))
            addComponent(world, room2, Has(item2))
            
            // Verify everything was set up correctly
            const room1Data = get_all_components_and_relations(world, room1)
            expect(room1Data.Name.value).to.equal("Starting Cave")
            expect(room1Data).to.have.property('ConnectsTo')
            expect(room1Data).to.have.property('Has')
            
            const room3Data = get_all_components_and_relations(world, room3)
            expect(room3Data.Name.value).to.equal("Ancient Ruins")
            expect(room3Data).to.have.property('ConnectsTo')
            expect(room3Data).to.have.property('Has')
            
            // Test queries work
            const entitiesWithHas = query(world, [Has(Wildcard)])
            expect(entitiesWithHas).to.include(room1)
            expect(entitiesWithHas).to.include(room2)
            expect(entitiesWithHas).to.include(room3)
        })

        it('should handle edge cases for get_components_for_entity', function() {
            const {Name} = world.components
            const entity = addEntity(world)
            addComponent(world, entity, set(Name, {value: "Test"}))
            
            // Empty component list
            const emptyResult = get_components_for_entity(world, entity, [])
            expect(Object.keys(emptyResult)).to.have.length(0)
            
            // Non-existent component
            const mixedResult = get_components_for_entity(world, entity, ['Name', 'NonExistent'])
            expect(mixedResult.Name.value).to.equal('Test')
            expect(mixedResult.NonExistent).to.be.undefined
        })
    })

    describe('get_relation_data_for_entity Tests', function() {
        it('should return empty object when entity has no relations', function() {
            const room = createRoom("Empty Room", "A room with no connections")
            
            const relationData = get_relation_data_for_entity(world, room)
            expect(relationData).to.deep.equal({})
        })

        it('should return ConnectsTo relation data with proper direction', function() {
            const room1 = createRoom("Room 1", "First room")
            const room2 = createRoom("Room 2", "Second room")
            
            connectRooms(room1, room2, "north", "south")
            
            const relationData = get_relation_data_for_entity(world, room1, ['ConnectsTo'])
            
            expect(relationData).to.have.property('ConnectsTo')
            expect(relationData.ConnectsTo).to.have.property(room2.toString())
            expect(relationData.ConnectsTo[room2.toString()]).to.deep.equal({direction: "north"})
        })

        it('should return Has relation data', function() {
            const {Has} = world.relations
            const room = createRoom("Test Room", "A test room")
            const item1 = addEntity(world)
            const item2 = addEntity(world)
            
            addComponent(world, room, Has(item1))
            addComponent(world, room, Has(item2))
            

            
            const relationData = get_relation_data_for_entity(world, room, ['Has'])
            
            expect(relationData).to.have.property('Has')
            expect(relationData.Has).to.have.property(item1.toString())
            expect(relationData.Has).to.have.property(item2.toString())
            expect(relationData.Has[item1.toString()]).to.deep.equal({})
            expect(relationData.Has[item2.toString()]).to.deep.equal({})
        })

        it('should return multiple relation types when requested', function() {
            const {Has} = world.relations
            const room1 = createRoom("Multi Room", "A room with multiple relations")
            const room2 = createRoom("Connected Room", "Connected to multi room")
            const item = addEntity(world)
            
            // Add both ConnectsTo and Has relations
            connectRooms(room1, room2, "east", "west")
            addComponent(world, room1, Has(item))
            
            const relationData = get_relation_data_for_entity(world, room1, ['ConnectsTo', 'Has'])
            
            expect(relationData).to.have.property('ConnectsTo')
            expect(relationData).to.have.property('Has')
            expect(relationData.ConnectsTo[room2.toString()]).to.deep.equal({direction: "east"})
            expect(relationData.Has[item.toString()]).to.deep.equal({})
        })

        it('should return all relations when no relation names specified', function() {
            const {Has} = world.relations
            const room1 = createRoom("All Relations Room", "A room to test all relations")
            const room2 = createRoom("Target Room", "Target for connection")
            const item = addEntity(world)
            
            // Add both types of relations
            connectRooms(room1, room2, "southwest", "northeast")
            addComponent(world, room1, Has(item))
            
            const relationData = get_relation_data_for_entity(world, room1) // No relation names specified
            
            expect(relationData).to.have.property('ConnectsTo')
            expect(relationData).to.have.property('Has')
            expect(relationData.ConnectsTo[room2.toString()]).to.deep.equal({direction: "southwest"})
            expect(relationData.Has[item.toString()]).to.deep.equal({})
        })

        it('should handle multiple connections from the same room', function() {
            const room1 = createRoom("Central Room", "A room with multiple exits")
            const room2 = createRoom("North Room", "To the north")
            const room3 = createRoom("South Room", "To the south")
            const room4 = createRoom("East Room", "To the east")
            
            // Connect room1 to multiple rooms
            connectRooms(room1, room2, "north", "south")
            connectRooms(room1, room3, "south", "north")
            connectRooms(room1, room4, "east", "west")
            
            const relationData = get_relation_data_for_entity(world, room1, ['ConnectsTo'])
            
            expect(relationData).to.have.property('ConnectsTo')
            expect(Object.keys(relationData.ConnectsTo)).to.have.lengthOf(3)
            expect(relationData.ConnectsTo[room2.toString()]).to.deep.equal({direction: "north"})
            expect(relationData.ConnectsTo[room3.toString()]).to.deep.equal({direction: "south"})
            expect(relationData.ConnectsTo[room4.toString()]).to.deep.equal({direction: "east"})
        })

        it('should handle non-existent relation names gracefully', function() {
            const room = createRoom("Test Room", "A test room")
            
            const relationData = get_relation_data_for_entity(world, room, ['NonExistentRelation'])
            expect(relationData).to.deep.equal({})
        })

        it('should handle mixed existing and non-existing relation names', function() {
            const {Has} = world.relations
            const room = createRoom("Mixed Test Room", "A room for mixed testing")
            const item = addEntity(world)
            
            addComponent(world, room, Has(item))
            
            const relationData = get_relation_data_for_entity(world, room, ['Has', 'NonExistent', 'ConnectsTo'])
            
            expect(relationData).to.have.property('Has')
            expect(relationData.Has[item.toString()]).to.deep.equal({})
            expect(relationData).to.not.have.property('NonExistent')
            expect(relationData).to.not.have.property('ConnectsTo')
        })

        it('should work with the complete world setup matching setup_world.mjs', function() {
            // Recreate the exact setup from setup_world.mjs
            const {Room, Landmark, Name, Description} = world.components
            const {Has, ConnectsTo} = world.relations
            
            const room1 = createRoom("Starting Cave", "A dark, damp cave with rough stone walls.")
            const room2 = createRoom("Forest Path", "A narrow path through a dense forest.")
            const room3 = createRoom("Ancient Ruins", "Crumbling stone structures covered in moss.")
            
            // Create connections exactly like setup_world.mjs
            connectRooms(room1, room2, "north", "south")
            connectRooms(room2, room3, "east", "west")
            
            // Create landmarks and items
            const landmark1 = addEntity(world)
            addComponent(world, landmark1, Landmark)
            addComponent(world, landmark1, set(Name, {value: "ancient altar"}))
            addComponent(world, room3, Has(landmark1))
            
            const item1 = addEntity(world)
            addComponent(world, item1, IsA(world.prefabs.rusty_sword))
            addComponent(world, room1, Has(item1))
            
            const item2 = addEntity(world)
            addComponent(world, item2, IsA(world.prefabs.health_potion))
            addComponent(world, room2, Has(item2))
            
            // Test room1 (Starting Cave) - should have ConnectsTo room2 and Has item1
            const room1Relations = get_relation_data_for_entity(world, room1)
            expect(room1Relations).to.have.property('ConnectsTo')
            expect(room1Relations).to.have.property('Has')
            expect(room1Relations.ConnectsTo[room2.toString()]).to.deep.equal({direction: "north"})
            expect(room1Relations.Has[item1.toString()]).to.deep.equal({})
            
            // Test room2 (Forest Path) - should connect to both room1 and room3, and have item2
            const room2Relations = get_relation_data_for_entity(world, room2)
            expect(room2Relations).to.have.property('ConnectsTo')
            expect(room2Relations).to.have.property('Has')
            expect(Object.keys(room2Relations.ConnectsTo)).to.have.lengthOf(2)
            expect(room2Relations.ConnectsTo[room1.toString()]).to.deep.equal({direction: "south"})
            expect(room2Relations.ConnectsTo[room3.toString()]).to.deep.equal({direction: "east"})
            expect(room2Relations.Has[item2.toString()]).to.deep.equal({})
            
            // Test room3 (Ancient Ruins) - should connect to room2 and have landmark1
            const room3Relations = get_relation_data_for_entity(world, room3)
            expect(room3Relations).to.have.property('ConnectsTo')
            expect(room3Relations).to.have.property('Has')
            expect(room3Relations.ConnectsTo[room2.toString()]).to.deep.equal({direction: "west"})
            expect(room3Relations.Has[landmark1.toString()]).to.deep.equal({})
        })
    })

    describe('Utility Functions Tests', function() {
        it('get_all_components_for_entity should return all components for an entity', function() {
            const room = createRoom("Test Room", "A room for testing components")
            
            const components = get_all_components_for_entity(world, room)
            
            expect(components).to.have.property('Room')
            expect(components).to.have.property('Name')
            expect(components).to.have.property('Description')
            expect(components.Name.value).to.equal('Test Room')
            expect(components.Description.value).to.equal('A room for testing components')
        })

        it('entity_has_relation should correctly detect if entity has a relation', function() {
            const {Has, ConnectsTo} = world.relations
            const room1 = createRoom("Room 1", "First room")
            const room2 = createRoom("Room 2", "Second room")
            const item = addEntity(world)
            
            // Initially no relations
            expect(entity_has_relation(world, room1, Has)).to.be.false
            expect(entity_has_relation(world, room1, ConnectsTo)).to.be.false
            
            // Add Has relation
            addComponent(world, room1, Has(item))
            expect(entity_has_relation(world, room1, Has)).to.be.true
            expect(entity_has_relation(world, room1, ConnectsTo)).to.be.false
            
            // Add ConnectsTo relation
            connectRooms(room1, room2, "north", "south")
            expect(entity_has_relation(world, room1, Has)).to.be.true
            expect(entity_has_relation(world, room1, ConnectsTo)).to.be.true
        })

        it('get_all_relations_for_entity should return all relations for an entity', function() {
            const {Has, ConnectsTo} = world.relations
            const room1 = createRoom("Multi Relation Room", "Room with multiple relations")
            const room2 = createRoom("Connected Room", "Connected room")
            const item = addEntity(world)
            
            // Initially no relations
            const emptyRelations = get_all_relations_for_entity(world, room1)
            expect(Object.keys(emptyRelations)).to.have.length(0)
            
            // Add relations
            addComponent(world, room1, Has(item))
            connectRooms(room1, room2, "east", "west")
            
            const relations = get_all_relations_for_entity(world, room1)
            expect(relations).to.have.property('Has')
            expect(relations).to.have.property('ConnectsTo')
            expect(Object.keys(relations)).to.have.length(2)
        })

        it('get_relation_targets_with_data should work without pre-collected targets', function() {
            const {Has, ConnectsTo} = world.relations
            const room1 = createRoom("Room 1", "First room")
            const room2 = createRoom("Room 2", "Second room")
            const item1 = addEntity(world)
            const item2 = addEntity(world)
            
            // Add various relations
            addComponent(world, room1, Has(item1))
            addComponent(world, room2, Has(item2))
            connectRooms(room1, room2, "north", "south")
            
            // Test that get_relation_targets_with_data works directly
            const hasTargets = get_relation_targets_with_data(world, room1, Has)
            expect(hasTargets).to.have.property(item1.toString())
            
            const connectsTargets = get_relation_targets_with_data(world, room1, ConnectsTo)
            expect(connectsTargets).to.have.property(room2.toString())
        })

        it('get_relation_targets_with_data should return targets and their data', function() {
            const {Has, ConnectsTo} = world.relations
            const room1 = createRoom("Source Room", "Room with connections")
            const room2 = createRoom("Target Room 1", "First target")
            const room3 = createRoom("Target Room 2", "Second target")
            const item = addEntity(world)
            
            // Add relations
            addComponent(world, room1, Has(item))
            connectRooms(room1, room2, "north", "south")
            connectRooms(room1, room3, "east", "west")
            
            // Test Has relation (no data) - using new signature without allTargets
            const hasTargets = get_relation_targets_with_data(world, room1, Has)
            expect(hasTargets).to.have.property(item.toString())
            expect(hasTargets[item.toString()]).to.deep.equal({})
            
            // Test ConnectsTo relation (with direction data) - using new signature
            const connectsTargets = get_relation_targets_with_data(world, room1, ConnectsTo)
            expect(connectsTargets).to.have.property(room2.toString())
            expect(connectsTargets).to.have.property(room3.toString())
            expect(connectsTargets[room2.toString()]).to.deep.equal({direction: "north"})
            expect(connectsTargets[room3.toString()]).to.deep.equal({direction: "east"})
        })

        it('utility functions should work together seamlessly', function() {
            const {Has, ConnectsTo} = world.relations
            const room = createRoom("Integration Room", "Room for integration testing")
            const connectedRoom = createRoom("Connected Room", "Connected to integration room")
            const item1 = addEntity(world)
            const item2 = addEntity(world)
            
            // Add relations
            addComponent(world, room, Has(item1))
            addComponent(world, room, Has(item2))
            connectRooms(room, connectedRoom, "south", "north")
            
            // Test that utility functions produce same results as main functions
            const directComponents = get_all_components_for_entity(world, room)
            const directRelations = get_all_relations_for_entity(world, room)
            const combinedDirect = { ...directComponents, ...directRelations }
            
            const mainFunctionResult = get_all_components_and_relations(world, room)
            
            // Should produce identical results
            expect(mainFunctionResult.Room).to.deep.equal(combinedDirect.Room)
            expect(mainFunctionResult.Name).to.deep.equal(combinedDirect.Name) 
            expect(mainFunctionResult.Description).to.deep.equal(combinedDirect.Description)
            expect(mainFunctionResult.Has).to.equal(combinedDirect.Has)
            expect(mainFunctionResult.ConnectsTo).to.equal(combinedDirect.ConnectsTo)
        })
    })
})