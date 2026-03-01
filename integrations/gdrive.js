/**
 * Google Drive integration: list files, read Google Docs, get writing style.
 * Requires env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN (from OAuth flow).
 * Without tokens, all methods return { error: 'Google Drive not configured' }.
 */
const { google } = require('googleapis');
const path = require('path');
const { getWritingStyleProfile } = require(path.join(__dirname, '..', 'lib', 'writing-style.js'));

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

function getClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, 'urn:ietf:wg:oauth:2.0:oob');
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

async function listFiles(options = {}) {
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
    return { files: res.data.files || [] };
  } catch (err) {
    return { error: err.message || 'Failed to list files' };
  }
}

const DOC_MIME = 'application/vnd.google-apps.document';

async function readDocument(docId) {
  const auth = getClient();
  if (!auth) return { error: 'Google Drive not configured.' };
  const drive = google.drive({ version: 'v3', auth });
  try {
    const res = await drive.files.export({
      fileId: docId,
      mimeType: 'text/plain',
    });
    const raw = res.data;
    const text = typeof raw === 'string' ? raw : (Buffer.isBuffer(raw) ? raw.toString('utf8') : (raw && String(raw))) || '';
    return { text };
  } catch (err) {
    return { error: err.message || 'Failed to read document' };
  }
}

async function getWritingStyle(docIds) {
  const auth = getClient();
  if (!auth) return { error: 'Google Drive not configured.' };
  if (!Array.isArray(docIds) || docIds.length === 0) {
    return { error: 'docIds array required' };
  }
  const texts = [];
  for (const id of docIds) {
    const out = await readDocument(id);
    if (out.error) return out;
    if (out.text) texts.push(out.text);
  }
  const profile = getWritingStyleProfile(texts);
  return { profile };
}

module.exports = { listFiles, readDocument, getWritingStyle, getClient };
