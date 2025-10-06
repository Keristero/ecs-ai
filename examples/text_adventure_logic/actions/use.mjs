import {query, hasComponent, getComponent, setComponent, removeComponent} from 'bitecs'
import {z} from 'zod'
import {
    findEntityRoom,
    getEntityName,
    hasItemInInventory,
    areInSameRoom,
    failureResult
} from '../helpers.mjs'

/**
 * Use action - use an item on a target entity
 * Generic action that modifies a component field based on the item's Usable properties
 * @param {Object} game - The game instance
 * @param {Object} params - Action parameters
 * @param {number} params.playerId - The player entity ID (optional, defaults to game.playerId)
 * @param {number} params.itemId - The item ID to use
 * @param {number} params.targetId - The target entity ID (optional, defaults to player for self-use)
 * @returns {Object} Action result with success status and message
 */
export default function use(game, params) {
    const playerId = params.playerId ?? game.playerId
    let {itemId, targetId} = params
    const {world} = game
    const {InRoom} = world.relations
    const {Usable, Name} = world.components
    
    // Check if player has the item
    if (!hasItemInInventory(world, playerId, itemId)) {
        return failureResult("You don't have that item!")
    }
    
    // Check if item has Usable component
    if (!hasComponent(world, itemId, Usable)) {
        return failureResult("That item cannot be used.")
    }
    
    // Get usable data - getComponent triggers onGet observer automatically
    const usableData = getComponent(world, itemId, Usable)
    const targetComponentName = usableData?.targetComponent
    const modifyComponentName = usableData?.modifyComponent
    const modifyField = usableData?.modifyField
    const modifyAmount = usableData?.modifyAmount
    
    // Validate usable data
    if (!targetComponentName || !modifyComponentName || !modifyField || modifyAmount === undefined) {
        return failureResult("This item is not properly configured.")
    }
    
    // Get component references
    const targetComponent = world.components[targetComponentName]
    const modifyComponent = world.components[modifyComponentName]
    
    if (!targetComponent || !modifyComponent) {
        return failureResult("This item references unknown components.")
    }
    
    // Default to self if no target specified
    if (targetId === undefined) {
        targetId = playerId
    }
    
    // Validate target has required component
    if (!hasComponent(world, targetId, targetComponent)) {
        return failureResult("That is not a valid target for this item!")
    }
    
    // Validate target has component to modify
    if (!hasComponent(world, targetId, modifyComponent)) {
        return failureResult("That target cannot be affected by this item!")
    }
    
    // Check if target is in same room as player (if not self)
    if (targetId !== playerId && !areInSameRoom(world, playerId, targetId)) {
        return failureResult("That target is not here!")
    }
    
    // Apply the modification
    const itemName = getEntityName(world, itemId) || 'item'
    const targetName = getEntityName(world, targetId) || (targetId === playerId ? 'yourself' : 'target')
    
    const oldValue = modifyComponent[modifyField][targetId]
    const newValue = oldValue + modifyAmount
    modifyComponent[modifyField][targetId] = newValue
    
    // Check for special cases (e.g., death if hitpoints reach 0)
    let extraInfo = {}
    if (modifyComponentName === 'Hitpoints' && modifyField === 'current' && newValue <= 0) {
        // Target died/destroyed - remove from room
        const targetRoom = findEntityRoom(world, targetId)
        if (targetRoom) {
            removeComponent(world, targetId, InRoom(targetRoom))
        }
        extraInfo.targetDestroyed = true
    }
    
    // Build result message
    const action = modifyAmount > 0 ? 'increased' : 'decreased'
    const absoluteAmount = Math.abs(modifyAmount)
    
    return {
        success: true,
        message: `You use the ${itemName} on ${targetName}. ${modifyComponentName}.${modifyField} ${action} by ${absoluteAmount} (${oldValue} → ${newValue})`,
        itemId,
        itemName,
        targetId,
        targetName,
        modifiedComponent: modifyComponentName,
        modifiedField: modifyField,
        oldValue,
        newValue,
        amount: modifyAmount,
        ...extraInfo
    }
}

// Action metadata for dynamic command generation and autocomplete
export const metadata = {
    name: 'use',
    aliases: ['u', 'apply', 'attack'],
    description: 'Use an item on a target',
    parameters: ['itemId', 'targetId'], // Parameter names
    autocompletes: [
        ['Item'], // itemId parameter: must have Item component (items in inventory)
        [] // targetId parameter: component requirements determined dynamically based on selected item's Usable.targetComponent
    ],
    inputSchema: z.object({
        itemId: z.number().int().nonnegative().describe('ID of the item to use'),
        targetId: z.number().int().nonnegative().optional().describe('ID of the target entity (optional, defaults to self)')
    }),
    summarizeWithAI: true // Client should use AI to generate a natural language summary of the result
}
