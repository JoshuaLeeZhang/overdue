# Desktop Agent (Electron + Playwright)

Minimal skeleton: Electron window, Express + WebSocket server, Playwright agent.

## One-time setup

```bash
npm install
npx playwright install chromium
```

## Run

1. **Terminal 1** — start the server:
   ```bash
   npm run server
   ```

2. **Terminal 2** — start Electron:
   ```bash
   npm run electron
   ```

3. In the app window, click **Run agent**. A visible Chromium window opens, navigates to example.com, and logs stream in the UI. When done, the extracted title and page text appear below.
