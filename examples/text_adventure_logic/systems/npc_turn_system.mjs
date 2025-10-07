import {query, hasComponent} from 'bitecs'
import use from '../actions/use.mjs'
import {endTurn} from '../event_queue.mjs'

const npc_turn_system = async ({game, event}) => {
  if (event.type !== 'turn' || event.name !== 'turn_start') return null
  
  const {world} = game
  const {Enemy, Player, Usable, Item} = world.components
  const actorEid = event.turn.actor_eid
  
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
    await endTurn(game.eventQueue)
    return null
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
      await endTurn(game.eventQueue)
      return null
    }
    
    const target = playersInRoom[Math.floor(Math.random() * playersInRoom.length)]
    
    // Call the use action and return its event directly
    const actionEvent = use(game, {
      actorId: actorEid,
      itemId: weapon,
      targetId: target
    })
    
    // After action completes, end turn
    await endTurn(game.eventQueue)
    
    return actionEvent
  }
  
  // No targets, end turn
  await endTurn(game.eventQueue)
  return null
}

export {npc_turn_system}
