/* Round 1561 probe (never committed): sweepWeight's own section 1 measure, on the four front office routes only.
   It writes a copy of scripts/sweepWeight.mjs beside it (scripts/.weightFo.mjs, so its './lib/' imports resolve)
   whose BUDGETS list is the four routes at a ceiling nobody reaches, runs it, prints its section 1 lines, removes
   the copy. Usage, from a checkout root: node <this file>   (BASE / SWEEP_BASE / SWEEP_OFFLINE as sweepWeight). */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const from = path.join(root, 'scripts', 'sweepWeight.mjs');
const src = fs.readFileSync(from, 'utf8').split('\r\n').join('\n');
const start = src.indexOf('const BUDGETS = [\n');
const end = src.indexOf('\n];\n', start);
if (start < 0 || end < 0) { console.error('weightFo: BUDGETS not found in sweepWeight.mjs'); process.exit(2); }
const rows = ['/front-office', '/nhl-front-office', '/nba-front-office', '/mlb-front-office'].map(r => `  ['${r}', 9999],`).join('\n');
const copy = path.join(root, 'scripts', '.weightFo.mjs');
fs.writeFileSync(copy, src.slice(0, start) + 'const BUDGETS = [\n' + rows + src.slice(end));
let r;
try {
  r = spawnSync(process.execPath, [copy], { cwd: root, encoding: 'utf8', env: process.env, maxBuffer: 64 * 1024 * 1024, timeout: 900000 });
} finally {
  fs.rmSync(copy, { force: true });
}
const out = `${r.stdout || ''}\n${r.stderr || ''}`;
const lines = out.split('\n').filter(l => /front-office|^1\)|FAIL|NOTE/.test(l));
console.log(lines.join('\n'));
console.log(`weightFo: the copy exited ${r.status}`);
process.exit(lines.some(l => /K gz over/.test(l)) ? 0 : 1);
