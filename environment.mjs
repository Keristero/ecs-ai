const toPort = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const env = Object.freeze({
    game_logic_folder_path: process.env.GAME_LOGIC_FOLDER_PATH || "./examples/text_adventure_logic",
    game_logic_script_name: process.env.GAME_LOGIC_SCRIPT_NAME || "game.mjs",
    mcp_host: process.env.MCP_HOST || "127.0.0.1",
    mcp_port: toPort(process.env.MCP_PORT, 6061),
    api_host: process.env.API_HOST || "0.0.0.0",
    api_port: toPort(process.env.API_PORT, 6060),
    ollama_host: process.env.OLLAMA_HOST || "127.0.0.1",
    ollama_port: toPort(process.env.OLLAMA_PORT, 6062),
    ollama_model_name: process.env.OLLAMA_MODEL_NAME || "qwen3"
});

const derived = Object.freeze({
    DEFAULT_MCP_URL: process.env.MCP_URL || `http://${env.mcp_host}:${env.mcp_port}/mcp`,
    DEFAULT_OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || `http://${env.ollama_host}:${env.ollama_port}`
});

export const {
    game_logic_folder_path,
    game_logic_script_name,
    mcp_host,
    mcp_port,
    api_host,
    api_port,
    ollama_host,
    ollama_port,
    ollama_model_name
} = env;

export const {
    DEFAULT_MCP_URL,
    DEFAULT_OLLAMA_BASE_URL
} = derived;

export default {
    ...env,
    ...derived
};