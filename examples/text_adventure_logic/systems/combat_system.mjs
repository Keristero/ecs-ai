import { create_system_event } from '../event_helpers.mjs'

const combat_system = ({game, event}) => {
  if (event.type !== 'action' || event.name !== 'use') return null
  
  const {world} = game
  const {Hitpoints} = world.components
  
  // Check if the action was successful and modified hitpoints
  if (!event.details.success) return null
  if (event.details.modified_component !== 'Hitpoints') return null
  if (event.details.modified_field !== 'current') return null
  
  const targetEid = event.details.target_eid
  const newValue = event.details.new_value
  const oldValue = event.details.old_value
  
  // Check if target died (went from alive to dead)
  if (newValue <= 0 && oldValue > 0) {
    return create_system_event('death', `Entity ${targetEid} was killed by ${event.details.actor_eid}`, 'combat', {
      entity_eid: targetEid,
      killer_eid: event.details.actor_eid,
      room_eid: event.details.room_eid
    })
  }
  
  return null
}

export {combat_system}
