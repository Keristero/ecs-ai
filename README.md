# ECS AI

## Overview

**ECS AI** is an experiment by me to see how well I can get an AI agent to understand and maniupulate a simulated world when it is given a well defined framework for interaction.

**What makes this unique:** Many games have tried using AI to generate narratives, but usually this narrative is based on the existing context of an ongoing converstaion and devolves quickly (see aidungeon) for this project I wanted to provide all the required context every time I use the AI, this hopefully prevents major hallucinations and keeps things closer to the ground truth of what is happening in the simulation.

I also want to experiment with modifying the game world using AI behind the scenes, interfacing it with systems to augment things like:
- NPC behaviour
- Procedural generation
- Balance decisions

- **[System Architecture](docs/architecture.md)** - Understand the three-layer design
- **[Game Logic Patterns](examples/text-adventure/game-logic.md)** - Server-side implementation
- **[Game Logic Patterns](examples/text-adventure/client.md)** - Server-side implementation

## 🚀 Quick Start

### Prerequisites
- **[mise](https://mise.jdx.dev/)** for toolchain management  
- activate mise in your chosen terminal emulator, check its status with `mise doctor`

### Launch the Complete System

1. **Install dependencies and tools**:
   ```bash
   mise install                 # Install Node.js and Ollama
   mise run install            # Install npm packages using pnpm
   ```

2. **Start the AI backend** (Terminal 1):
   ```bash
   mise run ollama             # Ollama listens on port 6062 by default
   ```

3. **Launch the game stack** (Terminal 2):
   ```bash
   mise start                  # Boots ECS game + MCP server + HTTP API
   ```

4. **Host the client html** (Terminal 2):
   I like to use the live server extension to open `examples/text_adventure_client/index.html`

4. **Verify the system**:
   - **HTTP API**: `http://localhost:6060/health` 
   - **MCP Server**: `http://localhost:6061/mcp`
   - **Game Client**: `examples/text_adventure_client/index.html`

## Core Technology Stack

**Foundation:**
- **Node.js** with ES modules (.mjs extensions required)
- **BitECS** - High-performance Entity Component System
- **Express.js** - HTTP API server  
- **MCP SDK** - Model Context Protocol integration

**Development Tools:**
- **mise** - Toolchain and environment management
- **Mocha + Chai** - Testing framework with 100+ tests
- **Zod** - Runtime type validation for all APIs
- **nodemon** - Development file watching and reloading

**Text Adventure Example**
- **WebSocket (ws)** - Real-time client communication

### Data Flow

```
AI Agent (via MCP) ←→ Game Framework ←→ ECS World ←→ Game Logic ←→ WebSocket ←→ Browser Client
                                     ↕
                               HTTP API ←→ External Tools
```

## Environment Configuration

All configuration lives in `environment.mjs` with environment variable overrides:

| Variable | Purpose | Default |
|----------|---------|---------|
| `GAME_LOGIC_FOLDER_PATH` | Game logic bundle location | `./examples/text_adventure_logic` |
| `GAME_LOGIC_SCRIPT_NAME` | Entry point filename | `game.mjs` |
| `MCP_HOST` / `MCP_PORT` | MCP server bind address | `127.0.0.1:6061` |
| `API_HOST` / `API_PORT` | HTTP API bind address | `0.0.0.0:6060` |
| `OLLAMA_HOST` | Ollama service location | `127.0.0.1:6062` |
| `OLLAMA_MODEL_NAME` | AI model for agent prompting | `qwen3` |

## API Overview

### HTTP API Surface

**Auto-Generated from MCP Tools**: The API surface is dynamically created from tool definitions in `game_framework/ecs_interface.mjs`, ensuring consistency between MCP and HTTP interfaces.

**Introspection Endpoints**:
- `GET /health` - Service heartbeat and system status
- `GET /tools` - List all available tool handles with schemas

**Tool Execution**:
- `POST /tools/:handle` - Execute any MCP tool via HTTP
- **Validation**: Zod schemas validate request bodies automatically  
- **Response**: JSON with tool handle and human-friendly result

**AI Agent Integration**:
- `POST /agent/prompt` - Forward instructions to Ollama with MCP context
- **Auto-Configuration**: Agent receives MCP callback URLs automatically
- **Tool Control**: Whitelist/blacklist specific tools per prompt
- **Streaming**: Set `stream: true` for real-time AI responses

### Example AI Agent Request

```json
{
  "prompt": "Add a magical sword to the reward room",
  "context":, //other context would be here
  "toolsWhitelist": ["addEntity", "addComponent", "addComponentWithValues"],
  "options": { "temperature": 0.7 }
}
```

The agent automatically receives MCP access and can call back to modify the game world while generating responses.

## Project Structure

```
ecs-ai/
├── main.mjs                      # System entry point - boots all services
├── environment.mjs               # Centralized configuration management
├── game_framework/               # Universal ECS patterns and tools
│   ├── framework.mjs            # Core ECS initialization and management
│   ├── create_component.mjs     # Type-safe component creation
│   └── ecs_interface.mjs        # MCP tool definitions
├── api/                         # HTTP API layer
│   ├── server.mjs              # Express.js server with auto-generated routes
│   └── docs.mjs                # API documentation generation
├── mcp_server/                  # Model Context Protocol integration
│   └── mcp_server.mjs          # MCP server implementation
├── examples/                    # Reference implementations
│   ├── text_adventure_logic/   # Complete RPG game logic
│   └── text_adventure_client/  # Browser-based game client
├── tests/                       # Comprehensive test suite
│   ├── framework.test.mjs      # Framework pattern tests
│   ├── api.test.mjs           # HTTP API validation tests
│   └── ecs_interface.test.mjs  # MCP tool integration tests
└── docs/                        # Consolidated documentation
    └── architecture.md         # System design and data flow
```

## Testing Strategy
```bash
# Run all tests
mise run test             # or: pnpm test

# Run specific test suites  
npm run test:client        # Browser client logic and UI interactions
npm run test:framework     # Core ECS functionality and patterns
npm run test:api           # HTTP endpoints and validation
```

**Test Categories**:
- **Framework Tests**: ECS functionality, game initialization, system integration
- **Interface Tests**: MCP tool definitions and ECS interface validation
- **API Tests**: HTTP endpoints, request validation, error handling  
- **Client Tests**: Browser logic, command parsing, UI interactions