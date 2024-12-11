import { EventEmitter } from "node:events";

import ipc from "./transports/ipc.js";
import ws from "./transports/ws.js";

import process from "./process/index.js";

let socketId = 0;

export default class extends EventEmitter {
	constructor() {
		super();

		this.onClose = this.onClose.bind(this);
		this.onConnection = this.onConnection.bind(this);
		this.onMessage = this.onMessage.bind(this);

		const handlers = {
			connection: this.onConnection,
			message: this.onMessage,
			close: this.onClose,
		};

		// Windows: https://github.com/oven-sh/bun/pull/11378, https://github.com/oven-sh/bun/issues/11820
		// Ensure you have the latest bun version installed if you encounter issues.
		new ipc(handlers);
		new ws(handlers);

		new process(handlers);
	}

	onConnection(socket) {
		socket.send({
			cmd: "DISPATCH",
			data: {
				v: 1,
				config: {
					cdn_host: "cdn.discordapp.com",
					api_endpoint: "//discord.com/api",
					environment: "production",
				},
				user: {
					// mocked user
					id: "1288207496158380042",
					username: "bunRPC",
					global_name: null,
					avatar: "786220a525357da464740fb4e4733964",
					avatar_decoration_data: null,
					discriminator: "9677",
					public_flags: 0,
					clan: null,
					flags: 0,
					bot: false,
					banner: "7c5909da611edc965917f64897ccfd56",
					banner_color: null,
					accent_color: null,
					bio: "",
				},
			},
			evt: "READY",
			nonce: null,
		});

		socket.data.socketId = socketId++;

		this.emit("connection", socket);
	}

	onClose(socket) {
		this.emit("activity", {
			activity: null,
			pid: socket.data.lastPid,
			socketId: socket.data.socketId.toString(),
		});

		this.emit("close", socket);
	}

	onMessage(socket, { cmd, args, nonce }) {
		this.emit("message", { socket, cmd, args, nonce });

		if (cmd === "CONNECTIONS_CALLBACK") {
			return socket.send({
				cmd,
				data: {
					code: 1000,
				},
				evt: "ERROR",
				nonce,
			});
		}

		if (cmd === "SET_ACTIVITY") {
			const { activity, pid } = args;

			socket.data.lastPid = pid ?? socket.data.lastPid;

			if (!activity) {
				this.emit("activity", {
					activity: null,
					pid,
					socketId: socket.data.socketId.toString(),
				});

				return socket.send({
					cmd,
					data: null,
					evt: null,
					nonce,
				});
			}

			const { buttons, timestamps, instance } = activity;

			const metadata = { };
			const extra = { };

			if (buttons) {
				metadata.buttons_urls = buttons.map((button) => button.url);
				extra.buttons = buttons.map((button) => button.label);
			}

			if (timestamps) {
				for (const x in timestamps) {
					const key = x;
					// translate s -> ms timestamps
					if (
						timestamps[key] !== undefined &&
						Date.now().toString().length - timestamps[key].toString().length > 2
					)
						timestamps[key] = Math.floor(1000 * timestamps[key]);
				}
			}

			this.emit("activity", {
				activity: {
					application_id: socket.data.clientId,
					metadata,
					flags: instance ? 1 << 0 : 0,
					...activity,
					...extra,
				},
				pid,
				socketId: socket.data.socketId.toString(),
			});

			return socket.send?.({
				cmd,
				data: {
					...activity,
					name: "",
					application_id: socket.data.clientId,
					type: 0,
				},
				evt: null,
				nonce,
			});
		}

		if (cmd === "GUILD_TEMPLATE_BROWSER" || cmd === "INVITE_BROWSER") {
			const { code } = args;

			const isInvite = cmd === "INVITE_BROWSER";

			const callback = (isValid = true) => {
				socket.send({
					cmd,
					data: isValid
						? { code }
						: {
								code: isInvite ? 4011 : 4017,
								message: `Invalid ${isInvite ? "invite" : "guild template"} id: ${code}`,
							},
					evt: isValid ? null : "ERROR",
					nonce,
				});
			};

			return this.emit(isInvite ? "invite" : "guild-template", code, callback);
		}

		if (cmd === "DEEP_LINK") {
			return this.emit("link", args.params);
		}
	}
}
