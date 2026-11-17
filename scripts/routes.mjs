// Every page and API route of the app, read from src/app (route groups dropped, dynamic segments filled with "x").
// Used by the go-live sweep and by test/routes.test.ts.
import fs from 'node:fs';
import path from 'node:path';

export function appRoutes(appDir) {
  const out = [];
  const walk = (dir, segs) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (e.name.startsWith('_') || e.name.startsWith('@')) continue; // private folders, parallel slots
        const seg = /^\(.*\)$/.test(e.name) ? null : /^\[.*\]$/.test(e.name) ? 'x' : e.name;
        walk(path.join(dir, e.name), seg === null ? segs : [...segs, seg]);
      } else {
        const m = /^(page|route)\.(tsx?|jsx?|mjs)$/.exec(e.name);
        if (m) out.push({ path: '/' + segs.join('/'), kind: m[1] === 'route' ? 'api' : 'page' });
      }
    }
  };
  walk(appDir, []);
  return out.sort((a, b) => a.path.localeCompare(b.path));
}
