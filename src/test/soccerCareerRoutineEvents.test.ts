import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CareerState, ClubData, RandomEvent, SeasonRecord } from '@/lib/soccerCareerEngine';

const enginePath = process.env.SOCCER_ROUTINE_ENGINE;
const lifePath = process.env.SOCCER_ROUTINE_LIFE;
const E = (enginePath ? await import(/* @vite-ignore */ enginePath) : await import('@/lib/soccerCareerEngine')) as typeof import('@/lib/soccerCareerEngine');
const L = (lifePath ? await import(/* @vite-ignore */ lifePath) : await import('@/lib/soccerCareerLife')) as typeof import('@/lib/soccerCareerLife');

type Skill = 'pace' | 'shooting' | 'passing' | 'dribbling' | 'defending' | 'physical' | 'reflexes';
type Effect = { morale?: number; integrityBonus?: number; popularity?: number; skill?: Skill; boost?: number };
type Contract = { id: number; scenario: string; effects: [Effect, Effect]; position?: string };
const CONTRACT: Contract[] = [
  { id: 600, scenario: 'extra passing reps', effects: [{ skill: 'passing', boost: 1, morale: -1 }, { morale: 2 }] },
  { id: 601, scenario: 'video notes', effects: [{ skill: 'defending', boost: 1, morale: -1 }, { morale: 2 }] },
  { id: 602, scenario: 'first touch work', effects: [{ skill: 'dribbling', boost: 1, morale: -1 }, { morale: 2 }] },
  { id: 603, scenario: 'sprint mechanics', effects: [{ skill: 'pace', boost: 1, morale: -1 }, { morale: 2 }] },
  { id: 604, scenario: 'keeper catching', position: 'GK', effects: [{ skill: 'reflexes', boost: 1, morale: -1 }, { morale: 2 }] },
  { id: 605, scenario: 'long away trip', effects: [{ morale: 2, popularity: -1 }, { skill: 'passing', boost: 1, morale: -1 }] },
  { id: 606, scenario: 'post trip quiet', effects: [{ morale: 2, popularity: -1 }, { popularity: 2, morale: -1 }] },
  { id: 607, scenario: 'travel meal routine', effects: [{ skill: 'physical', boost: 1, morale: -1 }, { morale: 2 }] },
  { id: 608, scenario: 'shared travel notes', effects: [{ skill: 'passing', boost: 1, morale: -1 }, { morale: 1, integrityBonus: 1 }] },
  { id: 609, scenario: 'calling home', effects: [{ morale: 2, popularity: -1 }, { popularity: 1, morale: 1 }] },
  { id: 610, scenario: 'defensive clips', position: 'CB', effects: [{ skill: 'defending', boost: 1, morale: -1 }, { morale: 2 }] },
  { id: 611, scenario: 'loan parent check in', effects: [{ integrityBonus: 1, morale: -1 }, { morale: 2 }] },
  { id: 612, scenario: 'loan local community', effects: [{ popularity: 2, morale: -1 }, { morale: 2 }] },
  { id: 613, scenario: 'midfield receiving angles', position: 'CM', effects: [{ skill: 'passing', boost: 1, morale: -1 }, { morale: 2 }] },
  { id: 614, scenario: 'captain squad responsibility', effects: [{ integrityBonus: 2, morale: -1 }, { morale: 2, popularity: -1 }] },
  { id: 615, scenario: 'reserve frustration', effects: [{ skill: 'physical', boost: 1, morale: -1 }, { morale: 2 }] },
  { id: 616, scenario: 'finishing practice', position: 'ST', effects: [{ skill: 'shooting', boost: 1, morale: -1 }, { morale: 2 }] },
  { id: 617, scenario: 'helping a training partner', effects: [{ integrityBonus: 2, morale: -1 }, { morale: 2, popularity: -1 }] },
  { id: 618, scenario: 'kit preparation', effects: [{ integrityBonus: 1, morale: 1 }, { morale: 2, integrityBonus: -1 }] },
  { id: 619, scenario: 'captain media duty', effects: [{ popularity: 2, morale: -1 }, { integrityBonus: 1, morale: 1 }] },
  { id: 620, scenario: 'family visit', effects: [{ morale: 2, popularity: -1 }, { skill: 'physical', boost: 1, morale: -1 }] },
  { id: 621, scenario: 'keeping an off season routine', effects: [{ integrityBonus: 1, morale: 1 }, { morale: 2, integrityBonus: -1 }] },
  { id: 622, scenario: 'sponsor appearance', effects: [{ popularity: 2, morale: -1 }, { morale: 2, popularity: -1 }] },
  { id: 623, scenario: 'quiet phone time', effects: [{ morale: 2, popularity: -1 }, { popularity: 2, morale: -1 }] },
  { id: 624, scenario: 'cool down routine', effects: [{ skill: 'physical', boost: 1, morale: -1 }, { morale: 2 }] },
  { id: 625, scenario: 'recorded injury review', effects: [{ skill: 'passing', boost: 1, morale: -1 }, { morale: 2 }] },
  { id: 626, scenario: 'veteran warm up', effects: [{ skill: 'physical', boost: 1, morale: -1 }, { morale: 2 }] },
  { id: 627, scenario: 'skill review', effects: [{ skill: 'dribbling', boost: 1, morale: -1 }, { morale: 2 }] },
  { id: 628, scenario: 'new club introduction', effects: [{ popularity: 2, morale: -1 }, { morale: 2 }] },
  { id: 629, scenario: 'family school calendar', effects: [{ integrityBonus: 1, morale: 1 }, { skill: 'physical', boost: 1, morale: -1 }] },
];
const CLUB: ClubData = { id: 'routine-fixture', name: 'Fixture Albion', country: 'England', tier: 3, league: 'Fixture League', color: '#123456' };
const SKILLS: Skill[] = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'];
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const clamp = (n: number) => Math.max(0, Math.min(100, n));
const routine = (cards: RandomEvent[]) => cards.filter(card => card.id >= 600 && card.id <= 629);

