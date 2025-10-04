import express from 'express';
import { z } from 'zod';
import Logger from '../logger.mjs';
import { tool_defs, resource_defs } from '../game_framework/ecs_interface.mjs';
import {
    DEFAULT_MCP_URL,
    DEFAULT_OLLAMA_BASE_URL,
    api_host as defaultApiHost,
    api_port as defaultApiPort,
    ollama_model_name as defaultModel
} from '../environment.mjs';

const logger = new Logger('API Server', 'blue');

const zMessage = z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string().min(1)
});

const zPromptPayload = z.object({
    prompt: z.string().min(1, 'prompt is required'),
    systemPrompt: z.string().optional(),
    context: z.array(z.string().min(1)).optional(),
    toolsWhitelist: z.array(z.string().min(1)).optional(),
    toolsBlacklist: z.array(z.string().min(1)).optional(),
    messages: z.array(zMessage).optional(),
    options: z.record(z.any()).optional(),
    stream: z.boolean().optional()
});

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

function createToolEndpoints(app, game) {
    const tools = listToolMetadata(tool_defs);

    app.get('/tools', (req, res) => {
        res.json({ tools });
    });

    for (const [handle, definition] of Object.entries(tool_defs)) {
        logger.info(`Creating tool endpoint: POST /tools/${handle}`);

        app.post(`/tools/${handle}`, async (req, res) => {
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
                logger.error(`Tool '${handle}' failed`, error);
                res.status(500).json({
                    error: 'tool_execution_failed',
                    message: error?.message ?? 'Unknown error'
                });
            }
        });
    }
}

