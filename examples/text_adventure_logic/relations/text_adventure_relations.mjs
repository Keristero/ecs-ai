import {z} from 'zod'
import { CreateRelation } from '../../../game_framework/create_component.mjs'

// Has represents an entity possessing/containing other entities
// Examples: 
// - Player Has Sword (inventory)
// - Skeleton Has Sword (inventory)
// - Room Has Player (location)
// - Room Has Item (location)
let Has = CreateRelation({})

// ConnectsTo has additional data - the direction of the connection
let ConnectsTo = CreateRelation({},z.object({
    direction: z.string()
}))

export {
    Has,
    ConnectsTo
}