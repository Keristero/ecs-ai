import {describe, it, beforeEach} from 'mocha'
import {expect} from 'chai'
import {addEntity, addComponent, removeComponent, hasComponent, getComponent, set, getRelationTargets} from 'bitecs'

import {initialize_game} from '../game_framework/framework.mjs'
import {pickup} from '../examples/text_adventure_logic/actions/pickup.mjs'

describe('Pickup Action Tests', function() {
    let game, world
    
    beforeEach(async function() {
        // Initialize game framework
        game = await initialize_game({
            component_dirs: ['./examples/text_adventure_logic/components'],
            relation_dirs: ['./examples/text_adventure_logic/relations'],
            system_dirs: ['./examples/text_adventure_logic/systems'],
            action_dirs: ['./examples/text_adventure_logic/actions'],
            prefab_dirs: ['./examples/text_adventure_logic/prefabs']
        })
        world = game.world
    })

    function createRoom(name, description) {
        const {Room, Name, Description} = world.components
        const room = addEntity(world)
        addComponent(world, room, Room)
        addComponent(world, room, set(Name, {value: name}))
        addComponent(world, room, set(Description, {value: description}))
        return room
    }

    function createPlayer(name) {
        const {Player, Name, Hitpoints} = world.components
        const player = addEntity(world)
        addComponent(world, player, Player)
        addComponent(world, player, set(Name, {value: name}))
        addComponent(world, player, set(Hitpoints, {max: 100, current: 100}))
        return player
    }

    function createItemInRoom(prefabName, room) {
        const {Has} = world.relations
        const {Item, Name, Description} = world.components
        const item = addEntity(world)
        
        // Add item-specific components based on prefab name
        addComponent(world, item, Item)
        if (prefabName === 'health_potion') {
            addComponent(world, item, set(Name, {value: "HealthPotion"}))
            addComponent(world, item, set(Description, {value: "A small vial filled with red liquid."}))
        } else if (prefabName === 'rusty_sword') {
            addComponent(world, item, set(Name, {value: "RustySword"}))
            addComponent(world, item, set(Description, {value: "An old, rusty sword covered in grime."}))
        }
        
        // Place item in room
        addComponent(world, room, Has(item))
        return item
    }

    it('should pick up an item from the room', async function() {
        const room = createRoom("Test Room", "A test room")
        const player = createPlayer("TestPlayer")
        const {Has} = world.relations
        
        // Place player in room
        addComponent(world, room, Has(player))
        
        // Create a health potion in the room
        const potion = createItemInRoom('health_potion', room)
        
        // Verify item is in room initially
        let roomItems = getRelationTargets(world, room, Has)
        expect(roomItems).to.include(potion)
        
        let playerItems = getRelationTargets(world, player, Has)
        expect(playerItems).to.not.include(potion)
        
        // Execute pickup action
        const result = await pickup.func(game, {
            actor_eid: player,
            room_eid: room,
            item_name: "HealthPotion"
        })
        
        // Verify the action was successful
        expect(result.details.success).to.be.true
        expect(result.details.item_name).to.equal("HealthPotion")
        
        // Verify item was transferred from room to player
        roomItems = getRelationTargets(world, room, Has)
        expect(roomItems).to.not.include(potion)
        
        playerItems = getRelationTargets(world, player, Has)
        expect(playerItems).to.include(potion)
    })

    it('should fail when item does not exist in room', async function() {
        const room = createRoom("Empty Room", "An empty test room")
        const player = createPlayer("TestPlayer")
        const {Has} = world.relations
        
        // Place player in room (but no items)
        addComponent(world, room, Has(player))
        
        // Try to pick up non-existent item
        const result = await pickup.func(game, {
            actor_eid: player,
            room_eid: room,
            item_name: "NonExistentItem"
        })
        
        // Verify the action failed appropriately
        expect(result.details.success).to.be.false
        expect(result.message).to.include('don\'t see a "NonExistentItem"')
    })

    it('should allow picking up multiple items with same name (different entities)', async function() {
        const room = createRoom("Test Room", "A test room")
        const player = createPlayer("TestPlayer")
        const {Has} = world.relations
        
        // Place player in room
        addComponent(world, room, Has(player))
        
        // Create two rusty swords in the room
        const sword1 = createItemInRoom('rusty_sword', room)
        const sword2 = createItemInRoom('rusty_sword', room)
        
        // Pick up first sword
        const result1 = await pickup.func(game, {
            actor_eid: player,
            room_eid: room,
            item_name: "RustySword"
        })
        expect(result1.details.success).to.be.true
        
        // Pick up second sword (should succeed - different entity)
        const result2 = await pickup.func(game, {
            actor_eid: player,
            room_eid: room,
            item_name: "RustySword"
        })
        expect(result2.details.success).to.be.true
        
        // Verify player now has both swords
        const playerItems = getRelationTargets(world, player, Has)
        expect(playerItems).to.include(sword1)
        expect(playerItems).to.include(sword2)
        
        // Verify room no longer has the swords
        const roomItems = getRelationTargets(world, room, Has)
        expect(roomItems).to.not.include(sword1)
        expect(roomItems).to.not.include(sword2)
    })

    it('should be case insensitive for item names', async function() {
        const room = createRoom("Test Room", "A test room")
        const player = createPlayer("TestPlayer")
        const {Has} = world.relations
        
        // Place player in room
        addComponent(world, room, Has(player))
        
        // Create a health potion in the room
        const potion = createItemInRoom('health_potion', room)
        
        // Try different case variations
        const result = await pickup.func(game, {
            actor_eid: player,
            room_eid: room,
            item_name: "healthpotion"  // lowercase
        })
        
        expect(result.details.success).to.be.true
        
        // Verify item was transferred
        const playerItems = getRelationTargets(world, player, Has)
        expect(playerItems).to.include(potion)
    })
})