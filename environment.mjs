const env = {
    game_logic_folder_path: process.env.GAME_LOGIC_FOLDER_PATH || "./examples/text_adventure_logic",
    game_logic_script_name: process.env.GAME_LOGIC_SCRIPT_NAME || "game.mjs",
    mcp_port: process.env.MCP_PORT,
    mcp_host: process.env.MCP_HOST
};

export const {
    game_logic_folder_path,
    game_logic_script_name,
    mcp_port,
    mcp_host
} = env;

export default env;