import express from 'express'
import { tool_defs, resource_defs } from '../game_framework/ecs_interface.mjs'
import Logger from "../logger.mjs";
import {DEFAULT_OLLAMA_BASE_URL} from "../environment.mjs";
const logger = new Logger("API Server",'blue');

const app = express()
app.use(express.json())

async function create_tool_endpoints(tool_defs) {
    for (const handle in tool_defs) {
        logger.info(`Creating tool endpoint: /tools/${handle}`)
        const tool_def = tool_defs[handle]
    }
}

async function create_resource_endpoints(resource_defs) {
    for (const handle in resource_defs) {
        logger.info(`Creating tool endpoint: /resources/${handle}`)
        const resource_def = resource_defs[handle]
    }
}

async function create_ollama_endpoints(ollama_url){
    //
}