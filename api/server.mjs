import express from 'express';
import Logger from '../logger.mjs';
import { tool_defs, resource_defs } from '../game_framework/ecs_interface.mjs';
import { setupDocs } from './docs.mjs';
import env from '../environment.mjs';

const logger = new Logger('API Server', 'blue');

const createEndpoints = (app, game, defs, basePath) => {
    // List all available tools/resources
    app.get(`/${basePath}`, (req, res) => {
        const items = Object.entries(defs).map(([handle, def]) => ({
            handle,
            title: def?.details?.title ?? handle,
            description: def?.details?.description ?? ''
        }));
        res.json({ [basePath]: items });
    });

    // Create individual endpoints
    for (const [handle, definition] of Object.entries(defs)) {
        app.post(`/${basePath}/${handle}`, async (req, res) => {
            try {
                // Validate input if schema exists
                if (definition?.details?.inputSchema) {
                    const result = definition.details.inputSchema.safeParse(req.body);
                    if (!result.success) {
                        return res.status(400).json({ error: 'invalid_input', details: result.error });
                    }
                }

                // Run the tool/resource
                const result = await definition.run({ game, ...(req.body || {}) });
                
                // Return result
                const response = typeof result === 'string' ? result : 
                               result?.content?.[0]?.text || JSON.stringify(result);
                res.json({ handle, result: response });

            } catch (error) {
                logger.error(`${handle} failed:`, error.message);
                res.status(500).json({ error: 'execution_failed', message: error.message });
            }
        });
    }
};

async function serve_api(game) {
    const app = express();
    app.use(express.json());

    // Health check
    app.get('/health', (req, res) => res.json({ status: 'ok' }));

    // Create ECS endpoints
    createEndpoints(app, game, tool_defs, 'tools');
    createEndpoints(app, game, resource_defs, 'resources');

    // Setup API documentation
    setupDocs(app, { logger });

    // Start server
    const server = app.listen(env.api_port, env.api_host, () => {
        logger.info(`API listening on http://${env.api_host}:${env.api_port}`);
    });

    return { app, server };
}

export { serve_api };