// Round 1303 fix scratch (never committed). The halves scripts/playCmVar.mjs walks, searched again on the engine
// as it is now (the goal lift) and asked the way the plain build asks: the goal kind alone. For each case of the
// walk's WANTED table: does its hint still hold, and the first seeds of a wide scan that do.
//   node .rc/x/scanWalk.mjs <match 0|1> [seeds] [from]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const work = fs.mkdtempSync(path.join(process.env.TEMP || os.tmpdir(), 'r1303-scanW-'));
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
const reviewsOf = feed => feed.filter(e => e.kind === 'var' && e.review).sort((a, b) => place(a) - place(b));
function alone(v, feed) {
  return v.minute >= 4 && v.minute <= 38 && !v.plus
    && !feed.some(e => e !== v && isChance(e) && e.minute >= v.minute - 2 && e.minute <= v.minute + 2)
    && !reviewsOf(feed).some(o => o !== v && Math.abs(o.minute - v.minute) <= 3);
}
function crowdedEnd(feed, live, shape) {
  const whistle = 45 + (live.added?.h1 ?? 0), late = reviewsOf(feed).filter(v => place(v) >= 44), r = late[0];
  if (late.length !== 1 || r.review.decision !== 'disallowed' || place(r) < whistle - 1) return null;
  return shape(r, whistle, feed.filter(e => isChance(e) && place(e) >= 44)) ? r : null;
}
function lateRuledOut(feed, live, back) {
  const all = reviewsOf(feed), whistle = 45 + (live.added?.h1 ?? 0), r = all[0];
  return all.length === 1 && r.review.decision === 'disallowed' && place(r) === whistle - back && !feed.some(e => isChance(e) && place(e) >= whistle - 3) ? r : null;
}
function besideOther(feed, kind) {
  const all = reviewsOf(feed), r = all[0];
  return all.length === 1 && r.minute >= 2 && r.minute <= 40 && !r.plus && feed.some(e => e.kind === kind && e.side !== r.side && place(e) === place(r)) ? r : null;
}
/* The walk's own table (scripts/playCmVar.mjs, WANTED), the cases a build with the goal kind alone can meet. */
const WANTED = {
  ruledOut: { match: 0, hint: 2460, want: feed => reviewsOf(feed).find(v => v.review.decision === 'disallowed' && v.side === 'me' && alone(v, feed)) },
  goalBefore: { match: 1, hint: 1724, want: feed => { const all = reviewsOf(feed); return all.length === 1 && all[0].review.decision === 'disallowed' && all[0].minute >= 4 && all[0].minute <= 40 && !all[0].plus && feed.some(e => e.kind === 'goal' && place(e) === place(all[0]) - 1) ? all[0] : null; } },
  two: { match: 0, hint: 2453, want: feed => { const all = reviewsOf(feed); return all.length === 2 && all.every(r => r.minute >= 4 && r.minute <= 40 && !r.plus) && all[1].minute - all[0].minute >= 4 ? all[0] : null; } },
  lateWhistle: { match: 1, hint: 1984, want: (feed, live) => lateRuledOut(feed, live, 0) },
  lateBefore: { match: 1, hint: 2591, want: (feed, live) => lateRuledOut(feed, live, 1) },
  ownGoal: { match: 1, hint: 1940, want: feed => { const all = reviewsOf(feed), r = all[0]; return all.length === 1 && r.review.decision === 'disallowed' && r.minute >= 4 && r.minute <= 38 && !r.plus && feed.some(e => e.kind === 'goal' && e.og && place(e) === place(r) + 1) ? r : null; } },
  injury: { match: 0, hint: 3861, want: feed => besideOther(feed, 'injury') },
  red: { match: 1, hint: 3827, want: feed => besideOther(feed, 'red') },
  crowdedGoal: { match: 1, hint: 42322, want: (feed, live) => crowdedEnd(feed, live, (r, whistle, real) => place(r) === whistle - 1 && real.some(e => e.kind === 'goal' && place(e) === whistle) && real.some(e => place(e) === whistle - 2)) },
  crowdedShot: { match: 1, hint: 6203, want: (feed, live) => crowdedEnd(feed, live, (r, whistle, real) => place(r) === whistle && !real.some(e => place(e) === whistle) && real.some(e => place(e) === whistle - 1)) },
};
let pre = seeded(4107, () => cm.startCareer('Everton'));
delete pre.realLeagueFixtures;
pre.squad = pre.squad.map(p => ({ ...p, fitness: 100, morale: 70, injuryWeeks: 0, suspendedMatches: 0 }));
for (let n = 0; n < K; n++) pre = seeded(5000 + n, () => cm.playNextEntry(pre, { skipHalftime: true, noCoach: true })).state;
const mine = Object.entries(WANTED).filter(([, spec]) => spec.match === K);
const halfOf = seed => {
  const stop = seeded(seed, () => cm.playNextEntry(pre, { varReviews: ['goal'] }));
  if (stop.kind !== 'halftime' || stop.state.live.varReviews !== true) return null;
  return { live: stop.state.live, feed: cm.liveFeed(stop.state.live) };
};
const found = Object.fromEntries(mine.map(([kind]) => [kind, []]));
const hintHolds = {};
for (const [kind, spec] of mine) { const h = halfOf(spec.hint); hintHolds[kind] = !!(h && spec.want(h.feed, h.live)); }
const started = Date.now();
let lit = 0, penalty = 0;
for (let seed = FROM; seed < FROM + SEEDS; seed++) {
  const h = halfOf(seed);
  if (!h) continue;
  lit += 1;
  if (reviewsOf(h.feed).some(v => v.review.incident === 'penalty')) penalty += 1;
  for (const [kind, spec] of mine) {
    if (found[kind].length >= 6) continue;
    const r = spec.want(h.feed, h.live);
    if (r) found[kind].push(`${seed} (${r.side} ${r.minute}${r.plus ? `+${r.plus}` : ''}')`);
  }
}
console.log(`scanWalk: match ${K + 1}, the goal kind alone, seeds ${FROM} to ${FROM + SEEDS - 1}: ${lit} first halves lit, ${penalty} with a penalty review (must be 0), ${Math.round((Date.now() - started) / 1000)} s`);
for (const [kind, spec] of mine) console.log(`scanWalk: ${kind}: hint ${spec.hint} ${hintHolds[kind] ? 'HOLDS' : 'is STALE'}; first seeds that hold it: ${found[kind].join(', ') || 'none'}`);
if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, `scanWalk-${K}.json`), JSON.stringify({ hintHolds, found }));
