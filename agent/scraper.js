/**
 * Playwright-based scraper: visits each URL, extracts title and body text.
 * Reads AGENT_JOB from env: JSON with { mode: "scrape", urls: string[] }.
 * Outputs one JSON line: { result: { context: { pages: [{ url, title, text }] } } }
 */
const { chromium } = require('playwright');

const job = process.env.AGENT_JOB ? JSON.parse(process.env.AGENT_JOB) : { mode: 'scrape', urls: [] };
const urls = job.urls && job.urls.length ? job.urls : [];

async function run() {
  console.log('Launching browser');
  const browser = await chromium.launch({ headless: true });

  const pages = [];
  try {
    const page = await browser.newPage();
    for (const url of urls) {
      try {
        console.log('Navigating to URL');
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        const title = await page.title();
        const text = await page.locator('body').innerText();
        pages.push({ url, title, text: text.slice(0, 50000) });
      } catch (err) {
        pages.push({ url, title: '', text: `Error: ${err.message}` });
      }
    }
    console.log('Extracting content');
    console.log('Done');
    console.log(JSON.stringify({ result: { context: { pages } } }));
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
