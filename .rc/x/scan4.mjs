// Round 1302 scratch (never committed): does the engine hold a review in extra time on the shipped rates?
// Only a Champions League knockout tie plays extra time. Sent to a runner: node .rc/x/scan4.mjs [seeds]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const work = fs.mkdtempSync(path.join(process.env.TEMP || os.tmpdir(), 'r1302-scan4-'));
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
const SEEDS = Number(process.argv[2] || 2500);
const place = e => e.minute + (e.plus ?? 0);
const at = e => `${e.minute}${e.plus ? '+' + e.plus : ''}'`;
for (const [club, start] of [['Arsenal', 4107], ['Real Madrid', 4108], ['Bayern Munich', 4109]]) {
  let state;
  try { state = seeded(start, () => cm.startCareer(club)); } catch (error) { console.log(`${club}: no career (${String(error.message).slice(0, 80)})`); continue; }
  let steps = 0, found = null;
  /* Walk on until the next entry is a knockout night that can go to extra time: a second leg, or a one legged tie. */
  while (steps++ < 90) {
    const e = state.calendar[state.week];
    if (!e) break;
    if (e.type === 'uclKo' && (e.uclLeg === 2 || !e.uclLeg)) { found = e; break; }
    const r = seeded(start * 31 + steps, () => cm.playNextEntry(state, { skipHalftime: true, noCoach: true }));
    if (r.kind === 'seasonOver' || !r.state || r.state.sacked) break;
    state = r.state;
  }
  if (!found) { console.log(`${club}: reached no knockout second leg in ${steps} entries (week ${state.week}, next ${state.calendar[state.week]?.type ?? 'none'})`); continue; }
  console.log(`${club}: start seed ${start}, ${steps - 1} entries played with seeds ${start * 31 + 1} on, next is uclKo ${found.uclRound} leg ${found.uclLeg ?? 'single'} at week ${state.week}`);
  let lit = 0, extra = 0, withReview = 0;
  const first = [];
  for (let seed = 1700; seed < 1700 + SEEDS; seed++) {
    const stop = seeded(seed, () => cm.playNextEntry(state, { varReviews: true }));
    if (stop.kind !== 'halftime' || stop.state.live?.varReviews !== true) continue;
    lit += 1;
    const second = seeded(seed + 500000, () => cm.startSecondHalf(stop.state));
    if (!second?.live) continue;
    const et = seeded(seed + 900000, () => cm.startExtraTime(second));
    if (!et?.live) continue;
    extra += 1;
    const feed = cm.liveFeed(et.live).filter(e => e.minute > 90);
    const vars = feed.filter(e => e.kind === 'var' && e.review);
    if (!vars.length) continue;
    withReview += 1;
    if (first.length < 6) first.push(`seed ${seed}: ${vars.map(v => `${v.review.decision} ${v.side} ${at(v)} ${v.text}`).join(' + ')}, extra time to ${et.live.et?.to ?? '?'}, lines ${feed.length}, chances near ${feed.filter(e => (e.kind === 'goal' || e.kind === 'shot' || e.kind === 'save') && Math.abs(place(e) - place(vars[0])) <= 2).length}`);
  }
  console.log(`${club}: ${lit} of ${SEEDS} kickoffs lit, ${extra} went to extra time, ${withReview} of those hold a review after 90`);
  for (const line of first) console.log(`  ${line}`);
}
console.log('scan4: done.');
