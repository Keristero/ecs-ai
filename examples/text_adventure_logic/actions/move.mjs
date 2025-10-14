import { getComponent, hasComponent, addComponent, removeComponent } from 'bitecs'
import { z } from 'zod'

import { Action, action_argument_schemas } from '../Action.mjs'
import { get_relation_data_for_entity } from '../helpers.mjs'

const move = new Action('move', ['go', 'walk', 'travel'], 'Move to another room', {
    direction: z.string().describe("Direction to move (e.g., north, south, east, west)")
}, { 
    includeActorRoom: true,
    entityValidation: {
        direction: {
            relationValues: [{
                relation: 'ConnectsTo',
                source: 'room_eid',
                valueField: 'direction'
            }]
        }
    }
})

move.func = async (game, args) => {
    const { actor_eid, room_eid, direction } = args
    const { world } = game
    const { Name } = world.components
    const { ConnectsTo } = world.relations

    console.log(`[move action] Actor ${actor_eid} attempting to move ${direction} from room ${room_eid}`)

    // Get actor display name
    const actorName = getComponent(world, actor_eid, Name)
    const actor_display_name = actorName ? actorName.value : `Actor ${actor_eid}`
    const roomRelations = get_relation_data_for_entity(world, room_eid, ['ConnectsTo'])
    let target_room_eid = null
    let connectionDescription = null
        
    if (roomRelations.ConnectsTo) {
        for (const [roomId, connectionData] of Object.entries(roomRelations.ConnectsTo)) {
            if (connectionData.direction === direction.toLowerCase()) {
                target_room_eid = parseInt(roomId)
                connectionDescription = connectionData.description
                break
            }
        }
    }

    // Create descriptive movement message
    let moveMessage = `${actor_display_name} moves ${direction}`

    // Note: Actual movement is handled by movement_system
    return move.create_event(actor_eid, moveMessage, {
        success: true,
        direction: direction,
        from_room_eid: room_eid,
        to_room_eid: target_room_eid,
        connection_description: connectionDescription
    })
}

export { move }