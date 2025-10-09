import {query, hasComponent} from 'bitecs'
import { create_system_event } from '../event_helpers.mjs'

const sound_system = ({game, event}) => {
  if (event.type !== 'action' || event.name !== 'speak') return null
  if (!event.details.success) return null
  
  const {world} = game
  const {Has} = world.relations
  const {Ears, Name} = world.components
  
  const roomEid = event.details.room_eid
  if (!roomEid) return null
  
  const actorEid = event.details.actor_eid
  
  // Find all entities in the room (entities that the room Has)
  const allEntities = []
  for (let eid = 0; eid < 1000; eid++) {
    if (hasComponent(world, roomEid, Has(eid))) {
      allEntities.push(eid)
    }
  }
  
  // Find entities with Ears, excluding the speaker
  const listenerIds = allEntities
    .filter(eid => eid !== actorEid && hasComponent(world, eid, Ears))
  
  if (listenerIds.length === 0) return null
  
  // Get listener names
  const listeners = listenerIds.map(eid => 
    world.string_store.getString(Name.value[eid])
  )
  
  return create_system_event('heard', `${listeners.length} listeners heard: "${event.details.dialogue}"`, 'sound', {
    sound: event.details.dialogue,
    listener_count: listeners.length,
    listeners,
    room_eid: roomEid
  })
}

export {sound_system}
