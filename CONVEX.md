# Convex persistent context store

The context store (scraped pages from `/scrape`) persists in [Convex](https://convex.dev) when you use the dev server.

## One-command setup

```bash
npm run dev:server
```

First run: Convex will prompt you to log in and create a project. After that, it writes `.env.local` and syncs your functions. The server starts with persistent storage.

Subsequent runs: Convex and the server start together; no prompts.

## Without Convex

```bash
npm run dev:server:simple
# or
npm run build && npm run server
```

Uses in-memory storage (context is lost on restart). No Convex account needed.
