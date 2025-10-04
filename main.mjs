import env from "./environment.mjs";
import Logger from "./logger.mjs";
import {serve_mcp} from "./mcp_server/mcp_server.mjs"
import path from "path";
const logger = new Logger("Main",'green');

//dynamically import the game logic module
const game = (await import(path.resolve(env.game_logic_folder_path, env.game_logic_script_name))).default

//run the game update function as a test
game.update(game)

await serve_mcp(game)

logger.info('hello')