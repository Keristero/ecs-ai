export function create_action_event(name, message, actor_eid, room_eid, success, more_details = {}) {
  let details = {
    actor_eid,
    room_eid,
    success,
    ...more_details
  }
  const event = create_event(name, message, "action",details)
  return event
}