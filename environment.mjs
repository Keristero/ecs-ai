const readString = (key, fallback) => {
    const value = process.env[key];
    return typeof value === 'string' && value.length > 0 ? value : fallback;
};

const readPort = (key, fallback) => {
    const value = process.env[key];
    if (value == null || value === '') {
        return fallback;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const env = {
    game_logic_folder_path: readString('GAME_LOGIC_FOLDER_PATH', './examples/text_adventure_logic'),
    game_logic_script_name: readString('GAME_LOGIC_SCRIPT_NAME', 'game.mjs'),
    mcp_host: readString('MCP_HOST', '127.0.0.1'),
    mcp_port: readPort('MCP_PORT', 6061),
    api_host: readString('API_HOST', '0.0.0.0'),
    api_port: readPort('API_PORT', 6060),
    ollama_host: readString('OLLAMA_HOST', '127.0.0.1'),
    ollama_port: readPort('OLLAMA_PORT', 6062),
    ollama_model_name: readString('OLLAMA_MODEL_NAME', 'qwen3')
};

env.DEFAULT_MCP_URL = readString('MCP_URL', `http://${env.mcp_host}:${env.mcp_port}/mcp`);
env.DEFAULT_OLLAMA_BASE_URL = readString('OLLAMA_BASE_URL', `http://${env.ollama_host}:${env.ollama_port}`);

export default env;