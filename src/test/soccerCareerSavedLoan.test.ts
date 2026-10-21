import { describe, expect, it, vi } from 'vitest';
import type { CareerState, RandomEvent } from '@/lib/soccerCareerEngine';

const E = (process.env.SC_LOAN_ENGINE ? await import(/* @vite-ignore */ process.env.SC_LOAN_ENGINE)
  : await import('@/lib/soccerCareerEngine')) as typeof import('@/lib/soccerCareerEngine');
const L = (process.env.SC_LOAN_LIFE ? await import(/* @vite-ignore */ process.env.SC_LOAN_LIFE)
  : await import('@/lib/soccerCareerLife')) as typeof import('@/lib/soccerCareerLife');
const S = (process.env.SC_LOAN_SAVE ? await import(/* @vite-ignore */ process.env.SC_LOAN_SAVE)
  : await import('@/lib/soccerCareerSave')) as typeof import('@/lib/soccerCareerSave');
const C = (process.env.SC_LOAN_CONTRACTS ? await import(/* @vite-ignore */ process.env.SC_LOAN_CONTRACTS)
  : await import('@/lib/soccerCareerContracts')) as typeof import('@/lib/soccerCareerContracts');
const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const clamp = (value: number) => Math.max(0, Math.min(100, value));
const year = (state: CareerState) => state.seasons[state.seasons.length - 1]!.year;
type Choice = 0 | 1;
function draws<T>(input: number | readonly number[], action: () => T): { result: T; values: number[] } {
  const values: number[] = [], spy = vi.spyOn(Math, 'random').mockImplementation(() => {
    const value = typeof input === 'number' ? input : input[values.length];
    if (value === undefined) throw new Error('Actual source consumed an unlisted saved-loan input');
    values.push(value); return value;
  });
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-13T16:00:00Z'));
  try { return { result: action(), values }; } finally { spy.mockRestore(); clock.mockRestore(); }
}
function restore(state: CareerState): CareerState {
  const saved = json(state); expect(S.isSoccerCareerSave(saved), 'complete saved-loan state must validate').toBe(true);
  const result = E.repairCareer(saved); expect(S.isSoccerCareerSave(result)).toBe(true); return result;
}
function roundtrip(state: CareerState): CareerState {
  const held = JSON.stringify(state), run = draws([], () => restore(state));
  expect(run.values).toEqual([]); expect(JSON.stringify(state)).toBe(held);
  expect(JSON.stringify(run.result)).toBe(held); return run.result;
}
function context(funds = 0.5): CareerState {
  return restore(draws(0.9, () => {
    const stats = { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70, reflexes: 70 };
    const base = E.initCareer('Saved Loan Fixture', 'England', 'CM', '2020s', stats, 70, 2020, E.FALLBACK_CLUBS, null, 90);
    const club = E.FALLBACK_CLUBS[0];
    return { ...base, age: 23, phase: 'playing', retired: false, personality: 'professor', agentId: 'self',
      currentClub: club.name, currentClubCountry: club.country, currentClubTier: club.tier, currentClubColor: club.color,
      currentLeague: club.league, contractYearsLeft: 4, weeklyWage: 10000, netWorth: funds, morale: 60,
      popularity: 60, socialMediaFollowers: 1, integrityBonus: 5, sponsorBonus: 0.2, marketValue: 4,
      seasons: [{ ...base.seasons[0], year: 2026, age: 23, club: club.name, clubCountry: club.country, clubTier: club.tier,
        type: 'playing', apps: 24, leagueApps: 20, goals: 4, assists: 6, rating: 7, injury: null, injuryWeeks: 0, injurySevere: false }],
      lifeFlags: {}, eventLastFired: {}, pendingEvents: [], seriousInjuries: [],
      statBoostNextSeason: { physical: 2, reflexes: 3 }, events: ['Prepared fictional saved-loan context'] } as CareerState;
  }).result);
}
function catalog(state: CareerState): RandomEvent[] {
  const held = JSON.stringify(state), run = draws([0.99, 0.99], () => E.getAllEvents(state));
  expect(run.values, 'original professor216/217 reads remain the complete catalog vector').toEqual([0.99, 0.99]);
  expect(JSON.stringify(state)).toBe(held); return run.result;
}
function waiting(state: CareerState, voucher: boolean): CareerState {
  const all = catalog(state), ids = voucher ? [220, 236, 4] : [236, 4];
  const events = ids.map(id => {
    const matches = all.filter(event => event.id === id); expect(matches, `actual source card ${id} must exist`).toHaveLength(1);
    return matches[0];
  });
  const ledger = { '7777': year(state) - 4, '236': year(state), '4': year(state),
    ...(voucher ? { 'story:squadChatLeak': year(state) } : {}) };
  // Genuine source-card presentation is prepared here, not claimed as natural delivery.
  const live = { ...state, phase: 'random_events' as const, pendingEvents: events, eventLastFired: ledger };
  return { ...restore(live), pendingEvents: live.pendingEvents };
}
function answer(state: CareerState, choice: Choice): CareerState {
  const held = JSON.stringify(state), queue = state.pendingEvents;
  const run = draws([0.99, 0.99], () => E.applyEventChoice(state, choice, E.FALLBACK_CLUBS));
  expect(run.values, 'catalog lookup consumes two reads and these choices add no effect draw').toEqual([0.99, 0.99]);
  expect(JSON.stringify(state)).toBe(held); expect(state.pendingEvents).toBe(queue); return run.result;
}
function expected(before: CareerState, id: 220 | 236, choice: Choice): CareerState {
  const after = json(before);
  if (id === 220) {
    expect(choice).toBe(1); after.netWorth = Math.round((before.netWorth - 0.02) * 100) / 100;
    after.morale = clamp(before.morale + 3);
    after.events.push('🎁 Apologized for the haircut text with a barber voucher. He used it');
  } else if (choice === 0) {
    after.netWorth = Math.round((before.netWorth - 0.2) * 100) / 100;
    after.integrityBonus = before.integrityBonus + 2; after.lifeFlags = { ...before.lifeFlags, teammateLoan: 1 };
    after.events.push('🤝 Lent a teammate €200k on a handshake');
  } else {
    after.morale = clamp(before.morale - 2); after.lifeFlags = { ...before.lifeFlags, teammateLoan: 9 };
    after.events.push('🏦 Helped a teammate get a real loan instead of cash');
  }
  after.lastEventId = id; after.pendingEvents = json(before.pendingEvents.slice(1)); after.phase = 'random_events';
  after.overall = 70; return after;
}
function literal(before: CareerState, after: CareerState, id: 220 | 236, choice: Choice): void {
  expect(before.pendingEvents[0].id).toBe(id); expect(json(after)).toEqual(expected(before, id, choice));
  expect(after.eventLastFired?.['236']).toBe(2026); expect(after.eventLastFired?.['4']).toBe(2026);
  expect(after.eventLastFired?.['7777']).toBe(2022); expect(after.chanceWheel).toBe(before.chanceWheel);
  expect(roundtrip(roundtrip(after))).toEqual(json(after));
}
function voucher(loaded: boolean): CareerState {
  const live = waiting(context(), true), before = loaded ? roundtrip(roundtrip(live)) : live;
  const after = answer(before, 1); literal(before, after, 220, 1);
  expect(after.netWorth).toBe(0.48); expect(after.morale).toBe(63);
  expect(after.eventLastFired?.['story:squadChatLeak']).toBe(2026);
  return loaded ? roundtrip(roundtrip(after)) : after;
}
function loadedChoice(choice: Choice): void {
  const before = voucher(true), wanted = expected(before, 236, choice), after = answer(before, choice);
  expect(JSON.stringify(json(after)) === JSON.stringify(wanted), 'saved teammate loan choice lost its actual effect').toBe(true);
  literal(before, after, 236, choice); expect(after.pendingEvents[0].id).toBe(4);
}

