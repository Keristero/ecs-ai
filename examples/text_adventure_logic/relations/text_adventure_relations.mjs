import {z} from 'zod'
import { CreateRelation } from '../../../game_framework/create_component.mjs'

// InRoom and InInventory are simpler - they don't need custom data fields
// The relation target itself carries the meaning (which room/inventory)
let InRoom = CreateRelation({})
let InInventory = CreateRelation({})

// ConnectsTo has additional data - the direction of the connection
let ConnectsTo = CreateRelation({},z.object({
    direction: z.string()
}))

export {
    InRoom,
    InInventory,
    ConnectsTo
}