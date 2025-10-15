---
title: "System Architecture"
description: "Comprehensive system architecture documentation for ECS AI"
audience: "new-developers|existing-developers"
last_updated: "2025-10-15"
version: "1.0.0"
category: "overview"
cross_references:
  - "README.md"
  - "framework/README.md"
  - "api/README.md"
---

# System Architecture

## Overview

ECS AI implements a **three-layer architecture** that separates game logic, protocol interfaces, and runtime orchestration. This design enables AI agents to interact with complex game worlds through standardized protocols while maintaining high performance through BitECS.

**Core Philosophy**: Configuration-driven, event-based, protocol-first design that enables AI agents to understand and modify game state through well-defined interfaces.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                            │
├─────────────────────────────────────────────────────────────┤
│  Web Clients  │  AI Agents  │  HTTP Clients  │  MCP Clients │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────────────┐
│                   Protocol Layer                            │
├─────────────────────────────────────────────────────────────┤
│  HTTP API Server │ WebSocket │ MCP Server │ Tool Definitions │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────────────┐
│                 Game Framework Layer                        │
├─────────────────────────────────────────────────────────────┤
│    ECS World   │  Component  │   Tool       │   Interface   │
│   Management   │   Creation  │ Generation   │  Definitions  │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────────────┐
│                 Game Logic Layer                            │
├─────────────────────────────────────────────────────────────┤
│  Components │ Systems │ Actions │ Prefabs │ Relations │Event│
│  (Domain)   │(Behavior)│(Input)  │(Templates)│(Links) │Queue│
└─────────────────────────────────────────────────────────────┘
```

## Component Relationships

### 1. **Runtime Orchestration**

**Entry Point**: `main.mjs`
```javascript
main.mjs → environment.mjs (config) → framework.mjs (game world)
       ↓
   HTTP API Server + MCP Server + Game Loop
```

**Key Responsibilities**:
- Load environment configuration
- Initialize game framework with specified logic bundle
- Start HTTP API server and MCP server concurrently
- Coordinate graceful shutdown

### 2. **Configuration Management**

**Central Hub**: `environment.mjs`
```javascript
// Environment Variables → Computed Configuration
GAME_LOGIC_FOLDER_PATH → baseGameLogicPath
MCP_HOST + MCP_PORT → DEFAULT_MCP_URL  
API_HOST + API_PORT → HTTP server binding
OLLAMA_HOST + OLLAMA_PORT → DEFAULT_OLLAMA_BASE_URL
```

**Design Pattern**: Single source of truth with runtime overrides
- Default values provided for all configuration
- Environment variables override defaults
- Computed URLs derived consistently

### 3. **Game Framework Layer**

**Core Components**:

```javascript
framework.mjs          // World orchestration
├── ecs_interface.mjs  // MCP tool definitions
├── create_component.mjs // Component helpers
└── Game Logic Bundle  // Domain-specific implementation
    ├── components/    // Domain components
    ├── systems/       // Game behavior systems  
    ├── actions/       // Player/AI interactions
    ├── prefabs/       // Entity templates
    └── relations/     // Entity relationships
```

**ECS World Management**:
- **World Creation**: BitECS world with string store for text data
- **Component Registration**: Schema-driven component creation with observers
- **System Orchestration**: Priority-based system execution framework
- **Tool Generation**: Automatic MCP tool creation from component definitions

**Framework Patterns**:
- `CreateComponent(schema)` - Zod schema validation + BitECS integration
- **System Registration**: Declarative system definition and lifecycle management
- **Tool Interface**: ECS operations exposed as MCP tools for AI integration

### 4. **Protocol Layer**

**HTTP API Server** (`api/server.mjs`):
```javascript
// Auto-generated endpoints from tool definitions
GET  /health           // Health check
GET  /tools            // Available tools listing
POST /tools/{toolName} // Execute specific tool
POST /agent/{endpoint} // AI agent prompt forwarding
```

**MCP Server** (`mcp_server/mcp_server.mjs`):
```javascript
// Model Context Protocol implementation
- Tool introspection (list_tools)
- Tool execution (call_tool) 
- Resource discovery
- Prompt template support
```

**WebSocket Communication**:
```javascript
// Real-time game state updates
- Event broadcasting to connected clients
- Player action input from browser clients
- State synchronization for UI updates
```

**Tool Definition Pattern**:
```javascript
// Single source generates both HTTP and MCP endpoints
tool_defs.addEntity = {
    details: {
        title: "Add Entity",
        description: "Add a new entity to the game world",
        inputSchema: z.object({})
    },
    run: async({game}) => {
        const eid = addEntity(game.world)
        return `Added entity with ID ${eid}`
    }
}
```

## Data Flow Architecture

### 1. **AI Agent Interaction Flow**

```
AI Agent Request
    ↓
HTTP API / MCP Server
    ↓
Tool Definition Lookup
    ↓
Input Schema Validation
    ↓
Game Framework Tool Execution
    ↓
