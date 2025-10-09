import {query, hasComponent, getComponent, setComponent, removeComponent} from 'bitecs'
import {z} from 'zod'
import {
    findEntityRoom,
    getEntityName,
    hasItemInInventory,
    areInSameRoom,
    validateComponentForAction,
    failureResult
} from '../helpers.mjs'
import {create_action_event} from '../event_helpers.mjs'

/**
 * Use action - use an item on a target entity
 * Generic action that modifies a component field based on the item's Usable properties
 * Requires: Actor must have Hands component with health >= 0.5
 * @param {Object} game - The game instance
 * @param {Object} params - Action parameters
 * @param {number} params.actorId - The entity performing the action (optional, defaults to game.playerId)
 * @param {number} params.itemId - The item ID to use
 * @param {number} params.targetId - The target entity ID (optional, defaults to actor for self-use)
 * @returns {Object} Action result with success status and message
 */
export default function use(game, params) {
    const actorId = params.actorId ?? game.playerId
    let {itemId, targetId} = params
    const {world} = game
    const {InRoom} = world.relations
    const {Usable, Name, Hands} = world.components
    
    const roomEid = findEntityRoom(world, actorId)
    
    // Validate actor has functional Hands
    const handsValidation = validateComponentForAction(world, actorId, Hands, 'Hands', 'use items')
    if (!handsValidation.valid) {
        return create_action_event('use', actorId, roomEid, false, {
            error: handsValidation.error
        })
    }
    
    // Check if actor has the item
    if (!hasItemInInventory(world, actorId, itemId)) {
        return create_action_event('use', actorId, roomEid, false, {
            error: "You don't have that item!"
        })
    }
    
    // Check if item has Usable component
    if (!hasComponent(world, itemId, Usable)) {
        return create_action_event('use', actorId, roomEid, false, {
            error: "That item cannot be used.",
            item_eid: itemId
        })
    }
    
    // Get usable data - getComponent triggers onGet observer automatically
    const usableData = getComponent(world, itemId, Usable)
    const targetComponentName = usableData?.targetComponent
    const modifyComponentName = usableData?.modifyComponent
    const modifyField = usableData?.modifyField
    const modifyAmount = usableData?.modifyAmount
    
    // Validate usable data
    if (!targetComponentName || !modifyComponentName || !modifyField || modifyAmount === undefined) {
        return create_action_event('use', actorId, roomEid, false, {
            error: "This item is not properly configured.",
            item_eid: itemId
        })
    }
    
    // Get component references
    const targetComponent = world.components[targetComponentName]
    const modifyComponent = world.components[modifyComponentName]
    
    if (!targetComponent || !modifyComponent) {
        return create_action_event('use', actorId, roomEid, false, {
            error: "This item references unknown components.",
            item_eid: itemId
        })
    }
    
    // Default to self if no target specified
    if (targetId === undefined) {
        targetId = actorId
    }
    
    // Validate target has required component
    if (!hasComponent(world, targetId, targetComponent)) {
        return create_action_event('use', actorId, roomEid, false, {
            error: "That is not a valid target for this item!",
            item_eid: itemId,
            target_eid: targetId
        })
    }
    
    // Validate target has component to modify
    if (!hasComponent(world, targetId, modifyComponent)) {
        return create_action_event('use', actorId, roomEid, false, {
            error: "That target cannot be affected by this item!",
            item_eid: itemId,
            target_eid: targetId
        })
    }
    
    // Check if target is in same room as actor (if not self)
    if (targetId !== actorId && !areInSameRoom(world, actorId, targetId)) {
        return create_action_event('use', actorId, roomEid, false, {
            error: "That target is not here!",
            item_eid: itemId,
            target_eid: targetId
        })
    }
    
    // Apply the modification
    const itemName = getEntityName(world, itemId) || 'item'
    const targetName = getEntityName(world, targetId) || (targetId === actorId ? 'yourself' : 'target')
    
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
    
    let message = `You use the ${itemName} on ${targetName}. ${modifyComponentName}.${modifyField} ${action} by ${absoluteAmount} (${oldValue} → ${newValue})`
    
    // Add warning if Hands impaired
    if (handsValidation.warning) {
        message += ` (${handsValidation.warning})`
    }
    
    return create_action_event('use', actorId, roomEid, true, {
        message,
        item_eid: itemId,
        item_name: itemName,
        target_eid: targetId,
        target_name: targetName,
        modified_component: modifyComponentName,
        modified_field: modifyField,
        old_value: oldValue,
        new_value: newValue,
        amount: modifyAmount,
        ...extraInfo
    })
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
