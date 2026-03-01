const fs = require('fs');
const path = require('path');

// Persistent profile dir; lock file lives inside it
const userDataDir = path.join(__dirname, '..', '.browser-profile');
const lockPath = path.join(userDataDir, '.session.lock');

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function acquireLock() {
  await fs.promises.mkdir(userDataDir, { recursive: true });
  try {
    const raw = await fs.promises.readFile(lockPath, 'utf8');
    const { pid, startedAt } = JSON.parse(raw);
    if (isProcessAlive(pid)) {
      throw new Error(
        `Browser session already in use by process ${pid} (since ${startedAt}). Close it first or remove ${lockPath} if that process is gone.`
      );
    }
    await fs.promises.unlink(lockPath);
  } catch (err) {
    if (err.message.includes('already in use')) throw err;
    if (err.code !== 'ENOENT') await fs.promises.unlink(lockPath).catch(() => {});
    // ENOENT or stale/corrupt lock — continue to create fresh lock
  }
  await fs.promises.writeFile(
    lockPath,
    JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }),
    'utf8'
  );
}

async function releaseLock() {
  try {
    await fs.promises.unlink(lockPath);
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn('Could not remove session lock:', err.message);
  }
}

module.exports = { userDataDir, acquireLock, releaseLock };
