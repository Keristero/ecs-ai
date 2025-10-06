import {createRelation} from 'bitecs'

// Relation: entity is located in a room
const InRoom = createRelation()

// Relation: entity is in another entity's inventory
const InInventory = createRelation()

// Relation: room connects to another room
// The direction is stored in the relation data (e.g., 'north', 'south', 'up', 'down', etc.)
const ConnectsTo = createRelation({
    store: () => ({ direction: [] })
})

export {
    InRoom,
    InInventory,
    ConnectsTo
}
