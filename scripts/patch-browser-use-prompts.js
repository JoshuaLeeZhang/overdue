#!/usr/bin/env node
/**
 * Patch browser-use: copy missing system prompt .md files into node_modules.
 * The npm package omits these files, causing "ENOENT: no such file or directory".
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'https://raw.githubusercontent.com/webllm/browser-use/main/src/agent';
const FILES = [
  'system_prompt.md',
  'system_prompt_flash.md',
  'system_prompt_flash_anthropic.md',
  'system_prompt_anthropic_flash.md',
  'system_prompt_no_thinking.md',
  'system_prompt_browser_use.md',
  'system_prompt_browser_use_flash.md',
  'system_prompt_browser_use_no_thinking.md',
];

const targetDir = path.join(__dirname, '..', 'node_modules', 'browser-use', 'dist', 'agent');

async function main() {
  if (!fs.existsSync(path.join(__dirname, '..', 'node_modules', 'browser-use'))) {
    console.log('browser-use not installed, skipping prompt patch');
    return;
  }

  fs.mkdirSync(targetDir, { recursive: true });

  for (const file of FILES) {
    const url = `${BASE}/${file}`;
    const dest = path.join(targetDir, file);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      fs.writeFileSync(dest, text, 'utf8');
      console.log(`Patched ${file}`);
    } catch (err) {
      console.warn(`Failed to patch ${file}:`, err.message);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
