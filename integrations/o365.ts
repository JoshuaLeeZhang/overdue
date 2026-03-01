/**
 * Office 365 / OneDrive integration: list files, read Word docs, get writing style.
 * Stub: returns "not configured" until OAuth (Azure AD) and Graph API are wired.
 * Set env: MS_CLIENT_ID, MS_CLIENT_SECRET, MS_REFRESH_TOKEN (or equivalent) for a real implementation.
 */
import { getWritingStyleProfile } from '../lib/writing-style.js';
import type { WritingStyleProfile } from '../lib/writing-style.js';

export interface O365File {
  name: string;
  id: string;
}

export interface ListFilesResult {
  error?: string;
  files?: O365File[];
}

export interface ReadDocumentResult {
  error?: string;
  text?: string;
}

export interface GetWritingStyleResult {
  error?: string;
  profile?: WritingStyleProfile;
}

export function getClient(): null {
  if (!process.env.MS_CLIENT_ID || !process.env.MS_CLIENT_SECRET || !process.env.MS_REFRESH_TOKEN) {
    return null;
  }
  // TODO: use @azure/msal-node and @microsoft/microsoft-graph-client
  return null;
}

export async function listFiles(_options: { folderId?: string; pageSize?: number } = {}): Promise<ListFilesResult> {
  if (!getClient()) {
    return { error: 'Office 365 not configured. Set MS_CLIENT_ID, MS_CLIENT_SECRET, MS_REFRESH_TOKEN.' };
  }
  // TODO: GET /me/drive/root/children
  return { files: [] };
}

export async function readDocument(itemId: string): Promise<ReadDocumentResult> {
  if (!getClient()) {
    return { error: 'Office 365 not configured.' };
  }
  // TODO: download Word doc via Graph, extract text (e.g. mammoth)
  void itemId;
  return { text: '' };
}

export async function getWritingStyle(itemIds: string[]): Promise<GetWritingStyleResult> {
  if (!getClient()) {
    return { error: 'Office 365 not configured.' };
  }
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    return { error: 'itemIds array required' };
  }
  const texts: string[] = [];
  for (const id of itemIds) {
    const out = await readDocument(id);
    if (out.error) return out;
    if (out.text) texts.push(out.text);
  }
  const profile = getWritingStyleProfile(texts);
  return { profile };
}
