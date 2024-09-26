import { join } from "node:path";
import { unlinkSync } from "node:fs";

import { createServer, createConnection } from "node:net";

const SOCKET_PATH =
	process.platform === "win32"
		? "\\\\?\\pipe\\discord-ipc"
		: join(
			process.env.XDG_RUNTIME_DIR || process.env.TMPDIR || process.env.TMP || process.env.TEMP || "/tmp",
			"discord-ipc",
		);

const Types = {
	HANDSHAKE: 0,
	FRAME: 1,
	CLOSE: 2,
	PING: 3,
	PONG: 4,
};

const CloseCodes = {
	CLOSE_NORMAL: 1000,
	CLOSE_UNSUPPORTED: 1003,
	CLOSE_ABNORMAL: 1006,
};

const ErrorCodes = {
	INVALID_CLIENTID: 4000,
	INVALID_ORIGIN: 4001,
	RATELIMITED: 4002,
	TOKEN_REVOKED: 4003,
	INVALID_VERSION: 4004,
	INVALID_ENCODING: 4005,
};

let uniqueId = 0;

const encode = (type, data) => {
	const jsonData = JSON.stringify(data);
	const dataSize = Buffer.byteLength(jsonData);

	const buf = Buffer.alloc(dataSize + 8);
	buf.writeInt32LE(type, 0); // type
	buf.writeInt32LE(dataSize, 4); // data size
	buf.write(jsonData, 8, dataSize); // data

	return buf;
};

const read = (socket) => {
	let resp = socket.read(8);
	if (!resp) return;

	resp = Buffer.from(resp);
	const type = resp.readInt32LE(0);
	const dataSize = resp.readInt32LE(4);

	if (type < 0 || type >= Object.keys(Types).length)
		throw new Error("invalid type");

	let data = socket.read(dataSize);
	if (!data) throw new Error("failed reading data");

	data = JSON.parse(Buffer.from(data).toString());

	switch (type) {
		case Types.PING:
			socket.emit("ping", data);
			socket.write(encode(Types.PONG, data));
			break;

		case Types.PONG:
			socket.emit("pong", data);
			break;

		case Types.HANDSHAKE:
			if (socket._handshook) throw new Error("already handshook");

			socket._handshook = true;
			socket.emit("handshake", data);
			break;

		case Types.FRAME:
			if (!socket._handshook) throw new Error("need to handshake first");

			socket.emit("request", data);
			break;

		case Types.CLOSE:
			socket.end();
			socket.destroy();
			break;
	}

	read(socket);
};

const socketIsAvailable = async (socket) => {
	socket.on("readable", () => {
		try {
			read(socket);
		} catch (e) {
			socket.end(
				encode(Types.CLOSE, {
					code: CloseCodes.CLOSE_UNSUPPORTED,
					message: e.message,
				}),
			);
			socket.destroy();
		}
	});

	const stop = () => {
		try {
			socket.end();
			socket.destroy();
		} catch { }
	};

	const possibleOutcomes = Promise.race([
		new Promise((res) => socket.on("error", res)), // errored
		new Promise((res, rej) => socket.on("pong", () => rej("socket ponged"))), // ponged
		new Promise((res, rej) => setTimeout(() => rej("timed out"), 1000)), // timed out
	]).then(
		() => true,
		(e) => e,
	);

	socket.write(encode(Types.PING, { code: ++uniqueId, message: "ping" }));

	const outcome = await possibleOutcomes;
	stop();

	return outcome === true;
};

const getAvailableSocket = async (tries = 0) => {
	if (tries > 9) {
		throw new Error(`ran out of tries to find socket: ${tries}`);
	}

	const path = `${SOCKET_PATH}-${tries}`;
	const socket = createConnection(path);

	if (await socketIsAvailable(socket)) {
		if (process.platform !== "win32")
			try {
				unlinkSync(path);
			} catch { }

		return path;
	}

	return getAvailableSocket(tries + 1);
};

export default class {
	constructor(handlers) {
		this.handlers = handlers;

		this.onConnection = this.onConnection.bind(this);
		this.onMessage = this.onMessage.bind(this);

		const server = createServer(this.onConnection);

		getAvailableSocket().then((socketPath) => {
			server.listen(socketPath);
			console.log(`[bunRPC] [Transport] [IPC] listening on ${socketPath}`);
		});
	}

	onConnection(socket) {
		socket.data = {};
		socket.pause();
		socket.on("readable", () => {
			try {
				read(socket);
			} catch (e) {
				socket.end(
					encode(Types.CLOSE, {
						code: CloseCodes.CLOSE_UNSUPPORTED,
						message: e.message,
					}),
				);
				socket.destroy();
			}
		});

		socket.once("handshake", (params) => {
			const ver = Number.parseInt(params.v ?? 1);
			const clientId = params.client_id ?? "";

			socket.close = (code = CloseCodes.CLOSE_NORMAL, message = "") => {
				socket.end(
					encode(Types.CLOSE, {
						code,
						message,
					}),
				);
				socket.destroy();
			};

			if (ver !== 1) {
				console.log(socket.data)
				socket.close(ErrorCodes.INVALID_VERSION);
				return;
			}

			if (clientId === "") {
				console.log(socket.data)
				socket.close(ErrorCodes.INVALID_CLIENTID);
				return;
			}

			socket.data.clientId = clientId;

			socket.on("close", (e) => {
				this.handlers.close(socket);
				console.log("[bunRPC] [Transport] [IPC] connection lost");
			});

			socket.on("request", this.onMessage.bind(this, socket));

			socket._send = socket.send;
			socket.send = (msg) => {
				socket.write(encode(Types.FRAME, msg));
			};

			this.handlers.connection(socket);
		});

		console.log("[bunRPC] [Transport] [IPC] connection established");
	}

	onMessage(socket, msg) {
		this.handlers.message(socket, msg);
	}
}
