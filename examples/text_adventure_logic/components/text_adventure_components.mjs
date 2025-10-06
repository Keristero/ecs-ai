import {z} from 'zod'

/**
 * Component metadata for automatic observer setup
 * Each component can specify:
 * - stringFields: array of field names that should use string store
 * - numberFields: array of field names that are numeric
 * - schema: optional Zod schema for validation
 * 
 * This metadata is used by setupComponentObservers() during world initialization.
 * After setup, use bitECS's getComponent() to retrieve component data - it will
 * automatically trigger onGet observers.
 */
const COMPONENT_METADATA = {
    Name: {
        stringFields: ['value'],
        schema: z.object({
            value: z.string()
        })
    },
    Description: {
        stringFields: ['value'],
        schema: z.object({
            value: z.string()
        })
    },
    Hitpoints: {
        numberFields: ['max', 'current'],
        schema: z.object({
            max: z.number().int().positive(),
            current: z.number().int().nonnegative()
        })
    },
    Connection: {
        stringFields: ['direction'],
        numberFields: ['from', 'to'],
        schema: z.object({
            direction: z.string(),
            from: z.number().int().nonnegative(),
            to: z.number().int().nonnegative()
        })
    },
    Item: {
        numberFields: ['id'],
        schema: z.object({
            id: z.number().int().nonnegative()
        })
    },
    Landmark: {
        numberFields: ['id'],
        schema: z.object({
            id: z.number().int().nonnegative()
        })
    },
    Player: {
        numberFields: ['id', 'respawnRoom'],
        schema: z.object({
            id: z.number().int().nonnegative(),
            respawnRoom: z.number().int().nonnegative()
        })
    },
    Usable: {
        stringFields: ['targetComponent', 'modifyComponent', 'modifyField'],
        numberFields: ['modifyAmount'],
        schema: z.object({
            targetComponent: z.string(),
            modifyComponent: z.string(),
            modifyField: z.string(),
            modifyAmount: z.number()
        })
    },
    Attributes: {
        numberFields: ['strength', 'dexterity', 'intelligence'],
        schema: z.object({
            strength: z.number().int().nonnegative(),
            dexterity: z.number().int().nonnegative(),
            intelligence: z.number().int().nonnegative()
        })
    }
}

// Basic components
const Hitpoints = {
    max: [],
    current: []
}

const Name = {
    stringIndex: [],
}

const Description = {
    stringIndex: [],
}

const Attributes = {
    strength: [],
    dexterity: [],
    intelligence: [],
}

// Game-specific components
const Enemy = {}

const Room = {
    id: [], // unique room id
}

const Item = {
    id: [], // unique item id
}

const Landmark = {
    id: [], // unique landmark id
}

const Player = {
    id: [], // unique player id
    respawnRoom: [], // room id to respawn in
}

// Connections between rooms (directional)
const Connection = {
    from: [], // room id
    to: [],   // room id
    direction: [], // string index for direction (e.g. 'north', 'south', etc.)
}

// Usable items - defines what an item can target and how it modifies them
const Usable = {
    targetComponent: [], // string index - which component the target must have (e.g. "Hitpoints")
    modifyComponent: [], // string index - which component to modify (e.g. "Hitpoints")
    modifyField: [], // string index - which field to modify (e.g. "current")
    modifyAmount: [], // numeric amount to modify by (positive or negative)
}

export {
    Hitpoints,
    Name,
    Description,
    Attributes,
    Enemy,
    Room,
    Item,
    Landmark,
    Player,
    Connection,
    Usable,
    COMPONENT_METADATA
}
