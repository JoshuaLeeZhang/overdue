/**
 * Opens a visible browser with the persistent profile for learn.uwaterloo.ca login.
 * Stays open until the user manually closes the window. User can log in, navigate
 * assignment pages, and close when done. Profile is shared with the scraper.
 *
 * Run directly: npm run login (or node dist/agent/login.js from project root)
 */
import path from 'path';
import { chromium } from 'playwright';

const LEARN_URL = 'https://learn.uwaterloo.ca/';
const userDataDir = process.env.BROWSER_PROFILE_PATH || path.join(process.cwd(), '.browser-profile');

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

async function run(): Promise<void> {
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: ['--start-maximized', '--disable-background-timer-throttling', '--no-first-run'],
    acceptDownloads: false,
  });

  const page = await context.newPage();
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(30000);

  await page.goto('data:text/html,' + encodeURIComponent(`
    <!DOCTYPE html>
    <html>
    <head><title>LEARN Login</title></head>
    <body style="font-family: system-ui; max-width: 560px; margin: 2rem auto; padding: 1rem; line-height: 1.5;">
      <h1>Log in to LEARN</h1>
      <p>This window stays open until you close it. Click below to open LEARN, log in, browse your assignments, then <strong>close this window</strong> when done.</p>
      <p><a href="${LEARN_URL}" style="font-size: 1.1rem; display: inline-block; margin-top: 0.5rem;">Open LEARN →</a></p>
      <p style="color: #666; font-size: 0.9rem;">Your session is saved for future scrapes.</p>
    </body>
    </html>
  `));

  await new Promise<void>((resolve) => {
    context.on('close', () => resolve());
  });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
