/**
 * Browser-use Agent: LLM-driven autonomous browser control.
 * Uses the browser-use package for AI-driven navigation and extraction.
 *
 * Requires: BROWSER_USE_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY, or BASETEN_API_KEY
 */
import { Agent } from "browser-use";
import { BrowserProfile } from "browser-use";
import { ChatOpenAI } from "browser-use/llm/openai";
import { ChatAnthropic } from "browser-use/llm/anthropic";
import { ChatGoogle } from "browser-use/llm/google";
import { ChatBrowserUse } from "browser-use/llm/browser-use";
import type { BaseChatModel } from "browser-use";
import {
	userDataDir,
	acquireLock,
	releaseLock,
	clearStaleChromiumLocks,
} from "./session-lock.js";
import { getAgentUrl } from "../lib/agent-url.js";
import { getAssignmentsStore } from "../server/assignments-store.js";

export interface RunAgentOptions {
	log?: (msg: string) => void;
	/** Override URL (default: AGENT_URL env or learn.uwaterloo.ca) */
	url?: string;
	/** Override browser profile directory (e.g. for Electron) */
	userDataDir?: string;
	/** Task for the agent (default: extract title and text from URL) */
	task?: string;
	/** LLM model override (e.g. gpt-4o, claude-sonnet-4) */
	model?: string;
	/** Run browser headless (default: false) */
	headless?: boolean;
}

export interface RunAgentResult {
	title: string;
	text: string;
}

export interface ScrapeResult {
	pages: { url: string; title: string; text: string }[];
}

export interface FillFormResult {
	filled: Record<string, boolean>;
	url: string;
}

const defaultLog = (msg: string) => console.log(msg);

type LLMProvider =
	| "browser-use"
	| "openai"
	| "anthropic"
	| "google"
	| "baseten";

function createLLM(options?: {
	model?: string;
	log?: (msg: string) => void;
	preferProvider?: LLMProvider;
}): BaseChatModel {
	const log = options?.log ?? defaultLog;
	const model = options?.model || process.env.AGENT_MODEL || "gpt-4o";
	const prefer = options?.preferProvider;

	const tryOpenAI = () => {
		if (!process.env.OPENAI_API_KEY) return null;
		log(`Using OpenAI (${model})`);
		return new ChatOpenAI({ model, apiKey: process.env.OPENAI_API_KEY });
	};
	const tryAnthropic = () => {
		if (!process.env.ANTHROPIC_API_KEY) return null;
		const m = model.startsWith("claude") ? model : "claude-sonnet-4-20250514";
		log(`Using Anthropic (${m})`);
		return new ChatAnthropic({
			model: m,
			apiKey: process.env.ANTHROPIC_API_KEY,
		});
	};
	const tryGoogle = () => {
		if (!process.env.GOOGLE_API_KEY) return null;
		const m = model.includes("gemini") ? model : "gemini-2.0-flash";
		log(`Using Google (${m})`);
		return new ChatGoogle({ model: m, apiKey: process.env.GOOGLE_API_KEY });
	};
	const tryBaseten = () => {
		if (!process.env.BASETEN_API_KEY) return null;
		const m =
			process.env.BASETEN_MODEL || "deepseek-ai/DeepSeek-V3.1";
		const baseURL =
			process.env.BASETEN_API_URL || "https://inference.baseten.co/v1";
		log(`Using Baseten (${m})`);
		return new ChatOpenAI({
			model: m,
			apiKey: process.env.BASETEN_API_KEY,
			baseURL,
		});
	};
	const tryBrowserUse = () => {
		if (!process.env.BROWSER_USE_API_KEY) return null;
		log(`Using Browser Use (${model.startsWith("bu-") ? model : "bu-latest"})`);
		return new ChatBrowserUse({
			apiKey: process.env.BROWSER_USE_API_KEY,
			model:
				model.startsWith("bu-") || model.startsWith("browser-use/")
					? model
					: "bu-latest",
		});
	};

	const order: LLMProvider[] = prefer
		? [
				prefer,
				...(
					[
						"baseten",
						"openai",
						"anthropic",
						"google",
						"browser-use",
					] as LLMProvider[]
				).filter((p) => p !== prefer),
			]
		: ["baseten", "openai", "anthropic", "google", "browser-use"];

	for (const p of order) {
		const llm =
			p === "browser-use"
				? tryBrowserUse()
				: p === "openai"
					? tryOpenAI()
					: p === "anthropic"
						? tryAnthropic()
						: p === "google"
							? tryGoogle()
							: tryBaseten();
		if (llm) return llm;
	}

	throw new Error(
		"No LLM API key found. Set BROWSER_USE_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY, or BASETEN_API_KEY in .env or .env.local",
	);
}

