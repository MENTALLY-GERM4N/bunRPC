import { parse } from "node:querystring";

const portRange = [6463, 6472];

const checkIfOpen = async (port) => {
	try {
		await fetch(`http://localhost:${port}`);
		return true;
	} catch (e) {
		return false;
	}
};

const getPort = async () => {
	let port = portRange[0];

	while (port <= portRange[1]) {
		if (await checkIfOpen(port)) {
			port++;
		} else {
			break;
		}
	}

	return port;
};

export default class {
	constructor(handlers) {
		this.handlers = handlers;

		getPort().then((port) => {
			const ws = Bun.serve({
				port,
				fetch(req, server) {
					const params = parse(req.url.split("?")[1]);

					if (
						server.upgrade(req, {
							data: {
								version: Number.parseInt(String(params.v ?? 1)),
								encoding: params.encoding ?? "json",
								clientId: params.client_id ?? "",
							},
						})
					) {
						return undefined;
					}

					return Response.redirect(
						"https://github.com/wont-stream/bunRPC",
						301,
					);
				},
				websocket: {
					open: (ws) => {
						const { version, encoding } = ws.data;
						if (version !== 1) {
							ws.close();
							return;
						}

						if (encoding !== "json") {
							ws.close();
							return;
						}

						this.handlers.connection(ws);
					},
					message: (ws, msg) => {
						console.log(msg)
						this.handlers.message(ws, JSON.parse(msg));
					},
					close: (ws) => {
						this.handlers.close(ws);
					},
				},
			});

			console.log(`[bunRPC] [Transport] [WS] listening on ws://localhost:${ws.port}`);
		});
	}
}
