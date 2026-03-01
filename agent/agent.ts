import { chromium } from 'playwright';
import { userDataDir, acquireLock, releaseLock } from './session-lock';

const DEFAULT_URL = 'https://learn.uwaterloo.ca';
const URL = process.env.AGENT_URL || DEFAULT_URL;

async function run(): Promise<void> {
  await acquireLock();
  try {
    console.log('Launching browser (profile:', userDataDir, ')');
    const browser = await chromium.launch({
      headless: false,
      userDataDir,
    } as import('playwright').LaunchOptions);

    try {
      const page = await browser.newPage();
      console.log('Navigating to URL');
      await page.goto(URL);

      console.log('Extracting content');
      const title = await page.title();
      const text = await page.locator('body').innerText();

      console.log('Done');
      console.log(JSON.stringify({ result: { title, text } }));
    } finally {
      await browser.close();
    }
  } finally {
    await releaseLock();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
