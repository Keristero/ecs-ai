import { query, hasComponent } from 'bitecs';
import { startRound } from '../event_queue.mjs';

const turn_tracking_system = async ({ game, event }) => {
    const { world, eventQueue } = game;
    
    // React to player spawn events - this is the primary trigger for round management
    if (event.type === 'system' && event.name === 'player_spawned') {
        const { player_eid } = event.system.details;
        const { Actor } = world.components;
        
        // Verify the player has the Actor component
        if (!Actor || !hasComponent(world, player_eid, Actor)) {
            console.log(`Player ${player_eid} does not have Actor component`);
            return null;
        }
        
        // Count total actors
        const actorCount = query(world, [Actor]).length;
        console.log(`Total actors after spawn: ${actorCount}, current actor: ${eventQueue.currentActorEid}`);
        
        // If this is the first actor or no round is active, start a round
        if (!eventQueue.currentActorEid || actorCount === 1) {
            console.log(`Starting new round with ${actorCount} actor(s)`);
            await startRound(eventQueue);
            
            return {
                type: 'system',
                name: 'round_started',
                system: {
                    system_name: 'turn_tracking',
                    details: {
                        actor_count: actorCount,
                        first_actor: player_eid,
                        reason: actorCount === 1 ? 'first_player_joined' : 'round_restarted'
                    }
                }
            };
        }
        
        // If a round is active but not at this player's turn yet, inform
        if (eventQueue.currentActorEid !== player_eid) {
            return {
                type: 'system',
                name: 'actor_waiting',
                system: {
                    system_name: 'turn_tracking',
                    details: {
                        waiting_actor: player_eid,
                        current_actor: eventQueue.currentActorEid,
                        total_actors: actorCount
                    }
                }
            };
        }
    }
    
    // React to player despawn events
    if (event.type === 'system' && event.name === 'player_despawned') {
        const { player_eid } = event.system.details;
        const { Actor } = world.components;
        
        // Count remaining actors
        const actorCount = query(world, [Actor]).length;
        
        // If the despawned player was the current actor, we need to advance the turn
        if (eventQueue.currentActorEid === player_eid) {
            return {
                type: 'system',
                name: 'turn_interrupted',
                system: {
                    system_name: 'turn_tracking',
                    details: {
                        interrupted_actor: player_eid,
                        remaining_actors: actorCount,
                        reason: 'actor_disconnected'
                    }
                }
            };
        }
        
        // If no actors remain, signal round should end
        if (actorCount === 0) {
            return {
                type: 'system',
                name: 'no_actors_remaining',
                system: {
                    system_name: 'turn_tracking',
                    details: {
                        reason: 'all_players_disconnected'
                    }
                }
            };
        }
    }
    
    return null;
};

export { turn_tracking_system };
