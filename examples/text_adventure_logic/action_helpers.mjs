export function createActionEvent(actionName, actorEid, success, details = {}) {
  return {
    type: 'action',
    name: actionName,
    action: {
      actor_eid: actorEid,
      success,
      details
    }
  }
}