function createFallbackLLM(
	primaryProvider: LLMProvider,
	options?: { model?: string; log?: (msg: string) => void },
): BaseChatModel | null {
	const log = options?.log ?? defaultLog;
	const model = options?.model || process.env.AGENT_MODEL || "gpt-4o";
	const candidates: LLMProvider[] = [
		"openai",
		"anthropic",
		"google",
		"baseten",
		"browser-use",
	].filter((p) => p !== primaryProvider) as LLMProvider[];

	for (const p of candidates) {
		if (p === "openai" && process.env.OPENAI_API_KEY) {
			log(`Fallback LLM: OpenAI (will use if primary fails)`);
			return new ChatOpenAI({
				model,
				apiKey: process.env.OPENAI_API_KEY,
			});
		}
		if (p === "anthropic" && process.env.ANTHROPIC_API_KEY) {
			const m = model.startsWith("claude") ? model : "claude-sonnet-4-20250514";
			log(`Fallback LLM: Anthropic (will use if primary fails)`);
			return new ChatAnthropic({
				model: m,
				apiKey: process.env.ANTHROPIC_API_KEY,
			});
		}
		if (p === "google" && process.env.GOOGLE_API_KEY) {
			const m = model.includes("gemini") ? model : "gemini-2.0-flash";
			log(`Fallback LLM: Google (will use if primary fails)`);
			return new ChatGoogle({ model: m, apiKey: process.env.GOOGLE_API_KEY });
		}
		if (p === "baseten" && process.env.BASETEN_API_KEY) {
			const m =
				process.env.BASETEN_MODEL || "deepseek-ai/DeepSeek-V3";
			const baseURL =
				process.env.BASETEN_API_URL || "https://inference.baseten.co/v1";
			log(`Fallback LLM: Baseten (will use if primary fails)`);
			return new ChatOpenAI({
				model: m,
				apiKey: process.env.BASETEN_API_KEY,
				baseURL,
			});
		}
		if (p === "browser-use" && process.env.BROWSER_USE_API_KEY) {
			log(`Fallback LLM: Browser Use (will use if primary fails)`);
			return new ChatBrowserUse({
				apiKey: process.env.BROWSER_USE_API_KEY,
				model:
					model.startsWith("bu-") || model.startsWith("browser-use/")
						? model
						: "bu-latest",
			});
		}
	}
	return null;
}

function getPrimaryProvider(): LLMProvider {
	const order: LLMProvider[] = [
		"baseten",
		"openai",
		"anthropic",
		"google",
		"browser-use",
	];
	for (const p of order) {
		if (p === "baseten" && process.env.BASETEN_API_KEY) return "baseten";
		if (p === "openai" && process.env.OPENAI_API_KEY) return "openai";
		if (p === "anthropic" && process.env.ANTHROPIC_API_KEY)
			return "anthropic";
		if (p === "google" && process.env.GOOGLE_API_KEY) return "google";
		if (p === "browser-use" && process.env.BROWSER_USE_API_KEY)
			return "browser-use";
	}
	return "baseten";
}

