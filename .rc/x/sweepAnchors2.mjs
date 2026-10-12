// Read only anchor sweep, the critic's correction 2 of Release AX.
// FILES is every source file the merge changed (git diff --name-only <first parent> HEAD -- src supabase scripts).
// Literals are read from scripts/**/*.mjs, scripts/**/*.cjs, src/test/** and src/**/*.test.*, with their escapes
// evaluated. A hit is a literal of MIN characters or more that stood exactly once in a changed file on the first
// parent and stands zero times or more than once in it now.
// usage (from the worktree): node .tmp-fx/sweepAnchors2.mjs <first parent> [min length, default 20]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const base = process.argv[2];
const MIN = Number(process.argv[3] || 20);
const lf = s => s.split('\r\n').join('\n');
const changed = execFileSync('git', ['diff', '--name-only', base, 'HEAD', '--', 'src', 'supabase', 'scripts'], { encoding: 'utf8' }).split('\n').filter(Boolean);
const FILES = [];
for (const f of changed) {
  let old = null;
  try { old = lf(execFileSync('git', ['show', `${base}:${f}`], { encoding: 'utf8', maxBuffer: 1 << 27, stdio: ['ignore', 'pipe', 'ignore'] })); } catch { /* added by the merge */ }
  if (old === null) continue;
  FILES.push({ f, old, now: fs.existsSync(f) ? lf(fs.readFileSync(f, 'utf8')) : '' });
}
const count = (text, lit) => { let n = 0, i = -1; while ((i = text.indexOf(lit, i + 1)) !== -1 && n < 3) n++; return n; };
const walk = (dir, keep) => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name), keep) : keep(path.join(dir, e.name).split(path.sep).join('/')) ? [path.join(dir, e.name)] : []) : [];
const sources = [
  ...walk('scripts', p => p.endsWith('.mjs') || p.endsWith('.cjs')),
  ...walk('src', p => p.startsWith('src/test/') || /\.test\.[a-z]+$/.test(p)),
];
const BS = String.fromCharCode(92);
function unescape(s) {
  let out = '';
  for (let i = 0; i < s.length; i += 1) {
    if (s[i] !== BS) { out += s[i]; continue; }
    const c = s[i + 1]; i += 1;
    out += c === 'n' ? '\n' : c === 't' ? '\t' : c === 'r' ? '\r' : c === undefined ? '' : c;
  }
  return out;
}
const q = c => new RegExp(`${c}((?:[^${c}${BS}${BS}\\n]|${BS}${BS}.){${MIN},})${c}`, 'g');
const TICK = new RegExp('`((?:[^`' + BS + BS + '$]|' + BS + BS + '.){' + MIN + ',})`', 'g');
const where = new Map();
for (const script of sources) {
  const text = fs.readFileSync(script, 'utf8');
  for (const re of [q("'"), q('"'), TICK]) for (const m of text.matchAll(re)) {
    const lit = unescape(m[1]);
    if (lit.length < MIN) continue;
    if (!where.has(lit)) where.set(lit, script.split(path.sep).join('/'));
  }
}
let hits = 0;
for (const [lit, script] of where) {
  for (const { f, old, now } of FILES) {
    if (count(old, lit) !== 1) continue;
    const n = count(now, lit);
    if (n === 1) continue;
    hits += 1;
    console.log(`${n === 0 ? 'GONE ' : 'TWICE'} ${script} -> ${f}: ${JSON.stringify(lit.slice(0, 130))}`);
  }
}
console.log(`sweep: ${changed.length} changed files (${FILES.length} existed on ${base.slice(0, 8)}), ${sources.length} files read, ${where.size} distinct literals of ${MIN} or more characters, ${hits} stood once before and do not stand once now`);
