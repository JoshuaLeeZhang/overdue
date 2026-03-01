import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { resolve } from "path";

export default defineConfig({
	main: {
		build: {
			lib: {
				entry: resolve(__dirname, "desktop/main.ts"),
			},
		},
		plugins: [externalizeDepsPlugin()],
	},
	renderer: {
		root: "desktop",
		build: {
			rollupOptions: {
				input: {
					index: resolve(__dirname, "desktop/index.html"),
				},
			},
		},
		resolve: {
			alias: {
				"@": resolve(__dirname, "desktop"),
			},
		},
	},
});
