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
import type { BaseChatModel, ChatInvokeOptions } from "browser-use";
import {
	UserMessage,
	ContentPartTextParam,
	ContentPartImageParam,
} from "browser-use/llm/messages";
import type { Message } from "browser-use/llm/messages";
import type { ChatInvokeCompletion } from "browser-use/llm/views";
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

/** Wraps a ChatOpenAI instance to strip image_url parts (for models that reject them) */
class ImageStrippingLLM implements BaseChatModel {
	model: string;
	private inner: BaseChatModel;

	constructor(inner: BaseChatModel) {
		this.inner = inner;
		this.model = inner.model;
	}

	get provider() { return this.inner.provider; }
	get name() { return this.inner.name; }
	get model_name() { return this.inner.model_name; }

	private stripImages(messages: Message[]): Message[] {
		return messages.map((msg) => {
			if (msg instanceof UserMessage && Array.isArray(msg.content)) {
				const filtered = msg.content.filter(
					(part) => !(part instanceof ContentPartImageParam),
				);
				if (filtered.length === 0) {
					filtered.push(new ContentPartTextParam("[screenshot omitted]"));
				}
				return new UserMessage(filtered, msg.name);
			}
			return msg;
		});
	}

	ainvoke(messages: Message[], output_format?: any, options?: ChatInvokeOptions): Promise<ChatInvokeCompletion<any>> {
		return this.inner.ainvoke(this.stripImages(messages), output_format, options);
	}
}

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
			process.env.BASETEN_MODEL || "zai-org/GLM-5";
		const baseURL =
			process.env.BASETEN_API_URL || "https://inference.baseten.co/v1";
		log(`Using Baseten (${m})`);
		return new ImageStrippingLLM(
			new ChatOpenAI({
				model: m,
				apiKey: process.env.BASETEN_API_KEY,
				baseURL,
			}),
		);
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
				process.env.BASETEN_MODEL || "zai-org/GLM-5";
			const baseURL =
				process.env.BASETEN_API_URL || "https://inference.baseten.co/v1";
			log(`Fallback LLM: Baseten (will use if primary fails)`);
			return new ImageStrippingLLM(
				new ChatOpenAI({
					model: m,
					apiKey: process.env.BASETEN_API_KEY,
					baseURL,
				}),
			);
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
	const task =
		options?.task ??
		`Go to ${url}/d2l/home.

AUTHENTICATION:
If you see a login page, do NOT fill in credentials. A human will log in for you. Call wait(seconds=15) and check the URL. Repeat until the URL contains "/d2l/home".

IMPORTANT: D2L uses shadow DOM web components. The browser click() action DOES NOT WORK. You MUST use evaluate() for ALL clicks. Never use click() or click_element_by_index().

SCRAPING PLAN:

Step 1: On the homepage, find all course links by searching the page HTML. Run:
  evaluate('(function(){var r=[];function walk(n){if(n.shadowRoot)walk(n.shadowRoot);n.querySelectorAll("a").forEach(function(a){if(/\\/d2l\\/home\\/\\d+/.test(a.href)){var m=a.href.match(/\\/d2l\\/home\\/(\\d+)/);if(m)r.push({name:a.textContent.trim(),id:m[1],href:a.href})}});n.querySelectorAll("*").forEach(function(c){if(c.shadowRoot)walk(c.shadowRoot)})}walk(document);return JSON.stringify(r)})()')
  This walks through shadow DOM to find all course links with their full IDs.

Step 2: If Step 1 returns [], try clicking the course selector button:
  evaluate('(function(){var btns=document.querySelectorAll("d2l-navigation-button,d2l-button-subtle,button");for(var i=0;i<btns.length;i++){var t=btns[i].textContent||btns[i].getAttribute("text")||"";if(/course/i.test(t)){btns[i].click();return "clicked: "+t}}return "not found"})()')
  Then wait(seconds=2) and run Step 1 again.

Step 3: For EACH course from Step 1, navigate to it and scrape:
  a) go_to_url(THE_COURSE_HREF) — use the exact href from Step 1, do NOT type it yourself.
  b) Find and click Dropbox link: evaluate('(function(){var a=document.querySelector("a[href*=dropbox]");if(a){a.click();return "clicked"}var r=document;function walk(n){if(n.shadowRoot){var s=n.shadowRoot.querySelector("a[href*=dropbox]");if(s){s.click();return true}}for(var c of n.querySelectorAll("*")){if(c.shadowRoot&&walk(c))return true}return false}walk(r);return "done"})()')
  c) Use extract_structured_data to get assignment names, due dates, status, scores.
  d) Go back: go_to_url(THE_COURSE_HREF)
  e) Find and click Quizzes link: evaluate('(function(){var a=document.querySelector("a[href*=quizzing]");if(a){a.click();return "clicked"}var r=document;function walk(n){if(n.shadowRoot){var s=n.shadowRoot.querySelector("a[href*=quizzing]");if(s){s.click();return true}}for(var c of n.querySelectorAll("*")){if(c.shadowRoot&&walk(c))return true}return false}walk(r);return "done"})()')
  f) Use extract_structured_data to get quiz names, due dates, status, scores.
  g) go_to_url("${url}/d2l/home") to return home before the next course.

Step 4: After all courses, call done() with the JSON.

RULES:
- NEVER use click() or click_element_by_index(). ALWAYS use evaluate() for clicking.
- Use go_to_url() ONLY with URLs copied from the evaluate() results.
- If a page errors or has no data, skip it.
- If stuck for 2 actions, move on.

OUTPUT FORMAT (strict JSON):
{"courses":[{"name":"...","id":"...","assignments":[{"title":"...","dueDate":"...","status":"...","score":"..."}],"quizzes":[{"title":"...","dueDate":"...","status":"...","score":"..."}]}]}

Call done() with this JSON.`;

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
			max_failures: 3,
			max_actions_per_step: 5,
			register_new_step_callback: (summary, _output, step) => {
				log(
					`Step ${step}: ${summary.url || "loading"} - ${summary.title || ""}`,
				);
			},
		});

		try {
			const history = await agent.run(60);
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
