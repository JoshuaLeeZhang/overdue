import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { chromium } from 'playwright';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // electron-vite provides an env var when in dev, pointing to the dev server
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../out/renderer/index.html'));
  }

  // Open the DevTools automatically for debugging if needed
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Setup Playwright agent integration
ipcMain.on('agent:start', async (event) => {
  const log = (msg: string) => {
    console.log(msg); // to terminal
    event.reply('agent:log', msg); // to UI
  };

  try {
    log('Launching browser');
    const browser = await chromium.launch({ headless: false });
    
    // Create new context & page
    const context = await browser.newContext();
    const page = await context.newPage();

    log('Navigating to URL');
    await page.goto('https://example.com');

    log('Extracting content');
    const title = await page.title();
    // We only extract the generic text from the body to keep it simple, as requested.
    const text = await page.evaluate(() => document.body.innerText.trim());

    // Send result back to the renderer
    event.reply('agent:result', { title, text });

    log('Done');
    
    // For this skeleton, we will close the browser after completion. 
    // You could also leave it open for debugging.
    await browser.close();

  } catch (error: any) {
    log(`Error: ${error?.message || 'Unknown error occurred'}`);
  }
});
