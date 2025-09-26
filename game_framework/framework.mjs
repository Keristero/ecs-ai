import env from "../environment.mjs";
import path from "path";
import fs from "fs/promises";
import { createWorld, addEntity, addComponent, addComponents, query } from 'bitecs'
import Logger from "../logger.mjs";
const logger = new Logger("Game Framework");

async function _import_all_exports_from_directory(directory){
    logger.info(`Importing all modules from directory: ${directory}`)
    const exports = {}
    const files = await fs.readdir(directory)
    for(const file of files){
        if(file.endsWith('.mjs')){
            const module_path = path.join(directory, file)
            const module = await import(module_path)
            Object.assign(exports, module)
        }
    }
    return exports
}


async function initialize_game(){
    logger.info("Initializing game framework")
    const game = {
        world: {},
    }

    let components_folder = path.resolve(env.game_logic_folder_path, 'components')
    const components = await _import_all_exports_from_directory(components_folder)

    const {update} = await import(path.resolve(env.game_logic_folder_path, 'systems', 'update.mjs'))
    if(!update){
        throw new Error("Game framework expects /systems/update.mjs to export a function as 'update' for the main game update system")
    }else{
        game.update = update
    }

    game.world = createWorld({
        components: components
    })

    logger.info(`Game initialized`,game)
    return game
}

export {
    initialize_game
}