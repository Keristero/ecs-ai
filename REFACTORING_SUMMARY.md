# Refactoring Summary - October 6, 2025

## Overview
Major refactoring of the ECS text adventure game to improve maintainability, reduce code duplication, and add dynamic action loading with AI summarization.

---

## 1. Dynamic Action Loading & Metadata System

### Changes to Actions
**All action files** (`move.mjs`, `look.mjs`, `pickup.mjs`, `drop.mjs`, `use.mjs`, `gameinfo.mjs`) now export metadata:

```javascript
export const metadata = {
    name: 'action_name',
    aliases: ['alias1', 'alias2'],
    description: 'What the action does',
    parameters: ['param1', 'param2'],
    autocompletes: [['Component1'], ['Component2']],
    inputSchema: z.object({ /* zod schema */ }),
    summarizeWithAI: false // or true
}
```

### Benefits
- ✅ No hardcoded command lists in clients
- ✅ Actions automatically discovered from API
- ✅ Autocomplete works based on component requirements
- ✅ Single source of truth for action definitions

---

## 2. Component Observer System Refactoring

### Before (setup_world.mjs)
```javascript
// 120 lines of repetitive observer code
observe(world, onSet(Name), (eid, params) => { /* ... */ })
observe(world, onGet(Name), (eid) => { /* ... */ })
observe(world, onSet(Description), (eid, params) => { /* ... */ })
observe(world, onGet(Description), (eid) => { /* ... */ })
// ... repeated for every component
```

### After (text_adventure_components.mjs)
```javascript
const COMPONENT_METADATA = {
    Name: { stringFields: ['value'] },
    Description: { stringFields: ['value'] },
    Hitpoints: { numberFields: ['max', 'current'] },
    Usable: {
        stringFields: ['targetComponent', 'modifyComponent', 'modifyField'],
        numberFields: ['modifyAmount']
    }
    // ... declarative configuration
}

setupComponentObservers(world) // One function call
```

### Benefits
- ✅ 120 lines reduced to ~30 lines + metadata
- ✅ Adding new components requires only metadata update
- ✅ No more copy-paste observer code
- ✅ All component logic centralized in components file

---

## 3. Client Refactoring (core.js, client.js, cli.js)

### core.js Changes
**Removed:**
- Hardcoded `COMMANDS` object with static action definitions
- Manual command parsing for each action

**Added:**
- `loadActionsMetadata()` - Fetches actions from `/actions` endpoint
- `summarizeWithAI()` - Generates natural language narratives
- Entity collection helpers (`getEntitiesByType`, `getEntitiesByComponent`, etc.)
- Dynamic command building from metadata

### client.js & cli.js Changes
- Now use core.js functions for all game logic
- Display AI summaries when available
- Autocomplete works with dynamic metadata
- History management through `GameState` class

### Benefits
- ✅ DRY: Clients share common logic via core.js
- ✅ Consistent behavior across browser and CLI
- ✅ AI-generated narrative for immersive gameplay
- ✅ Smart autocomplete based on context

---

## 4. Entity Handling with Functional Helpers

### Before
```javascript
// Repeated 4+ times in formatRoomInfo
if (roomData.items && roomData.items.length > 0) {
    lines.push('Items:');
    roomData.items.forEach(item => {
        if (item.name) {
            lines.push(`  • ${item.name} [${item.id}]`);
            if (item.description) {
                lines.push(`    ${item.description}`);
            }
        }
    });
}
// Similar blocks for enemies, landmarks, inventory...
```

### After
```javascript
const ENTITY_TYPES = {
    items: { label: 'Items', componentType: 'Item' },
    enemies: { label: 'Enemies', componentType: 'Enemy' },
    // ... configuration
}

for (const typeName of ['landmarks', 'items', 'enemies', 'inventory']) {
    lines.push(...formatEntityCollection(roomData, typeName));
}
```

### Benefits
- ✅ 80 lines → 30 lines in `formatRoomInfo`
- ✅ 60 lines → 35 lines in `getAutocompleteSuggestions`
- ✅ Consistent formatting across entity types
- ✅ Adding new entity types = update config only

---

## 5. Generic Use Action System

### Before
```javascript
switch (useEffect) {
    case 'damage': /* 30 lines of hardcoded damage logic */
    case 'heal': /* 20 lines of hardcoded heal logic */
}
```

