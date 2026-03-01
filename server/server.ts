import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { spawn } from 'child_process';
import { WebSocketServer } from 'ws';
import { generateDraft } from './pipeline';
import { runDedalusAgent } from './dedalus-runner';

const PORT = process.env.PORT || 3000;
const app = express();
const server = createServer(app);

const wss = new WebSocketServer({ server });
const clients = new Set<import('ws').WebSocket>();
let lastResult: { title?: string; text?: string } | null = null;
const contextStore = new Map<string, { pages?: { url: string; title: string; text: string }[] }>();
let contextIdCounter = 0;

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});

function broadcast(msg: object): void {
  const data = JSON.stringify(msg);
  clients.forEach((c) => {
    if (c.readyState === 1) c.send(data);
  });
}

// From dist/server/ we need to reach project root, then ui/
const uiPath = path.join(__dirname, '../..', 'ui');
app.use(express.json());
app.use(express.static(uiPath));

app.get('/agent/last-result', (_req, res) => {
  if (lastResult == null) {
    return res.status(204).send();
  }
  res.json(lastResult);
});

app.post('/run-agent', async (req, res) => {
  lastResult = null;
  const body = (req.body || {}) as {
    input?: string;
    url?: string;
    model?: string;
    job?: { mode?: string; url?: string; values?: Record<string, unknown> };
  };
  const { input, url, model, job } = body;
  const hasDedalus = !!process.env.DEDALUS_API_KEY;

  if (hasDedalus && (input || !job)) {
    const prompt =
      typeof input === 'string' && input.trim()
        ? input.trim()
        : `Go to ${url || 'https://example.com'} and extract the page title and main text.`;
    try {
      broadcast({ type: 'log', payload: 'Running Dedalus agent (LLM + Browser Use MCP)...' });
      const result = await runDedalusAgent({ input: prompt, model });
      lastResult = { title: 'Agent', text: result.finalOutput };
      broadcast({ type: 'result', payload: lastResult });
      broadcast({ type: 'end', code: 0 });
      return res.json({ ok: true, ...result });
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message });
    }
  }

  const projectRoot = path.join(__dirname, '..');
  let agentPath: string;
  const env = { ...process.env };
  if (job && job.mode === 'fill_form' && job.url) {
    agentPath = path.join(projectRoot, 'agent', 'fill-form.js');
    env.AGENT_JOB = JSON.stringify({ mode: 'fill_form', url: job.url, values: job.values || {} });
  } else {
    agentPath = path.join(projectRoot, 'agent', 'agent.js');
    if (url) env.AGENT_URL = url;
  }

  const child = spawn('node', [agentPath], {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    env,
  });

  let buffer = '';
  function processLine(line: string): void {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const parsed = JSON.parse(trimmed) as { result?: unknown };
      if (parsed.result != null) {
        lastResult = parsed.result as { title?: string; text?: string };
        broadcast({ type: 'result', payload: parsed.result });
        return;
      }
    } catch {
      // not JSON
    }
    broadcast({ type: 'log', payload: trimmed });
  }

  child.stdout?.setEncoding('utf8');
  child.stdout?.on('data', (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    lines.forEach(processLine);
  });

  child.stderr?.setEncoding('utf8');
  child.stderr?.on('data', (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    lines.forEach(processLine);
  });

  child.on('close', (code) => {
    if (buffer.trim()) processLine(buffer);
    broadcast({ type: 'end', code });
  });

  res.status(202).json({ ok: true, message: 'Agent started' });
});

function runScraper(urls: string[]): Promise<{ pages: { url: string; title: string; text: string }[] }> {
  return new Promise((resolve, reject) => {
    const projectRoot = path.join(__dirname, '..');
    const scraperPath = path.join(projectRoot, 'agent', 'scraper.js');
    const child = spawn('node', [scraperPath], {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, AGENT_JOB: JSON.stringify({ mode: 'scrape', urls }) },
    });
    let buffer = '';
    let result: { pages: { url: string; title: string; text: string }[] } | null = null;
    function processLine(line: string): void {
      const trimmed = line.trim();
      if (!trimmed) return;
      try {
        const parsed = JSON.parse(trimmed) as { result?: { context?: { pages?: { url: string; title: string; text: string }[] } } };
        if (parsed.result != null && parsed.result.context != null) {
          result = parsed.result.context as { pages: { url: string; title: string; text: string }[] };
        }
      } catch {
        // not JSON
      }
    }
    child.stdout?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      lines.forEach(processLine);
    });
    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      lines.forEach(processLine);
    });
    child.on('close', (code) => {
      if (buffer.trim()) processLine(buffer);
      if (result != null) resolve(result);
      else reject(new Error(code !== 0 ? `Scraper exited with code ${code}` : 'No context in scraper output'));
    });
  });
}

app.post('/scrape', async (req, res) => {
  const urls = req.body && Array.isArray(req.body.urls) ? (req.body.urls as string[]) : [];
  if (urls.length === 0) {
    return res.status(400).json({ error: 'urls array required' });
  }
  try {
    const context = await runScraper(urls);
    const contextId = `ctx_${++contextIdCounter}`;
    contextStore.set(contextId, context);
    res.json({ contextId, context });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/context/:id', (req, res) => {
  const context = contextStore.get(req.params.id);
  if (!context) return res.status(404).json({ error: 'Context not found' });
  res.json(context);
});

app.post('/pipeline/draft', async (req, res) => {
  const { assignmentSpec = {}, contextId, context: contextBody, styleProfile } = (req.body || {}) as {
    assignmentSpec?: Record<string, unknown>;
    contextId?: string;
    context?: { pages?: { url: string; title: string; text: string }[] };
    styleProfile?: import('../lib/writing-style').WritingStyleProfile | null;
  };
  const context = contextBody || (contextId ? contextStore.get(contextId) : null) || { pages: [] };
  try {
    const { draft } = await generateDraft(
      assignmentSpec as import('./pipeline').AssignmentSpec,
      context,
      styleProfile ?? null
    );
    res.json({ draft });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

server.listen(PORT, () => {
  console.log(`Server at http://localhost:${PORT}`);
});
