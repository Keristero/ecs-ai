# Prefabs System

## Overview

Prefabs are reusable entity templates using bitECS's built-in prefab system. They are special entities marked with the `Prefab` component that are excluded from normal queries and serve as templates for creating other entities through the `IsA` relationship.

## Directory Structure

```
examples/text_adventure_logic/
  prefabs/
    goblin.mjs
    skeleton_warrior.mjs
    rusty_sword.mjs
    health_potion.mjs
```

## Creating a Prefab

Each prefab file should export a default function that:
1. Takes `world` and `components` parameters
2. Creates a prefab entity with `addPrefab(world)` instead of `addEntity(world)`
3. Adds and configures components
4. Returns the prefab entity ID

### Example Prefab

```javascript
import {addPrefab, addComponent, set} from 'bitecs'

/**
 * Goblin enemy prefab
 * A weak, common enemy found in forests and caves
 */
export default function create_goblin_prefab(world, components) {
    const {Enemy, Hitpoints, Name, Description} = components
    
    const Goblin = addPrefab(world)
    addComponent(world, Goblin, Enemy)
    addComponent(world, Goblin, Hitpoints)
    Hitpoints.max[Goblin] = 20
    Hitpoints.current[Goblin] = 20
    addComponent(world, Goblin, set(Name, {value: "goblin"}))
    addComponent(world, Goblin, set(Description, {value: "A small, green-skinned creature."}))
    
    return Goblin
}
```

## Using Prefabs

Prefabs are automatically loaded and initialized by the game framework. To instantiate an entity from a prefab, use the `IsA` relationship:

```javascript
import {addEntity, addComponent, IsA} from 'bitecs'

function setup_world(game) {
    const {world, prefabs} = game
    
    // Create a room
    const room = addEntity(world)
    addComponent(world, room, Room)
    
    // Instantiate a goblin from the prefab
    const goblin = addEntity(world)
    addComponent(world, goblin, IsA(prefabs.goblin))
    addComponent(world, goblin, InRoom(room))
    
    // Spawn multiple enemies of the same type
    const goblin1 = addEntity(world)
    addComponent(world, goblin1, IsA(prefabs.goblin))
    
    const goblin2 = addEntity(world)
    addComponent(world, goblin2, IsA(prefabs.goblin))
}
```

## Inheritance

When you use `IsA(prefab)`, the entity inherits all components and their values from the prefab. For this to work properly, you need `onSet` and `onGet` observers for your components:

```javascript
// Enable inheritance for components
observe(world, onSet(Hitpoints), (eid, params) => {
    if (params && params.max !== undefined) {
        Hitpoints.max[eid] = params.max
    }
    if (params && params.current !== undefined) {
        Hitpoints.current[eid] = params.current
    }
})

observe(world, onGet(Hitpoints), (eid) => ({
    max: Hitpoints.max[eid],
    current: Hitpoints.current[eid]
}))
```

## Benefits

1. **Reusability**: Create multiple instances of the same entity type
2. **Inheritance**: Entities inherit all components from prefabs
3. **Query Exclusion**: Prefabs don't appear in normal queries
4. **Consistency**: Ensures entities are created with the correct components
5. **Maintainability**: All entity logic in one place
6. **Type Safety**: Each prefab clearly defines what components it needs

## Prefabs vs Normal Queries

```javascript
// Prefabs themselves don't appear in queries
query(world, [Enemy]).includes(prefabs.goblin) // false

// But instantiated entities do
const goblin = addEntity(world)
addComponent(world, goblin, IsA(prefabs.goblin))
query(world, [Enemy]).includes(goblin) // true

// You can query for all instances of a prefab
query(world, [IsA(prefabs.goblin)]) // Returns all goblins
```

## Framework Integration

The game framework automatically:
- Scans the `prefabs/` folder in your game logic directory
- Loads all `.mjs` files as prefab creator functions
- Calls each creator with `(world, components)` to initialize the prefab
- Makes them available via `game.prefabs[prefab_name]`
- Logs how many prefabs were loaded and initialized

The prefab name is derived from the filename (e.g., `goblin.mjs` → `game.prefabs.goblin`)

## Advanced: Prefab Hierarchies

You can create prefab hierarchies using the `IsA` relationship:

```javascript
// Base animal prefab
const Animal = addPrefab(world)
addComponent(world, Animal, Vitals)
Vitals.health[Animal] = 100

// Sheep prefab inherits from Animal
const Sheep = addPrefab(world)
addComponent(world, Sheep, IsA(Animal)) // inherits Vitals
addComponent(world, Sheep, Contains(Wool))

// Instantiate a sheep
const sheep = addEntity(world)
addComponent(world, sheep, IsA(Sheep))
hasComponent(world, sheep, Vitals) // true (inherited from Animal)
hasComponent(world, sheep, Contains(Wool)) // true (from Sheep)
```
