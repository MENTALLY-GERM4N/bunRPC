const clients = new Set();

const lastMsg = {};

export const send = (msg) => {
	lastMsg[msg.socketId] = msg;
	for (const client of clients) {
		client.send(JSON.stringify(msg));
	}
};

Bun.serve({
	port: 1337,
	fetch(req, server) {
		if (server.upgrade(req)) {
			return undefined;
		}

		return Response.redirect("https://github.com/wont-stream/bunRPC", 301);
	},
	websocket: {
		message() {},
		open(ws) {
			clients.add(ws);

			for (const id in lastMsg) {
				// catch up newly connected
				if (lastMsg[id].activity != null) send(lastMsg[id]);
			}
		},
		close(ws) {
			clients.delete(ws);
		},
	},
});
