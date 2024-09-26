import { exec } from "node:child_process";

export const getProcesses = () => {
	return new Promise((resolve, reject) => {
		exec("ps -axo pid,comm", (error, stdout) => {
			if (error) {
				return reject(error); // Handle errors
			}

			const processes = stdout
				.toString()
				.split("\n") // Split by new lines
				.slice(1) // Skip the header line
				.map((line) => line.trim().split(/\s+/, 2)) // Split into PID and command
				.filter((parts) => parts.length === 2) // Ensure both PID and command exist
				.map(([pid, command]) => [Number(pid), command]);

			resolve(processes);
		});
	});
};
