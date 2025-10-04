import env from "../environment.mjs";
import path from "path";
import fs from "fs/promises";
import { createWorld, observe, onSet } from 'bitecs'
import Logger from "../logger.mjs";
const logger = new Logger("Game Framework");

function apply_component_values(component, eid, values){
    if (values == null) {
        return
    }

    if (Array.isArray(component) || ArrayBuffer.isView(component)) {
        component[eid] = values
        return
    }

    for (const [field, value] of Object.entries(values)) {
        const target = component[field]

        if (Array.isArray(target) || ArrayBuffer.isView(target)) {
            target[eid] = value
        } else if (target && typeof target === 'object') {
            target[eid] = value
        } else {
            component[field] = value
        }
    }
}

function register_component_onset_handlers(world, components){
    for (const component of Object.values(components)) {
        if (!component || typeof component !== 'object') {
            continue
        }

        observe(world, onSet(component), (eid, params = {}) => {
            apply_component_values(component, eid, params)
            return params
        })
    }
}

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

    register_component_onset_handlers(game.world, components)

    logger.info(`Game initialized`,game)
    return game
}

export {
    initialize_game
}