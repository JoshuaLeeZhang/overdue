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
app.use(express.static(uiPath));

app.post('/run-agent', (req, res) => {
  const projectRoot = path.join(__dirname, '..');
  const agentPath = path.join(projectRoot, 'agent', 'agent.js');
  const child = spawn('node', [agentPath], {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let buffer = '';
  function processLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.result != null) {
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

server.listen(PORT, () => {
  console.log(`Server at http://localhost:${PORT}`);
});
