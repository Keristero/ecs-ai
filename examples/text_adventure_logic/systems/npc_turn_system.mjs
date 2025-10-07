import {query} from 'bitecs'
import use from '../actions/use.mjs'

const npc_turn_system = ({game, event}) => {
  if (event.type !== 'turn' || event.name !== 'turn_start') return null
  
  const {world} = game
  const {Enemy, Player, Usable, Item} = world.components
  const actorEid = event.turn.actor_eid
  
  if (!Enemy[actorEid] || Player[actorEid]) return null
  
  // NPC AI logic
  const {InRoom, Has} = world.relations
  const enemyRoom = query(world, [world.components.Room]).find(room => {
    const entitiesInRoom = query(world, [InRoom(room)])
    return entitiesInRoom.includes(actorEid)
  })
  
  if (!enemyRoom) return null
  
  const playersInRoom = query(world, [Player, InRoom(enemyRoom)])
  
  if (playersInRoom.length > 0) {
    // Find a usable weapon in inventory
    const inventory = query(world, [Has(actorEid)])
    const weapon = inventory.find(itemEid => {
      return Item[itemEid] && Usable[itemEid]
    })
    
    if (!weapon) return null
    
    const target = playersInRoom[Math.floor(Math.random() * playersInRoom.length)]
    
    // Call the use action and return its event directly
    return use(game, {
      actorId: actorEid,
      itemId: weapon,
      targetId: target
    })
  }
  
  return null
}

export {npc_turn_system}
