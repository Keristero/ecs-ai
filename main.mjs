import path from "path";
import env from "./environment.mjs";
import Logger from "./logger.mjs";
import { serve_mcp } from "./mcp_server/mcp_server.mjs";
import { serve_api } from "./api/server.mjs";

const logger = new Logger("Main", 'green');

async function start() {
	const modulePath = path.resolve(env.game_logic_folder_path, env.game_logic_script_name);
	const game = (await import(modulePath)).default;

	if (!game || typeof game.update !== 'function') {
		throw new Error(`Game module at ${modulePath} must export a default object with an update function.`);
	}

	await Promise.resolve(game.update(game));

	try {
		const [mcpInfo, apiInfo] = await Promise.all([
			serve_mcp(game),
			serve_api(game)
		]);

		logger.info('Services started', {
			mcp: mcpInfo?.server?.address?.(),
			api: apiInfo?.server?.address?.()
		});
	} catch (error) {
		logger.error('Failed to start services', error);
		process.exit(1);
	}
}

start().catch((error) => {
	logger.error('Unhandled startup error', error);
	process.exit(1);
});