/* Round 1146: a quick sim makes its subs, and the full time report shows them.

   The rule itself (the two keyed minutes, no weaker or settled, one change and
   one man kept back, the same match as the changes made by hand) is held over
   fleets by scripts/simCmQuickLegs.mjs. This file holds what a player sees:
   quick sim a match with a leggy eleven and a fresh bench, and the report he
   lands on lists the change the coach made after the break. And Manager Hot
   Seat, which plays without the coach, still gets none. */
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MatchReportCard } from '@/components/club-manager/MatchReportCard';
import { QUICK_LEGS_WINDOWS, playNextEntry, startCareer } from '@/lib/clubManager';
import type { CareerState, MatchWeekReport } from '@/lib/clubManager';

vi.mock('@/components/game/VictoryMoment', () => ({ default: () => null }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const seeded = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

/** A fresh career whose eleven has played a lot and whose bench has not, nobody hurt or banned. */
function leggyCareer(): CareerState {
  vi.spyOn(Math, 'random').mockImplementation(seeded(11460));
  const career = startCareer('Everton');
  const starting = new Set(career.xiIds.filter((id): id is string => !!id));
  /* 69 is one point above "spent at the break" (68), so nobody comes off there and the changes left are for legs */
  career.squad = career.squad.map(p => ({ ...p, fitness: starting.has(p.id) ? 69 : 100, morale: starting.has(p.id) ? 70 : 90, injuryWeeks: 0, suspendedMatches: 0 }));
  return career;
}

const lo = QUICK_LEGS_WINDOWS[0][0];
const hi = QUICK_LEGS_WINDOWS[QUICK_LEGS_WINDOWS.length - 1][1];

describe('Club Manager: a quick sim makes its subs (Round 1146)', () => {
  it('brings fresh legs on after the break, and the report the player lands on lists the change', () => {
    const pre = leggyCareer();
    let found: { report: MatchWeekReport; seed: number } | null = null;
    let withLegs = 0;
    const SEEDS = 8;
    for (let k = 0; k < SEEDS; k++) {
      vi.mocked(Math.random).mockImplementation(seeded(1146100 + k * 7919));
      const done = playNextEntry(pre, { skipHalftime: true });
      expect(done.kind).toBe('match');
      const subs = done.report!.detail!.subs;
      const hurt = new Set(done.report!.detail!.injuries.map(x => x.name));
      const legs = subs.filter(s => !hurt.has(s.off) && s.minute >= lo && s.minute <= hi);
      if (legs.length) { withLegs += 1; found ??= { report: done.report!, seed: k }; }
      /* never more than two for legs: the third change is kept for an injury */
      expect(subs.filter(s => !hurt.has(s.off)).length).toBeLessThanOrEqual(2);
    }
    /* A leggy eleven beside a fresh bench is exactly when he acts: measured, all 8 of these quick sims have a
       change for legs, so 6 leaves room for a fixture to drift and still fails a coach who has stopped. */
    expect(withLegs).toBeGreaterThanOrEqual(6);
    expect(found).not.toBeNull();
    const { container } = render(<MatchReportCard report={found!.report} clubName="Everton" onContinue={() => {}} />);
    const text = container.textContent ?? '';
    for (const s of found!.report.detail!.subs) {
      expect(text).toContain(`▲ ${s.on}`);
      expect(text).toContain(`▼ ${s.off}`);
    }
    /* and the timeline row of each */
    const rows = found!.report.detail!.timeline.filter(e => e.kind === 'sub' && e.side === 'me');
    expect(rows).toHaveLength(found!.report.detail!.subs.length);
  }, 120000);

  it('leaves a match played without the coach (Manager Hot Seat) with the eleven that kicked off', () => {
    const pre = leggyCareer();
    for (let k = 0; k < 4; k++) {
      vi.mocked(Math.random).mockImplementation(seeded(1146100 + k * 7919));
      const done = playNextEntry(pre, { skipHalftime: true, noCoach: true });
      expect(done.report!.detail!.subs).toEqual([]);
    }
  }, 120000);
});
