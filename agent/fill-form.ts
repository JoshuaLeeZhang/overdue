/**
 * Form-fill agent: uses browser-use when LLM keys available, otherwise Playwright.
 * Reads AGENT_JOB from env: { mode: "fill_form", url, values: { fieldName: value } }.
 * Outputs one JSON line: { result: { filled: {...}, url } }
 */
import "dotenv/config";
import path from "path";
import { chromium } from "playwright";
import { runFillFormAgent } from "./agent.js";

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
const userDataDir =
	process.env.BROWSER_PROFILE_PATH ||
	path.join(process.cwd(), ".browser-profile");

function hasLLMKey(): boolean {
	return !!(
		process.env.BROWSER_USE_API_KEY ||
		process.env.OPENAI_API_KEY ||
		process.env.ANTHROPIC_API_KEY ||
		process.env.GOOGLE_API_KEY ||
		process.env.BASETEN_API_KEY
	);
}

async function runPlaywrightFill(): Promise<void> {
	console.log("Launching browser (Playwright)");
	const browser = await chromium.launch({ headless: false });

	const filled: Record<string, boolean> = {};
	try {
		const page = await browser.newPage();
		console.log("Navigating to URL");
		await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

		console.log("Filling form");
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

async function run(): Promise<void> {
	if (hasLLMKey()) {
		console.log("Launching browser-use agent (AI-driven form fill)");
		try {
			const result = await runFillFormAgent({
				url,
				values,
				log: (msg) => console.log(msg),
				userDataDir,
			});
			console.log("Done");
			console.log(JSON.stringify({ result }));
		} catch (err) {
			console.error("Browser-use fill failed, falling back to Playwright:", err);
			await runPlaywrightFill();
		}
	} else {
		await runPlaywrightFill();
	}
}

run().catch((err) => {
	console.error(err);
	process.exit(1);
});