export async function runAgent(
	options?: RunAgentOptions,
): Promise<RunAgentResult> {
	const log = options?.log ?? defaultLog;
	const url = options?.url ?? getAgentUrl();
	const profileDir = options?.userDataDir ?? userDataDir;
	const origin = url.replace(/\/$/, "");

	const task =
		options?.task ??
		`You are a web scraper. Your job is to collect ALL courses, assignments, and quizzes from D2L/LEARN.

Go to ${origin}/d2l/home

═══════════════════════════════════════
PHASE 0 — AUTHENTICATION
═══════════════════════════════════════
If you see a login page (ADFS, SSO, Duo, CAS, or any sign-in form):
  - Do NOT type any credentials. A human will log in for you.
  - Call wait(seconds=20), then check the URL.
  - Repeat until the URL contains "/d2l/home" (meaning you are past login).

═══════════════════════════════════════
PHASE 1 — DISCOVER ALL COURSES
═══════════════════════════════════════
Once on the D2L homepage, you need to find every course listed.

1. Look for a button or link that says "View All Courses" or shows more courses.
   If you see one, click it and wait 2 seconds.
2. Scroll down to make sure all courses are visible.
3. Run this evaluate() to extract every course ID and name from the page:

evaluate("var courses=[],seen=new Set();function walk(el){if(el.shadowRoot){el.shadowRoot.querySelectorAll('a[href*=\\"/d2l/home/\\"]').forEach(function(a){var m=a.href.match(/\\\\/d2l\\\\/home\\\\/(\\\\d{4,})/);if(m&&!seen.has(m[1])){seen.add(m[1]);courses.push({id:m[1],name:(a.textContent||'').trim().substring(0,100)})}});el.shadowRoot.querySelectorAll('*').forEach(walk)}};document.querySelectorAll('a[href*=\\"/d2l/home/\\"]').forEach(function(a){var m=a.href.match(/\\\\/d2l\\\\/home\\\\/(\\\\d{4,})/);if(m&&!seen.has(m[1])){seen.add(m[1]);courses.push({id:m[1],name:(a.textContent||'').trim().substring(0,100)})}});document.querySelectorAll('*').forEach(walk);JSON.stringify(courses)")

This returns a JSON array of {id, name} objects. Save this list — these are ALL the courses you must visit.

If it returns an empty array, scroll down more, wait 2 seconds, and try again. If still empty after 2 attempts, call done("No courses found").

═══════════════════════════════════════
PHASE 2 — SCRAPE EACH COURSE
═══════════════════════════════════════
You MUST visit every single course from the list. For each course:

STEP A — Go to the course homepage:
  go_to_url("${origin}/d2l/home/{courseId}")
  Wait for the page to load.

STEP B — Get the course name:
  Read the page title or header to get the full course name.

STEP C — Navigate to Assignments (Dropbox):
  Look at the course navigation bar near the top of the page. You are looking for
  a link or dropdown menu labeled any of these:
    "Submit", "Assessments", "Activities", "Assignments", "Dropbox"
  
  - If you see a dropdown (e.g. "Assessments" or "Activities"), click it to expand,
    then click "Assignments" or "Dropbox" from the submenu.
  - If you see a direct link labeled "Assignments" or "Dropbox", click it.
  - If you cannot find any such link in the navbar, go directly to:
    go_to_url("${origin}/d2l/lms/dropbox/user/folders_list.d2l?ou={courseId}")

STEP D — Extract assignments from the page:
  Once on the assignments/dropbox page, run:

  evaluate("var items=[];document.querySelectorAll('tr').forEach(function(row){var cells=row.querySelectorAll('td');if(cells.length>=1){var title=(cells[0]&&cells[0].innerText||'').trim();if(title&&title.length>1&&!/^\\\\s*$/.test(title)){items.push({title:title.substring(0,200),dueDate:(cells[1]&&cells[1].innerText||'').trim(),status:(cells[2]&&cells[2].innerText||'').trim(),score:(cells[3]&&cells[3].innerText||'').trim()})}}});JSON.stringify(items)")

  If the result is empty "[]", look at the visible page content. If you can see assignment
  names listed on the page (in cards, lists, or any format), read them and note them down.

STEP E — Navigate to Quizzes:
  Go back to the course: go_to_url("${origin}/d2l/home/{courseId}")
  Look at the course navbar again for:
    "Quizzes", "Tests", or under the same "Assessments"/"Submit" dropdown
  
  - Click the appropriate link or dropdown item to reach the Quizzes page.
  - If you cannot find a quizzes link, go directly to:
    go_to_url("${origin}/d2l/lms/quizzing/user/quizzes_list.d2l?ou={courseId}")

STEP F — Extract quizzes from the page:
  Once on the quizzes page, run:

  evaluate("var items=[];document.querySelectorAll('tr').forEach(function(row){var cells=row.querySelectorAll('td');if(cells.length>=1){var title=(cells[0]&&cells[0].innerText||'').trim();if(title&&title.length>1&&!/^\\\\s*$/.test(title)){items.push({title:title.substring(0,200),dueDate:(cells[1]&&cells[1].innerText||'').trim(),status:(cells[2]&&cells[2].innerText||'').trim(),score:(cells[3]&&cells[3].innerText||'').trim()})}}});JSON.stringify(items)")

  Same as before — if empty, check the visible page for quiz names.

STEP G — Move to the next course. Repeat Steps A-F for ALL courses.

═══════════════════════════════════════
PHASE 3 — RETURN RESULTS
═══════════════════════════════════════
After visiting every course, compile ALL your collected data into this JSON format
and call done() with it:

{"courses":[{"id":"123456","name":"CS 101 - Intro to CS","assignments":[{"title":"Assignment 1","dueDate":"Jan 15","status":"Submitted","score":"85/100"}],"quizzes":[{"title":"Quiz 1","dueDate":"Jan 20","status":"Completed","score":"90%"}]}]}

Include ALL courses, even those with empty assignments/quizzes arrays.

═══════════════════════════════════════
CRITICAL RULES
═══════════════════════════════════════
1. Visit EVERY course. Do NOT stop after one or two courses.
2. NEVER fabricate or guess a URL. Only use the exact patterns shown above with real course IDs.
3. If a page returns 403 or an error, skip it and move to the next course.
4. If you cannot find assignments or quizzes for a course, use empty arrays [] and move on.
5. NEVER type credentials or interact with login forms.
6. Always replace {courseId} with the actual numeric course ID from your list.
7. Do NOT call done() until you have visited ALL courses from Phase 1.
8. Be thorough — even if some courses seem empty, still check them all.`;

	await acquireLock(profileDir);
	try {
		clearStaleChromiumLocks(profileDir);
		log(`Launching browser-use agent (profile: ${profileDir})`);

		const llm = createLLM({ model: options?.model, log });
		const primaryProvider = getPrimaryProvider();
		const fallbackLlm = createFallbackLLM(primaryProvider, {
			model: options?.model,
			log,
		});

		const browserProfile = new BrowserProfile({
			user_data_dir: profileDir,
			headless: options?.headless ?? false,
		});

		const agent = new Agent({
			task,
			llm,
			fallback_llm: fallbackLlm ?? undefined,
			browser_profile: browserProfile,
			directly_open_url: true,
			use_vision: true,
			use_judge: false,
			max_failures: 5,
			max_actions_per_step: 3,
			register_new_step_callback: (summary, _output, step) => {
				log(
					`Step ${step}: ${summary.url || "loading"} - ${summary.title || ""}`,
				);
			},
		});

		try {
			const history = await agent.run(150);
			const text = history.final_result() ?? "";
			const lastState = history.history[history.history.length - 1]?.state;
			const title = lastState?.title ?? "";

			await storeAgentResults(text, log);

			log("Done");
			return { title, text };
		} finally {
			await agent.close();
		}
	} finally {
		await releaseLock(profileDir);
	}
}

