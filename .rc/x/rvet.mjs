// Reviewer probe (Round 1331 review). Runner only. From a tree root: node <this file> <label>
// My side at the break before extra time under five in three: a 2026-27 Arsenal knockout second leg (the walk of
// c00694b8's extratime section), one change at half time and three in play at 60, 70 and 80, then, on the nights
// that go to extra time, a change at the break (minute 90, after extra time is drawn) and one at 95.
// The rule: the break is free, so 90 is taken; 95 needs a fourth stoppage, so it is refused.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const ROOT = process.cwd();
const label = process.argv[2] ?? 'tree';
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'rvet-'));
const entry = path.join(work, 'entry.ts');
fs.writeFileSync(entry, "export * as cm from '@/lib/clubManager';\n");
await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: path.join(work, 'engine.cjs'), logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')] });
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k), clear: () => memory.clear() };
const { cm } = createRequire(import.meta.url)(path.join(work, 'engine.cjs'));
function withSeed(seed, fn) {
  const previous = Math.random, previousNow = Date.now;
  Date.now = () => 1791302400000;
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = previous; Date.now = previousNow; }
}
const pair = (st, m) => {
  const live = st.live, gone = cm.liveGoneIds(live, m), on = new Set((live.subs ?? []).map(x => x.onId));
  const reds = new Set([...(live.h1Cards ?? []), ...(live.h2Cards ?? [])].filter(c => c.kind === 'red' && c.minute <= m).map(c => c.id));
  const out = live.onPitch.find(id => !gone.has(id) && !reds.has(id) && st.squad.find(p => p.id === id)?.position !== 'GK' && !on.has(id));
  const inn = cm.benchFor(st).find(p => !gone.has(p.id) && p.position !== 'GK');
  return out && inn ? { kind: 'sub', outId: out, inId: inn.id } : null;
};
let pre = withSeed(4107, () => cm.startCareer('Arsenal'));
for (let step = 1; step < 90; step++) {
  const next = pre.calendar[pre.week];
  if (!next || (next.type === 'uclKo' && (next.uclLeg === 2 || !next.uclLeg))) break;
  pre = withSeed(4107 * 31 + step, () => cm.playNextEntry(pre, { skipHalftime: true, noCoach: true })).state;
}
console.log(`walked to ${pre.calendar[pre.week]?.type} leg ${pre.calendar[pre.week]?.uclLeg}; rule ${JSON.stringify(cm.matchRuleOf(pre))}`);
let nights = 0, setUp = 0, breakTaken = 0, breakRefused = 0, ninety5Refused = 0, ninety5Taken = 0;
for (let k = 0; k < 1200 && nights < 60; k++) {
  const seed = 2600 + k;
  const ht = withSeed(seed, () => cm.playNextEntry(pre));
  if (ht.kind !== 'halftime' || !ht.state.live) continue;
  let s = cm.changeLive(ht.state, 46, pair(ht.state, 46) ?? { kind: 'shape', mentality: 'balanced' });
  if (!s) continue;
  s = withSeed(seed + 500000, () => cm.startSecondHalf(s));
  for (const m of [60, 70, 80]) { const p = s && pair(s, m); s = p ? withSeed(seed + m, () => cm.changeLive(s, m, p)) : null; }
  if (!s || s.live.subsUsed !== 4 || cm.stopsUsed(s.live) !== 3) continue;
  setUp += 1;
  const et = withSeed(seed + 900000, () => cm.startExtraTime(s));
  if (!et?.live?.et) continue;
  nights += 1;
  const p90 = pair(et, 90);
  const at90 = p90 ? withSeed(seed + 90, () => cm.changeLive(et, 90, p90)) : null;
  if (at90) breakTaken += 1; else breakRefused += 1;
  const p95 = pair(et, 95);
  const at95 = p95 ? withSeed(seed + 95, () => cm.changeLive(et, 95, p95)) : null;
  if (at95) ninety5Taken += 1; else ninety5Refused += 1;
}
console.log(`RVET ${label}: ${setUp} nights set up (one at the break, three stoppages used), ${nights} went to extra time; change at the extra time break taken ${breakTaken}, refused ${breakRefused}; change at 95 taken ${ninety5Taken}, refused ${ninety5Refused}`);
