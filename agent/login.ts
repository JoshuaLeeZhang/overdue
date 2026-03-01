/**
 * Opens a visible browser with the persistent profile for learn.uwaterloo.ca login.
 * This is the only site that requires user login; everything else uses MCP.
 * Profile is shared with the scraper when scraping LEARN.
 */
import path from 'path';
import { chromium } from 'playwright';

const LEARN_URL = 'https://learn.uwaterloo.ca/';
const userDataDir = process.env.BROWSER_PROFILE_PATH || path.join(process.cwd(), '.browser-profile');

async function run(): Promise<void> {
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
  });

  const page = await context.newPage();
  await page.goto(LEARN_URL);

  const browser = context.browser();
  await new Promise<void>((resolve) => {
    browser?.on('disconnected', () => resolve());
  });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
