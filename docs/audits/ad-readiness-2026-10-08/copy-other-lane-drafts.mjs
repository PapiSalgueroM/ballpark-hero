/**
 * Ad readiness audit, 2026-10-08, the COPY area. READ ONLY.
 *
 * The other lane (Codex) holds uncommitted drafts of five guide files in the
 * root checkout. This reads `git diff -U0` there (never writes, never stages)
 * and says which game guides each draft touches, how many lines, and how the
 * word count of the changed lines moves. Prints a table; writes nothing.
 *
 * Run: node docs/audits/ad-readiness-2026-10-08/copy-other-lane-drafts.mjs
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_CHECKOUT = 'C:/Users/antho/ballpark-hero';
const FILES = ['baseball', 'basketball', 'college', 'hockey', 'moreSports', 'soccer1', 'soccer2', 'football', 'world'].map(n => `src/data/gameContent/${n}.ts`);
const wc = s => (s.match(/[A-Za-z0-9][A-Za-z0-9'’$%+-]*/g) || []).length;
const out = [];
for (const file of FILES) {
  let diff = '';
  try { diff = execFileSync('git', ['-C', ROOT_CHECKOUT, 'diff', '-U0', '--', file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 }); } catch { continue; }
  if (!diff.trim()) continue;
  const work = fs.readFileSync(path.join(ROOT_CHECKOUT, file), 'utf8').split(/\r?\n/);
  /* line number (1 based) in the working file -> the route whose entry holds it */
  const routeAt = []; let cur = null;
  work.forEach((line, i) => { const m = line.match(/^ {2}'(\/[a-z0-9-]+)': \{/); if (m) cur = m[1]; routeAt[i + 1] = cur; });
  const per = new Map(); let at = 0; let route = null;
  for (const line of diff.split(/\r?\n/)) {
    const h = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (h) { at = Number(h[1]); route = routeAt[Math.max(1, at)] ?? null; if (!per.has(route)) per.set(route, { removed: 0, added: 0, wordsRemoved: 0, wordsAdded: 0, headingsChanged: 0, faqChanged: 0 }); continue; }
    if (!route && !per.has(route)) continue;
    const p = per.get(route); if (!p) continue;
    if (line.startsWith('---') || line.startsWith('+++')) continue;
    if (line.startsWith('-')) { p.removed += 1; p.wordsRemoved += wc(line.slice(1)); if (/heading:/.test(line)) p.headingsChanged += 1; if (/\bq:\s*"/.test(line)) p.faqChanged += 1; }
    else if (line.startsWith('+')) { p.added += 1; p.wordsAdded += wc(line.slice(1)); }
  }
  for (const [r, p] of per) out.push({ file: file.replace('src/data/gameContent/', ''), route: r, ...p });
}
console.log('file | route | lines removed | lines added | words removed | words added | h3 or h4 changed | faq lines changed');
for (const o of out) console.log([o.file, o.route, o.removed, o.added, o.wordsRemoved, o.wordsAdded, o.headingsChanged, o.faqChanged].join(' | '));
const t = out.reduce((a, o) => ({ r: a.r + o.wordsRemoved, a: a.a + o.wordsAdded }), { r: 0, a: 0 });
console.log(`guides touched ${out.length}; words on removed lines ${t.r}; words on added lines ${t.a}`);
