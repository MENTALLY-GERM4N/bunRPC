import { platform, env } from "node:process";


const SOCKET_PATH =
    platform === "win32"
        ? "\\\\?\\pipe\\discord-ipc"
        : join(
            env.XDG_RUNTIME_DIR || env.TMPDIR || env.TMP || env.TEMP || "/tmp",
            "discord-ipc",
        );

Bun.serve({
    unix: SOCKET_PATH, // path to socket
    fetch(req) {
        return new Response("404!");
    },
});