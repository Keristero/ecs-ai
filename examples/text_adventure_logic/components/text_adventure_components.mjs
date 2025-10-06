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
    Item: {
        schema: z.object({})
    },
    Landmark: {
        schema: z.object({})
    },
    Player: {
        numberFields: ['respawnRoom'],
        schema: z.object({
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
    },
    // Relations metadata
    ConnectsTo: {
        stringFields: ['direction'],
        schema: z.object({
            direction: z.string()
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

const Room = {}

const Item = {}

const Landmark = {}

const Player = {
    respawnRoom: [], // entity id of room to respawn in
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
    Usable,
    COMPONENT_METADATA
}