function createResourceEndpoints(app, game) {
    const resources = listToolMetadata(resource_defs);

    app.get('/resources', (req, res) => {
        res.json({ resources });
    });

    for (const [handle, definition] of Object.entries(resource_defs)) {
        logger.info(`Creating resource endpoint: POST /resources/${handle}`);

        app.post(`/resources/${handle}`, async (req, res) => {
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
                logger.error(`Resource '${handle}' failed`, error);
                res.status(500).json({
                    error: 'resource_execution_failed',
                    message: error?.message ?? 'Unknown error'
                });
            }
        });
    }
}

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
    const {
        fetchImpl,
        baseUrl,
        model,
        mcpUrl
    } = config;

    if (typeof fetchImpl !== 'function') {
        throw new Error('A fetch implementation is required to contact the Ollama server.');
    }

    app.post('/agent/prompt', async (req, res) => {
        const parsed = zPromptPayload.safeParse(req.body ?? {});

        if (!parsed.success) {
            return res.status(400).json({
                error: 'invalid_prompt_payload',
                details: parsed.error.flatten()
            });
        }

        const payload = parsed.data;
        const allToolHandles = Object.keys(tool_defs);

        let allowedTools = allToolHandles;
        if (payload.toolsWhitelist?.length) {
            const whitelist = new Set(payload.toolsWhitelist);
            allowedTools = allowedTools.filter((handle) => whitelist.has(handle));
        }

        if (payload.toolsBlacklist?.length) {
            const blacklist = new Set(payload.toolsBlacklist);
            allowedTools = allowedTools.filter((handle) => !blacklist.has(handle));
        }

        const forbiddenTools = payload.toolsBlacklist?.length
            ? payload.toolsBlacklist.filter((handle) => allToolHandles.includes(handle))
            : [];

        const systemLines = [];
        if (payload.systemPrompt) {
            systemLines.push(payload.systemPrompt);
        } else {
            systemLines.push(
                `You control a game via Model Context Protocol. Connect to ${mcpUrl} when you need to inspect or change the world.`
            );
        }

        if (allowedTools.length) {
            systemLines.push(`Allowed MCP tools: ${allowedTools.join(', ')}.`);
        } else {
            systemLines.push('No MCP tools are available for this task.');
        }

        if (forbiddenTools.length) {
            systemLines.push(`Do not use these tools: ${forbiddenTools.join(', ')}.`);
        }

        if (payload.context?.length) {
            for (const ctx of payload.context) {
                systemLines.push(`Context: ${ctx}`);
            }
        }

        const messages = [
            { role: 'system', content: systemLines.join('\n') },
            ...(payload.messages ?? []).filter((message) => message.role !== 'system')
        ];

        messages.push({ role: 'user', content: payload.prompt });

        const normalizedBase = baseUrl.replace(/\/$/, '');
        const requestBody = {
            model,
            messages,
            options: {
                ...payload.options,
                mcp: {
                    ...(payload.options?.mcp ?? {}),
                    servers: {
                        ...(payload.options?.mcp?.servers ?? {}),
                        ecs: {
                            url: mcpUrl
                        }
                    },
                    allow: allowedTools,
                    deny: forbiddenTools
                }
            },
            stream: payload.stream ?? false
        };

        let ollamaResponse;

        try {
            ollamaResponse = await fetchImpl(`${normalizedBase}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
        } catch (error) {
            logger.error('Failed to reach Ollama server', error);
            return res.status(502).json({
                error: 'ollama_unreachable',
                message: error?.message ?? 'Failed to contact Ollama server.'
            });
        }

        if (payload.stream) {
            res.status(ollamaResponse.status);
            res.setHeader('Content-Type', ollamaResponse.headers.get('content-type') ?? 'application/x-ndjson');
            res.setHeader('Connection', 'keep-alive');
            await pipeReadableStreamToResponse(ollamaResponse.body, res);
            return;
        }

        const responseText = await ollamaResponse.text();
        let data;

        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch (error) {
            data = { raw: responseText };
        }

        if (!ollamaResponse.ok) {
            return res.status(ollamaResponse.status).json({
                error: 'ollama_error',
                details: data
            });
        }

        res.status(200).json({
            ...data,
            model,
            mcpUrl,
            allowedTools,
            forbiddenTools
        });
    });
}

const listenAsync = (app, port, host) =>
    new Promise((resolve, reject) => {
        const server = app
            .listen(port, host, () => resolve(server))
            .on('error', (error) => reject(error));
    });

async function serve_api(game, options = {}) {
    const host = options.host ?? process.env.API_HOST ?? defaultApiHost;
    const portValue = options.port ?? process.env.API_PORT ?? defaultApiPort;
    const parsedPort = typeof portValue === 'string' ? Number.parseInt(portValue, 10) : portValue;
    const port = Number.isFinite(parsedPort) ? parsedPort : defaultApiPort;

    const ollamaBaseUrl = options.ollamaBaseUrl ?? process.env.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_BASE_URL;
    const ollamaModel = options.ollamaModel ?? process.env.OLLAMA_MODEL_NAME ?? defaultModel;
    const fetchImpl = options.fetchImpl ?? globalThis.fetch;
    const mcpUrl = options.mcpUrl ?? process.env.MCP_URL ?? DEFAULT_MCP_URL;

    if (typeof fetchImpl !== 'function') {
        throw new Error('A fetch implementation must be provided to contact the Ollama server.');
    }

    const app = express();
    app.use(express.json({ limit: '1mb' }));

    app.get('/health', (req, res) => {
        res.json({ status: 'ok' });
    });

    createToolEndpoints(app, game);
    createResourceEndpoints(app, game);
    createOllamaEndpoints(app, {
        fetchImpl,
        baseUrl: ollamaBaseUrl,
        model: ollamaModel,
        mcpUrl
    });

    const server = await listenAsync(app, port, host);
    const address = server.address();
    const boundPort = typeof address === 'object' && address ? address.port : port;
    const boundHost = typeof address === 'object' && address ? address.address : host;

    logger.info(`API listening on http://${boundHost}:${boundPort}`);

    return { app, server };
}

export { serve_api };