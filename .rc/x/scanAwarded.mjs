// Round 1302 fix 2 scratch (never committed): which first halves of the screen test's own Everton career hold a
// penalty a review GIVES in the last clock places, with real chances beside it? Sent to a runner:
//   node .rc/x/scanAwarded.mjs <match 0|1|2> [seeds] [from]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const work = fs.mkdtempSync(path.join(process.env.TEMP || os.tmpdir(), 'r1302-scanA-'));
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
/* The test's own career: src/test/clubManagerVarScreen.test.tsx, entry(k). */
let pre = seeded(4107, () => cm.startCareer('Everton'));
delete pre.realLeagueFixtures;
pre.squad = pre.squad.map(p => ({ ...p, fitness: 100, morale: 70, injuryWeeks: 0, suspendedMatches: 0 }));
for (let n = 0; n < K; n++) pre = seeded(5000 + n, () => cm.playNextEntry(pre, { skipHalftime: true, noCoach: true })).state;
const started = Date.now();
let lit = 0, awardedAny = 0;
const found = [];
for (let seed = FROM; seed < FROM + SEEDS; seed++) {
  const res = seeded(seed, () => cm.playNextEntry(pre, { varReviews: true }));
  if (res.kind !== 'halftime' || !res.state.live || res.state.live.varReviews !== true) continue;
  lit += 1;
  const live = res.state.live, feed = cm.liveFeed(live), whistle = 45 + (live.added?.h1 ?? 0);
  const reviews = feed.filter(e => e.kind === 'var' && e.review && e.minute <= 45);
  if (reviews.some(r => r.review.decision === 'awarded')) awardedAny += 1;
  const late = reviews.filter(r => place(r) >= 44);
  if (late.length !== 1) continue;
  const r = late[0];
  if (r.review.decision !== 'awarded' || place(r) < whistle - 2) continue;
  const kick = [...(live.h1Play ?? [])].find(p => p.kind === 'shot' && p.review?.id === r.review.id);
  const own = e => e.side === r.side && place(e) === place(r) && e.text === r.text;
  const real = feed.filter(e => isChance(e) && e.minute <= 45 && place(e) >= whistle - 3 && !own(e));
  const back = b => real.some(e => place(e) === whistle - b);
  found.push({ seed, whistle, at: place(r), side: r.side, kick: !kick ? 'none' : kick.goal ? 'scored' : kick.on ? 'saved' : 'missed',
    real: real.map(e => `${e.side} ${e.kind}${e.penalty ? '(P)' : ''} at ${place(e)}`).join(', ') || 'none',
    tight: (back(0) ? 4 : 0) + (back(1) ? 2 : 0) + (back(2) ? 1 : 0), others: reviews.length - 1 });
}
console.log(`scanAwarded: match ${K + 1}, seeds ${FROM} to ${FROM + SEEDS - 1}: ${lit} first halves lit, ${awardedAny} with a penalty given by a review, ${found.length} with one in the last three clock places (and no other review from 44 on), ${Math.round((Date.now() - started) / 1000)} s`);
found.sort((a, b) => b.tight - a.tight || a.seed - b.seed);
for (const f of found.slice(0, 40)) console.log(`  seed ${f.seed}: whistle ${f.whistle}, review at ${f.at} (${f.side}), kick ${f.kick}, real chances from ${f.whistle - 3} on: ${f.real}; other reviews in the half ${f.others}`);
if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, `scanAwarded-${K}.json`), JSON.stringify(found));
