const { chromium } = require('playwright');

const DEFAULT_URL = 'https://example.com';
const URL = process.env.AGENT_URL || DEFAULT_URL;

async function run() {
  console.log('Launching browser');
  const browser = await chromium.launch({ headless: false });

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
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
