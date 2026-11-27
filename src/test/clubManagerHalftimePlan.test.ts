import { afterEach, expect, it, vi } from 'vitest';
import {
  changeLive, coachQuickMatch, halftimePlanCall, playNextEntry, resumeMatch,
  setHalftimePlan, startCareer, startSecondHalf,
  type CareerState,
} from '@/lib/clubManager';
import { timelineRows } from '@/lib/clubManagerMatchCentre';

function seed(n: number) {
  vi.spyOn(Math, 'random').mockImplementation(() => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  });
}
afterEach(() => vi.restoreAllMocks());

function kickoff(c: CareerState) {
  let next = playNextEntry(c);
  while (!next.live && next.kind === 'window') next = playNextEntry(next.state);
  expect(next.kind).toBe('halftime');
  return next.state;
}

it('plays the same first half, trades chances at the restart and records the actual trigger', () => {
  seed(151);
  const c = startCareer('Brentford');
  const armed = setHalftimePlan(c, 'both')!;
  const counts = { attacking: 0, defensive: 0, idle: 0 };
  for (let n = 1; n <= 35; n++) {
    seed(n);
    const normal = kickoff(c);
    seed(n);
    const chosen = kickoff(armed);
    expect(chosen.live).toEqual(normal.live);
    const gap = chosen.live!.myGoals - chosen.live!.oppGoals;
    seed(n * 911);
    const plain = startSecondHalf(normal)!.live!;
    seed(n * 911);
    const restarted = startSecondHalf(JSON.parse(JSON.stringify(chosen)))!;
    const live = restarted.live!;
    expect(restarted.mentality).toBe(c.mentality);
    expect(live.h1My).toEqual(plain.h1My);
    expect(live.h1Opp).toEqual(plain.h1Opp);
    expect(live.subs).toEqual(plain.subs);
    if (gap !== 1 && gap >= 0) {
      counts.idle++;
      expect(live).toEqual(plain);
      continue;
    }
    const attack = gap < 0;
    const stance = attack ? 'attacking' : 'defensive';
    counts[stance]++;
    expect(live.halftimePlanCall).toMatchObject({ mentality: stance, mine: live.myGoals, theirs: live.oppGoals });
    expect(live.mentality).toBe(stance);
    const sign = attack ? 1 : -1;
    expect(sign * (live.lam2Mine! - plain.lam2Mine!)).toBeGreaterThan(0);
    expect(sign * (live.lam2Opp! - plain.lam2Opp!)).toBeGreaterThan(0);
    expect(startSecondHalf(restarted)!.live).toEqual(live);
    const resolved = resumeMatch(restarted);
    const row = timelineRows(resolved.report!.detail!, 'key').filter(r => r.kind === 'halftime-plan');
    expect(row).toHaveLength(1);
    expect(row[0]).toMatchObject({ clock: "46'", side: 'me' });
    expect(row[0].label).toContain(`${live.myGoals}-${live.oppGoals}`);
    expect(resolved.state.halftimePlan).toBe('both');
    const coached = coachQuickMatch(chosen).live!;
    // The quick coach can replace an injured player before the interval, changing the score it actually sees.
    const coachedGap = coached.myGoals - coached.oppGoals;
    if (coachedGap === 1 || coachedGap < 0) {
      expect(coached.halftimePlanCall).toEqual({
        mentality: coachedGap < 0 ? 'attacking' : 'defensive', mine: coached.myGoals, theirs: coached.oppGoals,
      });
    } else expect(coached.halftimePlanCall).toBeUndefined();
  }
  expect(counts.attacking).toBeGreaterThan(3);
  expect(counts.defensive).toBeGreaterThan(3);
  expect(counts.idle).toBeGreaterThan(3);
});

it('respects a manual dressing-room call and an off or unrecognized plan', () => {
  seed(20);
  const c = startCareer('Brentford');
  let matched: CareerState | undefined;
  for (let n = 1; n < 45 && !matched; n++) {
    seed(n);
    const next = kickoff(setHalftimePlan(c, 'chase')!);
    if (next.live!.myGoals < next.live!.oppGoals) matched = next;
  }
  expect(matched).toBeDefined();
  const live = matched!.live!;
  expect(halftimePlanCall(matched!, live)?.mentality).toBe('attacking');
  const manual = changeLive(matched!, 46, { kind: 'shape', mentality: 'balanced' })!;
  expect(halftimePlanCall(manual, manual.live!)).toBeNull();
  expect(startSecondHalf(manual)!.live!.halftimePlanCall).toBeUndefined();
  expect(setHalftimePlan(matched!, 'protect')).toBeNull();
  expect(setHalftimePlan(setHalftimePlan(c, 'both')!, 'off')).toEqual(c);
  expect(halftimePlanCall({ ...matched!, halftimePlan: 'future' as never }, live)).toBeNull();
  expect(halftimePlanCall({ ...matched!, halftimePlan: 'protect' }, live)).toBeNull();
});

it('checks the tie score in a return leg, including when the team is leading on the night', () => {
  seed(305);
  const c = kickoff(setHalftimePlan(startCareer('Brentford'), 'both')!);
  const live = { ...c.live!, myGoals: 1, oppGoals: 0 };
  c.calendar[live.week] = { type: 'uclKo', round: 0, uclRound: 'QF', uclLeg: 2 };
  c.uclBracket = [{ round: 'QF', slot: 0, home: c.clubName, away: live.opponent, mine: true,
    winner: null, homeGoals: null, awayGoals: null, leg1: { homeGoals: 0, awayGoals: 2 } }];
  expect(halftimePlanCall(c, live)).toEqual({ mentality: 'attacking', mine: 1, theirs: 2, aggregate: true });
  c.uclBracket[0].leg1 = { homeGoals: 0, awayGoals: 1 };
  expect(halftimePlanCall(c, live)).toBeNull();
  delete c.uclBracket[0].leg1;
  expect(halftimePlanCall(c, live)).toBeNull();
});

it('keeps the plan for later fixtures and can turn it off before the next quick match', () => {
  seed(472);
  let state = setHalftimePlan(startCareer('Brentford'), 'both')!;
  let matches = 0;
  const triggers = new Set<string>();
  while (matches < 10 && state.week < state.calendar.length) {
    const result = playNextEntry(state, { skipHalftime: true });
    state = JSON.parse(JSON.stringify(result.state));
    expect(state.halftimePlan).toBe('both');
    if (result.kind !== 'match') continue;
    matches++;
    for (const row of result.report!.detail!.timeline) if (row.kind === 'halftime-plan') triggers.add(row.text);
    expect(state.mentality).toBe('balanced');
  }
  expect(matches).toBe(10);
  expect(triggers.size).toBeGreaterThan(1);
  state = setHalftimePlan(state, 'off')!;
  for (let n = 0; n < 3; n++) {
    const result = playNextEntry(state, { skipHalftime: true });
    state = result.state;
    expect(state.halftimePlan).toBeUndefined();
    expect(result.report?.detail?.timeline.some(row => row.kind === 'halftime-plan')).toBeFalsy();
  }
});
