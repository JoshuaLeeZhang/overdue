const express = require('express');
const { createServer } = require('http');
const path = require('path');
const { spawn } = require('child_process');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const app = express();
const server = createServer(app);

const wss = new WebSocketServer({ server });
const clients = new Set();
let lastResult = null;
const contextStore = new Map();
let contextIdCounter = 0;

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});

function broadcast(msg) {
  const data = JSON.stringify(msg);
  clients.forEach((c) => {
    if (c.readyState === 1) c.send(data);
  });
}

const uiPath = path.join(__dirname, '../ui');
app.use(express.json());
app.use(express.static(uiPath));

app.get('/agent/last-result', (req, res) => {
  if (lastResult == null) {
    return res.status(204).send();
  }
  res.json(lastResult);
});

app.post('/run-agent', (req, res) => {
  lastResult = null;
  const projectRoot = path.join(__dirname, '..');
  const body = req.body || {};
  const job = body.job;
  const url = typeof body.url === 'string' ? body.url : undefined;

  let agentPath;
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
  function processLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.result != null) {
        lastResult = parsed.result;
        broadcast({ type: 'result', payload: parsed.result });
        return;
      }
    } catch (_) {}
    broadcast({ type: 'log', payload: trimmed });
  }

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    lines.forEach(processLine);
  });

  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => {
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

function runScraper(urls) {
  return new Promise((resolve, reject) => {
    const projectRoot = path.join(__dirname, '..');
    const scraperPath = path.join(projectRoot, 'agent', 'scraper.js');
    const child = spawn('node', [scraperPath], {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, AGENT_JOB: JSON.stringify({ mode: 'scrape', urls }) },
    });
    let buffer = '';
    let result = null;
    function processLine(line) {
      const trimmed = line.trim();
      if (!trimmed) return;
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.result != null && parsed.result.context != null) {
          result = parsed.result.context;
        }
      } catch (_) {}
    }
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      lines.forEach(processLine);
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
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
  const urls = req.body && Array.isArray(req.body.urls) ? req.body.urls : [];
  if (urls.length === 0) {
    return res.status(400).json({ error: 'urls array required' });
  }
  try {
    const context = await runScraper(urls);
    const contextId = `ctx_${++contextIdCounter}`;
    contextStore.set(contextId, context);
    res.json({ contextId, context });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/context/:id', (req, res) => {
  const context = contextStore.get(req.params.id);
  if (!context) return res.status(404).json({ error: 'Context not found' });
  res.json(context);
});

const pipeline = require('./pipeline.js');
app.post('/pipeline/draft', (req, res) => {
  const { assignmentSpec = {}, contextId, context: contextBody, styleProfile } = req.body || {};
  const context = contextBody || (contextId ? contextStore.get(contextId) : null) || { pages: [] };
  try {
    const { draft } = pipeline.generateDraft(assignmentSpec, context, styleProfile || null);
    res.json({ draft });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`Server at http://localhost:${PORT}`);
});
