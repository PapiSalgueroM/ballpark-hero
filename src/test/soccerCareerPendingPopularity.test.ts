import { describe, expect, it, vi } from 'vitest';
import type { CareerState, RandomEvent } from '@/lib/soccerCareerEngine';

const E = (process.env.SC_POPULARITY_ENGINE ? await import(/* @vite-ignore */ process.env.SC_POPULARITY_ENGINE)
  : await import('@/lib/soccerCareerEngine')) as typeof import('@/lib/soccerCareerEngine');
const L = (process.env.SC_POPULARITY_LIFE ? await import(/* @vite-ignore */ process.env.SC_POPULARITY_LIFE)
  : await import('@/lib/soccerCareerLife')) as typeof import('@/lib/soccerCareerLife');
const S = (process.env.SC_POPULARITY_SAVE ? await import(/* @vite-ignore */ process.env.SC_POPULARITY_SAVE)
  : await import('@/lib/soccerCareerSave')) as typeof import('@/lib/soccerCareerSave');
const C = (process.env.SC_POPULARITY_CONTRACTS ? await import(/* @vite-ignore */ process.env.SC_POPULARITY_CONTRACTS)
  : await import('@/lib/soccerCareerContracts')) as typeof import('@/lib/soccerCareerContracts');
const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const year = (state: CareerState) => state.seasons[state.seasons.length - 1]!.year;
const clamp = (value: number) => Math.max(0, Math.min(100, value));
const LEGACY = 'Followers +800k, self-awareness is elite';
const CURRENT = 'Followers +800k, Popularity +4, self-awareness is elite';
type Choice = 0 | 1;
type Id = 213 | 233;
function draws<T>(input: number | readonly number[], action: () => T): { result: T; values: number[] } {
  const values: number[] = [], spy = vi.spyOn(Math, 'random').mockImplementation(() => {
    const value = typeof input === 'number' ? input : input[values.length];
    if (value === undefined) throw new Error('Actual source consumed an unlisted random input');
    values.push(value); return value;
  });
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-13T16:00:00Z'));
  try { return { result: action(), values }; } finally { spy.mockRestore(); clock.mockRestore(); }
}
function restore(state: CareerState): CareerState {
  const saved = json(state); expect(S.isSoccerCareerSave(saved), 'actual prepared save must validate').toBe(true);
  const repaired = E.repairCareer(saved); expect(S.isSoccerCareerSave(repaired)).toBe(true); return repaired;
}
function roundtrip(state: CareerState): CareerState {
  const held = JSON.stringify(state), run = draws(0.99, () => restore(state));
  expect(run.values, 'canonical JSON repair consumes no resolver draws').toEqual([]);
  expect(JSON.stringify(run.result)).toBe(held); expect(JSON.stringify(state)).toBe(held); return run.result;
}
function context(popularity = 60): CareerState {
  return restore(draws(0.9, () => {
    const stats = { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70, reflexes: 70 };
    const base = E.initCareer('Pending Popularity Fixture', 'England', 'CM', '2020s', stats, 70, 2020, E.FALLBACK_CLUBS, null, 90);
    const club = E.FALLBACK_CLUBS[0];
    return { ...base, age: 23, phase: 'playing', retired: false, personality: 'iceman', agentId: 'self',
      currentClub: club.name, currentClubCountry: club.country, currentClubTier: club.tier, currentClubColor: club.color,
      currentLeague: club.league, contractYearsLeft: 4, weeklyWage: 10000, netWorth: 10, morale: 60,
      popularity, socialMediaFollowers: 1, integrityBonus: 5, sponsorBonus: 0.2, marketValue: 4,
      seasons: [{ ...base.seasons[0], year: 2026, age: 23, club: club.name, clubCountry: club.country, clubTier: club.tier,
        type: 'playing', apps: 24, leagueApps: 20, goals: 4, assists: 6, rating: 7, injury: null, injuryWeeks: 0, injurySevere: false }],
      lifeFlags: {}, eventLastFired: {}, pendingEvents: [], seriousInjuries: [],
      statBoostNextSeason: { physical: 2, reflexes: 3 }, events: ['Prepared fictional pending popularity context'] } as CareerState;
  }).result);
}
function catalog(state: CareerState): RandomEvent[] {
  const held = JSON.stringify(state), input = state.agentId === 'cousin' ? [0.01, 0.99, 0.99, 0.01] : [0.99, 0.01];
  const run = draws(input, () => E.getAllEvents(state));
  expect(run.values, 'actual presentation retains the original conditional catalog inputs').toEqual(input);
  expect(JSON.stringify(state)).toBe(held); return run.result;
}
function waiting(state: CareerState, ids: number[]): CareerState {
  const all = catalog(state), events = ids.map(id => {
    const matches = all.filter(event => event.id === id); expect(matches, `source fixture must contain card ${id}`).toHaveLength(1);
    return matches[0];
  });
  const ledger: NonNullable<CareerState['eventLastFired']> = { ...state.eventLastFired, '7777': year(state) - 4 };
  for (const event of events) ledger[E.eventLedgerKey(event)] = year(state);
  // Prepared actual catalog presentation, not a natural picker-delivery claim.
  const live = { ...state, phase: 'random_events' as const, pendingEvents: events, eventLastFired: ledger };
  return { ...restore(live), pendingEvents: live.pendingEvents };
}
function answer(state: CareerState, choice: Choice): CareerState {
  const held = JSON.stringify(state), queue = state.pendingEvents, run = draws([0.99, 0.99], () => E.applyEventChoice(state, choice, E.FALLBACK_CLUBS));
  expect(run.values, 'lookup keeps both original catalog draws and these choices add no effect draw').toEqual([0.99, 0.99]);
  expect(JSON.stringify(state)).toBe(held); expect(state.pendingEvents).toBe(queue); return run.result;
}
const lines = {
  '213:0': '🎤 The all-yes interview became a meme format',
  '213:1': '🎙️ Eleven yeses and then a full sentence. The reporter nearly fainted',
  '233:0': '📸 Posed with your terrible wax figure. Comedy gold',
  '233:1': '😤 Demanded a wax redo. The internet sided with the statue',
} as const;
function expected(before: CareerState, id: Id, choice: Choice): CareerState {
  const after = json(before);
  if (id === 213) {
    after.popularity = clamp(before.popularity + (choice === 0 ? -2 : 2));
    if (choice === 0) after.socialMediaFollowers = Math.round((before.socialMediaFollowers + 0.5) * 100) / 100;
  } else {
    after.popularity = clamp(before.popularity + (choice === 0 ? 4 : -3));
    if (choice === 0) after.socialMediaFollowers = Math.round((before.socialMediaFollowers + 0.8) * 100) / 100;
  }
  after.events = [...before.events, lines[`${id}:${choice}`]]; after.lastEventId = id;
  after.pendingEvents = json(before.pendingEvents.slice(1)); after.phase = 'random_events'; after.overall = 70; return after;
}
function literal(before: CareerState, after: CareerState, id: Id, choice: Choice): void {
  expect(before.pendingEvents[0].id).toBe(id); expect(json(after)).toEqual(expected(before, id, choice));
  expect(after.eventLastFired?.[String(id)]).toBe(year(before)); expect(after.eventLastFired?.['7777']).toBe(year(before) - 4);
  expect(after.chanceWheel).toBe(before.chanceWheel); expect(json(roundtrip(roundtrip(after)))).toEqual(json(after));
}
function precursor(choice: Choice, loaded: boolean): CareerState {
  const live = waiting(context(), [213, 233, 220]), before = loaded ? roundtrip(roundtrip(live)) : live;
  const after = answer(before, choice); literal(before, after, 213, choice);
  expect(after.popularity).toBe(choice === 0 ? 58 : 62); expect(after.socialMediaFollowers).toBe(choice === 0 ? 1.5 : 1);
  expect(after.pendingEvents.map(event => event.id)).toEqual([233, 220]); expect(after.eventLastFired?.['233']).toBe(year(before));
  return loaded ? roundtrip(roundtrip(after)) : after;
}
function preview(state: CareerState): RandomEvent {
  const held = JSON.stringify(state), run = draws([0.99, 0.99], () => L.getLifeEvents(state));
  expect(run.values).toEqual([0.99, 0.99]); expect(JSON.stringify(state)).toBe(held);
  const cards = run.result.filter(event => event.id === 233); expect(cards).toHaveLength(1); return cards[0];
}

