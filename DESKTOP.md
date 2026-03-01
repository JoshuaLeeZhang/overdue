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

## MCP server (optional)

AI clients (e.g. Cursor, Claude Desktop) can trigger the agent via the MCP server. The backend must be running first.

1. Start the backend: `npm run server`
2. Run the MCP server (for local testing): `npm run mcp` — or add it to your MCP config so the client spawns it.

**Cursor:** In MCP settings, add a server with command `node` and args `["/absolute/path/to/server/mcp-server.js"]` (or `["server/mcp-server.js"]` with cwd set to the project root). Set `BACKEND_URL` if the backend is not on port 3000.

**MCP tools:** `run_browser_agent`, `scrape_assignment_context`, `gdrive_list_files`, `gdrive_read_document`, `gdrive_get_writing_style`, `o365_list_files`, `o365_read_document`, `o365_get_writing_style`, `generate_draft`, `fill_form`, `do_assignment`. Google Drive requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`. Office 365 is a stub until `MS_*` env vars are wired.

**Backend API:** `POST /run-agent` (body: `{ url? }` or `{ job: { mode: "fill_form", url, values } }`), `POST /scrape` (body: `{ urls }`), `GET /context/:id`, `POST /pipeline/draft` (body: `{ assignmentSpec, context?, contextId?, styleProfile? }`).
