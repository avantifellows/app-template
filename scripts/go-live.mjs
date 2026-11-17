#!/usr/bin/env node
// The go-live check for an AF internal app. An approver runs it from a clean checkout of app-template, pointed at
// the app's repo, so the app cannot change the check or the files it compares:
//
//   node scripts/go-live.mjs --repo ../my-app --url https://my-app.avantifellows.org
//
// --url is optional (repo checks only, as in CI). Writes go-live-report.md in the app's repo and exits 1 on any FAIL.
// CHECK items are for the approver to look at; they do not fail the run.
import { execFileSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { appRoutes } from './routes.mjs';

const TEMPLATE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const REPO = path.resolve(arg('--repo') ?? '.');
const URL_ARG = arg('--url')?.replace(/\/+$/, '');

// Files that must be exactly the template's: the build, the sign-in rules and the gate.
const PINNED = ['amplify.yml', 'scripts/write-env.mjs', 'src/proxy.ts', 'src/lib/gate.ts', 'src/lib/rules.ts'];
const PUBLIC_OK = new Set(['public/robots.txt', 'public/favicon.ico']);
const DATA_EXT = /\.(csv|tsv|xlsx?|parquet|sqlite3?|db|zip|pdf)$/i;
const STORAGE_DEPS = ['firebase', 'firebase-admin', '@supabase/supabase-js', 'googleapis', 'google-spreadsheet',
  '@vercel/kv', '@vercel/postgres', '@vercel/blob', '@upstash/redis', 'redis', 'ioredis', 'mongodb', 'mongoose',
  '@neondatabase/serverless', '@prisma/client', 'prisma', 'drizzle-orm', 'mysql2', 'better-sqlite3', 'sqlite3',
  '@aws-sdk/client-dynamodb', '@aws-sdk/lib-dynamodb', '@aws-sdk/client-s3', '@google-cloud/storage',
  '@google-cloud/firestore'];

const results = [];
const add = (name, status, notes = []) => results.push({ name, status, notes });

const tracked = execFileSync('git', ['-C', REPO, 'ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);
const read = (f) => fs.readFileSync(path.join(REPO, f), 'utf8');

// 1. Secrets, in the whole history.
{
  const bin = spawnSync('gitleaks', ['version']).status === 0 ? 'gitleaks' : null;
  if (!bin) add('Secrets (gitleaks, whole history)', 'FAIL', ['gitleaks is not installed: brew install gitleaks']);
  else {
    const r = spawnSync(bin, ['detect', '--source', REPO, '--config', path.join(TEMPLATE, '.gitleaks.toml'), '--redact', '--no-banner'], { encoding: 'utf8' });
    const out = (r.stdout + r.stderr).trim().split('\n').slice(-20);
    add('Secrets (gitleaks, whole history)', r.status === 0 ? 'PASS' : 'FAIL', r.status === 0 ? [] : out);
  }
}

// 2. Repo hygiene.
{
  const notes = [];
  for (const f of tracked) {
    if (f.startsWith('public/') && !PUBLIC_OK.has(f)) notes.push(`${f}: public/ is served to anyone without signing in; only robots.txt and favicon.ico may be there`);
    if (DATA_EXT.test(f)) notes.push(`${f}: data file in the repo`);
    if (/(^|\/)\.env/.test(f) && !f.endsWith('.env.example')) notes.push(`${f}: env file in the repo`);
    if (f.endsWith('.json') && f !== 'package-lock.json' && fs.statSync(path.join(REPO, f)).size > 50_000) notes.push(`${f}: JSON over 50 KB, looks like data`);
  }
  add('Repo hygiene (public/, data files, env files)', notes.length ? 'FAIL' : 'PASS', notes);
}

// 3. Pinned files are the template's.
if (REPO === TEMPLATE) add('Standard files match the template', 'PASS', ['(this is the template)']);
else {
  const hash = (p) => (fs.existsSync(p) ? crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') : 'missing');
  const diff = PINNED.filter((f) => hash(path.join(REPO, f)) !== hash(path.join(TEMPLATE, f)));
  add('Standard files match the template', diff.length ? 'FAIL' : 'PASS', diff.map((f) => `${f} differs from the template's (or is missing)`));
}

// 4. Writes, storage and personal data in logs: a dev or approver must look.
{
  const notes = [];
  const pkg = JSON.parse(read('package.json'));
  for (const d of Object.keys({ ...pkg.dependencies })) if (STORAGE_DEPS.includes(d)) notes.push(`dependency ${d}: storage or write access; a dev must sign off`);
  for (const f of tracked.filter((f) => /^src\/.*\.(tsx?|jsx?|mjs)$/.test(f))) {
    read(f).split('\n').forEach((line, i) => {
      const at = `${f}:${i + 1}`;
      if (/\b(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TRUNCATE|GRANT|MERGE)\b/.test(line)) notes.push(`${at}: SQL that writes? ${line.trim().slice(0, 100)}`);
      if (/\b(localStorage|sessionStorage|indexedDB)\b/.test(line)) notes.push(`${at}: browser storage (fine for a UI preference, never for records)`);
      if (/console\.(log|info|warn|error)/.test(line) && /name|phone|mobile|roll|dob|birth|address|aadhaar/i.test(line)) notes.push(`${at}: personal data in a log? ${line.trim().slice(0, 100)}`);
    });
  }
  add('Writes, storage, personal data in logs', notes.length ? 'CHECK' : 'PASS', notes);
}

// 5. Dependencies.
{
  const r = spawnSync('npm', ['audit', '--omit=dev', '--json'], { cwd: REPO, encoding: 'utf8' });
  try {
    const v = JSON.parse(r.stdout).metadata.vulnerabilities;
    const bad = (v.high ?? 0) + (v.critical ?? 0);
    add('Dependencies (npm audit, production)', bad ? 'FAIL' : 'PASS', [`critical ${v.critical ?? 0}, high ${v.high ?? 0}, moderate ${v.moderate ?? 0}, low ${v.low ?? 0}`]);
  } catch {
    add('Dependencies (npm audit, production)', 'FAIL', ['npm audit did not run: ' + (r.stderr || r.stdout).trim().slice(0, 300)]);
  }
}

// 6. Signed-out sweep of the live site.
if (URL_ARG) {
  const notes = [];
  let fail = false;
  const get = (p, accept) => fetch(URL_ARG + p, { redirect: 'manual', headers: { accept } });
  const toLogin = (r) => [302, 303, 307, 308].includes(r.status) && new URL(r.headers.get('location') ?? '', URL_ARG).pathname === '/login';
  const check = async (p, expect, accept = 'text/html') => {
    let r;
    try {
      r = await get(p, accept);
    } catch (e) {
      fail = true;
      return notes.push(`${p}: could not fetch (${e.message})`);
    }
    const ok = expect === 'login' ? toLogin(r) : expect === '401' ? r.status === 401 : expect === 'open' ? r.status === 200 : r.status < 200 || r.status >= 300;
    if (!ok) fail = true;
    notes.push(`${ok ? 'ok  ' : 'FAIL'} ${p} → ${r.status}${r.headers.get('location') ? ' ' + r.headers.get('location') : ''} (expected ${expect})`);
    return r;
  };

  const login = await check('/login', 'open');
  if (login) {
    const cc = login.headers.get('cache-control') ?? '';
    const robots = login.headers.get('x-robots-tag') ?? '';
    if (!/private|no-store/.test(cc)) { fail = true; notes.push(`FAIL /login Cache-Control is "${cc}": Amplify's CDN could cache pages`); }
    if (!/noindex/.test(robots)) { fail = true; notes.push('FAIL /login has no X-Robots-Tag: noindex'); }
  }
  for (const r of appRoutes(path.join(REPO, 'src/app'))) {
    if (r.path === '/login' || r.path.startsWith('/api/auth')) continue;
    const api = r.path === '/api' || r.path.startsWith('/api/');
    await check(r.path, api ? '401' : 'login', api ? 'application/json' : 'text/html');
  }
  for (const f of tracked.filter((f) => f.startsWith('public/'))) await check('/' + f.slice('public/'.length), PUBLIC_OK.has(f) ? 'open' : 'refused');
  for (const p of ['/API/me', '/Api/x', '//api/me', '/%61pi/me', '/api/%2e%2e/x', '/x%2fy', '/.env', '/.env.production', '/.git/config', '/package.json', '/_next/image?url=%2Frobots.txt&w=64&q=75', '/nope-' + Date.now()]) {
    await check(p, 'refused');
  }
  add('Signed-out sweep of ' + URL_ARG, fail ? 'FAIL' : 'PASS', notes);
} else add('Signed-out sweep', 'CHECK', ['not run: pass --url https://<app>.avantifellows.org']);

// 7. For the approver.
const approver = [
  'Signed in with a personal Gmail account: refused ("Only avantifellows.org accounts can sign in.")',
  'Signed in with an AF account: works; sign-in shows in the Amplify logs as {"audit":"sign_in",...}',
  'Data the app reads, and with which credentials (read-only Postgres role, narrow BigQuery service account)',
  'Saves nothing, or a dev has signed off on where and how it saves',
  'Access: all AF staff, or school-scoped from LMS seats (needs a dev); never a hand-made list',
  'No names, phone numbers or roll numbers in logs, git or published pages',
  'DPDPA register entry (task af-dpdpa) if it touches personal data',
  'App list entry on af-docs: owner, data touched, review/retire date',
  'Repo in the avantifellows GitHub org; Amplify in the AF AWS account; domain <app>.avantifellows.org via Cloudflare',
  'OAuth client in af-internal-apps; redirect URIs only the real domain (+ localhost); AUTH_URL is the real domain',
];

const failed = results.filter((r) => r.status === 'FAIL').length;
const report = [
  `# Go-live check: ${path.basename(REPO)}`,
  '',
  `Run ${new Date().toISOString()}${URL_ARG ? ` against ${URL_ARG}` : ''}, template ${execFileSync('git', ['-C', TEMPLATE, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()}.`,
  '',
  `**${failed ? `${failed} FAIL` : 'No FAIL'}**${failed ? ': fix and run again.' : '. An approver (Pritam, Deepansh or Surya) goes through the list below.'}`,
  '',
  ...results.flatMap((r) => [`## ${r.status} ${r.name}`, '', ...r.notes.map((n) => `- ${n}`), '']),
  '## Approver',
  '',
  ...approver.map((a) => `- [ ] ${a}`),
  '',
  'Approved by: ____________  Date: ________',
  '',
].join('\n');
fs.writeFileSync(path.join(REPO, 'go-live-report.md'), report);
for (const r of results) console.log(`${r.status.padEnd(5)} ${r.name}`);
console.log(`\nReport: ${path.join(REPO, 'go-live-report.md')}`);
process.exit(failed ? 1 : 0);
