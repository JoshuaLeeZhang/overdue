import { chromium } from 'playwright';
import { userDataDir, acquireLock, releaseLock } from './session-lock';
import { getAgentUrl } from '../lib/agent-url';

export interface RunAgentOptions {
  log?: (msg: string) => void;
  /** Override URL (default: AGENT_URL env or DEFAULT_AGENT_URL) */
  url?: string;
}

export interface RunAgentResult {
  title: string;
  text: string;
}

const defaultLog = (msg: string) => console.log(msg);

export async function runAgent(options?: RunAgentOptions): Promise<RunAgentResult> {
  const log = options?.log ?? defaultLog;
  const url = options?.url ?? getAgentUrl();

  await acquireLock();
  try {
    log(`Launching browser (profile: ${userDataDir})`);
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
    });

    try {
      const page = await context.newPage();
      log('Navigating to URL');
      await page.goto(url);

      log('Extracting content');
      const title = await page.title();
      const text = await page.locator('body').innerText();

      log('Done');
      return { title, text };
    } finally {
      await context.close();
    }
  } finally {
    await releaseLock();
  }
}
