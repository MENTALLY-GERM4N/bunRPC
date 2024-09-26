import { exec } from "node:child_process";

export const getProcesses = () => {
	return new Promise((resolve) => {
		exec(
			"wmic process get ProcessID,ExecutablePath /format:csv",
			(error, output) => {
				const processes = output
					.toString()
					.split("\r\n") // Split by new lines
					.slice(2) // Remove headers
					.map((line) => line.trim().split(",").reverse()) // Split, reverse, and trim
					.filter((parsed) => parsed[1]) // Filter out invalid paths
					.map(([executablePath, processId]) => [
						Number(processId) || processId,
						executablePath,
					]); // Parse IDs

				resolve(processes);
			},
		);
	});
};