describe('Soccer Career saved teammate loan choices', () => {
  it('saved loan missing: JSON236 choice0 resolves after the actual220 voucher', () => loadedChoice(0));
  it('saved loan missing: JSON236 choice1 resolves after the actual220 voucher', () => loadedChoice(1));
  it('saved loan preservation: fresh236 keeps the original balance gate', () => {
    for (const [funds, offered] of [[0.49, false], [0.5, true], [10, true]] as const) {
      const state = context(funds); expect(catalog(state).some(event => event.id === 236)).toBe(offered);
      expect(draws([0.99, 0.99], () => L.getLifeEvents(state)).values).toEqual([0.99, 0.99]);
    }
  });
  it('saved loan preservation: fresh236 keeps the original loan-stage gate', () => {
    for (const stage of [1, 2, 9]) {
      const state = roundtrip({ ...context(), lifeFlags: { teammateLoan: stage } });
      expect(catalog(state).some(event => event.id === 236)).toBe(false);
    }
  });
  it('saved loan preservation: live236 choice0 resolves after the actual220 voucher', () => {
    const before = voucher(false), after = answer(before, 0); literal(before, after, 236, 0);
  });
  it('saved loan preservation: live236 choice1 resolves after the actual220 voucher', () => {
    const before = voucher(false), after = answer(before, 1); literal(before, after, 236, 1);
  });
  it('saved loan preservation: JSON236 choice0 keeps its original above-threshold effect', () => {
    const before = roundtrip(roundtrip(waiting(context(), false))), after = answer(before, 0);
    literal(before, after, 236, 0);
    expect(C.soccerEventChoiceConsequence(before, 236, 0, before.pendingEvents[0].choices[0].consequence!))
      .toBe('-€200k for now. Repayment story continues later');
  });
  it('saved loan preservation: JSON236 choice1 keeps its original above-threshold effect', () => {
    const before = roundtrip(roundtrip(waiting(context(), false))), after = answer(before, 1);
    literal(before, after, 236, 1);
    expect(C.soccerEventChoiceConsequence(before, 236, 1, before.pendingEvents[0].choices[1].consequence!))
      .toBe('Responsible, slightly awkward: Morale -2');
  });
});
