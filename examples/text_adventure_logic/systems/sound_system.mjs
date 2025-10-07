import {query, hasComponent} from 'bitecs'

const sound_system = ({game, event}) => {
  if (event.type !== 'action' || event.name !== 'speak') return null
  if (!event.action.success) return null
  
  const {world} = game
  const {InRoom, Has} = world.relations
  const {Ears, Name} = world.components
  
  const roomEid = event.action.details.room_eid
  if (!roomEid) return null
  
  const actorEid = event.action.actor_eid
  const entitiesInRoom = query(world, [InRoom(roomEid)])
  
  // Find entities with Ears, excluding the speaker
  const listeners = entitiesInRoom
    .filter(eid => eid !== actorEid && hasComponent(world, eid, Ears))
    .map(eid => Name.getString(eid))
  
  if (listeners.length === 0) return null
  
  return {
    type: 'system',
    name: 'heard',
    system: {
      system_name: 'sound',
      details: {
        sound: event.action.details.dialogue,
        listeners,
        room_eid: roomEid
      }
    }
  }
}

export {sound_system}
