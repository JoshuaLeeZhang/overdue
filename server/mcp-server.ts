/**
 * MCP server: run_browser_agent, scrape_assignment_context, Google Drive, Office 365, pipeline tools.
 * Run with: node dist/server/mcp-server.js (stdio transport). Backend must be running for scrape/agent.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import * as gdrive from '../integrations/gdrive';
import * as o365 from '../integrations/o365';
import { getWritingStyleProfile } from '../lib/writing-style';
import type { WritingStyleProfile } from '../lib/writing-style';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const POLL_INTERVAL_MS = 500;
const POLL_TIMEOUT_MS = 30000;

async function runAgentAndGetResult(url?: string): Promise<{ title?: string; text?: string }> {
  const runRes = await fetch(`${BACKEND_URL}/run-agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(url ? { url } : {}),
  });
  if (!runRes.ok) {
    throw new Error(`Backend returned ${runRes.status}. Is the server running? Start it with: npm run server`);
  }

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const resultRes = await fetch(`${BACKEND_URL}/agent/last-result`);
    if (resultRes.status === 200) {
      const data = (await resultRes.json()) as { title?: string; text?: string };
      return data;
    }
  }
  throw new Error('Timed out waiting for agent result');
}

async function main(): Promise<void> {
  const server = new McpServer(
    {
      name: 'browser-use',
      version: '0.1.0',
    },
    {}
  );

  server.registerTool(
    'run_browser_agent',
    {
      description: 'Run the Playwright agent to extract the page title and main text from a URL. Opens a visible Chromium window.',
      inputSchema: {
        url: z.string().url().optional().describe('URL to open (default: https://learn.uwaterloo.ca)'),
      },
    },
    async ({ url }: { url?: string }) => {
      const result = await runAgentAndGetResult(url);
      const text = `Title: ${result.title || ''}\n\nText:\n${result.text || ''}`;
      return {
        content: [{ type: 'text', text }],
      };
    }
  );

  server.registerTool(
    'gdrive_list_files',
    {
      description: 'List files in Google Drive (optionally by folder and mime type). Requires Google OAuth configured.',
      inputSchema: {
        folderId: z.string().optional().describe('Folder ID (default: root)'),
        pageSize: z.number().optional().describe('Max results (default 50)'),
        mimeType: z.string().optional().describe('Filter by mime type, e.g. application/vnd.google-apps.document for Docs'),
      },
    },
    async (opts?: { folderId?: string; pageSize?: number; mimeType?: string }) => {
      const out = await gdrive.listFiles(opts || {});
      if (out.error) return { content: [{ type: 'text', text: out.error }] };
      const text = (out.files || []).map((f) => `${f.name} (${f.id}) ${f.mimeType || ''}`).join('\n') || 'No files.';
      return { content: [{ type: 'text', text }] };
    }
  );

  server.registerTool(
    'gdrive_read_document',
    {
      description: 'Get plain text content of a Google Doc by ID.',
      inputSchema: {
        docId: z.string().describe('Google Doc file ID'),
      },
    },
    async ({ docId }: { docId: string }) => {
      const out = await gdrive.readDocument(docId);
      if (out.error) return { content: [{ type: 'text', text: out.error }] };
      return { content: [{ type: 'text', text: out.text || '' }] };
    }
  );

  server.registerTool(
    'gdrive_get_writing_style',
    {
      description: 'Analyze writing style from one or more Google Doc IDs; returns a style profile (tone, sentence length, etc.).',
      inputSchema: {
        docIds: z.array(z.string()).describe('Array of Google Doc file IDs to analyze'),
      },
    },
    async ({ docIds }: { docIds: string[] }) => {
      const out = await gdrive.getWritingStyle(docIds);
      if (out.error) return { content: [{ type: 'text', text: out.error }] };
      const p: WritingStyleProfile = out.profile ?? { summary: '', stats: null };
      const text = [p.summary, p.excerpts ? 'Excerpts:\n' + p.excerpts.join('\n---\n') : ''].filter(Boolean).join('\n\n');
      return { content: [{ type: 'text', text: text || JSON.stringify(p) }] };
    }
  );

  server.registerTool(
    'o365_list_files',
    {
      description: 'List files in Office 365 / OneDrive. Requires Microsoft OAuth configured.',
      inputSchema: {
        folderId: z.string().optional().describe('Folder ID (default: root)'),
        pageSize: z.number().optional().describe('Max results'),
      },
    },
    async (opts?: { folderId?: string; pageSize?: number }) => {
      const out = await o365.listFiles(opts || {});
      if (out.error) return { content: [{ type: 'text', text: out.error }] };
      const text = (out.files || []).map((f) => `${f.name} (${f.id})`).join('\n') || 'No files.';
      return { content: [{ type: 'text', text }] };
    }
  );

  server.registerTool(
    'o365_read_document',
    {
      description: 'Get plain text content of a Word document by OneDrive item ID.',
      inputSchema: {
        itemId: z.string().describe('OneDrive/Graph item ID'),
      },
    },
    async ({ itemId }: { itemId: string }) => {
      const out = await o365.readDocument(itemId);
      if (out.error) return { content: [{ type: 'text', text: out.error }] };
      return { content: [{ type: 'text', text: out.text || '' }] };
    }
  );

  server.registerTool(
    'o365_get_writing_style',
    {
      description: 'Analyze writing style from one or more Office 365 document item IDs.',
      inputSchema: {
        itemIds: z.array(z.string()).describe('Array of OneDrive item IDs to analyze'),
      },
    },
    async ({ itemIds }: { itemIds: string[] }) => {
      const out = await o365.getWritingStyle(itemIds);
      if (out.error) return { content: [{ type: 'text', text: out.error }] };
      const p: WritingStyleProfile = out.profile ?? { summary: '', stats: null };
      const text = [p.summary, p.excerpts ? 'Excerpts:\n' + p.excerpts.join('\n---\n') : ''].filter(Boolean).join('\n\n');
      return { content: [{ type: 'text', text: text || JSON.stringify(p) }] };
    }
  );

  server.registerTool(
    'scrape_assignment_context',
    {
      description: 'Scrape one or more URLs (assignment page, rubric, linked readings) and return structured context (pages with title and text) for the assignment pipeline.',
      inputSchema: {
        urls: z.array(z.string().url()).describe('List of URLs to scrape'),
      },
    },
    async ({ urls }: { urls: string[] }) => {
      const res = await fetch(`${BACKEND_URL}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `Scrape failed: ${res.status}`);
      }
      const { contextId, context } = (await res.json()) as {
        contextId: string;
        context: { pages?: { url: string; title: string; text: string }[] };
      };
      const summary = context.pages
        ? context.pages.map((p) => `${p.url}: ${p.title || 'no title'} (${(p.text || '').length} chars)`).join('\n')
        : JSON.stringify(context);
      return {
        content: [{ type: 'text', text: `Context ID: ${contextId}\n\nPages:\n${summary}` }],
      };
    }
  );

  server.registerTool(
    'fill_form',
    {
      description: 'Navigate to a URL and fill form fields. Pass url and values (object: field name -> value). Uses Playwright; browser window is visible.',
      inputSchema: {
        url: z.string().url().describe('Page URL with the form'),
        values: z.record(z.string(), z.union([z.string(), z.number()])).describe('Field names (name or id) to values to fill'),
      },
    },
    async ({ url, values }: { url: string; values?: Record<string, string | number> }) => {
      const runRes = await fetch(`${BACKEND_URL}/run-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: { mode: 'fill_form', url, values: values || {} } }),
      });
      if (!runRes.ok) throw new Error(`Backend returned ${runRes.status}`);
      const deadline = Date.now() + POLL_TIMEOUT_MS;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const resultRes = await fetch(`${BACKEND_URL}/agent/last-result`);
        if (resultRes.status === 200) {
          const data = await resultRes.json();
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
      }
      throw new Error('Timed out waiting for form-fill result');
    }
  );

  server.registerTool(
    'generate_draft',
    {
      description: 'Generate an assignment draft from instructions, scraped context (by contextId or inline), and optional writing-style profile (or text chunks to derive style).',
      inputSchema: {
        instructions: z.string().optional().describe('Assignment instructions'),
        contextId: z.string().optional().describe('Context ID from scrape_assignment_context'),
        urls: z.array(z.string().url()).optional().describe('If no contextId, scrape these URLs first'),
        styleProfile: z
          .object({
            summary: z.string().optional(),
            excerpts: z.array(z.string()).optional(),
          })
          .optional()
          .describe('Writing style summary/excerpts'),
        textChunks: z.array(z.string()).optional().describe('Raw text to compute writing style from'),
      },
    },
    async ({
      instructions,
      contextId,
      urls,
      styleProfile,
      textChunks,
    }: {
      instructions?: string;
      contextId?: string;
      urls?: string[];
      styleProfile?: { summary?: string; excerpts?: string[] };
      textChunks?: string[];
    }) => {
      let context: { pages?: { url: string; title: string; text: string }[] } = { pages: [] };
      if (contextId) {
        const res = await fetch(`${BACKEND_URL}/context/${contextId}`);
        if (res.ok) context = (await res.json()) as typeof context;
      } else if (urls && urls.length > 0) {
        const res = await fetch(`${BACKEND_URL}/scrape`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls }),
        });
        if (!res.ok) throw new Error('Scrape failed');
        const data = (await res.json()) as { context?: typeof context };
        context = data.context || context;
      }
      let profile = styleProfile || null;
      if (!profile && textChunks && textChunks.length > 0) {
        profile = getWritingStyleProfile(textChunks);
      }
      const res = await fetch(`${BACKEND_URL}/pipeline/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentSpec: { instructions }, context, styleProfile: profile }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `Pipeline failed: ${res.status}`);
      }
      const { draft } = (await res.json()) as { draft: string };
      return { content: [{ type: 'text', text: draft || '' }] };
    }
  );

  server.registerTool(
    'do_assignment',
    {
      description:
        'High-level: scrape assignment URL (and optional extra links), optionally use writing style from Google Doc IDs, then generate a draft. Returns draft text.',
      inputSchema: {
        assignmentUrl: z.string().url().describe('Main assignment page URL to scrape'),
        extraUrls: z.array(z.string().url()).optional().describe('Additional URLs (rubric, readings)'),
        instructions: z.string().optional().describe('Override or add assignment instructions'),
        gdriveDocIds: z.array(z.string()).optional().describe('Google Doc IDs to derive writing style from'),
      },
    },
    async ({
      assignmentUrl,
      extraUrls,
      instructions,
      gdriveDocIds,
    }: {
      assignmentUrl: string;
      extraUrls?: string[];
      instructions?: string;
      gdriveDocIds?: string[];
    }) => {
      const urls = [assignmentUrl, ...(extraUrls || [])];
      const scrapeRes = await fetch(`${BACKEND_URL}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      });
      if (!scrapeRes.ok) throw new Error('Scrape failed');
      const { context } = (await scrapeRes.json()) as { context: { pages?: unknown[] } };
      let styleProfile: { summary?: string; excerpts?: string[] } | null = null;
      if (gdriveDocIds && gdriveDocIds.length > 0) {
        const out = await gdrive.getWritingStyle(gdriveDocIds);
        if (!out.error && out.profile) styleProfile = out.profile;
      }
      const draftRes = await fetch(`${BACKEND_URL}/pipeline/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentSpec: { instructions: instructions || 'Complete the assignment using the scraped context.' },
          context,
          styleProfile,
        }),
      });
      if (!draftRes.ok) throw new Error('Pipeline failed');
      const { draft } = (await draftRes.json()) as { draft: string };
      return { content: [{ type: 'text', text: draft || '' }] };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
