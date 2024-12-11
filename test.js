
const portRange = [6463, 6472];

const checkIfOpen = async (port) => {
	return new Promise((resolve) => {
		const ws = new WebSocket(`ws://localhost:${port}`);

		ws.onopen = () => {console.log(1)
			ws.close();
			resolve(true);
		};

		ws.onerror = () => {
			resolve(false);
		};
	});
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

console.log(await getPort());