import env from "../environment.mjs";
import path from "path";
import fs from "fs/promises";
import { createWorld } from 'bitecs'
import Logger from "../logger.mjs";
import { setupComponentObservers } from "./component_observers.mjs";
const logger = new Logger("Game Framework","red");

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

async function import_default_exports_from_directory(directory){
    logger.info(`Importing default exports from directory: ${directory}`)
    const exports = {}
    try {
        const files = await fs.readdir(directory)
        for(const file of files){
            if(file.endsWith('.mjs')){
                const module_name = path.basename(file, '.mjs')
                const module_path = path.join(directory, file)
                const module = await import(module_path)
                if(module.default){
                    exports[module_name] = module.default
                }
            }
        }
    } catch (error) {
        logger.warn(`Could not read directory ${directory}:`, error.message)
    }
    return exports
}


async function initialize_game(){
    logger.info("Initializing game framework")
    const game = {
        world: {},
    }

    const baseGameLogicPath = process.env.GAME_LOGIC_FOLDER_PATH || env.game_logic_folder_path
    let components_folder = path.resolve(baseGameLogicPath, 'components')
    const components = await _import_all_exports_from_directory(components_folder)

    const updateModulePath = path.resolve(baseGameLogicPath, 'systems', 'update.mjs')
    const {update} = await import(updateModulePath)
    if(!update){
        throw new Error("Game framework expects /systems/update.mjs to export a function as 'update' for the main game update system")
    }else{
        game.update = update
    }

    game.world = createWorld({
        components: components
    })
    
    // Setup string store for components that need string storage
    // This provides a generic way to store strings referenced by index
    const stringStore = []
    const addString = (str) => {
        const index = stringStore.length
        stringStore.push(str)
        return index
    }
    const getString = (index) => stringStore[index] || ''
    
    game.world.string_store = {
        getString,
        addString,
        store: stringStore
    }
    
    // If the game exports COMPONENT_METADATA, setup observers automatically
    // This must happen BEFORE prefabs are loaded so that set() calls trigger onSet observers
    if (components.COMPONENT_METADATA) {
        logger.info(`Setting up component observers from COMPONENT_METADATA`)
        setupComponentObservers(game.world, components.COMPONENT_METADATA)
    }

    // Load prefabs if they exist and initialize them
    const prefabs_folder = path.resolve(baseGameLogicPath, 'prefabs')
    try {
        const prefab_creators = await import_default_exports_from_directory(prefabs_folder)
        game.prefabs = {}
        
        // Initialize each prefab by calling its creator function
        for (const [name, creator] of Object.entries(prefab_creators)) {
            game.prefabs[name] = creator(game.world, components)
        }
        
        logger.info(`Loaded and initialized ${Object.keys(game.prefabs).length} prefabs`)
    } catch (error) {
        logger.warn(`No prefabs folder found or error loading prefabs:`, error.message)
        game.prefabs = {}
    }

    logger.info(`Game initialized`,game)
    return game
}

export {
    initialize_game,
    import_default_exports_from_directory
}