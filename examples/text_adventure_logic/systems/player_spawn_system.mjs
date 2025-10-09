import { addEntity, addComponent, removeEntity, query } from 'bitecs';
import { create_system_event } from '../event_helpers.mjs';

const player_spawn_system = async ({ game, event }) => {
    const { world } = game;
    
    // Handle player connect events
    if (event.type === 'system' && event.name === 'player_connect') {
        const { ws_id } = event.system.details;
        
    // Spawn a new player entity (future enhancement: reuse existing placeholder if desired)
    const eid = addEntity(world);
        
        const { Player, Name, Health, Location, Inventory, Actor } = world.components;
        
        if (Player) addComponent(world, eid, Player);
        if (Name) {
            addComponent(world, eid, Name);
            Name.value[eid] = 'Adventurer';
        }
        if (Health) {
            addComponent(world, eid, Health);
            Health.current[eid] = 100;
            Health.max[eid] = 100;
        }
        if (Location) {
            addComponent(world, eid, Location);
            // Find starting room
            const rooms = query(world, [world.components.Room]);
            if (rooms && rooms.length > 0) {
                Location.roomId[eid] = rooms[0];
            }
        }
        if (Inventory) {
            addComponent(world, eid, Inventory);
            Inventory.items[eid] = [];
        }
        if (Actor) {
            addComponent(world, eid, Actor);
            Actor.initiative[eid] = 10;
        }
        
        // Track globally if not already set
        if (!game.playerId) {
            game.playerId = eid;
        }

        // Return a player_spawned event
        return create_system_event('player_spawned', `Player ${eid} spawned for ws_id ${ws_id}`, 'player_spawn', {
            ws_id: ws_id,
            player_eid: eid
        });
    }
    
    // Handle player disconnect events
    if (event.type === 'system' && event.name === 'player_disconnect') {
        const { player_eid } = event.system.details;
        
        removeEntity(world, player_eid);
        
        return create_system_event('player_despawned', `Player ${player_eid} despawned`, 'player_spawn', {
            player_eid: player_eid
        });
    }
    
    return null;
};
export { player_spawn_system };
