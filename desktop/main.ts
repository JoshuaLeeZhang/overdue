import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local" });

import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "path";
import { runAgent } from "../agent/agent";

let mainWindow: BrowserWindow | null = null;

function getBrowserProfilePath(): string {
	return process.env.BROWSER_PROFILE_PATH || path.join(app.getPath("userData"), "browser-profile");
}

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		},
	});

	// electron-vite provides an env var when in dev, pointing to the dev server
	if (process.env["ELECTRON_RENDERER_URL"]) {
		mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
	} else {
		mainWindow.loadFile(path.join(__dirname, "../out/renderer/index.html"));
	}

	// Open the DevTools automatically for debugging if needed
	// mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
	createWindow();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

// Use browser-use agent; logs and result are forwarded to the renderer
ipcMain.on("agent:start", async (_event, task?: string) => {
	const log = (msg: string) => {
		console.log(msg);
		for (const w of BrowserWindow.getAllWindows()) {
			w.webContents.send("agent:log", msg);
		}
	};

	try {
		const result = await runAgent({
			log,
			userDataDir: getBrowserProfilePath(),
			...(task && { task }),
		});
		for (const w of BrowserWindow.getAllWindows()) {
			w.webContents.send("agent:result", result);
		}
	} catch (error: unknown) {
		const msg = error instanceof Error ? error.message : "Unknown error occurred";
		log(`Error: ${msg}`);
		for (const w of BrowserWindow.getAllWindows()) {
			w.webContents.send("agent:error");
		}
	}
});
