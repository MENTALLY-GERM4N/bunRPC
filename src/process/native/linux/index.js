import { readdir } from "node:fs/promises";
import { file } from "bun";

export const getProcesses = async () => {
	const directories = await readdir("/proc");

	const processPromises = directories
		.filter((pid) => +pid > 0) // Filter valid PIDs upfront
		.map(async (pid) => {
			try {
				const cmdline = await file(`/proc/${pid}/cmdline`).text();
				const [command, ...args] = cmdline.split("\0"); // Destructure for clarity
				return [+pid, command, args];
			} catch {
				return null; // Return null on failure
			}
		});

	const processes = await Promise.all(processPromises);
	return processes.filter(Boolean); // Filter out null entries
};
