import { query } from 'bitecs';
import { create_system_event } from '../event_helpers.mjs';

const entitySnapshots = new Map();

const entity_update_system = async ({ game, event }) => {
    // Only run on turn_end events to batch updates
    if (event.type !== 'turn' || event.name !== 'turn_end') return null;
    
    const { world } = game;
    const entities = query(world, []); // Query all entities
    
    const updates = [];
    
    for (const eid of entities) {
        const previousSnapshot = entitySnapshots.get(eid);
        const currentSnapshot = createSnapshot(world, eid);
        
        if (previousSnapshot && hasChanged(previousSnapshot, currentSnapshot)) {
            updates.push(create_system_event('entity_update', `Entity ${eid} was updated`, 'entity_update', {
                entityId: eid,
                components: currentSnapshot
            }));
        }
        
        entitySnapshots.set(eid, currentSnapshot);
    }
    
    if (updates.length > 0) {
        return updates;
    }
    return null;
};

const createSnapshot = (world, eid) => {
    const snapshot = { id: eid };
    
    // Extract all component data for this entity
    for (const [componentName, component] of Object.entries(world.components)) {
        if (component[eid]) {
            snapshot[componentName.toLowerCase()] = extractComponentData(component, eid);
        }
    }
    
    return snapshot;
};

const extractComponentData = (component, eid) => {
    const data = {};
    
    // Extract all properties from the component
    for (const key in component) {
        if (Array.isArray(component[key]) && component[key][eid] !== undefined) {
            data[key] = component[key][eid];
        }
    }
    
    return data;
};

const hasChanged = (prev, current) => {
    return JSON.stringify(prev) !== JSON.stringify(current);
};

export { entity_update_system };
