import {query, hasComponent} from 'bitecs'
import use from '../actions/use.mjs'
import System from '../System.mjs'

const npc_turn_system = new System('npc_turn')
npc_turn_system.func = async function ({game, event}) {
  if (event.type !== 'round' || event.name !== 'round_info') return null
  
  const {world} = game
  const {Enemy, Player, Usable, Item} = world.components
  const actorEid = event.details.actor_eid
  
  if (!hasComponent(world, actorEid, Enemy) || hasComponent(world, actorEid, Player)) return null
  
  // NPC AI logic
  const {Has} = world.relations
  const {Room} = world.components
  
  // Find which room has this enemy
  const enemyRoom = query(world, [Room]).find(room => {
    return hasComponent(world, room, Has(actorEid))
  })
  
  if (!enemyRoom) {
    // No valid room, end turn
    return this.create_event('turn_complete', `NPC ${actorEid} turn ended (no room)`, { actor_eid: actorEid })
  }
  
  // Find all players in the same room
  const allPlayers = query(world, [Player])
  const playersInRoom = allPlayers.filter(player => {
    return hasComponent(world, enemyRoom, Has(player))
  })
  
  if (playersInRoom.length > 0) {
    // Find a usable weapon in inventory (items that the enemy Has)
    const allItems = query(world, [Item])
    const inventory = allItems.filter(itemId => hasComponent(world, actorEid, Has(itemId)))
    const weapon = inventory.find(itemEid => hasComponent(world, itemEid, Usable))
    
    if (!weapon) {
      // No weapon, end turn
      return this.create_event('turn_complete', `NPC ${actorEid} turn ended (no weapon)`, { actor_eid: actorEid })
    }
    
    const target = playersInRoom[Math.floor(Math.random() * playersInRoom.length)]
    
    // Call the use action and return its event directly
    const actionEvent = use(game, {
      actorId: actorEid,
      itemId: weapon,
      targetId: target
    })
    
    // Return action event followed by turn completion
    const turnComplete = this.create_event('turn_complete', `NPC ${actorEid} turn ended after action`, { actor_eid: actorEid })
    return actionEvent ? [actionEvent, turnComplete] : turnComplete
  }
  
  // No targets, end turn
  return this.create_event('turn_complete', `NPC ${actorEid} turn ended (no targets)`, { actor_eid: actorEid })
}

export {npc_turn_system}
