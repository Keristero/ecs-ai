# Project Structure Overview

This document provides a high-level, navigable map of the repository as of 2025-10-08. It explains the purpose of each major directory and key files to help onboard contributors quickly.

## Top-Level Summary

| Path | Purpose |
| ---- | ------- |
| `main.mjs` | Entry point: boots game logic, MCP server, and REST API stack. |
| `environment.mjs` | Centralized environment variable parsing + derived URLs. |
| `logger.mjs` | Logging utilities (lightweight abstraction – see file for details). |
| `game_framework/` | ECS/game bootstrap layer + tool (MCP) interface abstractions. |
| `examples/` | Reference/gameplay logic bundles (currently: text adventure). |
| `api/` | HTTP server exposing ECS + agent endpoints derived from MCP tools. |
| `mcp_server/` | Model Context Protocol server wiring & tool registration. |
| `tests/` | Mocha/Chai test suites for framework, API, and gameplay logic. |
| `docs/` | Developer documentation (framework usage, ECS guidance, relations). |
| `old_docs/` | Historical design notes (kept for context, not authoritative). |
| `mise.toml` | Toolchain + service task definitions (Node/Ollama orchestration). |
| `package.json` | NPM metadata, scripts, runtime + dev dependencies. |
| `TODO.md` | Outstanding / future work tracking. |

## Runtime Flow (Bird's Eye)
1. `main.mjs` reads config from `environment.mjs`.
2. Game logic bundle (default: `examples/text_adventure_logic/game.mjs`) is loaded via the framework initialiser in `game_framework/framework.mjs`.
3. ECS interface and MCP tools are defined in `game_framework/ecs_interface.mjs` & `actions_interface.mjs`.
4. MCP server (`mcp_server/mcp_server.mjs`) registers those tools.
5. HTTP API (`api/server.mjs`) introspects tool definitions (`api/docs.mjs`, `api/ollama_defs.mjs`) to generate REST endpoints and agent prompt endpoints.
6. External client / agent (e.g. via Ollama) calls REST or MCP endpoints; tools mutate ECS world state.

## Directories & Key Files

### `game_framework/`
- `framework.mjs` – Orchestrates ECS world creation, system registration, and game loop integration.
- `ecs_interface.mjs` – Exposes core ECS operations as MCP-callable tool definitions (add/query entities/components, etc.).
- `actions_interface.mjs` – Higher-level action-oriented tool definitions (player or world interactions) if any are aggregated here.
- `create_component.mjs` – Helper for defining bitECS components consistently.
- `game_framework.md` – Conceptual guide / philosophy for the framework.

### `api/`
- `server.mjs` – Express app: health, tool listing, dynamic tool execution, agent prompt forwarding.
- `docs.mjs` – Generates human-readable documentation for exposed MCP tools -> drives `api/docs.html`.
- `ollama_defs.mjs` – Central definitions for interacting with the Ollama chat endpoint (model + payload shaping).
- `docs.html` – Static HTML artifact (likely generated or manually synced) listing tool docs.

### `mcp_server/`
- `mcp_server.mjs` – Boots an MCP server instance, registers tool definitions from the framework (and possibly the action layer), making them discoverable to agents.

### `examples/`
Houses reference game logic bundles. The canonical example is the text adventure split into `text_adventure_logic/` (server-side ECS logic) and `text_adventure_client/` (browser client).

#### `examples/text_adventure_logic/`
| Subpath | Purpose |
| ------- | ------- |
| `game.mjs` | Entry point that wires components, systems, prefabs, and relations. |
| `setup_world.mjs` | Initial world state seeding (rooms, player, items). |
| `components/text_adventure_components.mjs` | All domain-specific component schemas (position, description, inventory, etc.). |
| `systems/` | ECS systems implementing turn handling, combat, cleanup, sound, NPC logic. |
| `actions/` | Action handlers invoked by player/agent commands (look, move, speak, etc.). |
| `prefabs/` | Factory-like entity blueprints (player self, goblin, skeleton, items). |
| `relations/text_adventure_relations.mjs` | Relationship definitions (e.g., containment, location links). |
| `helpers/` & `helpers.mjs` | Utility functions for turn orchestration and shared logic. |
| `event_queue.mjs` / `event_queue.md` | Event queue implementation + documentation. |
| `EVENT_EMITTER.md` | Documentation about the event emitter contract. |
| `websocket_implementation.mjs` | Real-time layer (if used) for broadcasting updates. |
| `player_action_helper.mjs` | Helper for parsing/applying player actions. |
| `action_helpers.mjs` | Shared helpers to assist action scripts. |

