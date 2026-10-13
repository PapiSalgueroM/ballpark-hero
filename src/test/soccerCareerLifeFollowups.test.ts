import { describe, expect, it, vi } from 'vitest';
import type { CareerState } from '@/lib/soccerCareerEngine';

const E = (process.env.SOCCER_ROUTINE_ENGINE
  ? await import(/* @vite-ignore */ process.env.SOCCER_ROUTINE_ENGINE)
  : await import('@/lib/soccerCareerEngine')) as typeof import('@/lib/soccerCareerEngine');
const L = (process.env.SOCCER_ROUTINE_LIFE
  ? await import(/* @vite-ignore */ process.env.SOCCER_ROUTINE_LIFE)
  : await import('@/lib/soccerCareerLife')) as typeof import('@/lib/soccerCareerLife');

const copy = (state: CareerState): CareerState => E.repairCareer(JSON.parse(JSON.stringify(state)));
const season = (state: CareerState) => state.seasons[state.seasons.length - 1]!.year;
function seeded(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
function withRandom<T>(random: () => number, action: () => T): T {
  const spy = vi.spyOn(Math, 'random').mockImplementation(random);
  try { return action(); } finally { spy.mockRestore(); }
}
function career(): CareerState {
  return withRandom<CareerState>(seeded(660), () => {
    const stats = { pace: 60, shooting: 60, passing: 60, dribbling: 60, defending: 60, physical: 60, reflexes: 60 };
    const initial = E.initCareer('Routine Followup Fixture', 'England', 'CM', '2020s', stats, 60, 2020, E.FALLBACK_CLUBS, null, 90);
    const club = E.FALLBACK_CLUBS[0];
    return { ...initial, phase: 'playing', age: 23, retired: false, personality: 'professor', agentId: 'self',
      currentClub: club.name, currentClubCountry: club.country, currentClubTier: club.tier,
      currentClubColor: club.color, currentLeague: club.league, contractYearsLeft: 4, weeklyWage: 10000,
      netWorth: 10, lifeFlags: {}, eventLastFired: {}, seriousInjuries: [], pendingEvents: [], events: [] };
  });
}
function acquire(id: 226 | 230, index = 0): CareerState {
  const state = career();
  const event = L.getLifeEvents(state).find(card => card.id === id);
  expect(event, `fixture must offer actual acquisition ${id}`).toBeDefined();
  const waiting: CareerState = { ...state, phase: 'random_events', pendingEvents: [event!],
    eventLastFired: { [String(id)]: season(state) } };
  return withRandom(seeded(id), () => E.applyEventChoice(copy(waiting), index, E.FALLBACK_CLUBS));
}
function nextPlayingSeason(state: CareerState): CareerState {
  for (let seed = 770; seed < 802; seed++) {
    const next = withRandom(seeded(seed), () => E.advanceProSeason({ ...copy(state), phase: 'playing' }, E.FALLBACK_CLUBS));
    const row = next.seasons[next.seasons.length - 1]!;
    if (row.year === season(state) + 1 && row.type === 'playing' && row.apps > 0 && !row.injurySevere && !next.retired) return next;
  }
  throw new Error('Fixture refused: no actual next playing season within 32 fixed seeds');
}
function batch(state: CareerState): CareerState {
  return withRandom(() => 0.99, () => E.dismissSocialMediaPhase({ ...copy(state),
    phase: 'social_media_action', socialMediaActionUsedThisSeason: true }, E.FALLBACK_CLUBS));
}

describe('Soccer Career promised life followups', () => {
  it('followup missing: esports results have priority in the actual next playing season', () => {
    const acquired = acquire(226), next = nextPlayingSeason(acquired);
    expect(next.lifeFlags?.esports).toBe(1);
    expect(season(next)).toBe(season(acquired) + 1);
    expect(next.seasons[next.seasons.length - 1]!.type).toBe('playing');
    expect(L.getPriorityLifeEventIds(next)).toContain(227);
    expect(batch(next).pendingEvents.filter(card => card.id === 227)).toHaveLength(1);
  });

  it('followup missing: the boots story has priority in the actual next playing season', () => {
    const acquired = acquire(230), next = nextPlayingSeason(acquired);
    expect(next.lifeFlags?.cursedBoots).toBe(1);
    expect(season(next)).toBe(season(acquired) + 1);
    expect(next.seasons[next.seasons.length - 1]!.type).toBe('playing');
    expect(L.getPriorityLifeEventIds(next)).toContain(231);
    expect(batch(next).pendingEvents.filter(card => card.id === 231)).toHaveLength(1);
  });

  it('followup preservation: actual acquisitions and their existing season stamps survive JSON reload', () => {
    const esports = acquire(226), boots = acquire(230);
    expect(esports.netWorth).toBe(9.2);
    expect(esports.lifeFlags?.esports).toBe(1);
    expect(esports.eventLastFired?.['226']).toBe(season(esports));
    expect(boots.lifeFlags?.cursedBoots).toBe(1);
    expect(boots.eventLastFired?.['230']).toBe(season(boots));
    for (const state of [esports, boots]) {
      const loaded = copy(state);
      expect(loaded.lifeFlags).toEqual(state.lifeFlags);
      expect(loaded.eventLastFired).toEqual(state.eventLastFired);
      expect(loaded.netWorth).toBe(state.netWorth);
      expect(loaded.pendingEvents).toHaveLength(0);
    }
  });

  it('followup preservation: newly acquired stories are not due again in their acquisition season', () => {
    for (const [id, followup] of [[226, 227], [230, 231]] as const) {
      const acquired = acquire(id);
      expect(acquired.eventLastFired?.[String(id)]).toBe(season(acquired));
      expect(L.getPriorityLifeEventIds(acquired)).not.toContain(followup);
    }
  });

  it('followup preservation: sold completed and declined stories do not create another priority', () => {
    for (const [id, followup, flag] of [[226, 227, 'esports'], [230, 231, 'cursedBoots']] as const) {
      const acquired = acquire(id), event = L.getLifeEvents(acquired).find(card => card.id === followup);
      expect(event, 'the actual acquired followup must exist').toBeDefined();
      const waiting: CareerState = { ...acquired, phase: 'random_events', pendingEvents: [event!],
        eventLastFired: { ...acquired.eventLastFired, [String(followup)]: season(acquired) } };
      const done = withRandom(seeded(901), () => E.applyEventChoice(copy(waiting), 1, E.FALLBACK_CLUBS));
      expect(done.lifeFlags?.[flag]).toBe(2);
      if (id === 226) expect(done.netWorth).toBe(9.7);
      expect(L.getPriorityLifeEventIds(nextPlayingSeason(done))).not.toContain(followup);
      const declined = acquire(id, 1);
      expect(declined.lifeFlags?.[flag] ?? 0).toBe(0);
      expect(L.getPriorityLifeEventIds(nextPlayingSeason(declined))).not.toContain(followup);
    }
  });

  it('followup preservation: retired careers get no new playing season priority', () => {
    const state = nextPlayingSeason(acquire(226));
    state.lifeFlags = { ...state.lifeFlags, cursedBoots: 1 };
    state.eventLastFired = { ...state.eventLastFired, '230': season(state) - 1 };
    expect(L.getPriorityLifeEventIds({ ...state, retired: true, phase: 'retired' })).toEqual([]);
  });

  it('followup preservation: existing personality agent and comeback priorities remain available', () => {
    const state = career();
    expect(L.getPriorityLifeEventIds({ ...state, age: 18, personality: null, agentId: null })).toContain(200);
    expect(L.getPriorityLifeEventIds({ ...state, age: 19, personality: 'professor', agentId: null })).toContain(201);
    const injury: NonNullable<CareerState['seriousInjuries']>[number] = {
      year: season(state), name: 'Fixture rehabilitation', weeks: 24, path: 'plan', setback: false,
    };
    expect(L.getPriorityLifeEventIds({ ...state, seriousInjuries: [injury] })).toContain(262);
  });

  it('followup preservation: the actual picker still holds a followup inside its cooldown', () => {
    for (const [id, followup] of [[226, 227], [230, 231]] as const) {
      const state = nextPlayingSeason(acquire(id));
      const event = L.getLifeEvents(state).find(card => card.id === followup)!;
      expect(event).toBeDefined();
      state.eventLastFired = { ...state.eventLastFired, [String(followup)]: season(state) };
      expect(E.isEventOnCooldown(state, event)).toBe(true);
      expect(batch(state).pendingEvents.some(card => card.id === followup)).toBe(false);
    }
  });

  it('followup preservation: priority reads keep old saves and the random stream untouched', () => {
    const state = career();
    delete state.lifeFlags;
    delete state.eventLastFired;
    const before = JSON.stringify(state);
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Priority reads must not draw'); });
    try {
      expect(L.getPriorityLifeEventIds(state)).toEqual([]);
      expect(L.getPriorityLifeEventIds(state)).toEqual([]);
    } finally { random.mockRestore(); }
    expect(JSON.stringify(state)).toBe(before);
    expect(state.lifeFlags).toBeUndefined();
    expect(state.eventLastFired).toBeUndefined();
  });
});
