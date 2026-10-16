/* Reviewer (run lens), runner only, never committed. Old saves: a Club Manager save written by the BASE engine
   (CM_BOARD_BASE, the merge base 1027b08c) part way through a season, loaded by both engines and played on to
   the season's end with the same seeded draws. The brief promises old saves load unchanged and the new rules
   arrive only at the next season end, so the two runs must be equal up to finishSeason (a mid season
   approach's suitor masked, correction 9) and finishSeason must differ only in the grade, the line, the fate
   and the offers. Prints the counts and the first differences; exit 1 when a run differs elsewhere. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
const ROOT = process.cwd();
const BASE = process.env.CM_BOARD_BASE;
if (!BASE) { console.log('oldSaveCarry needs CM_BOARD_BASE; could not run'); process.exit(2); }
const require = createRequire(path.join(ROOT, 'package.json'));
require(path.join(ROOT, 'scripts/lib/offlineTransport.cjs'));
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'rv-old-'));
async function arm(name, src) {
  const entry = path.join(work, `${name}.ts`);
  fs.writeFileSync(entry, "export * as cm from '@/lib/clubManager';\n");
  const out = path.join(work, `${name}.cjs`);
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent', alias: { '@': src }, nodePaths: [path.join(ROOT, 'node_modules')] });
  return out;
}
const headOut = await arm('head', path.join(ROOT, 'src'));
const baseOut = await arm('base', path.join(BASE, 'src'));
async function fresh(out) { delete require.cache[require.resolve(out)]; const m = require(out); await m.cm.ensureAllEraRosters(); return m.cm; }
function withSeed(seed, fn) {
  const previous = Math.random, previousNow = Date.now;
  Date.now = () => 1791302400000;
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = previous; Date.now = previousNow; }
}
const QUICK = { skipHalftime: true };
const PHONE = '\u{1F4DE}';
const canon = v => JSON.parse(JSON.stringify(v).replace(/youth-([a-z0-9]+)-\d+-(\d+)/g, 'youth-$1-#-$2'));
function maskState(s) {
  const c = canon(s);
  if (c.approach) c.approach = { masked: true, expiresWeek: c.approach.expiresWeek };
  c.aiHeadlines = (c.aiHeadlines ?? []).map(l => (typeof l === 'string' && l.startsWith(PHONE) ? PHONE : l));
  return c;
}
function firstDiff(a, b, at = '') {
  if (JSON.stringify(a) === JSON.stringify(b)) return '';
  if (a && b && typeof a === 'object' && typeof b === 'object') for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const d = firstDiff(a[k], b[k], `${at}.${k}`); if (d) return d; }
  return `${at || '(root)'}: head ${JSON.stringify(a)?.slice(0, 90)} base ${JSON.stringify(b)?.slice(0, 90)}`;
}
const CLUBS = [['Liverpool', null], ['Brighton', null], ['West Ham', null], ['OB', null], ['Leeds United', null], ['Getafe', null], ['Everton', 'era2005'], ['Juventus', 'era2015']];
let n = 0, seasonEq = 0, finEq = 0, gradeMoved = 0, skipped = 0;
const diffs = [], finDiffs = [];
for (const [club, era] of CLUBS) {
  for (let seed = 0; seed < Number(process.env.RV_SEEDS ?? 4); seed++) {
    let cmB = await fresh(baseOut);
    let s = null;
    try { s = withSeed(100 + seed, () => (era ? cmB.startCareer(club, era) : cmB.startCareer(club))); } catch (e) { console.log(`  ${club}: could not start (${String(e).slice(0, 60)})`); }
    if (!s) { skipped += 1; continue; }
    const k = 6 + ((seed * 11) % 25);
    let alive = true;
    for (let i = 0; i < k; i++) { const r = withSeed(seed * 991 + i + 1, () => cmB.playNextEntry(s, QUICK)); s = r.state; if (s.sacked || r.kind === 'seasonOver') { alive = false; break; } }
    if (!alive) { skipped += 1; continue; }
    store.clear();
    cmB.saveCareer(s);
    const raw = store.get(cmB.SAVE_KEY);
    const play = async out => {
      const cmX = await fresh(out);
      store.clear(); store.set(cmX.SAVE_KEY, raw);
      let x = cmX.loadCareer();
      for (let i = 0; i < 160; i++) { const r = withSeed(seed * 5003 + i + 7, () => cmX.playNextEntry(x, QUICK)); x = r.state; if (x.sacked || r.kind === 'seasonOver') break; }
      const before = JSON.parse(JSON.stringify(x));
      const fin = x.sacked ? null : withSeed(seed * 31 + 9, () => cmX.finishSeason(x));
      return { before, fin };
    };
    const h = await play(headOut), b = await play(baseOut);
    n += 1;
    const d = firstDiff(maskState(h.before), maskState(b.before));
    if (!d) seasonEq += 1; else diffs.push(`${club} ${era ?? 'now'} seed ${seed} (saved at entry ${k}): ${d}`);
    if (h.fin && b.fin) {
      const m = f => { const c = canon(f); for (const sm of [c.summary, c.state?.pendingSummary]) { if (!sm) continue; delete sm.verdictGrade; delete sm.verdict; delete sm.fate; delete sm.offers; } for (const hr of c.state?.history ?? []) delete hr.fate; c.state = maskState(c.state); return c; };
      const fd = firstDiff(m(h.fin), m(b.fin));
      if (!fd) finEq += 1; else finDiffs.push(`${club} ${era ?? 'now'} seed ${seed}: ${fd}`);
      if (h.fin.summary.verdictGrade !== b.fin.summary.verdictGrade) gradeMoved += 1;
    } else if (!!h.fin !== !!b.fin) finDiffs.push(`${club} seed ${seed}: sacked on one tree only`);
  }
}
console.log(`[old saves] ${n} base saves (mid season) played on to the season end on both trees (${skipped} skipped: sacked or over before the save)`);
console.log(`[old saves] equal to the season end (suitor masked): ${seasonEq} of ${n}${diffs.length ? `; first ${diffs[0]}` : ''}`);
for (const x of diffs.slice(1, 4)) console.log(`  also ${x}`);
console.log(`[old saves] finishSeason equal but for grade, line, fate and offers: ${finEq}; differ ${finDiffs.length}${finDiffs.length ? `; first ${finDiffs[0]}` : ''}; grades that moved ${gradeMoved}`);
const red = diffs.length + finDiffs.length;
console.log(red ? `oldSaveCarry RED: ${red} runs differ beyond what the round promises` : 'oldSaveCarry GREEN');
process.exit(red ? 1 : 0);
