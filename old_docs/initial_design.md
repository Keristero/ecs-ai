### Premise

This system consists of 4 parts:
1. Game:
    - Uses a ECS system to set up a game world, contains code for the game loop, game systems, etc.
    - exports all the ECS methods that we want to expose to the MCP server
2. A MCP server which exposes all the ECS methods provided by the game.
3. A standalone local large language model which supports interacting with MCP servers.
4. An API which allows you to:
    - Directly call ECS methods via the MCP server
    - Give high level instructions to the LLM, which will then call the appropriate ECS methods via the MCP server
        - As extra arguments, you should be able to blacklist or whitelist the ECS methods that the LLM can use by name.
    - Provide extra context to the LLM to assist in generating the desired output


### Example usage.
A text based adventure game which works like this:
1. the game world is loaded from a snapshot
2. the game client uses the API to ask for a description of the player's current environment from the LLM
3. the game uses the API to retrieve the actual entities in the player's current environment
4. the player issues a valid command using text input (clientside validation)
5. the LLM receives the command and uses the MCP server to update the ECS world to reflect the player's action
6. the LLM responds with a description of the results of the player's action
7. the game uses the API to retrieve the actual entities in the player's current environment

## 1. Game
BITECS selected as the ECS system, the full api is here: https://github.com/NateTheGreatt/bitECS/blob/main/docs/API.md
should have a folder dedicated to the actual game logic, organized into files and folders like this:
/game
    main.js - entry point for the game, contains the game loop and automatically loads all the components, prefabs, relationships from their respective folders in /game_logic, it also imports the update system and runs it in a loop with a configurable ticrate.
    mcp_interface.js - imports and exports all the ECS methods that we want to expose to the MCP server
    /game_logic - all the game specific code, designed to be atomic so it can be swapped out for different games without requiring modififcation of main.js or mcp_interface.js
        /systems
            update.js - main system which runs all the other systems in a specified order.
        /components
        /prefabs
        /relationships
        /utils - helper functions for the game
        snapshots.js - functions for creating and loading snapshots of the ECS world
/mcp_server
    main.js - entry point for the MCP server
    methods.js - dynamically imports and exposes all the methods exported by the game from /game/mcp_interface.js

ECS methods for the MCP server to expose include:
- querying
    - query

- entity management
    - addEntity
    - removeEntity
    - getEntityComponents
    - isA

- component management
    - addComponent
    - removeComponent

- relationship management
    - createRelation
    - getRelationTargets

- prefabs
    - addPrefab

- custom helper functions
    - getEntityComponentsWithValues
    - setValueOfComponentForEntity

- world management
    - createSnapshot
    - loadSnapshot
    - createWorld
    - pauseGameLoop
    - resumeGameLoop

## 2. MCP server 
should implement all the methods provided by the game.

## 3. LLM
This will just be a model run locally using ollama cli's `ollama serve` command, this hosts a web server, so we will simply need to configure the API to be able to talk to it.

## 4. API
This is the main application, a nodejs express server with minimal dependencies.
It should be able to dynamically read the MCP sever's API and generate endpoints for any methods it provides.
It should also have endpoints for directing the LLM to do whatever, this endpoint will have optional whitelist and blacklist parameters to control which MCP methods the LLM should be allowed to discover.


## Structure
The structure of the system and overall dependencies should be something like this:

folders:
/game
    /game_logic
/mcp_server
/api
/logs
/example_clients
    /text_adventure
mise.toml


## technologies and dependencies
mise.toml
- installs required tools (ollama, nodejs)
- contains environment variables required for starting up the system
    - port numbers
    - which /game_logic folder to use for the game
- contains mise task to start everything up
    - start the game + mcp server
    - start the ollama server
    - start the api server
    - log outputs from all applications to log files in /logs

LLM:
- should be small quantized model capable of connecting to MCP servers, and thinking. runs fast on RTX 4080 Super (16GB VRAM)

API:
- nodejs application
- requires express
- requires axios
- Requests to ollama server
- Direct requests to MCP server

MCP server and Game:
- nodejs application
- consists of two parts:
    - Game
    - MCP server
- requires all the ECS methods exported by the game, dynamically exposing them VIA MCP.
- requires @modelcontextprotocol/sdk

Example game client:
- text based adventure game
- simple nodejs webserver that serves a static html page + js files
    - static html page has a text input, a autoscrolling log for game output with live text blitting and different colored fonts for player input vs system replies
    - there should a folder with scripts for each supported text command the player can run
        - inspect
        - move
        - take
        - use
        - talk
        - attack
        - inventory
        - help
    - command should support autocompletion based on the entities in the current room / the players inventory, etc.

## Coding style
- all the code is javascript, it should be concise and clear, strive for declarative code, use functional programming approaches to keep the code somewhat dry.
- ensure you use modern javascript, eg: async/await instead of callbacks with promises etc.
- ensure you use ES6 modules, no commonjs (for the example website)
- keep dependencies to an absolute minimum.
- make sure the code is well decoupled, but with minimal boilerplate and minimnal corporate object oriented programming patterns.
- comments should be simple one liners at most, the code should be self documenting.
- each nodejs application should have a simple environment.js file that reads the environment variables.
- each nodejs application should have a simple logger.js file with a function for writing to a fresh log file (overwrite the old one) each time it starts.
- Use as much spec generation as possible, most MCP and API endpoints should be generated dynamically