// Round 1303 scratch (never committed). The penalty rate fell (0.004902 to 0.003605 a foul) when the ledger's
// standard changed, and two halves the screen test plays lost their review. This finds new ones on the test's own
// Everton career: (A) a penalty a review gives, alone in its half, that is SAVED; (B) a penalty a review gives two
// clock places before the whistle with a real chance at the place after it and one at the whistle minus two.
//   node .rc/x/scanPen.mjs <match 0|1|2|3> [seeds] [from]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const work = fs.mkdtempSync(path.join(process.env.TEMP || os.tmpdir(), 'r1303-scanP-'));
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
let lit = 0;
const savedAlone = [], lateTwo = [];
for (let seed = FROM; seed < FROM + SEEDS; seed++) {
  const res = seeded(seed, () => cm.playNextEntry(pre, { varReviews: true }));
  if (res.kind !== 'halftime' || !res.state.live || res.state.live.varReviews !== true) continue;
  lit += 1;
  const live = res.state.live, feed = cm.liveFeed(live), whistle = 45 + (live.added?.h1 ?? 0);
  const reviews = feed.filter(e => e.kind === 'var' && e.review);
  const kickOf = v => [...(live.h1Play ?? []), ...(live.h2Play ?? [])].find(p => p.kind === 'shot' && p.review?.id === v.review.id);
  /* (A) the test's awardedAlone('saved') */
  const alone = v => {
    const own = e => v.review.decision === 'awarded' && e.minute === v.minute && e.side === v.side && e.text === v.text;
    return v.minute >= 4 && v.minute <= 38 && !v.plus
      && !feed.some(e => e !== v && isChance(e) && !own(e) && e.minute >= v.minute - 2 && e.minute <= v.minute + 2)
      && !reviews.some(o => o !== v && Math.abs(o.minute - v.minute) <= 3);
  };
  const a = reviews.find(v => { const kick = kickOf(v); return v.review.decision === 'awarded' && alone(v) && !!kick && !kick.goal && !!kick.on; });
  if (a) savedAlone.push({ seed, at: place(a), side: a.side });
  /* (B) the test's lateAwarded with the shape of row 4 */
  const shown = reviews.filter(v => place(v) >= 44), r = shown[0];
  if (shown.length === 1 && r.review.decision === 'awarded' && place(r) >= whistle - 2 && kickOf(r)?.goal) {
    const own = e => e.side === r.side && place(e) === place(r) && e.text === r.text;
    const real = feed.filter(e => isChance(e) && place(e) >= 44 && !own(e));
    const at = back => real.some(e => place(e) === whistle - back);
    if (place(r) === whistle - 2 && !at(0) && at(1) && at(2)) lateTwo.push({ seed, whistle, at: place(r), side: r.side, real: real.map(e => `${e.side} ${e.kind} at ${place(e)}`).join(', ') });
  }
}
console.log(`scanPen: match ${K + 1}, seeds ${FROM} to ${FROM + SEEDS - 1}: ${lit} first halves lit, ${Math.round((Date.now() - started) / 1000)} s`);
console.log(`scanPen: (A) saved and alone: ${savedAlone.length}: ${savedAlone.slice(0, 12).map(f => `${f.seed} (${f.side} at ${f.at})`).join(', ')}`);
console.log(`scanPen: (B) two places before the whistle, a real chance at its place and one after: ${lateTwo.length}: ${lateTwo.slice(0, 12).map(f => `${f.seed} (whistle ${f.whistle}, ${f.side} at ${f.at}; ${f.real})`).join(' | ')}`);
if (process.env.RC_OUT) fs.writeFileSync(path.join(process.env.RC_OUT, `scanPen-${K}.json`), JSON.stringify({ savedAlone, lateTwo }));
