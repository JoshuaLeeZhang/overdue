/**
 * Playwright-based scraper: visits each URL, extracts title and body text.
 * Uses persistent browser profile only for learn.uwaterloo.ca (the only site requiring login).
 * Everything else uses MCP; for those URLs we use a regular ephemeral browser.
 * Reads AGENT_JOB from env: JSON with { mode: "scrape", urls: string[] }.
 * Outputs one JSON line: { result: { context: { pages: [{ url, title, text }] } } }
 */
import path from 'path';
import { chromium } from 'playwright';

const LEARN_HOST = 'learn.uwaterloo.ca';

interface ScrapeJob {
  mode: string;
  urls?: string[];
}

const job: ScrapeJob = process.env.AGENT_JOB ? JSON.parse(process.env.AGENT_JOB) : { mode: 'scrape', urls: [] };
const urls = job.urls && job.urls.length ? job.urls : [];
const userDataDir = process.env.BROWSER_PROFILE_PATH || path.join(process.cwd(), '.browser-profile');

function needsLogin(urls: string[]): boolean {
  return urls.some((u) => u.includes(LEARN_HOST));
}

async function run(): Promise<void> {
  const useProfile = needsLogin(urls);
  console.log('Launching browser', useProfile ? '(persistent profile for LEARN)' : '(ephemeral)');

  let browser: import('playwright').Browser | null = null;
  const context = useProfile
    ? await chromium.launchPersistentContext(userDataDir, { headless: true })
    : await (browser = await chromium.launch({ headless: true })).newContext();

  const pages: { url: string; title: string; text: string }[] = [];
  try {
    const page = await context.newPage();
    for (const url of urls) {
      try {
        console.log('Navigating to URL');
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        const title = await page.title();
        const text = await page.locator('body').innerText();
        pages.push({ url, title, text: text.slice(0, 50000) });
      } catch (err) {
        pages.push({ url, title: '', text: `Error: ${(err as Error).message}` });
      }
    }
    console.log('Extracting content');
    console.log('Done');
    console.log(JSON.stringify({ result: { context: { pages } } }));
  } finally {
    await context.close();
    if (browser) await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
