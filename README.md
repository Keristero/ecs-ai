---
title: "ECS AI - Multi-Agent AI Playground"
description: "Main entry point for ECS AI project documentation"
audience: "new-developers"
last_updated: "2025-10-15"
version: "1.0.0"
category: "overview"
cross_references:
  - "architecture.md"
  - "framework/README.md"
  - "api/README.md"
  - "examples/text-adventure/README.md"
  - "development/setup.md"
---

# ECS AI - Multi-Agent AI Playground

## Overview

**ECS AI** is an end-to-end playground for driving Entity Component System (ECS) games through the Model Context Protocol (MCP). Built with Node.js, it demonstrates how AI agents can interact with structured game worlds using modern protocol interfaces.

**What makes this unique:** Instead of traditional game engines, this project uses BitECS for performance and MCP for AI integration, creating a playground where AI agents can understand, query, and modify game state through well-defined protocols.

- **[System Architecture](docs/architecture.md)** - Understand the three-layer design
- **[Game Logic Patterns](examples/text-adventure/game-logic.md)** - Server-side implementation
- **[Game Logic Patterns](examples/text-adventure/client.md)** - Server-side implementation

## 🚀 Quick Start (15 minutes)

### Prerequisites
- **[mise](https://mise.jdx.dev/)** for toolchain management  
- **Node.js** (installed automatically via `mise install`)
- **Ollama 0.9.6+** (installed automatically via `mise install`)

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

4. **Verify the system**:
   - **HTTP API**: `http://localhost:6060/health` 
   - **MCP Server**: `http://localhost:6061/mcp`
   - **Game Client**: Open `examples/text_adventure_client/index.html`

**What's running:**
- **ECS Game World**: Text adventure with AI-driven NPCs
- **MCP Server**: AI agents can query and modify game state
- **HTTP API**: REST interface for tools and agent prompting
- **WebSocket Server**: Real-time client communication
- **Ollama Agent**: AI backend for dynamic content generation

## Core Technology Stack

**Foundation:**
- **Node.js** with ES modules (.mjs extensions required)
- **BitECS** - High-performance Entity Component System
- **Express.js** - HTTP API server  
- **MCP SDK** - Model Context Protocol integration
- **WebSocket (ws)** - Real-time client communication

**Development Tools:**
- **mise** - Toolchain and environment management
- **Mocha + Chai** - Testing framework with 100+ tests
- **Zod** - Runtime type validation for all APIs
- **nodemon** - Development file watching and reloading

## System Architecture Overview

### Three-Layer Design

**1. Game Framework Layer** (`game_framework/`)
- **Purpose**: Universal patterns for any ECS game
- **Components**: Zod-validated entity components with type safety
- **Systems**: Declarative system registration and lifecycle management
- **Tools**: Automatic MCP tool generation from component definitions
- **Example**: `createComponent()` patterns work for RPG, RTS, or puzzle games

**2. Protocol Layer** (`api/`, `mcp_server/`)  
- **Purpose**: Communication interfaces for external systems
- **HTTP API**: REST endpoints auto-generated from MCP tool definitions
- **MCP Server**: AI agent integration with structured tool access
- **WebSocket**: Real-time client communication (game-specific)
- **Example**: AI agents can query entities, modify components, execute actions

**3. Game Logic Layer** (`examples/text_adventure_logic/`)
- **Purpose**: Game-specific implementations and mechanics
- **Systems**: Turn-based combat, inventory management, room navigation
- **Actions**: Player commands like move, pickup, attack, look
- **WebSocket Manager**: Client connection and real-time event handling
- **Example**: Different games implement different systems and actions

### Data Flow

```
AI Agent (via MCP) ←→ Game Framework ←→ ECS World ←→ Game Logic ←→ WebSocket ←→ Browser Client
                                     ↕
                               HTTP API ←→ External Tools
```

**Key Insight**: The framework provides universal patterns while game logic implements specific mechanics. This means you can build completely different game types using the same framework foundation.

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

**Deployment Note**: Custom deployments only need to override variables that differ from defaults. The API automatically derives `DEFAULT_MCP_URL` and `DEFAULT_OLLAMA_BASE_URL` for easy configuration.

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
  "prompt": "Add a magical sword to the current room and describe its properties.",
  "context": ["The player is exploring an ancient dungeon."],
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
    ├── architecture.md         # System design and data flow
    ├── framework/              # Framework patterns and tool generation
    ├── api/                    # HTTP and MCP API references
    ├── examples/               # Implementation guides and walkthroughs
    └── development/            # Setup, testing, and deployment guides
```

## Testing Strategy

**Comprehensive Coverage**: 100+ tests across framework, API, and client code

```bash
# Run all tests
mise run test             # or: pnpm test

# Run specific test suites  
npm run test:client        # Browser client logic and UI interactions
npm run test:framework     # Core ECS functionality and patterns
npm run test:api          # HTTP endpoints and validation
```

**Test Categories**:
- **Framework Tests**: ECS functionality, game initialization, system integration
- **Interface Tests**: MCP tool definitions and ECS interface validation
- **API Tests**: HTTP endpoints, request validation, error handling  
- **Client Tests**: Browser logic, command parsing, UI interactions (35 tests)

**TDD Approach**: Tests validate documentation quality, user journey completion, and structural consistency rather than just unit coverage.