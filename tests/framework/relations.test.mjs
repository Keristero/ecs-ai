#!/usr/bin/env node
/**
 * Test script for CreateRelation wrapper with various bitECS relation options
 * Tests: basic relations, relations with stores, exclusive relations, autoRemoveSubject
 */

import {createWorld, addEntity, addComponent, removeComponent, removeEntity, hasComponent, query, set, getRelationTargets} from 'bitecs'
import {CreateRelation} from '../../game_framework/create_component.mjs'
import {z} from 'zod'
import {expect} from 'chai'

describe('CreateRelation with Various bitECS Options', function() {
    // Helper to create a test world with string store
    function createTestWorld() {
        const world = createWorld()
        const stringStore = []
        world.string_store = {
            getString: (index) => stringStore[index] || '',
            addString: (str) => {
                const index = stringStore.length
                stringStore.push(str)
                return index
            },
            store: stringStore
        }
        return world
    }

    describe('Basic Relations (no store)', function() {
        it('should allow entities to be added to relations and queried', function() {
            const world = createTestWorld()
            const InRoom = CreateRelation({})
            
            if(InRoom.enableObservers) {
                InRoom.enableObservers(world)
            }
            
            const room = addEntity(world)
            const player = addEntity(world)
            const item = addEntity(world)
            
            addComponent(world, player, InRoom.data(room))
            addComponent(world, item, InRoom.data(room))
            
            const entitiesInRoom = query(world, [InRoom.data(room)])
            
            expect(entitiesInRoom).to.have.lengthOf(2)
            expect(entitiesInRoom).to.include(player)
            expect(entitiesInRoom).to.include(item)
        })
    })

    describe('Relations with Store', function() {
        it('should work with manual assignment to store fields', function() {
            const world = createTestWorld()
            const ConnectsTo = CreateRelation({}, z.object({
                direction: z.string()
            }))
            
            if(ConnectsTo.enableObservers) {
                ConnectsTo.enableObservers(world)
            }
            
            const room1 = addEntity(world)
            const room2 = addEntity(world)
            
            addComponent(world, room1, ConnectsTo.data(room2))
            ConnectsTo.data(room2).direction[room1] = world.string_store.addString("north")
            
            const direction = world.string_store.getString(ConnectsTo.data(room2).direction[room1])
            expect(direction).to.equal("north")
        })

        it('should work with set() syntax', function() {
            const world = createTestWorld()
            const ConnectsTo = CreateRelation({}, z.object({
                direction: z.string()
            }))
            
            if(ConnectsTo.enableObservers) {
                ConnectsTo.enableObservers(world)
            }
            
            const room1 = addEntity(world)
            const room2 = addEntity(world)
            const room3 = addEntity(world)
            
            addComponent(world, room1, set(ConnectsTo.data(room2), {direction: "north"}))
            addComponent(world, room2, set(ConnectsTo.data(room3), {direction: "east"}))
            
            const dir1 = world.string_store.getString(ConnectsTo.data(room2).direction[room1])
            const dir2 = world.string_store.getString(ConnectsTo.data(room3).direction[room2])
            
            expect(dir1).to.equal("north")
            expect(dir2).to.equal("east")
        })
    })

    describe('Exclusive Relations', function() {
        it('should only allow one target at a time', function() {
            const world = createTestWorld()
            const Targeting = CreateRelation({exclusive: true})
            
            if(Targeting.enableObservers) {
                Targeting.enableObservers(world)
            }
            
            const hero = addEntity(world)
            const rat = addEntity(world)
            const goblin = addEntity(world)
            
            addComponent(world, hero, Targeting.data(rat))
            expect(hasComponent(world, hero, Targeting.data(rat))).to.be.true
            
            addComponent(world, hero, Targeting.data(goblin))
            expect(hasComponent(world, hero, Targeting.data(goblin))).to.be.true
            expect(hasComponent(world, hero, Targeting.data(rat))).to.be.false
        })

        it('should work with store fields and set()', function() {
            const world = createTestWorld()
            const Targeting = CreateRelation({exclusive: true}, z.object({
                strength: z.number()
            }))
            
            if(Targeting.enableObservers) {
                Targeting.enableObservers(world)
            }
            
            const hero = addEntity(world)
            const rat = addEntity(world)
            const goblin = addEntity(world)
            
            addComponent(world, hero, set(Targeting.data(rat), {strength: 5}))
            const strengthBeforeSwitch = Targeting.data(rat).strength[hero]
            expect(strengthBeforeSwitch).to.equal(5)
            
            addComponent(world, hero, set(Targeting.data(goblin), {strength: 10}))
            expect(hasComponent(world, hero, Targeting.data(rat))).to.be.false
            expect(hasComponent(world, hero, Targeting.data(goblin))).to.be.true
            expect(Targeting.data(goblin).strength[hero]).to.equal(10)
        })
    })

    describe('AutoRemoveSubject Relations', function() {
        it('should remove subject when target is removed', function() {
            const world = createTestWorld()
            const ChildOf = CreateRelation({autoRemoveSubject: true})
            
            if(ChildOf.enableObservers) {
                ChildOf.enableObservers(world)
            }
            
            const parent = addEntity(world)
            const child = addEntity(world)
            
            addComponent(world, child, ChildOf.data(parent))
            removeEntity(world, parent)
            
            const allEntities = []
            for(let i = 0; i < 100; i++) {
                if(world[i]) allEntities.push(i)
            }
            
            expect(allEntities).to.not.include(child)
        })

        it('should work with store fields and set()', function() {
            const world = createTestWorld()
            const ChildOf = CreateRelation({autoRemoveSubject: true}, z.object({
                inheritancePercent: z.number()
            }))
            
            if(ChildOf.enableObservers) {
                ChildOf.enableObservers(world)
            }
            
            const parent = addEntity(world)
            const child = addEntity(world)
            
            addComponent(world, child, set(ChildOf.data(parent), {inheritancePercent: 50}))
            const inheritance = ChildOf.data(parent).inheritancePercent[child]
            expect(inheritance).to.equal(50)
            
            removeEntity(world, parent)
            
            const allEntities = []
            for(let i = 0; i < 100; i++) {
                if(world[i]) allEntities.push(i)
            }
            
            expect(allEntities).to.not.include(child)
        })
    })

    describe('Multiple Relation Targets', function() {
        it('should allow non-exclusive relations to have multiple targets', function() {
            const world = createTestWorld()
            const Contains = CreateRelation({}, z.object({
                amount: z.number()
            }))
            
            if(Contains.enableObservers) {
                Contains.enableObservers(world)
            }
            
            const inventory = addEntity(world)
            const gold = addEntity(world)
            const silver = addEntity(world)
            const bronze = addEntity(world)
            
            addComponent(world, inventory, set(Contains.data(gold), {amount: 100}))
            addComponent(world, inventory, set(Contains.data(silver), {amount: 50}))
            addComponent(world, inventory, set(Contains.data(bronze), {amount: 25}))
            
            expect(Contains.data(gold).amount[inventory]).to.equal(100)
            expect(Contains.data(silver).amount[inventory]).to.equal(50)
            expect(Contains.data(bronze).amount[inventory]).to.equal(25)
            
            expect(hasComponent(world, inventory, Contains.data(gold))).to.be.true
            expect(hasComponent(world, inventory, Contains.data(silver))).to.be.true
            expect(hasComponent(world, inventory, Contains.data(bronze))).to.be.true
        })
    })

    describe('Mixed Field Types', function() {
        it('should handle both string and number fields', function() {
            const world = createTestWorld()
            const Trade = CreateRelation({}, z.object({
                itemName: z.string(),
                price: z.number(),
                currency: z.string()
            }))
            
            if(Trade.enableObservers) {
                Trade.enableObservers(world)
            }
            
            const merchant = addEntity(world)
            const customer = addEntity(world)
            
            addComponent(world, merchant, set(Trade.data(customer), {
                itemName: "Magic Sword",
                price: 500,
                currency: "gold"
            }))
            
            const itemName = world.string_store.getString(Trade.data(customer).itemName[merchant])
            const price = Trade.data(customer).price[merchant]
            const currency = world.string_store.getString(Trade.data(customer).currency[merchant])
            
            expect(itemName).to.equal("Magic Sword")
            expect(price).to.equal(500)
            expect(currency).to.equal("gold")
        })
    })

    describe('Updating Relation Data', function() {
        it('should allow updating relation data by removing and re-adding', function() {
            const world = createTestWorld()
            const Status = CreateRelation({}, z.object({
                health: z.number(),
                status: z.string()
            }))
            
            if(Status.enableObservers) {
                Status.enableObservers(world)
            }
            
            const healer = addEntity(world)
            const patient = addEntity(world)
            
            // Initial state
            addComponent(world, healer, set(Status.data(patient), {
                health: 50,
                status: "wounded"
            }))
            
            const initialHealth = Status.data(patient).health[healer]
            const initialStatus = world.string_store.getString(Status.data(patient).status[healer])
            expect(initialHealth).to.equal(50)
            expect(initialStatus).to.equal("wounded")
            
            // Update
            removeComponent(world, healer, Status.data(patient))
            addComponent(world, healer, set(Status.data(patient), {
                health: 100,
                status: "healthy"
            }))
            
            const updatedHealth = Status.data(patient).health[healer]
            const updatedStatus = world.string_store.getString(Status.data(patient).status[healer])
            expect(updatedHealth).to.equal(100)
            expect(updatedStatus).to.equal("healthy")
        })
    })
})