interface AgentAssignmentItem {
	title: string;
	dueDate?: string;
	status?: string;
	score?: string;
	description?: string;
	type?: string;
}

interface AgentCourseOutput {
	courses?: {
		name: string;
		id: string;
		assignments?: AgentAssignmentItem[];
		quizzes?: AgentAssignmentItem[];
	}[];
}

async function storeAgentResults(
	text: string,
	log: (msg: string) => void,
): Promise<void> {
	if (!text || text.includes("No next action")) return;

	let parsed: AgentCourseOutput;
	try {
		const match = text.match(/\{[\s\S]*\}/);
		if (!match) return;
		parsed = JSON.parse(match[0]) as AgentCourseOutput;
	} catch {
		log("Could not parse agent output as JSON for storage");
		return;
	}

	if (!parsed.courses?.length) return;

	try {
		const store = await getAssignmentsStore();
		let totalItems = 0;

		const storeItem = async (
			course: { id: string; name: string },
			a: AgentAssignmentItem,
			type: string,
		) => {
			await store.upsertAssignment({
				courseId: course.id,
				courseName: course.name,
				title: `${type === "quiz" ? "[Quiz] " : ""}${a.title}`,
				dueDate: a.dueDate,
				status: a.status,
				description: a.score
					? `Score: ${a.score}${a.description ? ` — ${a.description}` : ""}`
					: a.description,
			});
			totalItems++;
		};

		for (const course of parsed.courses) {
			await store.upsertCourse({
				courseId: course.id,
				name: course.name,
			});

			if (course.assignments) {
				for (const a of course.assignments) {
					await storeItem(course, a, a.type ?? "dropbox");
				}
			}
			if (course.quizzes) {
				for (const q of course.quizzes) {
					await storeItem(course, q, "quiz");
				}
			}
		}

		log(
			`Stored ${parsed.courses.length} courses and ${totalItems} items (assignments + quizzes) in database`,
		);
	} catch (err) {
		log(`Failed to store results: ${(err as Error).message}`);
	}
}

