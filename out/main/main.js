"use strict";
const electron = require("electron");
const path = require("path");
const playwright = require("playwright");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
let mainWindow = null;
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  if (process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path__namespace.join(__dirname, "../out/renderer/index.html"));
  }
}
electron.app.whenReady().then(() => {
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.ipcMain.on("agent:start", async (event) => {
  const log = (msg) => {
    console.log(msg);
    event.reply("agent:log", msg);
  };
  try {
    log("Launching browser");
    const browser = await playwright.chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    log("Navigating to URL");
    await page.goto("https://example.com");
    log("Extracting content");
    const title = await page.title();
    const text = await page.evaluate(() => document.body.innerText.trim());
    event.reply("agent:result", { title, text });
    log("Done");
    await browser.close();
  } catch (error) {
    log(`Error: ${error?.message || "Unknown error occurred"}`);
  }
});
