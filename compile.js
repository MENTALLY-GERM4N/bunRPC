import { $, build } from "bun";

const targets = ["linux", "windows", "darwin"];
const arch = ["x64-modern", "arm64-modern", "x64-baseline", "arm64-baseline"];

const combos = [];

for (let i = 0; i < targets.length; i++) {
	for (let j = 0; j < arch.length; j++) {
		combos.push(`bun-${targets[i]}-${arch[j]}`);
	}
}

build({
	entrypoints: ["./index.js"],
	outdir: "./dist",
	target: "bun",
	minify: true,
	naming: "[dir]/bunRPC.[ext]",
});

for (const combo of combos) {
	try {
		await $`bun build --compile --target=${combo} ./dist/bunRPC.js --outfile dist/${combo.replace(
			"bun",
			"bunRPC",
		)}`;
	} catch {
		console.log(`Attempted to build unsupported target: ${combo}`);
	}
}
