/**
 * Office 365 / OneDrive integration: list files, read Word docs, get writing style.
 * Stub: returns "not configured" until OAuth (Azure AD) and Graph API are wired.
 * Set env: MS_CLIENT_ID, MS_CLIENT_SECRET, MS_REFRESH_TOKEN (or equivalent) for a real implementation.
 */
const path = require('path');
const { getWritingStyleProfile } = require(path.join(__dirname, '..', 'lib', 'writing-style.js'));

function getClient() {
  if (!process.env.MS_CLIENT_ID || !process.env.MS_CLIENT_SECRET || !process.env.MS_REFRESH_TOKEN) {
    return null;
  }
  // TODO: use @azure/msal-node and @microsoft/microsoft-graph-client
  return null;
}

async function listFiles(options = {}) {
  if (!getClient()) {
    return { error: 'Office 365 not configured. Set MS_CLIENT_ID, MS_CLIENT_SECRET, MS_REFRESH_TOKEN.' };
  }
  // TODO: GET /me/drive/root/children
  return { files: [] };
}

async function readDocument(itemId) {
  if (!getClient()) {
    return { error: 'Office 365 not configured.' };
  }
  // TODO: download Word doc via Graph, extract text (e.g. mammoth)
  return { text: '' };
}

async function getWritingStyle(itemIds) {
  if (!getClient()) {
    return { error: 'Office 365 not configured.' };
  }
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    return { error: 'itemIds array required' };
  }
  const texts = [];
  for (const id of itemIds) {
    const out = await readDocument(id);
    if (out.error) return out;
    if (out.text) texts.push(out.text);
  }
  const profile = getWritingStyleProfile(texts);
  return { profile };
}

module.exports = { listFiles, readDocument, getWritingStyle, getClient };
