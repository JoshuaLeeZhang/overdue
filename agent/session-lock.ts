import fs from "fs";
import path from "path";

// Same profile path as login.ts and scraper.ts so login state is preserved
export const userDataDir =
	process.env.BROWSER_PROFILE_PATH ||
	path.join(process.cwd(), ".browser-profile");

function getLockPath(dir?: string): string {
	return path.join(dir ?? userDataDir, ".session.lock");
}

function isProcessAlive(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

/** Remove stale Chromium SingletonLock after crashes (avoids "Failed to create ProcessSingleton") */
export function clearStaleChromiumLocks(profileDir?: string): void {
	const dir = profileDir ?? userDataDir;
	const singletonLock = path.join(dir, "SingletonLock");
	try {
		fs.unlinkSync(singletonLock);
	} catch {
		// ENOENT or in use — ignore
	}
}

export async function acquireLock(profileDir?: string): Promise<void> {
	const dir = profileDir ?? userDataDir;
	const lockPath = getLockPath(dir);
	await fs.promises.mkdir(dir, { recursive: true });
	try {
		const raw = await fs.promises.readFile(lockPath, "utf8");
		const { pid, startedAt } = JSON.parse(raw) as {
			pid: number;
			startedAt: string;
		};
		if (isProcessAlive(pid)) {
			throw new Error(
				`Browser session already in use by process ${pid} (since ${startedAt}). Close it first or remove ${lockPath} if that process is gone.`,
			);
		}
		await fs.promises.unlink(lockPath);
	} catch (err) {
		const e = err as NodeJS.ErrnoException;
		if (e.message?.includes("already in use")) throw err;
		if (e.code !== "ENOENT") await fs.promises.unlink(lockPath).catch(() => {});
		// ENOENT or stale/corrupt lock — continue to create fresh lock
	}
	await fs.promises.writeFile(
		lockPath,
		JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }),
		"utf8",
	);
}

export async function releaseLock(profileDir?: string): Promise<void> {
	const lockPath = getLockPath(profileDir ?? userDataDir);
	try {
		await fs.promises.unlink(lockPath);
	} catch (err) {
		const e = err as NodeJS.ErrnoException;
		if (e.code !== "ENOENT")
			console.warn("Could not remove session lock:", e.message);
	}
}
