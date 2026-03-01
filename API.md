# API Reference

Base URL: `http://localhost:3000` (or `PORT` env)

All request bodies use `Content-Type: application/json` unless noted.

---

## Agent

### POST /run-agent

Run the browser agent. Uses **Dedalus** (LLM + Browser Use MCP) when `DEDALUS_API_KEY` is set; otherwise uses **Playwright** for simple extract.

**Request body:**

| Field   | Type   | Required | Description                                                                 |
|---------|--------|----------|-----------------------------------------------------------------------------|
| input   | string | no       | Natural language task (e.g. "Go to example.com and extract the page"). Used when Dedalus is configured. |
| url     | string | no       | URL for simple extract (Playwright fallback). Default: https://example.com  |
| model   | string | no       | Dedalus model override (e.g. `anthropic/claude-sonnet-4`). Only when Dedalus is used. |
| job     | object | no       | Structured job for Playwright: `{ mode: "fill_form", url, values }`         |

**Dedalus path** (when `DEDALUS_API_KEY` is set and no `job`):

- Uses `input` or builds prompt from `url`
- Returns `200` with full result

**Response (Dedalus, 200):**

```json
{
  "ok": true,
  "finalOutput": "...",
  "stepsUsed": 1,
  "toolsCalled": []
}
```

**Response (Playwright, 202):**

```json
{
  "ok": true,
  "message": "Agent started"
}
```

Logs and result stream via WebSocket. Poll `GET /agent/last-result` for the extracted `{ title, text }`.

**Form-fill job** (Playwright only):

```json
{
  "job": {
    "mode": "fill_form",
    "url": "https://example.com/form",
    "values": { "fieldName": "value", "email": "user@example.com" }
  }
}
```

---

### GET /agent/last-result

Return the last agent result (from most recent `/run-agent` or Dedalus run).

**Response (200):**

```json
{
  "title": "Example Domain",
  "text": "Example Domain\n\nThis domain is for use in..."
}
```

**Response (204):** No result yet.

---

## Scraper

### POST /scraper/login

Open a visible browser with the persistent profile. User logs in to LMS/course sites, then closes the window. Subsequent scrapes use the saved session.

**Response (202):**

```json
{
  "ok": true,
  "message": "Login browser opened. Log in to your sites, then close the window when done."
}
```

---

### POST /scrape

Scrape one or more URLs and return structured context. Uses headless Playwright with the persistent profile (`.browser-profile`), so scrapes use saved logins from the login flow.

**Request body:**

| Field    | Type    | Required | Description                                                                 |
|----------|---------|----------|-----------------------------------------------------------------------------|
| urls     | string[]| yes      | URLs to scrape                                                              |
| traverse | boolean | no       | If true, follow links from the first URL to scrape assignment subpages (up to 25) |

```json
{
  "urls": ["https://learn.uwaterloo.ca/d2l/le/content/123456/view"],
  "traverse": true
}
```

**Response (200):**

```json
{
  "contextId": "ctx_1",
  "context": {
    "pages": [
      {
        "url": "https://example.com",
        "title": "Example Domain",
        "text": "..."
      }
    ]
  }
}
```

**Response (400):** `{ "error": "urls array required" }`

---

### GET /context/:id

Fetch stored context by ID (from `/scrape`).

**Response (200):** Same shape as `context` in `/scrape` response.

**Response (404):** `{ "error": "Context not found" }`

---

## Pipeline

### POST /pipeline/draft

Generate an assignment draft from instructions, scraped context, and optional writing-style profile.

When `DEDALUS_API_KEY` is set, uses the LLM. Otherwise returns a template.

**Request body:**

| Field          | Type   | Required | Description                                      |
|----------------|--------|----------|--------------------------------------------------|
| assignmentSpec | object | no       | `{ instructions?: string, type?: string, url?: string }` |
| contextId      | string | no       | ID from `/scrape` to load context                |
| context        | object | no       | Inline context: `{ pages: [{ url, title, text }] }` |
| styleProfile   | object | no       | `{ summary?: string, excerpts?: string[] }`      |

**Response (200):**

```json
{
  "draft": "..."
}
```

**Response (500):** `{ "error": "..." }`

---

## WebSocket

Connect to `ws://localhost:3000` (same host as HTTP).

**Server → client messages** (JSON):

| type   | payload                         | When                    |
|--------|---------------------------------|--------------------------|
| log    | string                          | Agent log line           |
| result | `{ title?, text? }`             | Agent finished, result   |
| end    | `{ code: number }`              | Agent process exited     |

---

## Environment

| Variable         | Description                                                |
|------------------|------------------------------------------------------------|
| PORT             | Server port (default 3000)                                 |
| DEDALUS_API_KEY  | Required for Dedalus path. Get from [dashboard](https://www.dedaluslabs.ai/dashboard/api-keys). |
| DEDALUS_MODEL    | Model override (default `anthropic/claude-sonnet-4`)       |
| CONVEX_URL       | Convex deployment URL for persistent context store. Set automatically when you run `npm run dev:server` (Convex writes `.env.local`). Also derived from `CONVEX_DEPLOYMENT` if set. Without either, context is stored in-memory only. |
