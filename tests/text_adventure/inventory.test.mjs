#!/usr/bin/env node
/**
 * Test script for inventory system using bitECS relations
 * Tests the InInventory relation for managing item ownership
 */

import game from '../../examples/text_adventure_logic/game.mjs'
import pickup from '../../examples/text_adventure_logic/actions/pickup.mjs'
import drop from '../../examples/text_adventure_logic/actions/drop.mjs'
import look from '../../examples/text_adventure_logic/actions/look.mjs'

console.log('=== Testing Inventory System with bitECS Relations ===\n')

// Get initial room state
console.log('1. Initial room state:')
const initialLook = look(game, {playerId: game.playerId})
const initialData = initialLook.action.details
console.log('Items in room:', initialData.items.map(i => i.name))
console.log('Player inventory:', initialData.inventory.map(i => i.name))
console.log('')

// Try to pick up the first item in the room
if (initialData.items.length > 0) {
    const firstItem = initialData.items[0]
    console.log(`2. Picking up "${firstItem.name}"...`)
    const pickupResult = pickup(game, {playerId: game.playerId, itemId: firstItem.id})
    console.log('Result:', pickupResult.action.details.message)
    console.log('')
    
    // Check inventory after pickup
    console.log('3. After pickup:')
    const afterPickup = look(game, {playerId: game.playerId})
    const afterPickupData = afterPickup.action.details
    console.log('Items in room:', afterPickupData.items.map(i => i.name))
    console.log('Player inventory:', afterPickupData.inventory.map(i => i.name))
    console.log('')
    
    // Verify item is in inventory using relation query
    if (afterPickupData.inventory.find(i => i.id === firstItem.id)) {
        console.log('✓ Item successfully moved to inventory via InInventory relation')
    } else {
        console.log('✗ ERROR: Item not found in inventory')
    }
    console.log('')
    
    // Try to drop the item
    console.log(`4. Dropping "${firstItem.name}"...`)
    const dropResult = drop(game, {playerId: game.playerId, itemId: firstItem.id})
    console.log('Result:', dropResult.action.details.message)
    console.log('')
    
    // Check inventory after drop
    console.log('5. After drop:')
    const afterDrop = look(game, {playerId: game.playerId})
    const afterDropData = afterDrop.action.details
    console.log('Items in room:', afterDropData.items.map(i => i.name))
    console.log('Player inventory:', afterDropData.inventory.map(i => i.name))
    console.log('')
    
    // Verify item is back in room
    if (afterDropData.items.find(i => i.id === firstItem.id)) {
        console.log('✓ Item successfully moved back to room via Has relation')
    } else {
        console.log('✗ ERROR: Item not found in room')
    }
    console.log('')
}

console.log('=== Test Complete ===')