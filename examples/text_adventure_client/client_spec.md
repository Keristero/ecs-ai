# Text Adventure Client spec

### index.html
Retro styled text based adventure client, split into some panes:
- log
    - covers most the screen, we should have a config with a list of event names that should automatically have their 'message' attribute printed out. message is always in event[event.type].message
- terminal
    - user types their commands here, recursive autocomplete iterates over each word in the sentence and suggests all valid options based on the action schemas (will eventaully be provided by an special event, for now we import it from actions_interface)
- room information
    - pane on the right of the screen, a brief name and description of the room, and a list of all named entities (sorted into categories based on a configurable list of components, if an entity does not fall into a category it shows in a ??? category)
- status
    - shows all the players current stats, you can configure a list of components that should be shown like a health bar, those appear here
- inventory
    - simply lists all the items the player has

there should be a background that could be replaced with an image in future, for now its dark.

#### styling
- the aesthetic of the website is an old school age of empires kinda runescape, late 90's pc game vibe.
- the styling should be very simple, use minimal css and html to acheive something clean.

### core.mjs
All the business logic is in core, anything specific to the interface is in its respective file.

### index.mjs
All the javascript specific to the web browser lives here, the core functionallity is imported from core.

### client functionality outline
All whitelisted events are automatically written to the console, in the per event config, add an array to configure which UI elements should be automatically updated by each event (the entity update function should likely trigger them all)

the client should be blocked from submitting actions until only the player_turn_system has not resolved (its the players turn)


### server side logic
- introduce a entity update event that will be emitted whenever any component data from an entity changes, we use this to maintain up to date entity information automatically, we can simply refresh the content of most UI elements (not the log)
- there will eventually be an event with all the action definitions so the client does not have to directly access them

### code style
look at how dynamic something like the game framework is, the code should be declarative with as little hard coding as possible.

use functional style programming to acheive clean dry code.