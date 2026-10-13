import { describe, expect, it, vi } from 'vitest';
import type { CareerState, RandomEvent } from '@/lib/soccerCareerEngine';

const E = (process.env.SC_LIFE_REVIEWS_ENGINE
  ? await import(/* @vite-ignore */ process.env.SC_LIFE_REVIEWS_ENGINE)
  : await import('@/lib/soccerCareerEngine')) as typeof import('@/lib/soccerCareerEngine');
const L = (process.env.SC_LIFE_REVIEWS_LIFE
  ? await import(/* @vite-ignore */ process.env.SC_LIFE_REVIEWS_LIFE)
  : await import('@/lib/soccerCareerLife')) as typeof import('@/lib/soccerCareerLife');
const copy = (state: CareerState): CareerState => E.repairCareer(JSON.parse(JSON.stringify(state)));
const year = (state: CareerState) => state.seasons[state.seasons.length - 1]!.year;
const clamp = (value: number) => Math.max(0, Math.min(100, value));
function random<T>(value: number, action: () => T): T {
  const draw = vi.spyOn(Math, 'random').mockReturnValue(value);
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-13T16:00:00Z'));
  try { return action(); } finally { draw.mockRestore(); clock.mockRestore(); }
}
function career(): CareerState {
  return random(0.9, () => {
    const stats = { pace: 80, shooting: 80, passing: 80, dribbling: 80, defending: 80, physical: 80, reflexes: 80 };
    const initial = E.initCareer('Life Review Fixture', 'England', 'CM', '2020s', stats, 80, 2020, E.FALLBACK_CLUBS, null, 94);
    const club = E.FALLBACK_CLUBS[0];
    return { ...initial, age: 30, phase: 'playing', retired: false, personality: 'professor', agentId: 'self',
      currentClub: club.name, currentClubCountry: club.country, currentClubTier: club.tier,
      currentClubColor: club.color, currentLeague: club.league, contractYearsLeft: 4, weeklyWage: 10000,
      seasons: [{ ...initial.seasons[0], year: 2026, age: 30, club: club.name, clubCountry: club.country,
        clubTier: club.tier, type: 'playing', apps: 24, leagueApps: 20, goals: 4, assists: 6, rating: 7,
        injury: null, injuryWeeks: 0, injurySevere: false }],
      netWorth: 10, morale: 65, integrityBonus: 5, lifeFlags: {}, eventLastFired: {}, seriousInjuries: [],
      pendingEvents: [], statBoostNextSeason: { physical: 2 }, events: ['Prepared fictional review context'] };
  });
}
function card(state: CareerState, id: number): RandomEvent {
  const matches = random(0.9, () => L.getLifeEvents(state).filter(event => event.id === id));
  expect(matches, `life review ${id} missing from actual life catalog`).toHaveLength(1);
  return matches[0];
}
function waiting(state: CareerState, event: RandomEvent): CareerState {
  const sentinel = random(0.9, () => E.getAllEvents(state).find(item => item.id === 4));
  expect(sentinel, 'existing sentinel must exist').toBeDefined();
  return copy({ ...state, phase: 'random_events', pendingEvents: [event, sentinel!],
    eventLastFired: { ...state.eventLastFired, [String(event.id)]: year(state) } });
}
function answer(state: CareerState, index: number, draw = 0.9): CareerState {
  return random(draw, () => E.applyEventChoice(copy(state), index, E.FALLBACK_CLUBS));
}
function acquired(id: 236 | 270, choice = 0): CareerState {
  const state = career();
  return answer(waiting(state, card(state, id)), choice);
}
function nextPlaying(state: CareerState): CareerState {
  const start = random(0.9, () => E.advanceProSeason({ ...copy(state), phase: 'playing', pendingEvents: [], loan: null }, E.FALLBACK_CLUBS));
  const next = start.phase === 'retirement_suggestion'
    ? random(0.9, () => E.declineRetirementSuggestion(start, E.FALLBACK_CLUBS)) : start;
  expect(year(next), 'actual next season must advance once').toBe(year(state) + 1);
  expect(next.seasons[next.seasons.length - 1]!.type).toBe('playing');
  expect(next.seasons[next.seasons.length - 1]!.apps).toBeGreaterThan(0);
  expect(next.seasons[next.seasons.length - 1]!.injurySevere).not.toBe(true);
  expect(next.retired).toBe(false);
  return next;
}
function batch(state: CareerState): CareerState {
  return random(0.99, () => E.dismissSocialMediaPhase({ ...copy(state), phase: 'social_media_action',
    socialMediaActionUsedThisSeason: true }, E.FALLBACK_CLUBS));
}
function review(): CareerState {
  const due = nextPlaying(acquired(270));
  return waiting(due, card(due, 630));
}
function literalEffect(before: CareerState, after: CareerState, changes: Partial<CareerState>): void {
  // Every other serialized field must remain literal, including the old queue and save stamps.
  const expected = copy({ ...before, ...changes, lastEventId: before.pendingEvents[0].id,
    pendingEvents: before.pendingEvents.slice(1), phase: 'random_events' });
  expect(after.events.slice(0, before.events.length)).toEqual(before.events);
  expect(after.events).toHaveLength(before.events.length + 1);
  expect(after.events[after.events.length - 1].trim().length).toBeGreaterThan(0);
  expect({ ...copy(after), events: before.events }).toEqual({ ...expected, events: before.events });
  expect(copy(before)).toEqual(before);
}
function reviewEffect(before: CareerState, after: CareerState, index: number): void {
  const skill = index === 0 ? 'passing' : 'defending';
  if (index < 2) expect(after.statBoostNextSeason[skill]).toBe((before.statBoostNextSeason[skill] ?? 0) + 1);
  literalEffect(before, after, index < 2
    ? { lifeFlags: { ...before.lifeFlags, coachingBadges: 3 },
      statBoostNextSeason: { ...before.statBoostNextSeason, [skill]: (before.statBoostNextSeason[skill] ?? 0) + 1 },
      integrityBonus: before.integrityBonus + (index === 0 ? 2 : 1) }
    : { lifeFlags: { ...before.lifeFlags, coachingBadges: 4 }, morale: clamp(before.morale + 2) });
}

