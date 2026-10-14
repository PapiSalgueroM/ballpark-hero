// Round 1331, runner only (never committed): does the substitution rule suppress reviews, or only move the stream?
// Counts, over the same seeds clubManagerVarScreen searches, the reviews by decision in (a) the first half of the
// Everton career's league match 2 and (b) the extra time of the Arsenal career's first knockout second leg, once on
// the current rules and once on the base match rules. Prints the counts; asserts only that it ran.
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { startCareer, playNextEntry, liveFeed, startSecondHalf, startExtraTime } from '@/lib/clubManager';
import type { CareerState, LiveFeedEvent } from '@/lib/clubManager';

const FIXED_NOW = 1791547200000;
const realRandom = Math.random;
function seeded<T>(seed: number, fn: () => T): T {
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = realRandom; }
}
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(FIXED_NOW)); });
afterEach(() => { vi.useRealTimers(); Math.random = realRandom; });

const SEEDS = Array.from({ length: Number(process.env.PROBE_SEEDS ?? 2500) }, (_, i) => 1700 + i);
const reviews = (feed: LiveFeedEvent[]) => feed.filter(e => e.kind === 'var' && e.review);

function everton(base: boolean): CareerState {
  const first = seeded(4107, () => startCareer('Everton'));
  delete (first as { realLeagueFixtures?: unknown }).realLeagueFixtures;
  if (base) first.matchRules = 'base';
  first.squad = first.squad.map(p => ({ ...p, fitness: 100, morale: 70, injuryWeeks: 0, suspendedMatches: 0 }));
  return seeded(5000, () => playNextEntry(first, { skipHalftime: true, noCoach: true })).state;
}
function arsenal(base: boolean): CareerState {
  let pre = seeded(4107, () => startCareer('Arsenal'));
  if (base) pre.matchRules = 'base';
  for (let step = 1; step < 90; step++) {
    const next = pre.calendar[pre.week];
    if (!next) break;
    if (next.type === 'uclKo' && (next.uclLeg === 2 || !next.uclLeg)) break;
    pre = seeded(4107 * 31 + step, () => playNextEntry(pre, { skipHalftime: true, noCoach: true })).state;
  }
  return pre;
}

it('counts reviews by decision on both rules', () => {
  for (const base of [false, true]) {
    const tag = base ? 'base rules' : 'current rules';
    const pre = everton(base);
    let halves = 0, late = 0; const dec: Record<string, number> = {};
    for (const seed of SEEDS) {
      const res = seeded(seed, () => playNextEntry(pre, { varReviews: true }));
      if (res.kind !== 'halftime' || !res.state.live) continue;
      halves++;
      for (const v of reviews(liveFeed(res.state.live))) {
        dec[v.review!.decision] = (dec[v.review!.decision] ?? 0) + 1;
        if (v.minute + (v.plus ?? 0) >= 44) late++;
      }
    }
    console.info(`probeVarRule FIRST HALF match 2, ${tag}: halves ${halves}, reviews ${JSON.stringify(dec)}, at 44 or later ${late}, opponent week ${pre.week}`);
    const ko = arsenal(base);
    let nights = 0; const et: Record<string, number> = {};
    for (const seed of SEEDS) {
      const stop = seeded(seed, () => playNextEntry(ko, { varReviews: true }));
      if (stop.kind !== 'halftime' || !stop.state.live) continue;
      const on = seeded(seed + 500000, () => startSecondHalf(stop.state));
      const extra = on ? seeded(seed + 900000, () => startExtraTime(on)) : null;
      if (!extra?.live) continue;
      nights++;
      for (const v of reviews(liveFeed(extra.live).filter(e => e.minute > 90))) et[v.review!.decision] = (et[v.review!.decision] ?? 0) + 1;
    }
    console.info(`probeVarRule EXTRA TIME, ${tag}: knockout week ${ko.week}, nights to extra time ${nights}, reviews ${JSON.stringify(et)}`);
  }
  expect(SEEDS.length).toBeGreaterThan(0);
}, 3_600_000);
