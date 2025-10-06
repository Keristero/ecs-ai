import env from "../environment.mjs";
import path from "path";
import fs from "fs/promises";
import { createWorld, observe, onSet, onGet } from 'bitecs'
import Logger from "../logger.mjs";
const logger = new Logger("Game Framework","red");

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

    register_component_onset_handlers(game.world, components)
    
    // Setup string store before loading prefabs
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
    
    // Setup string store observers for Name, Description, and Hitpoints components
    // These must be registered BEFORE prefabs are initialized
    const {Name, Description, Hitpoints} = components
    if (Name) {
        observe(game.world, onSet(Name), (eid, params) => {
            if (params && params.value) {
                Name.stringIndex[eid] = addString(params.value)
            }
        })
        
        observe(game.world, onGet(Name), (eid) => ({
            value: getString(Name.stringIndex[eid])
        }))
    }
    
    if (Description) {
        observe(game.world, onSet(Description), (eid, params) => {
            if (params && params.value) {
                Description.stringIndex[eid] = addString(params.value)
            }
        })
        
        observe(game.world, onGet(Description), (eid) => ({
            value: getString(Description.stringIndex[eid])
        }))
    }
    
    if (Hitpoints) {
        observe(game.world, onSet(Hitpoints), (eid, params) => {
            if (params && params.max !== undefined) {
                Hitpoints.max[eid] = params.max
            }
            if (params && params.current !== undefined) {
                Hitpoints.current[eid] = params.current
            }
        })
        
        observe(game.world, onGet(Hitpoints), (eid) => ({
            max: Hitpoints.max[eid],
            current: Hitpoints.current[eid]
        }))
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