/**
 * Context store: in-memory fallback, or Convex when CONVEX_URL is set.
 * Set CONVEX_URL (e.g. from .env.local after `npx convex dev`) for persistent storage.
 */
export interface ContextPage {
	url: string;
	title: string;
	text: string;
}

export interface StoredContext {
	pages?: ContextPage[];
}

export interface ContextStore {
	get(id: string): Promise<StoredContext | undefined>;
	set(ctx: StoredContext): Promise<string>;
}

const inMemoryStore = new Map<string, StoredContext>();
let inMemoryCounter = 0;

export const memoryStore: ContextStore = {
	async get(id: string) {
		return inMemoryStore.get(id);
	},
	async set(ctx: StoredContext) {
		const id = `ctx_${++inMemoryCounter}`;
		inMemoryStore.set(id, ctx);
		return id;
	},
};

function getConvexUrl(): string | null {
	const url = process.env.CONVEX_URL;
	if (url) return url;
	// Convex dev writes CONVEX_DEPLOYMENT (e.g. "dev:anxious-animal-123"); derive URL
	const deployment = process.env.CONVEX_DEPLOYMENT;
	if (deployment) {
		const name = deployment.replace(/^(dev|production):/, "");
		return `https://${name}.convex.cloud`;
	}
	return null;
}

async function createConvexStore(): Promise<ContextStore | null> {
	const url = getConvexUrl();
	if (!url) return null;

	try {
		const { ConvexHttpClient } = await import("convex/browser");
		const client = new ConvexHttpClient(url);

		return {
			async get(id: string) {
				const doc = await (
					client as {
						query: (
							name: string,
							args: object,
						) => Promise<{ pages?: ContextPage[] } | null>;
					}
				).query("contextStore:get", { id });
				return doc ? { pages: doc.pages } : undefined;
			},
			async set(ctx: StoredContext) {
				const id = await (
					client as {
						mutation: (name: string, args: object) => Promise<string>;
					}
				).mutation("contextStore:store", { pages: ctx.pages ?? [] });
				return id;
			},
		};
	} catch (err) {
		// Only warn when Convex was explicitly configured but failed
		if (process.env.CONVEX_URL || process.env.CONVEX_DEPLOYMENT) {
			console.warn(
				"Convex context store unavailable, using in-memory:",
				(err as Error).message,
			);
		}
		return null;
	}
}

let convexStore: ContextStore | null = null;

export async function getContextStore(): Promise<ContextStore> {
	if (convexStore) return convexStore;
	convexStore = (await createConvexStore()) ?? memoryStore;
	return convexStore;
}
