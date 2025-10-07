export function createActionEvent(actionName, actorEid, roomEid, success, details = {}) {
  return {
    type: 'action',
    name: actionName,
    action: {
      actor_eid: actorEid,
      room_eid: roomEid,
      success,
      details
    }
  }
}
