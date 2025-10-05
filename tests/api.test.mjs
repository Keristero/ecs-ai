import { describe, it, before, after, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import path from 'path';
import { initialize_game } from '../game_framework/framework.mjs';
import env from '../environment.mjs';
import { serve_api } from '../api/server.mjs';

const createResponse = (body, status = 200, headers = { 'Content-Type': 'application/json' }) => {
    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    return new Response(payload, { status, headers });
};

const stripTrailingSlash = (value) => value.replace(/\/$/, '');

const resolveServerBaseUrl = (server) => {
    const address = server.address();

    if (address == null) {
        throw new Error('Server address is not available.');
    }

    if (typeof address === 'string') {
        return address;
    }

    const host = ['::', '0.0.0.0'].includes(address.address) ? '127.0.0.1' : address.address;
    return `http://${host}:${address.port}`;
};

const closeServer = async (server) => {
    if (!server) {
        return;
    }

    await new Promise((resolve) => server.close(resolve));
};

const installOllamaFetchStub = () => {
    const calls = [];
    const originalFetch = globalThis.fetch;

    const stub = async (url, options) => {
        calls.push({ url, options });
        return createResponse({ reply: 'ok' });
    };

    globalThis.fetch = async (input, init) => {
        const url = typeof input === 'string'
            ? input
            : input instanceof URL
                ? input.href
                : input?.url;

        if (typeof url === 'string' && url.startsWith(env.DEFAULT_OLLAMA_BASE_URL)) {
            return stub(url, init ?? input?.init);
        }

        return originalFetch(input, init);
    };

    return {
        calls,
        restore: () => {
            globalThis.fetch = originalFetch;
        }
    };
};

describe('API Server', () => {
    let serverInfo;
    let baseUrl;
    let fetchInterceptor;
    let originalGameLogicFolderPath;
    let originalApiPort;
    let originalApiHost;

    before(() => {
        originalGameLogicFolderPath = process.env.GAME_LOGIC_FOLDER_PATH;
        process.env.GAME_LOGIC_FOLDER_PATH = path.resolve('./tests/fixtures');
        originalApiPort = env.api_port;
        originalApiHost = env.api_host;
    });

    after(() => {
        if (originalGameLogicFolderPath == null) {
            delete process.env.GAME_LOGIC_FOLDER_PATH;
        } else {
            process.env.GAME_LOGIC_FOLDER_PATH = originalGameLogicFolderPath;
        }
        env.api_port = originalApiPort;
        env.api_host = originalApiHost;
    });

    beforeEach(async () => {
        fetchInterceptor = installOllamaFetchStub();
        env.api_port = 0;
        env.api_host = '127.0.0.1';
        const game = await initialize_game();
        serverInfo = await serve_api(game);
        baseUrl = resolveServerBaseUrl(serverInfo.server);
    });

    afterEach(async () => {
        await closeServer(serverInfo?.server);
        fetchInterceptor?.restore();
        serverInfo = undefined;
        baseUrl = undefined;
        fetchInterceptor = undefined;
    });

    it('exposes ECS tools over HTTP', async () => {
        const response = await fetch(`${baseUrl}/tools/addEntity`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        const payload = await response.json();
        expect(response.status).to.equal(200);
        expect(payload.handle).to.equal('addEntity');
        expect(payload.result).to.contain('Added entity');
    });

    it('serves OpenAPI documentation', async () => {
        const specResponse = await fetch(`${baseUrl}/docs/openapi.json`);
        expect(specResponse.status).to.equal(200);

        const spec = await specResponse.json();
        expect(spec.openapi).to.equal('3.1.0');
        expect(spec.paths).to.have.property('/tools');
        expect(spec.paths['/tools/addEntity'].post.summary).to.include('Add');
        expect(spec.paths).to.have.property('/agent/prompt');

        const addComponentRequest = spec.paths['/tools/addComponent'].post.requestBody.content['application/json'].schema;
        expect(addComponentRequest).to.deep.equal({ $ref: '#/components/schemas/ToolsAddComponentInput' });

        const addComponentSchema = spec.components.schemas.ToolsAddComponentInput;
        expect(addComponentSchema.type).to.equal('object');
        expect(addComponentSchema.required).to.include.members(['eid', 'component_name']);
        expect(addComponentSchema.properties.eid.type).to.equal('integer');
        expect(addComponentSchema.properties.component_name.type).to.equal('string');

        const addComponentWithValuesRequest = spec.paths['/tools/addComponentWithValues'].post.requestBody.content['application/json'].schema;
        expect(addComponentWithValuesRequest).to.deep.equal({ $ref: '#/components/schemas/ToolsAddComponentWithValuesInput' });

        const addComponentWithValuesSchema = spec.components.schemas.ToolsAddComponentWithValuesInput;
        expect(addComponentWithValuesSchema.properties.component_values.additionalProperties.type).to.equal('number');

    const agentPromptRequest = spec.paths['/agent/prompt'].post.requestBody.content['application/json'].schema;
    expect(agentPromptRequest).to.deep.equal({ $ref: '#/components/schemas/AgentPromptInput' });

    const agentPromptSchema = spec.components.schemas.AgentPromptInput;
    expect(agentPromptSchema.required).to.include('prompt');
    expect(agentPromptSchema.properties.prompt.minLength).to.equal(1);

        const htmlResponse = await fetch(`${baseUrl}/docs`);
        expect(htmlResponse.status).to.equal(200);
        const html = await htmlResponse.text();
        expect(html).to.include('SwaggerUIBundle');
    });

    it('forwards prompts to the Ollama agent with MCP configuration', async () => {
        const response = await fetch(`${baseUrl}/agent/prompt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: 'Summarize the world state',
                toolsWhitelist: ['addEntity'],
                context: ['The player is in the tavern.']
            })
        });

        expect(response.status).to.equal(200);
        const payload = await response.json();
        expect(fetchInterceptor.calls).to.have.lengthOf(1);

        const { url, options } = fetchInterceptor.calls[0];
        const expectedChatUrl = `${stripTrailingSlash(env.DEFAULT_OLLAMA_BASE_URL)}/api/chat`;
        expect(url).to.equal(expectedChatUrl);
        const body = JSON.parse(options.body);

        expect(body.model).to.equal(env.ollama_model_name);
        expect(body.messages[0].content).to.include('Allowed MCP tools: addEntity');
        expect(body.messages.at(-1)).to.deep.equal({ role: 'user', content: 'Summarize the world state' });
        expect(body.options.mcp.servers.ecs.url).to.equal(env.DEFAULT_MCP_URL);
        expect(body.options.mcp.allow).to.deep.equal(['addEntity']);
        expect(payload.allowedTools).to.deep.equal(['addEntity']);
    });

    it('rejects invalid prompt payloads', async () => {
        const response = await fetch(`${baseUrl}/agent/prompt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        expect(response.status).to.equal(400);
        const payload = await response.json();
        expect(payload.error).to.equal('invalid_prompt_payload');
        expect(fetchInterceptor.calls).to.have.lengthOf(0);
    });
});
