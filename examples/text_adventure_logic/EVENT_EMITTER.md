# Event Queue - Event Emitter Pattern

The event queue has been refactored to use Node.js `EventEmitter` pattern, providing a clean subscription-based architecture for handling game events and broadcasting them to clients.

## Architecture

The event queue now emits two types of events that can be subscribed to:

### 1. Individual Events (`'event'`)
Emitted whenever any event is queued (actions, turns, rounds, system events).

```javascript
eventQueue.on('event', (event) => {
  console.log('Event queued:', event.type, event.name);
  // event structure: { type, name, action/turn/system, guid }
});
```

### 2. Round State Updates (`'round_state'`)
Emitted after significant state changes (round start, turn start, turn end, round end).

```javascript
eventQueue.on('round_state', (roundState) => {
  console.log('Round state update:', roundState);
  // roundState structure: { playerId, currentActorEid, events, systemsResolved }
});
```

## Usage in Server (WebSocket Broadcasting)

The API server subscribes to these events to broadcast to WebSocket clients:

```javascript
// Subscribe to individual events
game.eventQueue.on('event', (event) => {
  const message = JSON.stringify({
    type: 'event',
    data: event
  });
  
  clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
});

// Subscribe to round state updates
game.eventQueue.on('round_state', (roundState) => {
  const message = JSON.stringify({
    type: 'round_state',
    data: roundState
  });
  
  clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
});
```

## Event Queue API

The event queue provides convenience methods that wrap the underlying `EventEmitter`:

```javascript
// Subscribe to events
eventQueue.on('event', handlerFn);
eventQueue.on('round_state', handlerFn);

// Subscribe once (automatically unsubscribe after first call)
eventQueue.once('event', handlerFn);

// Unsubscribe
eventQueue.off('event', handlerFn);

// Direct access to emitter if needed
eventQueue.emitter.emit('custom_event', data);
```

## Benefits

1. **Decoupled Architecture**: The event queue doesn't need to know about WebSocket clients or broadcasting logic
2. **Multiple Subscribers**: Any number of listeners can subscribe to events
3. **Standard Pattern**: Uses Node.js EventEmitter, familiar to Node developers
4. **Testable**: Tests can easily subscribe to events to verify behavior
5. **Extensible**: Easy to add new event types or subscribers

## Example: Testing with Event Emitter

```javascript
it('should emit events when action is queued', (done) => {
  const eventQueue = createEventQueue(game);
  
  eventQueue.once('event', (event) => {
    expect(event.type).to.equal('action');
    expect(event.name).to.equal('move');
    done();
  });
  
  const moveEvent = move(game, { playerId: game.playerId, direction: 'north' });
  queueEvent(eventQueue, moveEvent);
});
```

## Migration from Callback Pattern

### Before (Callback Pattern):
```javascript
game.broadcastEvent = (event) => {
  // Broadcasting logic
};
```

### After (Event Emitter Pattern):
```javascript
game.eventQueue.on('event', (event) => {
  // Broadcasting logic
});

game.eventQueue.on('round_state', (roundState) => {
  // Round state broadcasting logic
});
```

## Event Flow

```
Action Executed
    ↓
queueEvent() called
    ↓
Event added to queue
    ↓
emit('event', event) ← Subscribers notified
    ↓
Systems process event
    ↓
System events queued (recursive)
    ↓
Round state changes
    ↓
emit('round_state', state) ← Subscribers notified
```
