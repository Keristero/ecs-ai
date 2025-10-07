import {z} from 'zod'
import { CreateRelation } from '../../../game_framework/create_component.mjs'

// InRoom represents an entity being located in a room
let InRoom = CreateRelation({})

// Has represents an entity possessing/containing other entities (inventory)
// Example: Player Has Sword, Skeleton Has Sword
let Has = CreateRelation({})

// ConnectsTo has additional data - the direction of the connection
let ConnectsTo = CreateRelation({},z.object({
    direction: z.string()
}))

export {
    InRoom,
    Has,
    ConnectsTo
}