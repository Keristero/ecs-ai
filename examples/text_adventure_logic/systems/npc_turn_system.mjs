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
  const {InRoom, Has} = world.relations
  const enemyRoom = query(world, [world.components.Room]).find(room => {
    const entitiesInRoom = query(world, [InRoom(room)])
    return entitiesInRoom.includes(actorEid)
  })
  
  if (!enemyRoom) {
    // No valid room, end turn
    await endTurn(game.eventQueue)
    return null
  }
  
  const playersInRoom = query(world, [Player, InRoom(enemyRoom)])
  
  if (playersInRoom.length > 0) {
    // Find a usable weapon in inventory
    const inventory = query(world, [Has(actorEid)])
    const weapon = inventory.find(itemEid => {
      return Item[itemEid] && Usable[itemEid]
    })
    
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
