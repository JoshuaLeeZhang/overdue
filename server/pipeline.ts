/**
 * Assignment pipeline: combines scraped context + writing style to generate draft or form-fill plan.
 * generateDraft uses Dedalus LLM when DEDALUS_API_KEY is set; otherwise returns a template.
 */
import { getWritingStyleProfile } from '../lib/writing-style.js';
import type { WritingStyleProfile } from '../lib/writing-style.js';
import { runDedalusAgent } from './dedalus-runner.js';

export interface AssignmentSpec {
  instructions?: string;
  type?: 'draft' | 'form' | 'both';
  url?: string;
}

export interface ContextPage {
  url: string;
  title: string;
  text: string;
}

export interface ScrapedContext {
  pages?: ContextPage[];
  files?: { name: string; text: string }[];
}

function buildDraftPrompt(
  instructions: string,
  contextBlob: string,
  styleSummary: string,
  excerpt: string
): string {
  return [
    'You are writing an assignment draft. Follow these instructions and match the author\'s writing style.',
    '',
    '## Instructions',
    instructions,
    '',
    '## Writing style to match',
    styleSummary,
    ...(excerpt ? ['', 'Sample excerpt from the author:', excerpt] : []),
    '',
    '## Context from assignment / linked pages',
    contextBlob || '(No scraped context.)',
    '',
    '---',
    'Write the draft now. Output only the draft content, no meta-commentary.',
  ].join('\n');
}

/**
 * Generate a draft from assignment spec, scraped context, and optional style profile.
 * When DEDALUS_API_KEY is set, uses Dedalus LLM. Otherwise returns a template.
 */
export async function generateDraft(
  assignmentSpec: AssignmentSpec,
  context: ScrapedContext,
  styleProfile: WritingStyleProfile | null
): Promise<{ draft: string }> {
  const instructions = assignmentSpec.instructions || 'No instructions provided.';
  const pages = (context && context.pages) || [];
  const styleSummary = (styleProfile && styleProfile.summary) || 'No writing style provided.';
  const excerpt = (styleProfile && styleProfile.excerpts && styleProfile.excerpts[0])
    ? styleProfile.excerpts[0].slice(0, 200)
    : '';

  const contextBlob = pages
    .map((p) => `[${p.url}]\n${p.title || ''}\n${(p.text || '').slice(0, 3000)}`)
    .join('\n\n---\n\n');

  if (process.env.DEDALUS_API_KEY) {
    const prompt = buildDraftPrompt(instructions, contextBlob, styleSummary, excerpt);
    const result = await runDedalusAgent({ input: prompt, mcpServers: [] });
    return { draft: result.finalOutput };
  }

  const draft = [
    '# Draft (template – set DEDALUS_API_KEY for LLM generation)',
    '',
    '## Instructions',
    instructions,
    '',
    '## Writing style to match',
    styleSummary,
    ...(excerpt ? ['', 'Sample excerpt:', excerpt] : []),
    '',
    '## Context from assignment / links',
    contextBlob || '(No scraped context.)',
  ].join('\n');

  return { draft };
}

/**
 * Prepare form-fill payload for the browser agent. Returns URL and key-value pairs.
 * Actual form field selectors would be produced by the agent or a separate step.
 */
export function prepareFormFill(
  assignmentSpec: AssignmentSpec,
  context: ScrapedContext
): { url: string; values: Record<string, string>; note: string } {
  const url = assignmentSpec.url || (context && context.pages && context.pages[0] && context.pages[0].url) || '';
  return {
    url,
    values: {},
    note: 'Form field mapping not implemented; extend pipeline with selector logic or LLM.',
  };
}
