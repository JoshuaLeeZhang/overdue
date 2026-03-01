/**
 * Google Drive integration: list files, read Google Docs, get writing style.
 * Requires env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN (from OAuth flow).
 * Without tokens, all methods return { error: 'Google Drive not configured' }.
 */
import { google } from 'googleapis';
import { getWritingStyleProfile } from '../lib/writing-style.js';
import type { WritingStyleProfile } from '../lib/writing-style.js';

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

export interface GDriveFile {
  id: string;
  name: string;
  mimeType?: string;
  modifiedTime?: string;
}

export interface ListFilesOptions {
  folderId?: string;
  pageSize?: number;
  mimeType?: string;
}

export interface ListFilesResult {
  error?: string;
  files?: GDriveFile[];
}

export interface ReadDocumentResult {
  error?: string;
  text?: string;
}

export interface GetWritingStyleResult {
  error?: string;
  profile?: WritingStyleProfile;
}

export function getClient(): InstanceType<typeof google.auth.OAuth2> | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, 'urn:ietf:wg:oauth:2.0:oob');
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

export async function listFiles(options: ListFilesOptions = {}): Promise<ListFilesResult> {
  const auth = getClient();
  if (!auth) return { error: 'Google Drive not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN.' };
  const drive = google.drive({ version: 'v3', auth });
  const { folderId = 'root', pageSize = 50, mimeType } = options;
  const q = folderId === 'root' ? "'root' in parents" : `'${folderId}' in parents`;
  const qWithMime = mimeType ? `(${q}) and mimeType='${mimeType}'` : q;
  try {
    const res = await drive.files.list({
      q: qWithMime,
      pageSize,
      fields: 'nextPageToken, files(id, name, mimeType, modifiedTime)',
      orderBy: 'modifiedTime desc',
    });
    return { files: (res.data.files as GDriveFile[]) || [] };
  } catch (err) {
    return { error: (err as Error).message || 'Failed to list files' };
  }
}

const DOC_MIME = 'application/vnd.google-apps.document';
void DOC_MIME;

export async function readDocument(docId: string): Promise<ReadDocumentResult> {
  const auth = getClient();
  if (!auth) return { error: 'Google Drive not configured.' };
  const drive = google.drive({ version: 'v3', auth });
  try {
    const res = await drive.files.export({
      fileId: docId,
      mimeType: 'text/plain',
    });
    const raw = res.data as string | Buffer | unknown;
    const text: string =
      typeof raw === 'string' ? raw : Buffer.isBuffer(raw) ? raw.toString('utf8') : raw != null ? String(raw) : '';
    return { text };
  } catch (err) {
    return { error: (err as Error).message || 'Failed to read document' };
  }
}

export async function getWritingStyle(docIds: string[]): Promise<GetWritingStyleResult> {
  const auth = getClient();
  if (!auth) return { error: 'Google Drive not configured.' };
  if (!Array.isArray(docIds) || docIds.length === 0) {
    return { error: 'docIds array required' };
  }
  const texts: string[] = [];
  for (const id of docIds) {
    const out = await readDocument(id);
    if (out.error) return out;
    if (out.text) texts.push(out.text);
  }
  const profile = getWritingStyleProfile(texts);
  return { profile };
}
