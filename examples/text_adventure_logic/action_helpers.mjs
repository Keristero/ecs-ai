export function createActionEvent(actionName, actorEid, roomEid, success, details = {}, eventGuid = null) {
  const event = {
    type: 'action',
    name: actionName,
    action: {
      actor_eid: actorEid,
      room_eid: roomEid,
      success,
      details
    }
  }
  
  // If a GUID was provided (from client), attach it to the event
  if (eventGuid) {
    event.guid = eventGuid
  }
  
  return event
}
