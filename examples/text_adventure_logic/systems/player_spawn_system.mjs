import { addEntity, addComponent, removeEntity, query } from 'bitecs';

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
        return {
            type: 'system',
            name: 'player_spawned',
            system: {
                system_name: 'player_spawn',
                details: {
                    ws_id: ws_id,
                    player_eid: eid
                }
            }
        };
    }
    
    // Handle player disconnect events
    if (event.type === 'system' && event.name === 'player_disconnect') {
        const { player_eid } = event.system.details;
        
        removeEntity(world, player_eid);
        
        return {
            type: 'system',
            name: 'player_despawned',
            system: {
                system_name: 'player_spawn',
                details: {
                    player_eid: player_eid
                }
            }
        };
    }
    
    return null;
};
export { player_spawn_system };
