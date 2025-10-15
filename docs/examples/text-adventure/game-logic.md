# Text Adventure Game Logic

## Overview

The text adventure game logic implements a complete turn-based RPG system using the ecs-ai framework. It demonstrates how to build complex game mechanics using Entity Component System patterns, WebSocket communication, and AI integration.

**Core Systems:**
- Turn-based gameplay with action queuing
- WebSocket server for real-time client communication
- AI narrator system for dynamic story generation
- Complete RPG mechanics (combat, inventory, movement)
- Modular component and system architecture

## Architecture

### ECS Component Design

The game logic uses a comprehensive set of components, relations and prefabs to model game entities

### System Architecture

The game implements a modular system architecture where each system handles specific game logic:

Some key systems of interest are:

#### 1. **Turn System** (`turn_system.mjs`)
- **Purpose**: Manages turn-based gameplay flow
- **Responsibilities**: 
  - Processes action queues in order
  - Handles turn completion states
  - Coordinates system execution timing
  - Ensures fair turn distribution

#### 2. **Player System** (`player_system.mjs`)
- **Purpose**: Handles player-specific logic and state management
- **Responsibilities**:
  - Processes player actions from WebSocket commands
  - Manages player session state and connection mapping
  - Validates player permissions and turn order
  - Coordinates player responses back to clients

#### 3. **NPC System** (`npc_system.mjs`)
- **Purpose**: Controls non-player character behavior and AI
- **Responsibilities**:
  - Implements enemy AI behavior patterns
  - Manages NPC action decision making
  - Handles NPC combat and interaction logic
  - Coordinates with turn system for NPC turns

#### 4. **AI Narrator System** (`ai_narrator_system.mjs`)
- **Purpose**: Generates dynamic story narration using AI
- **Responsibilities**:
  - Analyzes game events and generates contextual narration

#### 7. **Room Update System** (`room_update_system.mjs`)
- **Purpose**: Manages room state synchronization with clients
- **Responsibilities**:
  - Any event that modifies the room state should trigger a room update
  - Sends room updates to connected clients

### Action System Architecture

The game implements a comprehensive action system that validates player commands using zod, then creates an event with the context required for whichever system is resonsiple for modifying the game state.
```

#### Action Processing Pipeline
1. **Start**: Actor sends action commands
2. **Schema Validation**: Actions validated against defined schemas
4. **State Validation**: Check game state allows action
5. **Action Creation**: Queues the action with the context required for the system to execute it
6. **System**: Systems respond to the action and update the ECS world
7. **Response**: Systems can choose to respond with a system event that will inform the clients of what happened.
```