### After
```javascript
// Read component field to modify from item's Usable component
const usableData = getComponent(world, item, Usable)
const targetComponent = world.components[usableData.targetComponent]
const modifyComponent = world.components[usableData.modifyComponent]

// Apply modification generically
modifyComponent[usableData.modifyField][targetId] += usableData.modifyAmount
```

### Item Configuration (Prefabs)
```javascript
// Rusty Sword
{ targetComponent: 'Enemy', modifyComponent: 'Hitpoints', 
  modifyField: 'current', modifyAmount: -5 }

// Health Potion
{ targetComponent: 'Hitpoints', modifyComponent: 'Hitpoints',
  modifyField: 'current', modifyAmount: 20 }
```

### Benefits
- ✅ No hardcoded game logic in actions
- ✅ Data-driven item design
- ✅ New item types without code changes
- ✅ Items can modify any component field

---

## 6. AI Summarization System

### How It Works
1. Action executes and returns structured result
2. If `metadata.summarizeWithAI === true` and `result.success === true`
3. Send result to `/agent/prompt` endpoint
4. AI generates natural language narrative
5. Display both technical result and AI narrative

### Example
**Technical result:**
```json
{
  "success": true,
  "damage": 5,
  "targetDead": false,
  "itemName": "rusty sword",
  "targetName": "goblin"
}
```

**AI narrative:**
> "You swing the rusty sword at the goblin, striking true! The goblin staggers from the blow."

### Benefits
- ✅ Immersive storytelling
- ✅ Debug info still available
- ✅ Optional per action
- ✅ Consistent tone/style

---

## Code Metrics

| Component | Before | After | Reduction |
|-----------|--------|-------|-----------|
| setup_world.mjs observers | 120 lines | 30 lines + metadata | **75% reduction** |
| core.js formatRoomInfo | 80 lines | 30 lines | **62% reduction** |
| core.js autocomplete | 60 lines | 35 lines | **42% reduction** |
| Action command definitions | ~50 lines hardcoded | Dynamic from API | **100% reduction** |

---

## Testing Checklist

- [x] Actions load dynamically from API
- [x] Autocomplete suggests correct entities
- [x] Component observers work with refactored system
- [ ] AI summarization generates narratives
- [ ] Generic use action works with all item types
- [ ] Browser client functions correctly
- [ ] CLI client functions correctly
- [ ] All aliases work (e.g., 'u' for 'use')

---

## Migration Notes

### For Adding New Actions
1. Create action file in `actions/` directory
2. Export default function and metadata
3. No client changes needed - automatically discovered

### For Adding New Components
1. Define component structure in `text_adventure_components.mjs`
2. Add entry to `COMPONENT_METADATA` with field types
3. No observer code needed - automatically generated

### For Adding New Item Types
1. Create prefab with `Usable` component
2. Specify: targetComponent, modifyComponent, modifyField, modifyAmount
3. No action code changes needed - fully data-driven

---

## Architecture Improvements

### Separation of Concerns
- **Components file**: Component definitions + metadata + observer setup
- **Setup world**: Entity creation and world initialization
- **Actions**: Game logic without UI concerns
- **Clients**: Presentation layer using shared core

### Data-Driven Design
- Action metadata drives autocomplete
- Component metadata drives observers
- Item metadata drives use mechanics
- No business logic in presentation layer

### Extensibility
- New actions: Add file + metadata
- New components: Add definition + metadata
- New item types: Add prefab with Usable data
- New entity types: Update ENTITY_TYPES config

---

## Future Enhancements

### Possible Next Steps
1. **Relationships**: Use bitECS relations for more complex interactions
2. **Status Effects**: Generic system like Usable but for buffs/debuffs
3. **Quests**: Track objectives with components
4. **Combat System**: Turn-based using component state
5. **Inventory UI**: Visual inventory using entity helpers
6. **Save/Load**: Serialize world state
7. **Multiplayer**: Multiple player entities with actions

### Technical Debt
- [ ] Add comprehensive error handling for AI summarization
- [ ] Cache action metadata to reduce API calls
- [ ] Add tests for observer system
- [ ] Document all public APIs
- [ ] Add TypeScript type definitions
