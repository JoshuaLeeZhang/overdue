/**
 * Scraper: uses browser-use Agent when LLM keys are available, otherwise Playwright.
 * Reads AGENT_JOB from env: JSON with { mode: "scrape", urls: string[], traverse?: boolean }.
 * Outputs one JSON line: { result: { context: { pages: [{ url, title, text }] } } }
 */
import "dotenv/config";
import path from "path";
import { chromium } from "playwright";
import { runScrapeAgent } from "./agent.js";

const LEARN_HOST = "learn.uwaterloo.ca";
const MAX_TRAVERSE_LINKS = 25;

interface ScrapeJob {
	mode: string;
	urls?: string[];
	traverse?: boolean;
}

const job: ScrapeJob = process.env.AGENT_JOB
	? JSON.parse(process.env.AGENT_JOB)
	: { mode: "scrape", urls: [] };
const urls = job.urls && job.urls.length ? job.urls : [];
const traverse = !!job.traverse;
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

function needsLogin(urlsToCheck: string[]): boolean {
	return urlsToCheck.some((u) => u.includes(LEARN_HOST));
}

function isSameOriginAndRelevant(url: string, baseHost: string): boolean {
	try {
		const u = new URL(url);
		if (u.protocol !== "https:" && u.protocol !== "http:") return false;
		if (!u.hostname.includes(baseHost)) return false;
		if (u.pathname.includes("/logout") || u.pathname.includes("/sign_out"))
			return false;
		return true;
	} catch {
		return false;
	}
}

async function extractLinks(
	page: import("playwright").Page,
	baseUrl: string,
): Promise<string[]> {
	const baseHost = new URL(baseUrl).hostname;
	const links = await page.evaluate((host) => {
		const anchors = document.querySelectorAll("a[href]");
		const seen = new Set<string>();
		const out: string[] = [];
		for (const a of anchors) {
			const href = (a as HTMLAnchorElement).href;
			if (!href || seen.has(href)) continue;
			try {
				const u = new URL(href);
				if (
					(u.protocol !== "https:" && u.protocol !== "http:") ||
					!u.hostname.includes(host)
				)
					continue;
				if (u.pathname.includes("/logout") || u.pathname.includes("/sign_out"))
					continue;
				seen.add(href);
				out.push(href);
			} catch {
				/* skip */
			}
		}
		return out;
	}, baseHost);
	return links
		.filter((href) => isSameOriginAndRelevant(href, baseHost))
		.slice(0, MAX_TRAVERSE_LINKS);
}

async function runPlaywrightScraper(): Promise<void> {
	let urlsToScrape = [...urls];
	if (traverse && urls.length > 0) {
		urlsToScrape = [urls[0]];
	}

	const useProfile = needsLogin(urlsToScrape);
	console.log(
		"Launching browser (Playwright)",
		useProfile ? "(persistent profile for LEARN)" : "(ephemeral)",
		traverse ? "(traverse mode)" : "",
	);

	let browser: import("playwright").Browser | null = null;
	const context = useProfile
		? await chromium.launchPersistentContext(userDataDir, {
				headless: true,
			})
		: await (browser = await chromium.launch({ headless: true })).newContext();

	const pages: { url: string; title: string; text: string }[] = [];
	const seenUrls = new Set<string>();

	try {
		const page = await context.newPage();

		if (traverse && urls.length > 0) {
			const first = urls[0];
			try {
				console.log("Navigating to start URL");
				await page.goto(first, {
					waitUntil: "domcontentloaded",
					timeout: 20000,
				});
				const title = await page.title();
				const text = await page.locator("body").innerText();
				pages.push({ url: first, title, text: text.slice(0, 50000) });
				seenUrls.add(first);

				const links = await extractLinks(page, first);
				const toVisit = links
					.filter((u) => !seenUrls.has(u))
					.slice(0, MAX_TRAVERSE_LINKS - 1);
				console.log("Following", toVisit.length, "links from page");

				for (const link of toVisit) {
					try {
						await page.goto(link, {
							waitUntil: "domcontentloaded",
							timeout: 15000,
						});
						const t = await page.title();
						const txt = await page.locator("body").innerText();
						pages.push({ url: link, title: t, text: txt.slice(0, 50000) });
						seenUrls.add(link);
					} catch (err) {
						pages.push({
							url: link,
							title: "",
							text: `Error: ${(err as Error).message}`,
						});
					}
				}
			} catch (err) {
				pages.push({
					url: first,
					title: "",
					text: `Error: ${(err as Error).message}`,
				});
			}
		} else {
			for (const url of urlsToScrape) {
				try {
					console.log("Navigating to URL");
					await page.goto(url, {
						waitUntil: "domcontentloaded",
						timeout: 15000,
					});
					const title = await page.title();
					const text = await page.locator("body").innerText();
					pages.push({ url, title, text: text.slice(0, 50000) });
				} catch (err) {
					pages.push({
						url,
						title: "",
						text: `Error: ${(err as Error).message}`,
					});
				}
			}
		}

		console.log("Done");
		console.log(JSON.stringify({ result: { context: { pages } } }));
	} finally {
		await context.close();
		if (browser) await browser.close();
	}
}

async function runBrowserUseScraper(): Promise<void> {
	console.log("Launching browser-use agent (AI-driven scrape)");
	try {
		const result = await runScrapeAgent({
			urls,
			traverse,
			log: (msg) => console.log(msg),
			userDataDir,
		});
		console.log("Done");
		console.log(JSON.stringify({ result: { context: { pages: result.pages } } }));
	} catch (err) {
		console.error("Browser-use scrape failed, falling back to Playwright:", err);
		await runPlaywrightScraper();
	}
}

async function run(): Promise<void> {
	if (urls.length === 0) {
		console.error("No URLs in AGENT_JOB");
		process.exit(1);
	}

	if (hasLLMKey()) {
		await runBrowserUseScraper();
	} else {
		await runPlaywrightScraper();
	}
}

run().catch((err) => {
	console.error(err);
	process.exit(1);
});