ECS World Mutation
    ↓
Game-Specific Event Processing (if implemented)
    ↓
System Execution (Game-Defined Priority)
    ↓
Client Communication (Game-Specific Protocol)
    ↓
Client UI Updates
```

### 2. **Text Adventure Game Flow**

**Note**: This describes the text adventure's specific event-driven implementation, not universal framework patterns.

```
Action Command (Client)
    ↓
Action Validation (Action Handlers)
    ↓
ECS World Mutation
    ↓
Event Queue Processing (Text Adventure Specific)
    ↓
System Execution (Game-Specific Priority Order)
    ↓
WebSocket State Broadcasting
    ↓
Client UI Updates
```

### 3. **Text Adventure Event Processing**

**Note**: The Event Queue system is specific to the text adventure implementation.

```
Event Creation
    ↓
Event Queue (examples/text_adventure_logic/EventQueue.mjs)
    ↓
System Priority Sorting
    ↓
System Event Filtering (whitelist)
    ↓
Sequential System Execution
    ↓
Response Event Generation
    ↓
Recursive Event Processing
```

### 3. **Component Lifecycle**

```
CreateComponent(schema)
    ↓
BitECS Component Registration
    ↓
Observer Setup (onSet, onGet)
    ↓
String Store Integration
    ↓
Runtime Component Usage
    ↓
Automatic Schema Validation
```

## Technology Integration Patterns

### **BitECS Integration**
- **Performance**: Structure of Arrays (SoA) for cache efficiency
- **Queries**: Component-based entity filtering
- **Relations**: Entity-to-entity relationships with data
- **Observers**: Component lifecycle event handling

### **Zod Schema Integration**
- **Component Validation**: Runtime type checking for component data
- **API Validation**: Request/response schema enforcement
- **Tool Definitions**: Input parameter validation for MCP/HTTP tools

### **Event-Driven Architecture (Text Adventure Implementation)**

**Note**: These patterns are specific to the text adventure game logic, not universal framework requirements.

- **System Decoupling**: Systems communicate through events, not direct calls
- **Priority Processing**: Lower priority number = higher execution priority  
- **Event Filtering**: Systems can whitelist specific events to process
- **Recursive Processing**: Systems can generate new events during processing

### **Protocol-First Design (Framework Pattern)**
- **Single Source of Truth**: Tool definitions generate both MCP and HTTP APIs
- **Auto-Generation**: API documentation and client stubs generated from schemas
- **Introspection**: Both protocols support tool discovery and documentation

## Scalability and Performance

### **ECS Performance Benefits**
- **Cache Efficiency**: SoA memory layout optimizes CPU cache usage
- **Query Performance**: Component-based filtering scales with entity count
- **System Isolation**: Independent systems enable parallel processing opportunities

### **Text Adventure Event System Scalability**

**Note**: These optimizations are specific to the text adventure's event queue implementation.

- **Bounded Processing**: Event queue prevents infinite recursion
- **Priority Control**: Critical systems execute before less important ones
- **Filtering**: Systems only process relevant events, reducing overhead

### **Protocol Efficiency**
- **Schema Validation**: Early validation prevents invalid state mutations
- **Tool Caching**: Tool definitions cached and reused across requests
- **Connection Pooling**: WebSocket connections maintained for real-time updates

## Extension Points

### **Adding New Game Logic**
1. **Create Bundle**: New directory under `examples/`
2. **Define Components**: Use `CreateComponent` with Zod schemas
3. **Implement Systems**: Extend `System` base class with priority
4. **Create Actions**: Extend `Action` base class with validation
5. **Configure Environment**: Set `GAME_LOGIC_FOLDER_PATH`

### **Adding New Tools**
1. **Define Tool**: Add to `ecs_interface.mjs` with schema
2. **Auto-Generation**: HTTP and MCP endpoints automatically created
3. **Documentation**: Tool docs auto-generated from definitions

### **Adding New Protocols**
1. **Tool Interface**: Implement tool execution interface
2. **Server Integration**: Add server to `main.mjs` orchestration
3. **Documentation**: Update architecture docs with new flow

## Development Patterns

### **Configuration-Driven Development**
- Environment variables control all runtime behavior
- Default configurations enable zero-config development
- Production overrides through environment variable injection

### **Test-Driven Development**
- Components tested with schema validation
- Systems tested with event simulation
- Actions tested with entity state verification
- Integration tests verify protocol compliance

### **Observable Operations**
- Comprehensive logging at all architecture layers
- Event tracing for debugging system interactions
- Performance monitoring for ECS operations
- Health checks for all services

## See Also

- [Project Overview](README.md) - High-level introduction and quick start
- [Framework Documentation](framework/README.md) - ECS patterns and helpers
- [API Documentation](api/README.md) - Protocol integration details
- [Text Adventure Example](examples/text-adventure/README.md) - Complete implementation

---

*Generated from ecs-ai project documentation consolidation*  
*Last updated: 2025-10-15*