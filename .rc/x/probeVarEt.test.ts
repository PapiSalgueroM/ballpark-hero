// Round 1331, runner only (never committed): why the extra time of one knockout night holds 1 awarded penalty review
// in 2,500 seeds on the current rules and 13 on the base rules (r1331-vt2). Prints, per rule, the extra time feed's
// kinds by side, the awarded reviews by (side, minute, who) with their counts, and the subs made in extra time.
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { startCareer, playNextEntry, liveFeed, startSecondHalf, startExtraTime } from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';

const FIXED_NOW = 1791547200000;
const realRandom = Math.random;
function seeded<T>(seed: number, fn: () => T): T {
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = realRandom; }
}
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(FIXED_NOW)); });
afterEach(() => { vi.useRealTimers(); Math.random = realRandom; });

const N = Number(process.env.PROBE_SEEDS ?? 2500);
const SEEDS = Array.from({ length: N }, (_, i) => 1700 + i);
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
const top = (m: Map<string, number>, n = 8) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k} x${v}`).join('; ');

it('extra time of the knockout night on both rules', () => {
  for (const base of [false, true]) {
    const tag = base ? 'base' : 'current';
    const ko = arsenal(base);
    const fx = ko.calendar[ko.week];
    let nights = 0, oppEtSubs = 0, oppSubsAll = 0, decided = 0;
    const kinds = new Map<string, number>(), awarded = new Map<string, number>(), fouls = new Map<string, number>();
    for (const seed of SEEDS) {
      const stop = seeded(seed, () => playNextEntry(ko, { varReviews: true }));
      if (stop.kind !== 'halftime' || !stop.state.live) continue;
      const on = seeded(seed + 500000, () => startSecondHalf(stop.state));
      const extra = on ? seeded(seed + 900000, () => startExtraTime(on)) : null;
      if (!extra?.live) { if (on) decided++; continue; }
      nights++;
      const subs = extra.live.oppSubs ?? [];
      oppSubsAll += subs.length; oppEtSubs += subs.filter(s => s.minute > 90).length;
      for (const e of liveFeed(extra.live).filter(x => x.minute > 90)) {
        kinds.set(`${e.kind}:${e.side}`, (kinds.get(`${e.kind}:${e.side}`) ?? 0) + 1);
        if (e.kind === 'foul') fouls.set(`${e.side}:${e.text}`, (fouls.get(`${e.side}:${e.text}`) ?? 0) + 1);
        if (e.kind === 'var' && e.review?.decision === 'awarded') {
          const k = `${e.side}:${e.minute}${e.plus ? '+' + e.plus : ''}:${e.review.trigger?.who ?? '?'}`;
          awarded.set(k, (awarded.get(k) ?? 0) + 1);
        }
      }
    }
    console.info(`probeVarEt ${tag}: tie ${fx?.opponent} leg ${fx?.uclLeg}, week ${ko.week}, nights ${nights}, decided in 90 ${decided}, opp subs a night ${(oppSubsAll / Math.max(1, nights)).toFixed(2)}, of them in extra time ${(oppEtSubs / Math.max(1, nights)).toFixed(2)}`);
    console.info(`probeVarEt ${tag} kinds: ${top(kinds, 30)}`);
    console.info(`probeVarEt ${tag} awarded: ${top(awarded, 20) || 'none'}`);
    console.info(`probeVarEt ${tag} fouls (top): ${top(fouls, 10)}`);
  }
  expect(N).toBeGreaterThan(0);
}, 3_600_000);
