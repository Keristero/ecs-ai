import { z } from 'zod';
import { tool_defs } from '../game_framework/ecs_interface.mjs';

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
    options: z.record(z.string(), z.unknown()).optional(),
    stream: z.boolean().optional(),
    think: z.boolean().optional()
});

const ollama_defs = {
    prompt: {
        details: {
            title: 'Prompt Agent',
            description: 'Send a prompt to the Ollama-backed agent with MCP tool access.',
            inputSchema: zPromptPayload
        },
        async run({ config, payload }) {
            const { fetchImpl, baseUrl, model, mcpUrl } = config;

            if (typeof fetchImpl !== 'function') {
                throw new Error('A fetch implementation is required to contact the Ollama server.');
            }

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

            // Only add think parameter if we want to disable thinking
            // Adding any think parameter (true or false) seems to disable thinking
            if (payload.think === false) {
                requestBody.think = false;
            }

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
                return {
                    type: 'error',
                    status: 502,
                    body: {
                        error: 'ollama_unreachable',
                        message: error?.message ?? 'Failed to contact Ollama server.'
                    },
                    log: ['Failed to reach Ollama server', error]
                };
            }

            if (payload.stream) {
                return {
                    type: 'stream',
                    status: ollamaResponse.status,
                    headers: {
                        'Content-Type': ollamaResponse.headers.get('content-type') ?? 'application/x-ndjson',
                        Connection: 'keep-alive'
                    },
                    stream: ollamaResponse.body
                };
            }

            const responseText = await ollamaResponse.text();
            let data;

            try {
                data = responseText ? JSON.parse(responseText) : {};
            } catch (error) {
                data = { raw: responseText };
            }

            if (!ollamaResponse.ok) {
                return {
                    type: 'error',
                    status: ollamaResponse.status,
                    body: {
                        error: 'ollama_error',
                        details: data
                    }
                };
            }

            return {
                type: 'json',
                status: 200,
                body: {
                    ...data,
                    model,
                    mcpUrl,
                    allowedTools,
                    forbiddenTools
                }
            };
        }
    }
};

export { ollama_defs, zPromptPayload };
