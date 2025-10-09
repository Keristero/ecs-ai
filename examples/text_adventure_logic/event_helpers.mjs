import { z } from 'zod'

//zod schema for event
let event_schema = z.object({
  name: z.string(),
  message: z.string(),
  type: z.enum(["action", "system"]),
  details: z.record(z.any())
})

function create_event(event_name, message, event_type, details){
  if (!event_schema.safeParse({name: event_name, message, type: event_type, details}).success) {
    throw new Error("Invalid event format")
  }
  const event = {
    name: event_name,
    message: message,
    type: event_type,
    details: details
  }
  return event
}

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

export function create_system_event(name, message, system_name, more_details = {}) {
  let details = {
    system_name,
    ...more_details
  }
  const event = create_event(name, message, "system",details)
  return event
}
