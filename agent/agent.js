const { chromium } = require('playwright');
const { userDataDir, acquireLock, releaseLock } = require('./session-lock');

const URL = 'https://example.com';

async function run() {
  await acquireLock();
  try {
    console.log('Launching browser (profile:', userDataDir, ')');
    const browser = await chromium.launch({
      headless: false,
      userDataDir,
    });

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
