import env from "../environment.mjs";
import path from "path";
import fs from "fs/promises";
import { createWorld } from 'bitecs'
import Logger from "../logger.mjs";
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

    let relations_folder = path.resolve(baseGameLogicPath, 'relations')
    const relations = await _import_all_exports_from_directory(relations_folder)

    let systems_folder = path.resolve(baseGameLogicPath, 'systems')
    const systems = await _import_all_exports_from_directory(systems_folder)

    // Try to load update system (optional for event-driven games)
    const updateModulePath = path.resolve(baseGameLogicPath, 'systems', 'update.mjs')
    try {
        const updateModule = await import(updateModulePath)
        if(updateModule.update){
            game.update = updateModule.update
            logger.info("Loaded update system")
        }
    } catch (error) {
        logger.info("No update.mjs found - using event-driven architecture")
    }

    game.world = createWorld({
        components: {},
        relations: {}
    })
    
    // Store systems on world for easy access
    game.world.systems = systems
    
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

    for(const name in components){
        let component_metadata = components[name]
        game.world.components[name] = component_metadata.data
        component_metadata.enableObservers(game.world)
    }

    for(const name in relations){
        let relation_metadata = relations[name]
        logger.info(`Loading relation: ${name}, type: ${typeof relation_metadata.data}`)
        game.world.relations[name] = relation_metadata.data
        if(relation_metadata.enableObservers) {
            relation_metadata.enableObservers(game.world)
            // Update the reference after observers are enabled (may be wrapped)
            game.world.relations[name] = relation_metadata.data
        }
        logger.info(`Relation ${name} loaded. Is function: ${typeof game.world.relations[name] === 'function'}`)
    }

    let prefabs_folder = path.resolve(baseGameLogicPath, 'prefabs')
    const prefabs = await import_default_exports_from_directory(prefabs_folder)

    for(let name in prefabs){
        logger.info(`Found prefab: ${name}`)
        let prefab_creator = prefabs[name]
        if(typeof prefab_creator === 'function'){
            game.prefabs = game.prefabs || {}
            // Pass both world and the prefabs object so prefabs can reference other prefabs
            game.prefabs[name] = prefab_creator(game.world, game.prefabs)
            logger.info(`Initialized prefab: ${name}`)
        }else{
            logger.warn(`Prefab ${name} is not a function, skipping initialization`)
        }
    }

    logger.info(`Game initialized`,game)
    return game
}

export {
    initialize_game,
    import_default_exports_from_directory
}