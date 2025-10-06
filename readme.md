# ECS AI

An end-to-end playground for driving an ECS text adventure through the Model Context Protocol (MCP). The Node.js runtime hosts the game, exposes MCP tooling, and now ships with an HTTP API for forwarding instructions to an Ollama agent.

## Prerequisites

- [mise](https://mise.jdx.dev/) for toolchain management
- Node.js (installed automatically via `mise install`)
- Ollama 0.9.6+ (installed automatically via `mise install`, or via your OS package manager)

## Getting started

1. Install dependencies and tools:

     ```bash
     mise install
     npm install
     ```

2. In one terminal, start Ollama (listens on the port from `mise.toml`, default `6062`):

     ```bash
     mise run ollama
     ```

3. In another terminal, launch the game + MCP + API stack:

     ```bash
     mise start
     ```

     This calls `node main.mjs`, which boots the ECS game, hosts the MCP server at `http://<MCP_HOST>:<MCP_PORT>/mcp`, and exposes the REST API (default `http://0.0.0.0:6060`).

## Environment configuration

All knobs live in `environment.mjs` and are surfaced through environment variables (defaults shown in parentheses):

| Variable | Purpose |
| --- | --- |
| `GAME_LOGIC_FOLDER_PATH` (`./examples/text_adventure_logic`) | Folder that contains the game logic bundle |
| `GAME_LOGIC_SCRIPT_NAME` (`game.mjs`) | Entry point filename inside the logic folder |
| `MCP_HOST` (`127.0.0.1`) / `MCP_PORT` (`6061`) | Bind address and port for the MCP server |
| `API_HOST` (`0.0.0.0`) / `API_PORT` (`6060`) | Bind address and port for the REST API |
| `OLLAMA_HOST` (`127.0.0.1:6062`) | Location of the Ollama HTTP service |
| `OLLAMA_MODEL_NAME` (`qwen3`) | Model invoked when prompting the agent |

The API also derives `DEFAULT_MCP_URL` and `DEFAULT_OLLAMA_BASE_URL`, so custom deployments only need to override the env vars that differ from the defaults.

## REST API surface

The API is generated dynamically from the MCP tool definitions in `game_framework/ecs_interface.mjs`.

### Introspection

- `GET /health` – service heartbeat
- `GET /tools` – list available tool handles

### Tool execution

- `POST /tools/:handle`

Provide the same JSON payload you would send through MCP. Zod schemas from each definition validate the request body. Responses echo the handle and a human-friendly `result` string.

### Driving the Ollama agent

`POST /agent/prompt` forwards instructions to the Ollama server via its `/api/chat` endpoint. The API automatically passes an MCP configuration block, so the agent can call back into `http://<MCP_HOST>:<MCP_PORT>/mcp` using the registered tools.

Example payload:

```json
{
     "prompt": "Add a monster to the current room then describe it.",
     "context": ["The player is in the tavern."],
    "toolsWhitelist": ["addEntity", "addComponent", "addComponentWithValues"],
    "toolsBlacklist": ["queryEntitiesWithComponents"],
    "options": {
        "temperature": 0.2
    }
}
```

Response fields include the Ollama reply, the allowed/forbidden tool lists used for the call, and any raw data returned by Ollama. Set `stream: true` to proxy Ollama’s streaming response back to the client.

## Project layout

- `main.mjs` – boots the ECS game, MCP server, and REST API
- `environment.mjs` – centralised environment defaults
- `game_framework/` – reusable ECS facade and initialiser
- `examples/` – sample text adventure implementation
- `mcp_server/` – MCP server wiring that registers tools
- `api/` – HTTP façade for direct tool access and agent prompting
- `tests/` – Mocha + Chai suite covering the framework, interface, and API

## Tests

Run all tests:
```bash
npm test
# or
pnpm test
```

Run client tests only:
```bash
npm run test:client
# or
pnpm test:client
```

### Test Coverage

- **Framework Tests**: Core ECS functionality, game initialization, and system integration
- **Interface Tests**: MCP tool definitions and ECS interface
- **API Tests**: HTTP endpoints, validation, and error handling
- **Client Tests**: Browser client logic, command parsing, and UI interactions (35 tests)

Mocha runs all `*.test.mjs` files under `tests/` and `examples/*/tests/`, providing comprehensive coverage of both server and client code.