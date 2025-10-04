import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import path from 'path';
import { initialize_game } from '../game_framework/framework.mjs';
import { serve_api } from '../api/server.mjs';

const createResponse = (body, status = 200, headers = { 'Content-Type': 'application/json' }) => {
    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    return new Response(payload, { status, headers });
};

describe('API Server', () => {
    let game;
    let serverInfo;
    let baseUrl;
    let fetchCalls;
    let fetchStub;

    beforeEach(async () => {
        process.env.GAME_LOGIC_FOLDER_PATH = path.resolve('./tests/fixtures');
        game = await initialize_game();
        fetchCalls = [];
        fetchStub = async (url, options) => {
            fetchCalls.push({ url, options });
            return createResponse({ reply: 'ok' });
        };

        serverInfo = await serve_api(game, {
            host: '127.0.0.1',
            port: 0,
            ollamaBaseUrl: 'http://ollama.test',
            ollamaModel: 'test-model',
            fetchImpl: fetchStub,
            mcpUrl: 'http://mcp.test/mcp'
        });

        const address = serverInfo.server.address();
        const host = address.address === '::' ? '127.0.0.1' : address.address;
        baseUrl = `http://${host}:${address.port}`;
    });

    afterEach(async () => {
        if (serverInfo?.server) {
            await new Promise((resolve) => serverInfo.server.close(resolve));
        }
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
        expect(fetchCalls).to.have.lengthOf(1);

        const { url, options } = fetchCalls[0];
        expect(url).to.equal('http://ollama.test/api/chat');
        const body = JSON.parse(options.body);

        expect(body.model).to.equal('test-model');
        expect(body.messages[0].content).to.include('Allowed MCP tools: addEntity');
        expect(body.messages.at(-1)).to.deep.equal({ role: 'user', content: 'Summarize the world state' });
        expect(body.options.mcp.servers.ecs.url).to.equal('http://mcp.test/mcp');
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
        expect(fetchCalls).to.have.lengthOf(0);
    });
});
