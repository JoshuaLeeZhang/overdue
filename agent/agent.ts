import { chromium } from 'playwright';
import { userDataDir, acquireLock, releaseLock } from './session-lock.js';
import { getAgentUrl } from '../lib/agent-url.js';

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

      let captured = false;
      const capturePromise = new Promise<void>((resolve) => {
        page.exposeFunction('__agentCapture', () => {
          captured = true;
          resolve();
        });
      });
      const closedPromise = new Promise<void>((resolve) => {
        context.on('close', () => resolve());
      });

      // Re-inject button on every navigation (e.g. after login redirect)
      await page.addInitScript(() => {
        const inject = () => {
          if (document.getElementById('__agentCaptureBtn')) return;
          const btn = document.createElement('button');
          btn.id = '__agentCaptureBtn';
          btn.textContent = 'Capture page';
          btn.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:2147483647;padding:10px 16px;background:#2563eb;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
          btn.onclick = () => {
            (window as unknown as { __agentCapture?: () => void }).__agentCapture?.();
            btn.remove();
          };
          document.body.appendChild(btn);
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
        else inject();
      });

      await page.evaluate(() => {
        const btn = document.createElement('button');
        btn.textContent = 'Capture page';
        btn.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:2147483647;padding:10px 16px;background:#2563eb;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
        btn.onclick = () => {
          (window as unknown as { __agentCapture?: () => void }).__agentCapture?.();
          btn.remove();
        };
        document.body.appendChild(btn);
      });

      log('Log in if needed, navigate to the page, then click "Capture page" when ready.');
      await Promise.race([capturePromise, closedPromise]);

      if (!captured) {
        log('Browser closed without capture.');
        return { title: '', text: '' };
      }

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