describe('Soccer Career pending popularity and truthful wax statue preview', () => {
  for (const choice of [0, 1] as const) it(`pending popularity missing: JSON233 choice${choice} resolves after213 choice0`, () => {
    const before = precursor(0, true); expect(typeof before.pendingEvents[0].choices[choice].apply).toBe('undefined');
    const after = answer(before, choice), wanted = expected(before, 233, choice);
    const applied = after.popularity === wanted.popularity && after.socialMediaFollowers === wanted.socialMediaFollowers;
    expect(applied, 'pending popularity saved choice lost its actual effect').toBe(true);
    literal(before, after, 233, choice); expect(after.pendingEvents.map(event => event.id)).toEqual([220]);
  });
  it('popularity preview missing: current233 choice0 shows both actual rewards', () => {
    const actual = preview(context()).choices[0].consequence;
    expect(/Followers \+800k/.test(actual) && /Popularity \+4/.test(actual), 'current Life popularity preview omits an actual effect clause').toBe(true);
    expect(actual).toBe(CURRENT);
  });
  it('popularity preview missing: legacy233 choice0 shows both current rewards', () => {
    const before = roundtrip(roundtrip(waiting(context(), [233, 220])));
    before.pendingEvents[0].choices[0].consequence = LEGACY;
    const saved = roundtrip(roundtrip(before)), held = JSON.stringify(saved);
    const actual = C.soccerEventChoiceConsequence(saved, 233, 0, saved.pendingEvents[0].choices[0].consequence);
    expect(/Followers \+800k/.test(actual) && /Popularity \+4/.test(actual), 'legacy saved Life popularity preview still omits an actual effect clause').toBe(true);
    expect(actual).toBe(CURRENT); expect(JSON.stringify(saved)).toBe(held);
  });
  for (const [popularity, offered] of [[59, false], [60, true], [100, true]] as const)
    it(`pending popularity preservation: fresh233 ${offered ? 'is offered' : 'stays absent'} at popularity${popularity}`, () => {
      const before = context(popularity), held = JSON.stringify(before), run = draws([0.99, 0.99], () => L.getLifeEvents(before));
      expect(run.values).toEqual([0.99, 0.99]); expect(run.result.some(event => event.id === 233)).toBe(offered);
      expect(JSON.stringify(before)).toBe(held); expect(before.pendingEvents).toEqual([]); expect(before.eventLastFired).toEqual({});
    });
  for (const choice of [0, 1] as const) it(`pending popularity preservation: live233 choice${choice} resolves after213 choice0`, () => {
    const before = precursor(0, false); expect(typeof before.pendingEvents[0].choices[choice].apply).toBe('function');
    literal(before, answer(before, choice), 233, choice);
  });
  for (const choice of [0, 1] as const) it(`pending popularity preservation: JSON233 choice${choice} resolves after213 choice1`, () => {
    const before = precursor(1, true); expect(typeof before.pendingEvents[0].choices[choice].apply).toBe('undefined');
    literal(before, answer(before, choice), 233, choice);
  });
  for (const choice of [0, 1] as const) it(`pending popularity preservation: precursor213 choice${choice} has its exact saved effect`, () => {
    const before = roundtrip(roundtrip(waiting(context(), [213, 233, 220]))); literal(before, answer(before, choice), 213, choice);
  });
  for (const choice of [0, 1] as const) it(`pending popularity preservation: loaded233 choice${choice} keeps its original threshold effect`, () => {
    const before = roundtrip(roundtrip(waiting(context(), [233, 220]))); expect(before.popularity).toBe(60);
    literal(before, answer(before, choice), 233, choice);
  });
  it('pending popularity preservation: current233 choice1 keeps its exact penalty preview', () => {
    const state = context(), actual = preview(state).choices[1].consequence;
    expect(actual).toBe('Popularity -3, the museum posts the demand letter');
    expect(C.soccerEventChoiceConsequence(state, 233, 1, actual)).toBe(actual);
  });
  it('pending popularity preservation: pending JSON repair keeps the unplayed queue and stamps', () => {
    const before = waiting(context(), [213, 233, 220]), twice = roundtrip(roundtrip(before));
    expect(twice.pendingEvents.map(event => event.id)).toEqual([213, 233, 220]); expect(twice.events).toEqual(before.events);
    expect(twice.lastEventId).toBe(before.lastEventId); expect(twice.eventLastFired).toEqual(before.eventLastFired);
    expect(twice.pendingEvents.every(event => event.choices.every(choice => typeof choice.apply === 'undefined'))).toBe(true);
  });
  it('pending popularity preservation: resolved JSON repair keeps the answer once and preserves continuation', () => {
    for (const choice of [0, 1] as const) {
      const before = roundtrip(roundtrip(waiting(context(), [233, 220]))), after = answer(before, choice); literal(before, after, 233, choice);
      const twice = roundtrip(roundtrip(after)); expect(twice.events.filter(line => line === lines[`233:${choice}`])).toHaveLength(1);
      expect(twice.pendingEvents.map(event => event.id)).toEqual([220]); expect(twice.lastEventId).toBe(233);
      expect(twice.eventLastFired).toEqual(before.eventLastFired);
    }
  });
  it('pending popularity preservation: original233 cooldown has its exact99-season boundary', () => {
    const before = roundtrip(waiting(context(), [233, 220])), event = before.pendingEvents[0], held = JSON.stringify(before);
    expect(E.eventLedgerKey(event)).toBe('233'); expect(E.eventCooldown(event)).toBe(99);
    expect(E.isEventOnCooldown(before, event, year(before))).toBe(true);
    expect(E.isEventOnCooldown(before, event, year(before) + 99)).toBe(true);
    expect(E.isEventOnCooldown(before, event, year(before) + 100)).toBe(false); expect(JSON.stringify(before)).toBe(held);
  });
  it('pending popularity preservation: other saved cards keep their agent persona and acquisition gates', () => {
    const source = waiting({ ...context(), agentId: 'cousin' }, [205, 213, 234, 244, 257]);
    const before = restore({ ...source, personality: 'professor', agentId: 'self', lifeFlags: { lookalike: 1, podcast: 1, energyDrink: 1 } });
    const held = JSON.stringify(before), run = draws([0.99, 0.99, 0.99], () => L.getLifeEvents(before));
    expect(run.values).toEqual([0.99, 0.99, 0.99]);
    for (const id of [205, 213, 234, 244, 257]) expect(run.result.some(event => event.id === id)).toBe(false);
    expect(JSON.stringify(before)).toBe(held);
  });
  it('pending popularity preservation: unknown saved preview keeps its original text', () => {
    const before = context(), held = JSON.stringify(before);
    expect(C.soccerEventChoiceConsequence(before, 9999, 0, LEGACY)).toBe(LEGACY); expect(JSON.stringify(before)).toBe(held);
  });
  it('pending popularity preservation: catalog reads keep the complete input and both original draws', () => {
    const before = roundtrip(roundtrip(waiting(context(), [213, 233, 220]))), held = JSON.stringify(before);
    const run = draws([0.99, 0.99], () => E.getAllEvents(before)); expect(run.values).toEqual([0.99, 0.99]);
    expect(run.result.some(event => event.id === 213)).toBe(true); expect(run.result.some(event => event.id === 233)).toBe(true);
    expect(JSON.stringify(before)).toBe(held); expect(before.eventLastFired).toEqual({ '7777': 2022, '213': 2026, '233': 2026, 'story:squadChatLeak': 2026 });
  });
});
