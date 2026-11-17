#!/usr/bin/env node
// Amplify build step: writes the server's env vars to .env.production, which the Next.js server reads at runtime
// (Amplify passes console env vars to the build only). The keys are the ones in .env.example: one list, not two.
// Next expands $VAR in .env files, so every $ is escaped; values are single-quoted so # and spaces survive. A value
// that cannot be written safely (newline, single quote, backslash) fails the build instead of reaching the server
// altered. The sign-in variables are required: without them the build fails rather than deploying a broken site.
// (From student-worksheets' tools/write_env.mjs.)
import fs from 'node:fs';

const REQUIRED = ['AUTH_SECRET', 'AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET', 'AUTH_URL'];
const NEVER = new Set(['ENABLE_TEST_LOGIN']);

export function keysFrom(example) {
  return [...example.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]).filter((k) => !NEVER.has(k));
}

function main() {
  const keys = keysFrom(fs.readFileSync('.env.example', 'utf8'));
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`write-env: missing ${missing.join(', ')} (set them in the Amplify console)`);
    process.exit(1);
  }
  const lines = [];
  for (const k of keys) {
    const v = process.env[k];
    if (v === undefined || v === '') continue;
    if (/[\n\r'\\]/.test(v)) {
      console.error(`write-env: ${k} contains a newline, single quote or backslash; cannot be written safely`);
      process.exit(1);
    }
    lines.push(`${k}='${v.replace(/\$/g, '\\$')}'`);
  }
  fs.writeFileSync('.env.production', lines.join('\n') + '\n', { mode: 0o600 });
  console.log(`write-env: wrote ${lines.length} variables (${lines.map((l) => l.split('=')[0]).join(', ')})`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
