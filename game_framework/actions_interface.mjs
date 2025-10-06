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
 * And optionally export metadata for enhanced client features
 * Actions will be wrapped to match the tool interface
 */
async function load_actions() {
    const baseGameLogicPath = process.env.GAME_LOGIC_FOLDER_PATH || env.game_logic_folder_path
    const actionsFolder = path.resolve(baseGameLogicPath, 'actions')
    
    // Import all action modules (not just default exports, to get metadata too)
    try {
        const files = await fs.readdir(actionsFolder)
        
        for (const file of files) {
            if (!file.endsWith('.mjs')) continue
            
            const actionName = path.basename(file, '.mjs')
            const actionPath = path.join(actionsFolder, file)
            const module = await import(actionPath)
            
            const actionFn = module.default
            const metadata = module.metadata
            
            if (typeof actionFn !== 'function') {
                logger.warn(`Action ${actionName} is not a function`)
                continue
            }
            
            try {
                // Use metadata if available, otherwise fall back to JSDoc extraction
                let description, inputSchema
                
                if (metadata) {
                    description = metadata.description || 'No description'
                    inputSchema = metadata.inputSchema || null
                } else {
                    // Fallback to JSDoc extraction
                    const fileContent = await fs.readFile(actionPath, 'utf-8')
                    description = extractDescription(fileContent)
                    inputSchema = null
                }
                
                // Create action definition matching tool interface
                action_defs[actionName] = {
                    details: {
                        title: metadata?.name || actionName.charAt(0).toUpperCase() + actionName.slice(1),
                        description: description,
                        inputSchema: inputSchema
                    },
                    metadata: metadata || null, // Store full metadata for client use
                    run: construct_action_run_function(async ({ game, ...params }) => {
                        return await actionFn(game, params)
                    })
                }
                
                logger.info(`Loaded action: ${actionName}${metadata ? ' (with metadata)' : ''}`)
            } catch (error) {
                logger.error(`Failed to load action ${actionName}:`, error.message)
            }
        }
    } catch (error) {
        logger.warn(`Could not read actions directory ${actionsFolder}:`, error.message)
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
