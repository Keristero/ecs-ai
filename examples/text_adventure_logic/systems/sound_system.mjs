import {query} from 'bitecs'

const sound_system = ({game, event}) => {
  if (event.type !== 'action' || event.name !== 'speak') return null
  
  const {world} = game
  const {InRoom} = world.relations
  const {Name} = world.components
  
  const roomEid = event.action.details?.room_eid
  if (!roomEid) return null
  
  const actorEid = event.action.actor_eid
  const entitiesInRoom = query(world, [InRoom(roomEid)])
  const listeners = entitiesInRoom
    .filter(eid => eid !== actorEid)
    .map(eid => Name.getString(eid))
  
  if (listeners.length === 0) return null
  
  return {
    type: 'system',
    name: 'heard',
    system: {
      system_name: 'sound',
      details: {
        sound: event.action.details.dialogue,
        listeners
      }
    }
  }
}

export {sound_system}
