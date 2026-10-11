// Round 1303 fix scratch (never committed). The goal lift moved a few halves the screen test stands on. This finds
// a first half on the test's own Everton career that holds ONE review, a goal ruled out or a penalty given, between
// 2 and 40 with no plus, in the same clock place as the OTHER side's injury, and no real chance at that place when
// the review rules a goal out (the test's row: injury, shared false).
//   node .rc/x/scanInj.mjs <match 0..> [seeds] [from]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const work = fs.mkdtempSync(path.join(process.env.TEMP || os.tmpdir(), 'r1303-scanI-'));
const bundle = path.join(work, 'engine.mjs');
await build({ entryPoints: [path.join(ROOT, 'src/lib/clubManager.ts')], bundle: true, platform: 'node', format: 'esm', outfile: bundle, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error' });
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k) };
const cm = await import(pathToFileURL(bundle).href);
function seeded(seed, fn) {
  const previous = Math.random, previousNow = Date.now;
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  Date.now = () => 1791547200000;
  try { return fn(); } finally { Math.random = previous; Date.now = previousNow; }
}
const K = Number(process.argv[2] || 0), SEEDS = Number(process.argv[3] || 5000), FROM = Number(process.argv[4] || 1700);
const place = e => e.minute + (e.plus ?? 0);
const isChance = e => e.kind === 'goal' || e.kind === 'shot' || e.kind === 'save';
let pre = seeded(4107, () => cm.startCareer('Everton'));
delete pre.realLeagueFixtures;
pre.squad = pre.squad.map(p => ({ ...p, fitness: 100, morale: 70, injuryWeeks: 0, suspendedMatches: 0 }));
for (let n = 0; n < K; n++) pre = seeded(5000 + n, () => cm.playNextEntry(pre, { skipHalftime: true, noCoach: true })).state;
const started = Date.now();
let lit = 0;
const found = { injury: { false: [], true: [] }, red: { false: [], true: [] } };
for (let seed = FROM; seed < FROM + SEEDS; seed++) {
  const res = seeded(seed, () => cm.playNextEntry(pre, { varReviews: true }));
  if (res.kind !== 'halftime' || !res.state.live || res.state.live.varReviews !== true) continue;
  lit += 1;
  const feed = cm.liveFeed(res.state.live);
  const all = feed.filter(e => e.kind === 'var' && e.review), r = all[0];
  if (all.length !== 1 || r.minute < 2 || r.minute > 40 || r.plus) continue;
  for (const what of ['injury', 'red']) {
    if (!feed.some(e => e.kind === what && e.side !== r.side && place(e) === place(r))) continue;
    const shared = r.review.decision === 'disallowed' && feed.some(e => isChance(e) && place(e) === place(r));
    found[what][String(shared)].push({ seed, at: place(r), side: r.side, decision: r.review.decision });
  }
}
console.log(`scanInj: match ${K + 1}, seeds ${FROM} to ${FROM + SEEDS - 1}: ${lit} first halves lit, ${Math.round((Date.now() - started) / 1000)} s`);
for (const what of ['injury', 'red']) for (const shared of ['false', 'true']) {
  const list = found[what][shared];
  console.log(`scanInj: match ${K + 1} ${what}, a chance at the same place ${shared}: ${list.length}: ${list.slice(0, 10).map(f => `${f.seed} (${f.side} ${f.decision} at ${f.at})`).join(', ')}`);
}
if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, `scanInj-${K}.json`), JSON.stringify(found));