function career(patch: Partial<CareerState> = {}): CareerState {
  const stats = { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70, reflexes: 70 };
  const initial = E.initCareer('Routine Fixture', 'England', 'ST', '2020s', stats, 70, 2020, E.FALLBACK_CLUBS, null, 90);
  const row: SeasonRecord = { ...initial.seasons[0], year: 2026, age: 31, club: CLUB.name, clubCountry: CLUB.country, clubTier: CLUB.tier,
    type: 'playing', apps: 12, leagueApps: 10, goals: 2, assists: 1, rating: 6.8, injury: null, injuryWeeks: 0, injurySevere: false };
  return { ...initial, age: 31, phase: 'playing', retired: false, currentClub: CLUB.name, currentClubCountry: CLUB.country,
    currentLeague: CLUB.league, currentClubTier: CLUB.tier, currentClubColor: CLUB.color, seasons: [row],
    personality: null, agentId: null, lifeFlags: {}, morale: 65, popularity: 40, integrityBonus: 5,
    netWorth: 1, weeklyWage: 4_000, statBoostNextSeason: { physical: 2 },
    isClubCaptain: true, captainClub: CLUB.name,
    loan: { parentClub: 'Fixture Parent', parentTier: 3, parentLeague: CLUB.league, parentCountry: CLUB.country, parentColor: '#654321' },
    family: { ...initial.family, children: 1 }, events: ['Fixture career history'], ...patch };
}
function atYear(state: CareerState, year: number): CareerState {
  return { ...copy(state), seasons: state.seasons.map((row, index) => index === state.seasons.length - 1 ? { ...row, year } : { ...row }) };
}
function context(id: number): CareerState {
  const spec = CONTRACT.find(item => item.id === id)!;
  const state = career({ position: spec.position ?? 'ST' });
  if (id === 625) state.seasons[0] = { ...state.seasons[0], injury: 'Fixture strain', injuryWeeks: 2 };
  if (id === 628) state.seasons[0] = { ...state.seasons[0], club: 'Fixture Previous' };
  return state;
}
function offered(id: number, initial: CareerState = context(id)): { state: CareerState; card: RandomEvent } {
  const found: { state: CareerState; card: RandomEvent }[] = [];
  for (let year = 2026; year < 2056 && !found.length; year++) {
    const state = atYear(initial, year);
    const cards = L.getLifeEvents(state).filter(card => card.id === id);
    for (const card of cards) found.push({ state, card });
  }
  expect(found, `routine card ${id} missing from actual life catalog`).toHaveLength(1);
  return found[0];
}
function pending(state: CareerState, cards: RandomEvent[]): CareerState {
  const waiting: CareerState = { ...state, phase: 'random_events', pendingEvents: cards };
  return E.repairCareer(copy(waiting));
}
function sentinel(state: CareerState): RandomEvent {
  return E.getAllEvents(state).find(card => card.id === 4)!;
}
function apply(state: CareerState, card: RandomEvent, choice: number): CareerState {
  return E.applyEventChoice(pending(state, [card, sentinel(state)]), choice, [CLUB]);
}
function expectEffect(before: CareerState, after: CareerState, effect: Effect): void {
  expect(after.morale).toBe(clamp(before.morale + (effect.morale ?? 0)));
  expect(after.popularity).toBe(clamp(before.popularity + (effect.popularity ?? 0)));
  expect(after.integrityBonus).toBe(before.integrityBonus + (effect.integrityBonus ?? 0));
  const boosts = { ...before.statBoostNextSeason };
  if (effect.skill) boosts[effect.skill] = (boosts[effect.skill] ?? 0) + effect.boost!;
  expect(after.statBoostNextSeason).toEqual(boosts);
  for (const skill of SKILLS) expect(after[skill]).toBe(before[skill]);
  const held = (state: CareerState) => {
    const record = copy(state) as unknown as Record<string, unknown>;
    for (const field of ['morale', 'popularity', 'integrityBonus', 'statBoostNextSeason', 'events', 'pendingEvents', 'phase', 'lastEventId', 'overall']) delete record[field];
    return record;
  };
  expect(held(after)).toEqual(held(before));
  expect(after.events).toHaveLength(before.events.length + 1);
  expect(after.events[after.events.length - 1]).toEqual(expect.any(String));
}
function anyYearContains(state: CareerState, id: number): boolean {
  for (let year = 2026; year < 2056; year++) if (routine(L.getLifeEvents(atYear(state, year))).some(card => card.id === id)) return true;
  return false;
}

