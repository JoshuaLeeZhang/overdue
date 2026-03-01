/**
 * Assignment pipeline: combines scraped context + writing style to generate draft or form-fill plan.
 * generateDraft(assignmentSpec, context, styleProfile) -> draft text
 * prepareFormFill(assignmentSpec, context) -> { url, values } for the browser agent (sketch)
 */
import { getWritingStyleProfile } from '../lib/writing-style';
import type { WritingStyleProfile } from '../lib/writing-style';

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

/**
 * Generate a draft from assignment spec, scraped context, and optional style profile.
 * Without an LLM this returns a template that weaves in context and style summary.
 * Plug in an LLM (e.g. OpenAI) later by replacing the body and using assignmentSpec.instructions + context.pages + style.summary.
 */
export function generateDraft(
  assignmentSpec: AssignmentSpec,
  context: ScrapedContext,
  styleProfile: WritingStyleProfile | null
): { draft: string } {
  const instructions = assignmentSpec.instructions || 'No instructions provided.';
  const pages = (context && context.pages) || [];
  const styleSummary = (styleProfile && styleProfile.summary) || 'No writing style provided.';
  const excerpt = (styleProfile && styleProfile.excerpts && styleProfile.excerpts[0]) ? styleProfile.excerpts[0].slice(0, 200) : '';

  const contextBlob = pages
    .map((p) => `[${p.url}]\n${p.title || ''}\n${(p.text || '').slice(0, 3000)}`)
    .join('\n\n---\n\n');

  const draft = [
    '# Draft (template – replace with LLM generation)',
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
    '',
    '---',
    "Generate your response above using the instructions and context, in the author's style.",
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
