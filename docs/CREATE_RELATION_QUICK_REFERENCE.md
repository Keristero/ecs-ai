# CreateRelation Quick Reference

## Basic Usage

### 1. Define a Relation

```javascript
import {CreateRelation} from './game_framework/create_component.mjs'
import {z} from 'zod'

// Relation without data
const InRoom = CreateRelation({})

// Relation with data
const ConnectsTo = CreateRelation({}, z.object({
    direction: z.string(),
    distance: z.number()
}))
```

### 2. Enable Observers

```javascript
// In your game initialization
InRoom.enableObservers(world)
ConnectsTo.enableObservers(world)
```

### 3. Add Relations

```javascript
import {addComponent, set} from 'bitecs'

// Without data
addComponent(world, player, InRoom.data(room1))

// With data (clean syntax!)
addComponent(world, room1, set(ConnectsTo.data(room2), {
    direction: "north",
    distance: 10
}))
```

### 4. Query Relations

```javascript
import {query} from 'bitecs'

// Find all entities in a room
const entitiesInRoom = query(world, [InRoom.data(room1)])

// Find all rooms connected to room1
const connectedRooms = query(world, [ConnectsTo.data(room1)])
```

### 5. Access Relation Data

```javascript
// Get direction from ConnectsTo relation
const directionIndex = ConnectsTo.data(room2).direction[room1]
const direction = world.string_store.getString(directionIndex)

// Get distance
const distance = ConnectsTo.data(room2).distance[room1]
```

## Advanced Features

### Exclusive Relations

Only one target at a time (automatically removes old target):

```javascript
const Targeting = CreateRelation({exclusive: true}, z.object({
    range: z.number()
}))

addComponent(world, hero, set(Targeting.data(enemy1), {range: 10}))
addComponent(world, hero, set(Targeting.data(enemy2), {range: 5}))
// hero now only targets enemy2, enemy1 relation auto-removed
```

### Auto-Remove Subject

Subject entity removed when target is removed:

```javascript
const ChildOf = CreateRelation({autoRemoveSubject: true})

addComponent(world, child, ChildOf.data(parent))
removeEntity(world, parent)
// child is automatically removed too!
```

### Combined Options

```javascript
const BelongsTo = CreateRelation(
    {autoRemoveSubject: true, exclusive: true},
    z.object({
        ownership: z.string()
    })
)
```

## Common Patterns

### Room Connections (Bidirectional)

```javascript
const ConnectsTo = CreateRelation({}, z.object({
    direction: z.string()
}))

// Create two-way connection
addComponent(world, room1, set(ConnectsTo.data(room2), {direction: "north"}))
addComponent(world, room2, set(ConnectsTo.data(room1), {direction: "south"}))
```

### Inventory System

```javascript
const InInventory = CreateRelation({})
const Contains = CreateRelation({}, z.object({
    amount: z.number()
}))

// Simple in/out
addComponent(world, item, InInventory.data(player))

// With quantity tracking
addComponent(world, chest, set(Contains.data(gold), {amount: 100}))
```

### Parent-Child Hierarchy

```javascript
const ChildOf = CreateRelation({autoRemoveSubject: true})

// Build hierarchy
addComponent(world, arm, ChildOf.data(body))
addComponent(world, hand, ChildOf.data(arm))
addComponent(world, finger, ChildOf.data(hand))

// Remove body -> everything else removed automatically
removeEntity(world, body)
```

### Targeting System

```javascript
const Targeting = CreateRelation({exclusive: true}, z.object({
    lockedOn: z.number() // timestamp or lock strength
}))

// Can only target one enemy at a time
addComponent(world, player, set(Targeting.data(enemy), {
    lockedOn: Date.now()
}))
```

## Field Types

### String Fields

Automatically stored in string store as indices:

```javascript
const Tagged = CreateRelation({}, z.object({
    tag: z.string()
}))

addComponent(world, entity, set(Tagged.data(target), {tag: "friendly"}))

// Retrieve
const tagIndex = Tagged.data(target).tag[entity]
const tag = world.string_store.getString(tagIndex)
```

### Number Fields

Stored directly:

```javascript
const Weights = CreateRelation({}, z.object({
    weight: z.number()
}))

addComponent(world, item, set(Weights.data(container), {weight: 5.5}))

// Retrieve
const weight = Weights.data(container).weight[item]
```

### Mixed Fields

```javascript
const Trade = CreateRelation({}, z.object({
    itemName: z.string(),
    price: z.number(),
    currency: z.string()
}))

addComponent(world, merchant, set(Trade.data(customer), {
    itemName: "Magic Sword",
    price: 500,
    currency: "gold"
}))
```

## Relation Access in Actions

Always use relations from `world.relations`:

```javascript
export default function myAction(game, params) {
    const {world} = game
    const {InRoom, ConnectsTo} = world.relations // ✅ Correct
    
    // Not from direct imports ❌
    // import {InRoom} from './relations.mjs' // ❌ Wrong
}
```

## Tips & Best Practices

### 1. Schema First
Define your data schema first, it helps with documentation:

```javascript
// Good: Clear what data is stored
const Trades = CreateRelation({}, z.object({
    buyPrice: z.number(),
    sellPrice: z.number(),
    currency: z.string()
}))
```

### 2. Use Descriptive Names
Relation names should indicate the relationship:

```javascript
const OwnedBy = CreateRelation({}) // ✅ Clear
const Contains = CreateRelation({}) // ✅ Clear  
const HasRelationTo = CreateRelation({}) // ❌ Vague
```

### 3. Document Options
Comment why you use specific options:

```javascript
// Children die with parent (e.g., body parts)
const PartOf = CreateRelation({autoRemoveSubject: true})

// Player can only target one enemy at a time
const Targeting = CreateRelation({exclusive: true})
```

### 4. Group Related Relations
Keep relations for the same system together:

```javascript
// Spatial relations
const InRoom = CreateRelation({})
const ConnectsTo = CreateRelation({}, z.object({direction: z.string()}))
const BlocksPath = CreateRelation({})
```

## Troubleshooting

### "Relation is not a function"
Make sure you're using `.data`:

```javascript
// Wrong
addComponent(world, entity, InRoom(target))

// Correct
addComponent(world, entity, InRoom.data(target))
```

### "Cannot read property 'enableObservers' of undefined"
Enable observers only for relations with schemas:

```javascript
// No schema - enableObservers is optional
const InRoom = CreateRelation({})

// Has schema - must enable observers
const ConnectsTo = CreateRelation({}, z.object({direction: z.string()}))
ConnectsTo.enableObservers(world) // Required!
```

### "Schema validation failed"
Make sure field types match:

```javascript
const Info = CreateRelation({}, z.object({
    count: z.number(), // Must be number
    name: z.string()   // Must be string
}))

// Wrong
addComponent(world, e, set(Info.data(t), {count: "5"})) // ❌ String

// Correct
addComponent(world, e, set(Info.data(t), {count: 5})) // ✅ Number
```

## See Also

- [Full Implementation Docs](./CREATE_RELATION_IMPLEMENTATION.md)
- [Test Results](../tests/framework/RELATION_TESTS_SUMMARY.md)
- [bitECS Relations Guide](./bitecs_guide.md#relationships)