function extractJsonFromText(text: string): unknown {
	const match = text.match(/\{[\s\S]*\}/);
	if (!match) throw new Error("No JSON object found");
	return JSON.parse(match[0]);
}

async function runAgentWithJsonOutput<T>(
	options: RunAgentOptions & { task: string; headless?: boolean },
): Promise<T> {
	const result = await runAgent(options);
	try {
		const json = extractJsonFromText(result.text);
		return json as T;
	} catch {
		throw new Error(
			`Agent did not return valid JSON. Output: ${result.text.slice(0, 500)}...`,
		);
	}
}

/** AI-driven scrape: uses browser-use Agent to navigate, log in, and extract content */
export async function runScrapeAgent(options: {
	urls: string[];
	traverse?: boolean;
	log?: (msg: string) => void;
	userDataDir?: string;
	model?: string;
}): Promise<ScrapeResult> {
	const log = options.log ?? defaultLog;
	const profileDir = options.userDataDir ?? userDataDir;
	const { urls, traverse } = options;

	const urlList = urls.join(", ");
	const task = traverse
		? `Go to ${urls[0]}. Log in if needed (browser profile has saved credentials). Extract the main content. Then follow relevant links (assignments, course pages, content pages) - visit up to 25 pages. For each page, extract url, title, and main text. When done, output ONLY a valid JSON object: {"pages":[{"url":"...","title":"...","text":"..."}]}`
		: `Go to each of these URLs: ${urlList}. For each, log in if needed and extract the page title and main text. When done, output ONLY a valid JSON object: {"pages":[{"url":"...","title":"...","text":"..."}]}`;

	const parsed =
		await runAgentWithJsonOutput<{
			pages?: { url: string; title: string; text: string }[];
		}>({
			task,
			log,
			userDataDir: profileDir,
			model: options.model,
			url: urls[0],
			headless: true,
		});

	const pages = parsed?.pages ?? [];
	return { pages };
}

/** AI-driven form fill: uses browser-use Agent to navigate, log in, and fill form */
export async function runFillFormAgent(options: {
	url: string;
	values: Record<string, string | number>;
	log?: (msg: string) => void;
	userDataDir?: string;
	model?: string;
}): Promise<FillFormResult> {
	const log = options.log ?? defaultLog;
	const profileDir = options.userDataDir ?? userDataDir;
	const valuesStr = JSON.stringify(options.values);

	const task = `Go to ${options.url}. Log in if needed (browser profile has saved credentials). Fill the form with these values: ${valuesStr}. For each field, find the best matching input by name, id, or label. When done, output ONLY a valid JSON object: {"filled":{"fieldName":true},"url":"${options.url}"}`;

	const parsed = await runAgentWithJsonOutput<{
		filled?: Record<string, boolean>;
		url?: string;
	}>({
		task,
		log,
		url: options.url,
		userDataDir: profileDir,
		model: options.model,
		headless: false,
	});

	return {
		filled: parsed?.filled ?? {},
		url: parsed?.url ?? options.url,
	};
}
