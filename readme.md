# ECS AI

## Structure
- main.js
- /game_engine
    - designed for MCP integration
    - generic parts of the game logic that can be reused for other games
- /game_logic
    - only game specific logic
- /mcp_server
    - provides interface for LLM to interact with the game
- /api
    - allows you to direct the API to take actions