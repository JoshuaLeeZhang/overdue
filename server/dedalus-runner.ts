/**
 * Dedalus + Browser Use MCP + LLM integration.
 * Runs an agent with DedalusRunner, using browser-use-mcp for browser automation
 * and the configured LLM (e.g. OpenAI GPT, Anthropic Claude) for reasoning.
 *
 * Requires: DEDALUS_API_KEY
 */
import Dedalus from 'dedalus-labs';
import { DedalusRunner } from 'dedalus-labs';

const DEFAULT_MODEL = process.env.DEDALUS_MODEL || 'anthropic/claude-sonnet-4';
const BROWSER_USE_MCP = 'akakak/browser-use-mcp';

export interface DedalusRunOptions {
  input: string;
  model?: string;
  mcpServers?: string[];
}

export interface DedalusRunResult {
  finalOutput: string;
  stepsUsed: number;
  toolsCalled: string[];
}

export async function runDedalusAgent(options: DedalusRunOptions): Promise<DedalusRunResult> {
  const { input, model = DEFAULT_MODEL, mcpServers } = options;
  const servers = mcpServers !== undefined ? mcpServers : [BROWSER_USE_MCP];

  if (!process.env.DEDALUS_API_KEY) {
    throw new Error('DEDALUS_API_KEY is required. Get it from https://www.dedaluslabs.ai/dashboard/api-keys');
  }

  const client = new Dedalus();
  const runner = new DedalusRunner(client);

  const result = await runner.run({
    input,
    model,
    mcpServers: servers,
    stream: false,
  });

  if (typeof (result as AsyncIterableIterator<unknown>)[Symbol.asyncIterator] === 'function') {
    throw new Error('Streaming response not supported in this endpoint; use stream: false');
  }

  const runResult = result as { finalOutput: string; stepsUsed: number; toolsCalled?: string[] };
  return {
    finalOutput: runResult.finalOutput ?? '',
    stepsUsed: runResult.stepsUsed ?? 0,
    toolsCalled: runResult.toolsCalled ?? [],
  };
}
