import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Persistent profile dir; lock file lives inside it
export const userDataDir = path.join(__dirname, '..', '.browser-profile');
const lockPath = path.join(userDataDir, '.session.lock');

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function acquireLock(): Promise<void> {
  await fs.promises.mkdir(userDataDir, { recursive: true });
  try {
    const raw = await fs.promises.readFile(lockPath, 'utf8');
    const { pid, startedAt } = JSON.parse(raw) as { pid: number; startedAt: string };
    if (isProcessAlive(pid)) {
      throw new Error(
        `Browser session already in use by process ${pid} (since ${startedAt}). Close it first or remove ${lockPath} if that process is gone.`
      );
    }
    await fs.promises.unlink(lockPath);
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.message?.includes('already in use')) throw err;
    if (e.code !== 'ENOENT') await fs.promises.unlink(lockPath).catch(() => {});
    // ENOENT or stale/corrupt lock — continue to create fresh lock
  }
  await fs.promises.writeFile(
    lockPath,
    JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }),
    'utf8'
  );
}

export async function releaseLock(): Promise<void> {
  try {
    await fs.promises.unlink(lockPath);
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code !== 'ENOENT') console.warn('Could not remove session lock:', e.message);
  }
}
