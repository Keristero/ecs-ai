const combat_system = ({game, event}) => {
  if (event.type !== 'action' || event.name !== 'use') return null
  
  const {world} = game
  const {Hitpoints} = world.components
  
  // Check if the action was successful and modified hitpoints
  if (!event.action.success) return null
  if (event.action.details.modified_component !== 'Hitpoints') return null
  if (event.action.details.modified_field !== 'current') return null
  
  const targetEid = event.action.details.target_eid
  const newValue = event.action.details.new_value
  const oldValue = event.action.details.old_value
  
  // Check if target died (went from alive to dead)
  if (newValue <= 0 && oldValue > 0) {
    return {
      type: 'system',
      name: 'death',
      system: {
        system_name: 'combat',
        details: {
          entity_eid: targetEid,
          killer_eid: event.action.actor_eid,
          room_eid: event.action.details.room_eid
        }
      }
    }
  }
  
  return null
}

export {combat_system}
