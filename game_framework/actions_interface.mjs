import path from 'path'
import fs from 'fs/promises'
import env from '../environment.mjs'
import Logger from '../logger.mjs'
import { import_default_exports_from_directory } from './framework.mjs'

const logger = new Logger('Actions Interface', 'yellow')

const action_defs = {}

/**
 * Helper to construct action run function with consistent error handling
 * Similar to construct_tool_run_function but for actions
 */
function construct_action_run_function(func) {
    return async (inputs) => {
        try {
            return await func(inputs)
        } catch (e) {
            return {
                success: false,
                error: e.message
            }
        }
    }
}

/**
 * Load all actions from the game's actions folder
 * Each action file should export a default function: (game, params) => result
 * Actions will be wrapped to match the tool interface
 */
async function load_actions() {
    const baseGameLogicPath = process.env.GAME_LOGIC_FOLDER_PATH || env.game_logic_folder_path
    const actionsFolder = path.resolve(baseGameLogicPath, 'actions')
    
    // Use framework function to import all default exports
    const actions = await import_default_exports_from_directory(actionsFolder)
    
    // Parse JSDoc and create action definitions matching tool interface
    for (const [actionName, actionFn] of Object.entries(actions)) {
        if (typeof actionFn !== 'function') {
            logger.warn(`Action ${actionName} is not a function`)
            continue
        }
        
        try {
            const actionPath = path.join(actionsFolder, `${actionName}.mjs`)
            const fileContent = await fs.readFile(actionPath, 'utf-8')
            const description = extractDescription(fileContent)
            const parameters = extractParameters(fileContent)
            
            // Create action definition matching tool interface
            action_defs[actionName] = {
                details: {
                    title: actionName.charAt(0).toUpperCase() + actionName.slice(1),
                    description: description,
                    inputSchema: null // Actions don't use Zod schemas yet, but could be added
                },
                run: construct_action_run_function(async ({ game, ...params }) => {
                    return await actionFn(game, params)
                })
            }
            
            logger.info(`Loaded action: ${actionName}`)
        } catch (error) {
            logger.error(`Failed to load action ${actionName}:`, error.message)
        }
    }
    
    logger.info(`Loaded ${Object.keys(action_defs).length} actions`)
    return action_defs
}

/**
 * Extract description from JSDoc comment
 */
function extractDescription(fileContent) {
    const match = fileContent.match(/\/\*\*[\s\S]*?\*\s+(.+?)\n/m)
    return match ? match[1].trim() : 'No description'
}

/**
 * Extract parameters from JSDoc @param tags
 */
function extractParameters(fileContent) {
    const params = {}
    const paramRegex = /@param\s+\{([^}]+)\}\s+params\.(\w+)\s+-\s+(.+)/g
    let match
    
    while ((match = paramRegex.exec(fileContent)) !== null) {
        const [, type, name, description] = match
        params[name] = {
            type,
            description: description.trim()
        }
    }
    
    return params
}

export {
    load_actions,
    action_defs
}
