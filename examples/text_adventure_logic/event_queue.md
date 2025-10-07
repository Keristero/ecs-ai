# Event Queue Refactor


## Instructions:
Currently the game allows actors to use actions like move, look, pickup, speak
These actions currently immediately play out, and have an effect.

We also have an unused concept of systems that we should be using.

## Events
To leverage systems, we will introduce events. when certain actions take place, for example "Speak", a event will be emitted, for example speak might create a "Speak" event. events will always generate one event, the new event object is going to replace the existing success / fail responses.

Example speak event.
```js
let event = {
    type:"action",
    name:"speak"
    guid://auto generated when added to the queue
    action:{
        actor_eid:5//required, name of the actor that performed the action
        success:true//required, did action succeed or fail?
        details:{//optional extra information, fields change per event.
            room_eid:3
            dialogue:"Where am I?"
        }
    }
}
```

## Event Queue
We will have a single event queue on the game object that gets passed through to actions so that they can append events to it.
When an event is appended to the eventqueue (through a special function on it), the event queue will automatically run all systems with (event,game). once ALL systems promises have resolved, we append any new events that resolved to the queue before moving on to process the next event.

Once all systems have resolved all events, the current game turn is finished, the event queue keeps track of actors who get a turn by querying the ECS for a list of entities with the Actor component, the actor component has an initiative number which determines the turn order (sorted)

turn end events cant be responded to with another event, but all others can.

Here is an example of how a turn might work:

1. the round start event is emitted (built into the event queue)
1. the turn start event is emitted (built into the event queue)
1. the player_input system sees that its the players turn, it waits for an action to be invoked by the game client.
1. a player uses the "speak" action which emits a speak event
1. the sound system will see this "speak" event and append its own "heard" event
1. the event queue sees that all systems have resolved, so it adds a turn ending event (built into the event queue)
1. the event queue has more actors to process still, so it emits a turn start event for the next actor (2nd highest initiative)
1. the enemy_input system sees that its one of the enemies turns, the enemy chooses an action
1. the enemy uses the "use" action to attack the player with its sword
1. the combat system sees the uses event and checks to see if anyone died
1. the player died, so the combat system emits a "death" event for that player
1. the event queue sees that all systems have resolved, so it adds a turn ending event (built into the event queue)
1. there are no more actors to resolve, the round ends, the event queue is cleared, and a fresh round begins.

## Systems
Each system is a promise that receives (event,game) as an input and is expected to resolve an event or null.

1. the sound system should wait for "speak" events it will then query for any entities with ears in the room that the event occured in (excluding the actor), it will then add its own event "heard" event to the queue, for example:
```js
let event = {
    type:"system",
    name:"heard"
    system:{
        system_name:"sound"//required, name of the system which generated the event
        details:{//optional extra information, fields change per event
            sound:"Where am I?",
            listeners:["Goblin","ShopKeeper"]
        }
    }
}
```
## Game client

For now we can ignore the game client, first we should implement all the logic here, as well as tests for it. afterwards we can move onto upgrading the API to provide websockets, so that we can upgrade the game client to talk over websockets, this will allow the client to process events as they happen.