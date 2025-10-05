import express from 'express';
import Logger from '../logger.mjs';
import { tool_defs, resource_defs } from '../game_framework/ecs_interface.mjs';
import env from '../environment.mjs';
import { setupDocs } from './docs.mjs';
import { ollama_defs } from './ollama_defs.mjs';

const logger = new Logger('API Server', 'blue');


const formatToolResult = (result) => {
    if (!result) {
        return { text: '', raw: result };
    }

    if (typeof result === 'string') {
        return { text: result, raw: result };
    }

    if (Array.isArray(result.content)) {
        const text = result.content
            .map((entry) => {
                if (entry == null) {
                    return '';
                }
                if (typeof entry === 'string') {
                    return entry;
                }
                if (typeof entry.text === 'string') {
                    return entry.text;
                }
                return JSON.stringify(entry);
            })
            .join('');

        return { text, raw: result };
    }

    return { text: JSON.stringify(result), raw: result };
};

const listToolMetadata = (defs) =>
    Object.entries(defs).map(([handle, def]) => ({
        handle,
        title: def?.details?.title ?? handle,
        description: def?.details?.description ?? ''
    }));

const parseInput = (schema, payload = {}) => {
    if (!schema) {
        return { success: true, data: payload };
    }

    const result = schema.safeParse(payload);
    if (result.success) {
        return result;
    }

    return {
        success: false,
        error: result.error.flatten ? result.error.flatten() : result.error
    };
};

const registerDefinitions = (app, game, { defs, basePath, collectionKey }) => {
    const collection = listToolMetadata(defs);
    const collectionName = collectionKey.endsWith('s') ? collectionKey.slice(0, -1) : collectionKey;
    const title = collectionName.charAt(0).toUpperCase() + collectionName.slice(1);
    const errorCode = `${collectionName}_execution_failed`;

    app.get(`/${basePath}`, (req, res) => {
        res.json({ [collectionKey]: collection });
    });

    for (const [handle, definition] of Object.entries(defs)) {
        logger.info(`Creating ${collectionName} endpoint: POST /${basePath}/${handle}`);

        app.post(`/${basePath}/${handle}`, async (req, res) => {
            const parsed = parseInput(definition?.details?.inputSchema, req.body ?? {});

            if (!parsed.success) {
                return res.status(400).json({
                    error: 'invalid_input',
                    details: parsed.error
                });
            }

            try {
                const result = await definition.run({ game, ...parsed.data });
                const formatted = formatToolResult(result);

                res.json({
                    handle,
                    result: formatted.text,
                    raw: formatted.raw
                });
            } catch (error) {
                logger.error(`${title} '${handle}' failed`, error);
                res.status(500).json({
                    error: errorCode,
                    message: error?.message ?? 'Unknown error'
                });
            }
        });
    }
};

async function pipeReadableStreamToResponse(stream, res) {
    if (!stream) {
        res.end();
        return;
    }

    const reader = stream.getReader();

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            res.write(Buffer.from(value));
        }
    } finally {
        res.end();
        reader.releaseLock();
    }
}

function createOllamaEndpoints(app, config) {
    if (typeof config?.fetchImpl !== 'function') {
        throw new Error('A fetch implementation is required to contact the Ollama server.');
    }

    for (const [handle, definition] of Object.entries(ollama_defs)) {
        const path = `/agent/${handle}`;
        logger.info(`Creating Ollama endpoint: POST ${path}`);

        app.post(path, async (req, res) => {
            const parsed = parseInput(definition.details?.inputSchema, req.body ?? {});

            if (!parsed.success) {
                return res.status(400).json({
                    error: 'invalid_prompt_payload',
                    details: parsed.error
                });
            }

            try {
                const result = await definition.run({
                    config,
                    payload: parsed.data
                });

                if (result?.log) {
                    const logArgs = Array.isArray(result.log) ? result.log : [result.log];
                    logger.error(...logArgs);
                }

                if (result?.type === 'stream') {
                    res.status(result.status ?? 200);

                    if (result.headers) {
                        for (const [header, value] of Object.entries(result.headers)) {
                            if (value != null) {
                                res.setHeader(header, value);
                            }
                        }
                    }

                    await pipeReadableStreamToResponse(result.stream, res);
                    return;
                }

                const status = result?.status ?? 200;
                const body = result?.body ?? {};

                if (result?.type === 'error' && !result?.log) {
                    logger.error(`Ollama '${handle}' returned an error response`, body);
                }

                res.status(status).json(body);
            } catch (error) {
                logger.error(`Ollama '${handle}' failed`, error);
                res.status(500).json({
                    error: 'ollama_execution_failed',
                    message: error?.message ?? 'Unknown error'
                });
            }
        });
    }
}

const listenAsync = (app, port, host) =>
    new Promise((resolve, reject) => {
        const server = app
            .listen(port, host, () => resolve(server))
            .on('error', (error) => reject(error));
    });

async function serve_api(game) {
    const fetchImpl = globalThis.fetch;

    if (typeof fetchImpl !== 'function') {
        throw new Error('A fetch implementation must be provided to contact the Ollama server.');
    }

    const app = express();
    app.use(express.json({ limit: '1mb' }));

    app.get('/health', (req, res) => {
        res.json({ status: 'ok' });
    });

    registerDefinitions(app, game, {
        defs: tool_defs,
        basePath: 'tools',
        collectionKey: 'tools'
    });

    registerDefinitions(app, game, {
        defs: resource_defs,
        basePath: 'resources',
        collectionKey: 'resources'
    });

    createOllamaEndpoints(app, {
        fetchImpl,
        baseUrl: env.DEFAULT_OLLAMA_BASE_URL,
        model: env.ollama_model_name,
        mcpUrl: env.DEFAULT_MCP_URL
    });

    setupDocs(app, { logger });

    const server = await listenAsync(app, env.api_port, env.api_host);
    const address = server.address();
    const boundPort = typeof address === 'object' && address ? address.port : env.api_port;
    const boundHost = typeof address === 'object' && address ? address.address : env.api_host;

    logger.info(`API listening on http://${boundHost}:${boundPort}`);

    return { app, server };
}

export { serve_api };