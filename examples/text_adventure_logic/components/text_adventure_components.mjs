import {z} from 'zod'
import {CreateComponent} from '../../../game_framework/create_component.mjs'

let Hitpoints = CreateComponent(z.object({
    max: z.number().int().positive(),
    current: z.number().int().nonnegative()
}))

let Name = CreateComponent(z.object({
    value: z.string()
}))

let Description = CreateComponent(z.object({
    value: z.string()
}))

let Attributes = CreateComponent(z.object({
    strength: z.number().int().nonnegative(),
    dexterity: z.number().int().nonnegative(),
    intelligence: z.number().int().nonnegative()
}))

let Enemy = CreateComponent()
let Room = CreateComponent()
let Item = CreateComponent()
let Landmark = CreateComponent()


let Ears = CreateComponent(z.object({ // Entities with this component can hear dialogue
    health: z.number().nonnegative().max(1)
}))

let Eyes = CreateComponent(z.object({ // Entities with this component can see, and inspect
    health: z.number().nonnegative().max(1)
}))

let Hands = CreateComponent(z.object({ // Entities with this component can use items
    health: z.number().nonnegative().max(1)
}))

let Player = CreateComponent(z.object({
    respawnRoom: z.number().int().nonnegative() // entity id of room to respawn in
}))

let Usable = CreateComponent(z.object({
    targetComponent: z.string(), // which component the target must have (e.g. "Hitpoints")
    modifyComponent: z.string(), // which component to modify (e.g. "Hitpoints")
    modifyField: z.string(), // which field to modify (e.g. "current")
    modifyAmount: z.number() // amount to modify by (positive or negative)
}))

export {
    Hitpoints,
    Name,
    Description,
    Attributes,
    Enemy,
    Room,
    Item,
    Landmark,
    Ears,
    Eyes,
    Hands,
    Player,
    Usable
}