#### `examples/text_adventure_client/`
Browser-based client implementation (HTML + JS) consuming the server/MCP. (Contains `core.mjs`, `index.mjs`, `index.html`, plus its own `package.json`.)

### `tests/`
Organised by concern:
- Root test files: `api.test.mjs`, `ecs_interface.test.mjs`, `framework.test.mjs`.
- `framework/relations.test.mjs` – Focused relation mechanics (with `RELATION_TESTS_SUMMARY.md`).
- `text_adventure/` – Domain-specific tests (turn system, events, inventory, inspect, speak, etc.).
- `fixtures/` – Reusable simplified components, systems, and a minimal `game.mjs` for deterministic testing.

### `docs/`
Current developer-facing docs:
- `bitecs_guide.md` & `bitecs_api.md` – Guidance for working with the underlying bitECS engine.
- `CREATE_RELATION_IMPLEMENTATION.md` & `CREATE_RELATION_QUICK_REFERENCE.md` – How to implement and reference relation mechanics.
- (This file) `structure.md` – High-level repository map.

### `old_docs/`
Historical / initial design notes retained for context; not guaranteed to match current implementation. Use cautiously.

## Environment & Configuration
Defined in `environment.mjs`:
- `GAME_LOGIC_FOLDER_PATH` (default `./examples/text_adventure_logic`)
- `GAME_LOGIC_SCRIPT_NAME` (default `game.mjs`)
- `MCP_HOST` / `MCP_PORT` – MCP binding.
- `API_HOST` / `API_PORT` – REST API binding.
- `OLLAMA_HOST` / `OLLAMA_PORT` – Ollama service location.
- `OLLAMA_MODEL_NAME` – Default model name.
Derived:
- `DEFAULT_MCP_URL` – Computed if not explicitly provided.
- `DEFAULT_OLLAMA_BASE_URL` – Normalized host + port.

## Testing Stack
- Framework: Mocha + Chai (`mocha` command over `tests/**/*.test.mjs`).
- Style/type: No TypeScript or lint config present (as of this snapshot).
- Test focus: Ensures ECS operations, relation integrity, system sequencing, API correctness, and gameplay scripts behave.

## Dependency Notes
- `bitecs` (GitHub fork) – Underlying ECS engine.
- `@modelcontextprotocol/sdk` – Tool + MCP server integration.
- `express`, `cors`, `ws` – HTTP + WebSocket surfaces.
- `zod` – Runtime validation for tool inputs / API payloads.
- Dev: `mocha`, `chai`, `jsdom` (client DOM simulation), `nodemon` (dev reload).

## Extension Points
- Add new game bundles in `examples/<new_game_logic>/` and point `GAME_LOGIC_FOLDER_PATH` to it.
- Register new tool definitions alongside or within `game_framework/ecs_interface.mjs` or a parallel interface file; ensure MCP + API pick them up.
- Introduce new systems by appending to the system registration list in the logic bundle's `game.mjs`.
- Add docs into `docs/` and link them from `readme.md` if broadly useful.

## Suggested Future Enhancements (Non-Blocking)
- Add linting (ESLint) + formatting (Prettier) for consistency.
- Provide a `docker-compose.yml` for one-command local stack (game + Ollama stub).
- Generate `api/docs.html` automatically via a script to avoid drift.
- Add coverage tooling (c8/nyc) to quantify test completeness.
- Consider TypeScript migration for stronger interface contracts.

---
_Last updated: 2025-10-08_.