beforeEach(() => vi.spyOn(Math, 'random').mockReturnValue(0.9));
afterEach(() => vi.restoreAllMocks());

describe('Soccer Career routine saved outcomes', () => {
  for (const spec of CONTRACT) {
    it(`routine missing: ${spec.id} ${spec.scenario} saves both choices exactly`, () => {
      const { state, card } = offered(spec.id);
      expect(card.choices).toHaveLength(2);
      expect(card.choices[0].label).not.toBe(card.choices[1].label);
      expect(card.choices[0].consequence).not.toBe(card.choices[1].consequence);
      for (let choice = 0; choice < 2; choice++) {
        const input = pending(state, [card, sentinel(state)]), unchanged = copy(input);
        const after = E.applyEventChoice(input, choice, [CLUB]);
        expectEffect(unchanged, after, spec.effects[choice]);
        expect(input).toEqual(unchanged);
        expect(after.lastEventId).toBe(spec.id);
        expect(after.phase).toBe('random_events');
        expect(after.pendingEvents.map(event => event.id)).toEqual([4]);
        expect(copy(after).statBoostNextSeason).toEqual(after.statBoostNextSeason);
      }
    });
  }

  it('routine missing: stable capped reads add no random draws', () => {
    const { state } = offered(600);
    const before = copy(state);
    const random = vi.mocked(Math.random); random.mockClear();
    random.mockImplementation(() => { throw new Error('neutral life catalog must not draw'); });
    const first = routine(L.getLifeEvents(state));
    expect(first.length).toBeGreaterThan(0); expect(first.length).toBeLessThanOrEqual(5);
    expect(routine(L.getLifeEvents(state)).map(card => card.id)).toEqual(first.map(card => card.id));
    expect(routine(L.getLifeEvents(copy(state))).map(card => card.id)).toEqual(first.map(card => card.id));
    expect(random).not.toHaveBeenCalled(); expect(state).toEqual(before);
  });

  it('routine missing: year and player identity rotate the offered decisions', () => {
    const { state } = offered(600);
    const schedules = new Set<string>(), identities = new Set<string>();
    for (let year = 2026; year < 2038; year++) {
      const cards = routine(L.getLifeEvents(atYear(state, year)));
      expect(cards.length).toBeLessThanOrEqual(5);
      expect(new Set(cards.map(card => card.id)).size).toBe(cards.length);
      schedules.add(cards.map(card => card.id).join(','));
    }
    for (const playerName of ['Routine A', 'Routine B', 'Routine C', 'Routine D', 'Routine E', 'Routine F']) {
      identities.add(routine(L.getLifeEvents({ ...state, playerName })).map(card => card.id).join(','));
    }
    expect(schedules.size).toBeGreaterThan(1); expect(identities.size).toBeGreaterThan(1);
  });

  it('routine missing: recorded context excludes incompatible fresh offers', () => {
    offered(604);
    const cases: [number, CareerState][] = [
      [604, career({ position: 'ST' })], [610, career({ position: 'GK' })],
      [613, career({ position: 'CB' })], [616, career({ position: 'GK' })],
      [611, career({ loan: null })], [612, career({ loan: null })],
      [614, career({ captainClub: 'Fixture Other' })], [619, career({ isClubCaptain: false })],
      [615, career({ morale: 75 })], [615, career({ seasons: [{ ...career().seasons[0], apps: 30 }] })],
      [625, career()], [626, career({ age: 24 })], [628, career()],
      [629, career({ family: { ...career().family, children: 0 } })],
    ];
    for (const [id, state] of cases) expect(anyYearContains(state, id), `ineligible routine ${id}`).toBe(false);
    for (const state of [career({ retired: true }), career({ age: 16 }), career({ currentClub: '' }),
      career({ seasons: [{ ...career().seasons[0], type: 'youth' }] }), career({ seasons: [{ ...career().seasons[0], apps: 0 }] })]) {
      expect(routine(L.getLifeEvents(state))).toEqual([]);
    }
  });

  it('routine missing: actual full catalog reads keep saved state intact', () => {
    const { state, card } = offered(600), before = copy(state);
    const matches = E.getAllEvents(state).filter(event => event.id === card.id);
    expect(matches).toHaveLength(1);
    expect(matches[0].choices.map(choice => choice.consequence)).toEqual(card.choices.map(choice => choice.consequence));
    expect(state).toEqual(before);
  });

  it('routine missing: a queued reserve choice survives a real morale change and reload', () => {
    const { state, card } = offered(615);
    const old = E.getAllEvents(state).find(event => event.id === 1)!;
    const first = E.applyEventChoice(pending(state, [old, card, sentinel(state)]), 1, [CLUB]);
    expect(first.morale).toBe(75); expect(first.pendingEvents.map(event => event.id)).toEqual([615, 4]);
    const fresh = { ...copy(first), pendingEvents: [] };
    expect(routine(L.getLifeEvents(fresh)).some(event => event.id === 615)).toBe(false);
    const reloaded = E.repairCareer(copy(first)), before = copy(reloaded);
    expect(typeof reloaded.pendingEvents[0].choices[0].apply).toBe('undefined');
    expect(E.getAllEvents(reloaded).filter(event => event.id === 615)).toHaveLength(1);
    const after = E.applyEventChoice(reloaded, 0, [CLUB]);
    expectEffect(before, after, CONTRACT.find(item => item.id === 615)!.effects[0]);
    expect(after.lastEventId).toBe(615); expect(after.pendingEvents.map(event => event.id)).toEqual([4]);
    expect(reloaded).toEqual(before);
  });

  it('routine missing: two actual routine choices accumulate queued effects through reload', () => {
    const { state } = offered(600);
    const cards = routine(L.getLifeEvents(state));
    expect(cards.length).toBeGreaterThanOrEqual(2);
    const selected = cards.slice(0, 2), before = pending(state, [...selected, sentinel(state)]);
    const first = E.applyEventChoice(before, 0, [CLUB]);
    expectEffect(before, first, CONTRACT.find(item => item.id === selected[0].id)!.effects[0]);
    const restored = E.repairCareer(copy(first));
    const after = E.applyEventChoice(restored, 0, [CLUB]);
    expectEffect(restored, after, CONTRACT.find(item => item.id === selected[1].id)!.effects[0]);
    expect(after.pendingEvents.map(event => event.id)).toEqual([4]);
  });

  it('routine missing: queued skill reaches the actual next season once', () => {
    const { state, card } = offered(600);
    const chosen = apply(state, card, 0);
    expect(chosen.passing).toBe(70); expect(chosen.statBoostNextSeason.passing).toBe(1);
    const restored = E.repairCareer(copy(chosen)); restored.phase = 'playing'; restored.pendingEvents = []; restored.loan = null;
    const without = copy(restored); delete without.statBoostNextSeason.passing;
    const actualStart = E.advanceProSeason(restored, E.FALLBACK_CLUBS);
    const comparisonStart = E.advanceProSeason(without, E.FALLBACK_CLUBS);
    const actual = actualStart.phase === 'retirement_suggestion' ? E.declineRetirementSuggestion(actualStart, E.FALLBACK_CLUBS) : actualStart;
    const comparison = comparisonStart.phase === 'retirement_suggestion' ? E.declineRetirementSuggestion(comparisonStart, E.FALLBACK_CLUBS) : comparisonStart;
    expect(actual.seasons).toHaveLength(restored.seasons.length + 1);
    expect(actual.seasons[actual.seasons.length - 1].type).toBe('playing');
    expect(actual.passing).toBe(comparison.passing + 1);
    expect(actual.statBoostNextSeason).toEqual({});
    expect(copy(actual).statBoostNextSeason).toEqual({});
  });

  it('routine missing: modest morale and popularity changes respect their boundaries', () => {
    const { state, card } = offered(623);
    const high = { ...state, morale: 99, popularity: 99 };
    const afterQuiet = apply(high, card, 0);
    expect(afterQuiet.morale).toBe(100); expect(afterQuiet.popularity).toBe(98);
    const low = { ...state, morale: 0, popularity: 99 };
    const afterPublic = apply(low, card, 1);
    expect(afterPublic.morale).toBe(0); expect(afterPublic.popularity).toBe(100);
  });

  it('routine preservation: an existing humble celebration still saves its actual morale', () => {
    const state = career(), event = E.getAllEvents(state).find(card => card.id === 1)!;
    const after = apply(state, event, 1);
    expect(after.morale).toBe(75); expect(after.lastEventId).toBe(1);
    expect(after.seasons).toEqual(state.seasons); expect(after.statBoostNextSeason).toEqual({ physical: 2 });
  });

  it('routine preservation: the existing golf choice keeps its queued pace tradeoff', () => {
    const state = career(), event = L.getLifeEvents(state).find(card => card.id === 228)!;
    const after = apply(state, event, 0);
    expect(after.morale).toBe(73); expect(after.pace).toBe(70);
    expect(after.statBoostNextSeason).toEqual({ physical: 2, pace: -1 });
    expect(copy(after).statBoostNextSeason).toEqual({ physical: 2, pace: -1 });
  });

  it('routine preservation: two existing cards still answer after each JSON reload', () => {
    const state = career(), catalog = E.getAllEvents(state);
    const first = E.applyEventChoice(pending(state, [catalog.find(card => card.id === 1)!, catalog.find(card => card.id === 4)!]), 1, [CLUB]);
    expect(first.morale).toBe(75); expect(first.phase).toBe('random_events');
    const second = E.applyEventChoice(E.repairCareer(copy(first)), 0, [CLUB]);
    expect(second.lastEventId).toBe(4); expect(second.pendingEvents).toEqual([]);
    expect(second.statBoostNextSeason).toEqual({ physical: 2, shooting: 1 });
    expect(second.marketValue).toBe(first.marketValue + 3);
  });

  it('routine preservation: an unavailable old card skips without applying invented effects', () => {
    const state = career(), old = E.getAllEvents(state).find(card => card.id === 1)!;
    const absent = { ...copy(old), id: 90_000, title: 'Removed fixture card' };
    const before = pending(state, [absent, old]);
    const after = E.applyEventChoice(before, 0, [CLUB]);
    expect(after.morale).toBe(before.morale); expect(after.statBoostNextSeason).toEqual(before.statBoostNextSeason);
    expect(after.pendingEvents.map(card => card.id)).toEqual([1]); expect(after.phase).toBe('random_events');
  });

  it('routine preservation: existing category and once story cooldowns retain their season boundaries', () => {
    const state = career({ eventLastFired: { 'old-positive': 2026, 'old-life': 2026, 'story:fixture-once': 2026 } });
    const positive = { id: 'old-positive', category: 'positive' } as unknown as RandomEvent;
    const life = { id: 'old-life', category: 'life' } as unknown as RandomEvent;
    const once = { id: 90_001, category: 'life', story: 'fixture-once', cooldown: 99 } as RandomEvent;
    expect(E.isEventOnCooldown(state, positive, 2027)).toBe(true); expect(E.isEventOnCooldown(state, positive, 2028)).toBe(false);
    expect(E.isEventOnCooldown(state, life, 2028)).toBe(true); expect(E.isEventOnCooldown(state, life, 2029)).toBe(false);
    expect(E.isEventOnCooldown(state, once, 2125)).toBe(true); expect(E.isEventOnCooldown(state, once, 2126)).toBe(false);
  });

  it('routine preservation: existing cousin agent gates still draw their own randomness', () => {
    const state = career({ agentId: 'cousin' }), random = vi.mocked(Math.random);
    random.mockClear(); random.mockReturnValue(0.9);
    const quiet = L.getLifeEvents(state);
    expect(quiet.some(card => card.id === 205 || card.id === 206)).toBe(false);
    expect(random).toHaveBeenCalledTimes(2);
    random.mockClear(); random.mockReturnValue(0.1);
    const drama = L.getLifeEvents(state);
    expect(drama.filter(card => card.id === 205 || card.id === 206).map(card => card.id)).toEqual([205, 206]);
    expect(random).toHaveBeenCalledTimes(2);
  });
});
