// Reviewer probe (Round 1331 review): old saves. Runner only. From the head's tree root:
//   node <this file> <base tree root>
// Saves written by the BASE engine's own saveCareer (careers played part way, a live match paused at the break,
// one paused mid second half) are loaded by the base's loadCareer and the head's; the two loads must be the same
// JSON. Then each load plays on with the same seeds: the three change worlds must stay byte identical. And a
// 2026-27 match paused by the base with three changes made resumes on the head: what it may still do is printed.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const HEAD = process.cwd();
const BASE = path.resolve(process.argv[2]);
const KEY = 'dukb-club-manager-save';
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k), clear: () => memory.clear(), key: i => [...memory.keys()][i] ?? null, get length() { return memory.size; } };
async function bundle(root, name) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), `rvsaves-${name}-`));
  const entry = path.join(work, 'entry.ts');
  fs.writeFileSync(entry, "export * as cm from '@/lib/clubManager';\n");
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: path.join(work, 'e.cjs'), logLevel: 'silent', alias: { '@': path.join(root, 'src') }, nodePaths: [path.join(HEAD, 'node_modules')] });
  const { cm } = createRequire(import.meta.url)(path.join(work, 'e.cjs'));
  if (cm.ensureAllEraRosters) await cm.ensureAllEraRosters();
  OUTS.set(cm, path.join(work, 'e.cjs'));
  return cm;
}
/* A fresh module instance of a bundle, so no module level counter or cache carries from an earlier career. */
const OUTS = new WeakMap();
let freshN = 0;
async function fresh(cm) {
  const src = OUTS.get(cm), copy = src.replace(/\.cjs$/, `-f${++freshN}.cjs`);
  fs.copyFileSync(src, copy);
  const { cm: f } = createRequire(import.meta.url)(copy);
  if (f.ensureAllEraRosters) await f.ensureAllEraRosters();
  OUTS.set(f, src);
  return f;
}
const base = await bundle(BASE, 'base');
const head = process.env.RV_BASE_TWICE ? await bundle(BASE, 'base2') : await bundle(HEAD, 'head');
function withSeed(seed, fn) {
  const previous = Math.random, previousNow = Date.now;
  Date.now = () => 1791302400000;
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = previous; Date.now = previousNow; }
}
const h = x => createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 12);
function loadWith(cm, raw) { memory.clear(); memory.set(KEY, raw); return withSeed(1, () => cm.loadCareer()); }
function play(cm, s, seed, n) {
  for (let i = 0; i < n; i++) {
    const r = withSeed(seed + i, () => cm.playNextEntry(s, { skipHalftime: true }));
    if (r.kind === 'seasonOver') { s = withSeed(seed + 500 + i, () => cm.startNextSeason ? cm.startNextSeason(r.state) : r.state); continue; }
    s = r.state;
  }
  return s;
}
const CASES = [['Liverpool', null, 3], ['Barcelona', null, 9], ['Everton', 'era2005', 7], ['Real Madrid', 'era2015', 11], ['Barcelona', 'era2020', 5], ['Arsenal', 'era2020', 13], ['Westerlo', null, 6]];
let loadDiff = 0, threeDiff = 0, allDiff = 0, rows = 0;
for (const [club, era, played] of CASES) for (const seed of [1, 2]) {
  memory.clear();
  let s = withSeed(seed * 97, () => (era ? base.startCareer(club, era) : base.startCareer(club)));
  s = play(base, s, seed * 1000, played);
  memory.clear();
  withSeed(5, () => base.saveCareer(s));
  const raw = memory.get(KEY);
  if (!raw) { console.log(`no save written for ${club} ${era}`); continue; }
  const lb = loadWith(base, raw), lh = loadWith(head, raw);
  rows += 1;
  const same = JSON.stringify(lb) === JSON.stringify(lh);
  if (!same) loadDiff += 1;
  const three = era === 'era2005' || era === 'era2015';
  let onSame = null;
  if (lb && lh) {
    const fb = await fresh(base), fh = await fresh(head);
    const pb = play(fb, loadWith(fb, raw), seed * 3000, 12), ph = play(fh, loadWith(fh, raw), seed * 3000, 12);
    onSame = h(pb) === h(ph);
    if (three && !onSame) threeDiff += 1;
    if (!onSame) allDiff += 1;
    console.log(`${club} ${era ?? '2026'} seed ${seed}: load ${same ? 'same' : 'DIFFERS'}; head rule ${head.matchRuleOf ? JSON.stringify(head.matchRuleOf(lh)) : "n/a"}; 12 more entries ${onSame ? 'byte identical' : 'differ'}${three ? ' (three change world)' : ''}`);
  } else console.log(`${club} ${era}: a loader returned null (base ${!!lb}, head ${!!lh})`);
}
console.log(`RVSAVES loads: ${rows} saves, ${loadDiff} differ; three change worlds playing on: ${threeDiff} differ; all playing on: ${allDiff} differ`);

if (process.env.RV_BASE_TWICE) process.exit(0);
// A 2026-27 match paused by the base build with one change at the break and two in play.
memory.clear();
let s = withSeed(77, () => base.startCareer('Liverpool'));
let ht = null;
for (let i = 0; i < 12 && !ht; i++) { const r = withSeed(700 + i, () => base.playNextEntry(s)); if (r.kind === 'halftime') ht = r.state; else s = r.state; }
const pair = (cm, st, m) => {
  const live = st.live, gone = cm.liveGoneIds(live, m), on = new Set((live.subs ?? []).map(x => x.onId));
  const out = live.onPitch.find(id => !gone.has(id) && st.squad.find(p => p.id === id)?.position !== 'GK' && !on.has(id));
  const inn = cm.benchFor(st).find(p => !gone.has(p.id) && p.position !== 'GK');
  return out && inn ? { kind: 'sub', outId: out, inId: inn.id } : null;
};
let b = base.changeLive(ht, 46, pair(base, ht, 46));
b = withSeed(4601, () => base.startSecondHalf(b));
for (const m of [60, 70]) b = base.changeLive(b, m, pair(base, b, m));
b.live.minute = 72;
memory.clear(); withSeed(5, () => base.saveCareer(b));
const lh = loadWith(head, memory.get(KEY));
const out = { subsUsed: lh?.live?.subsUsed, subsLeft: head.subsLeftOf(lh), stopsLeft: head.stopsLeftOf(lh), stopsUsed: head.stopsUsed(lh.live) };
let c = lh, taken = [];
for (const m of [75, 80, 85]) { const n = head.changeLive(c, m, pair(head, c, m)); taken.push(`${m}:${n ? 'taken' : 'refused'}`); if (n) c = n; }
console.log(`RVSAVES paused base match on the head: ${JSON.stringify(out)}; changes after load ${taken.join(' ')}; in-play minutes now ${JSON.stringify((c.live.subs ?? []).filter(x => x.minute !== 46).map(x => x.minute))}`);
