/**
 * Playwright form-fill agent. Reads AGENT_JOB from env: { mode: "fill_form", url, values: { fieldName: value } }.
 * Fills inputs by name or id; outputs result as JSON line for lastResult.
 */
import { chromium } from "playwright";

interface FillFormJob {
	mode?: string;
	url?: string;
	values?: Record<string, string | number>;
}

const job: FillFormJob = process.env.AGENT_JOB
	? JSON.parse(process.env.AGENT_JOB)
	: {};
const url = job.url || "https://learn.uwaterloo.ca";
const values = job.values || {};

async function run(): Promise<void> {
	console.log("Launching browser");
	const browser = await chromium.launch({ headless: false });

	const filled: Record<string, boolean> = {};
	try {
		const page = await browser.newPage();
		console.log("Navigating to URL");
		await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

		console.log("Extracting content");
		for (const [name, value] of Object.entries(values)) {
			try {
				const selector = `[name="${name}"], #${name}`;
				await page.fill(selector, String(value));
				filled[name] = true;
			} catch {
				filled[name] = false;
			}
		}
		console.log("Done");
		console.log(JSON.stringify({ result: { filled, url } }));
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error(err);
	process.exit(1);
});