describe('Soccer Career recorded life reviews', () => {
  it('life review missing: repayment has priority in the actual next playing season', () => {
    const start = acquired(236), due = nextPlaying(start);
    expect(start.lifeFlags?.teammateLoan).toBe(1);
    expect(start.eventLastFired?.['236']).toBe(year(start));
    expect(L.getPriorityLifeEventIds(due).includes(237), 'repayment priority missing').toBe(true);
    expect(batch(due).pendingEvents.filter(event => event.id === 237), 'repayment missing from actual picker').toHaveLength(1);
  });
  it('life review missing: practical review has priority in the actual next playing season', () => {
    const start = acquired(270), due = nextPlaying(start);
    expect(start.lifeFlags?.coachingBadges).toBe(1);
    expect(start.eventLastFired?.['270']).toBe(year(start));
    expect(L.getPriorityLifeEventIds(due).includes(630), 'course review priority missing').toBe(true);
    const queued = batch(due);
    expect(queued.pendingEvents.filter(event => event.id === 630), 'life review 630 missing from actual picker').toHaveLength(1);
    expect(queued.eventLastFired?.['630']).toBe(year(due));
    const actual = queued.pendingEvents.find(event => event.id === 630)!;
    expect(E.eventCooldown(actual)).toBe(99);
    expect(E.isEventOnCooldown(queued, actual)).toBe(true);
    expect(batch({ ...queued, pendingEvents: [] }).pendingEvents.some(event => event.id === 630)).toBe(false);
  });
  it('life review missing: match analysis saves its exact queued passing and integrity', () => {
    const before = review(), held = copy(before);
    reviewEffect(before, answer(before, 0), 0); expect(before).toEqual(held);
  });
  it('life review missing: youth session saves its exact queued defending and integrity', () => {
    const before = review(), held = copy(before);
    reviewEffect(before, answer(before, 1), 1); expect(before).toEqual(held);
  });
  it('life review missing: leaving the course saves morale without a qualification', () => {
    const before = review(), held = copy(before);
    reviewEffect(before, answer(before, 2), 2); expect(before).toEqual(held);
  });
  it('life review missing: queued review survives changed offer gates and JSON reload', () => {
    const original = review();
    // A declared changed-gate fixture tests re-resolution, not a natural age or flag change.
    const before = copy({ ...original, age: 29, lifeFlags: { ...original.lifeFlags, coachingBadges: 2 },
      eventLastFired: { ...original.eventLastFired, '270': year(original) } });
    const fresh = { ...copy(before), pendingEvents: [] };
    expect(L.getLifeEvents(fresh).some(event => event.id === 630)).toBe(false);
    expect(typeof before.pendingEvents[0].choices[0].apply).toBe('undefined');
    expect(E.getAllEvents(before).filter(event => event.id === 630)).toHaveLength(1);
    const held = copy(before); reviewEffect(before, answer(before, 0), 0); expect(before).toEqual(held);
  });
  it('life review missing: both queued assignment skills reach the actual next season once', () => {
    for (const [choice, skill] of [[0, 'passing'], [1, 'defending']] as const) {
      const before = review(), chosen = answer(before, choice);
      expect(chosen.statBoostNextSeason[skill]).toBe(1);
      const without = copy(chosen); delete without.statBoostNextSeason[skill];
      const first = nextPlaying(chosen), control = nextPlaying(without);
      expect(first[skill]).toBe(control[skill] + 1);
      expect(first.statBoostNextSeason).toEqual({});
      expect(copy(first).statBoostNextSeason).toEqual({});
      const second = nextPlaying(first), secondControl = nextPlaying(control);
      expect(second[skill]).toBe(secondControl[skill] + 1);
      expect(second.statBoostNextSeason).toEqual({});
    }
  });
  it('life review missing: a legacy started course is due without inventing an acquisition year', () => {
    const state = acquired(270); delete state.eventLastFired;
    const before = JSON.stringify(state);
    expect(card(state, 630).id).toBe(630);
    expect(L.getPriorityLifeEventIds(state).includes(630), 'legacy course review priority missing').toBe(true);
    expect(JSON.stringify(state)).toBe(before); expect(state.eventLastFired).toBeUndefined();
  });
  it('life review missing: reviewed and left courses never receive a fresh review', () => {
    for (const choice of [0, 1, 2]) {
      const before = review(), done = answer(before, choice);
      expect(done.lifeFlags?.coachingBadges).toBe(choice === 2 ? 4 : 3);
      expect(copy(done).lifeFlags).toEqual(done.lifeFlags);
      expect(L.getLifeEvents({ ...done, pendingEvents: [] }).some(event => event.id === 630)).toBe(false);
      const later = nextPlaying(done);
      expect(L.getPriorityLifeEventIds(later)).not.toContain(630);
      expect(batch(later).pendingEvents.some(event => event.id === 630)).toBe(false);
    }
  });

  it('life review preservation: all original coaching choices keep their literal outcomes', () => {
    const state = career(), before = waiting(state, card(state, 270));
    for (const choice of [0, 1, 2]) {
      const held = copy(before), after = answer(before, choice);
      literalEffect(before, after, choice === 0
        ? { lifeFlags: { ...before.lifeFlags, coachingBadges: 1 }, integrityBonus: 7,
          statBoostNextSeason: { physical: 2, passing: 1 } }
        : choice === 1 ? { lifeFlags: { ...before.lifeFlags, coachingBadges: 2 }, morale: 67 }
          : { lifeFlags: { ...before.lifeFlags, coachingBadges: 2 }, integrityBonus: 6, morale: 66 });
      expect(before).toEqual(held);
    }
  });
  it('life review preservation: lending and declining keep the original money and integrity', () => {
    const state = career(), before = waiting(state, card(state, 236));
    literalEffect(before, answer(before, 0), { netWorth: 9.8, lifeFlags: { teammateLoan: 1 }, integrityBonus: 7 });
    literalEffect(before, answer(before, 1), { morale: 63, lifeFlags: { teammateLoan: 9 } });
  });
  it('life review preservation: repayment hit keeps its original money morale and wheel', () => {
    const state = acquired(236), before = waiting(state, card(state, 237)), after = answer(before, 0, 0.1);
    literalEffect(before, after, { netWorth: 10.2, morale: 71, lifeFlags: { teammateLoan: 2 },
      chanceWheel: { title: 'The Repayment', chance: 0.65, roll: 0.1, hit: 'Repaid with a letter', miss: 'No repayment', result: true, seen: false } });
  });
  it('life review preservation: repayment miss keeps its original integrity morale and wheel', () => {
    const state = acquired(236), before = waiting(state, card(state, 237)), after = answer(before, 0, 0.9);
    literalEffect(before, after, { netWorth: 9.8, morale: 61, integrityBonus: 9, lifeFlags: { teammateLoan: 2 },
      chanceWheel: { title: 'The Repayment', chance: 0.65, roll: 0.9, hit: 'Repaid with a letter', miss: 'No repayment', result: false, seen: false } });
  });
  it('life review preservation: repayment gift keeps cash and closes the actual story', () => {
    const state = acquired(236), before = waiting(state, card(state, 237)), after = answer(before, 1);
    literalEffect(before, after, { netWorth: 9.8, morale: 68, integrityBonus: 11, lifeFlags: { teammateLoan: 2 } });
    expect(L.getPriorityLifeEventIds(nextPlaying(after))).not.toContain(237);
  });
  it('life review preservation: acquisition season does not gain a new priority', () => {
    for (const [id, followup] of [[236, 237], [270, 630]] as const) {
      const state = acquired(id);
      expect(state.eventLastFired?.[String(id)]).toBe(year(state));
      expect(L.getPriorityLifeEventIds(state)).not.toContain(followup);
    }
  });
  it('life review preservation: declined courses and outside loans create no new followup', () => {
    for (const choice of [1, 2]) {
      const state = nextPlaying(acquired(270, choice));
      expect(state.lifeFlags?.coachingBadges).toBe(2);
      expect(L.getLifeEvents(state).some(event => event.id === 630)).toBe(false);
      expect(L.getPriorityLifeEventIds(state)).not.toContain(630);
    }
    const declinedLoan = nextPlaying(acquired(236, 1));
    expect(declinedLoan.lifeFlags?.teammateLoan).toBe(9);
    expect(L.getPriorityLifeEventIds(declinedLoan)).not.toContain(237);
  });
  it('life review preservation: retired careers gain no fresh repayment or course priority', () => {
    const state = nextPlaying(acquired(270));
    state.lifeFlags = { ...state.lifeFlags, teammateLoan: 1 };
    state.eventLastFired = { ...state.eventLastFired, '236': year(state) - 1 };
    const retired: CareerState = { ...state, retired: true, phase: 'retired', pendingEvents: [] };
    expect(L.getPriorityLifeEventIds(retired)).toEqual([]);
    expect(L.getLifeEvents(retired).some(event => event.id === 630)).toBe(false);
  });
  it('life review preservation: existing repayment once cooldown still blocks the actual picker', () => {
    const state = nextPlaying(acquired(236)), repayment = card(state, 237);
    state.eventLastFired = { ...state.eventLastFired, '237': year(state) };
    expect(E.eventCooldown(repayment)).toBe(99);
    expect(E.isEventOnCooldown(state, repayment)).toBe(true);
    expect(batch(state).pendingEvents.some(event => event.id === 237)).toBe(false);
  });
  it('life review preservation: priority reads keep old saves and their random stream intact', () => {
    const state = career(); delete state.lifeFlags; delete state.eventLastFired;
    const before = JSON.stringify(state), draw = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Read must not draw'); });
    try { expect(L.getPriorityLifeEventIds(state)).toEqual([]); expect(L.getPriorityLifeEventIds(state)).toEqual([]); }
    finally { draw.mockRestore(); }
    expect(JSON.stringify(state)).toBe(before);
  });
  it('life review preservation: a newly started course has no fresh practical review', () => {
    const state = acquired(270);
    expect(L.getLifeEvents({ ...state, pendingEvents: [] }).some(event => event.id === 630)).toBe(false);
    expect(state.lifeFlags?.coachingBadges).toBe(1);
    expect(state.statBoostNextSeason).toEqual({ physical: 2, passing: 1 });
  });
});
