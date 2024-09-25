import server from "./src/server.js";
import * as bridge from "./src/bridge.js";

const bunRPC = new server();

bunRPC.on("activity", bridge.send);
