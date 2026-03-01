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
						"browser-use",
						"openai",
						"anthropic",
						"google",
						"baseten",
					] as LLMProvider[]
				).filter((p) => p !== prefer),
			]
		: ["browser-use", "openai", "anthropic", "google", "baseten"];

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
		"browser-use",
		"openai",
		"anthropic",
		"google",
		"baseten",
	];
	for (const p of order) {
		if (p === "browser-use" && process.env.BROWSER_USE_API_KEY)
			return "browser-use";
		if (p === "openai" && process.env.OPENAI_API_KEY) return "openai";
		if (p === "anthropic" && process.env.ANTHROPIC_API_KEY)
			return "anthropic";
		if (p === "google" && process.env.GOOGLE_API_KEY) return "google";
		if (p === "baseten" && process.env.BASETEN_API_KEY) return "baseten";
	}
	return "browser-use";
}

export async function runAgent(
	options?: RunAgentOptions,
): Promise<RunAgentResult> {
	const log = options?.log ?? defaultLog;
	const url = options?.url ?? getAgentUrl();
	const profileDir = options?.userDataDir ?? userDataDir;
	const task =
		options?.task ??
		`Go to ${url}. If login is required, log in first (the browser profile has saved credentials).

Once logged in, do the following:
1. Go to the homepage and find all courses listed under "Courses and Communities". Click on the current semester tab (e.g. Winter 2026) to see enrolled courses.
2. For EACH course, click into it and navigate to the Assignments or Dropbox section.
3. Extract every assignment: name, due date, status (submitted/not submitted), and any description or instructions.
4. After visiting all courses, output a complete summary of ALL assignments across all courses, organized by course name, including due dates and submission status.

Be thorough - visit every course and every assignment page. Do not stop after the first course.`;

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
			register_new_step_callback: (summary, _output, step) => {
				log(
					`Step ${step}: ${summary.url || "loading"} - ${summary.title || ""}`,
				);
			},
		});

		try {
			const history = await agent.run(50);
			const text = history.final_result() ?? "";
			const lastState = history.history[history.history.length - 1]?.state;
			const title = lastState?.title ?? "";

			log("Done");
			return { title, text };
		} finally {
			await agent.close();
		}
	} finally {
		await releaseLock(profileDir);
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
