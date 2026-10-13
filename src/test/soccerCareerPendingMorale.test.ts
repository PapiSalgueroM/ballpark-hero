import { describe, expect, it, vi } from 'vitest';
import type { CareerState, RandomEvent } from '@/lib/soccerCareerEngine';

const E = (process.env.SC_MORALE_ENGINE ? await import(/* @vite-ignore */ process.env.SC_MORALE_ENGINE)
  : await import('@/lib/soccerCareerEngine')) as typeof import('@/lib/soccerCareerEngine');
const L = (process.env.SC_MORALE_LIFE ? await import(/* @vite-ignore */ process.env.SC_MORALE_LIFE)
  : await import('@/lib/soccerCareerLife')) as typeof import('@/lib/soccerCareerLife');
const S = (process.env.SC_MORALE_SAVE ? await import(/* @vite-ignore */ process.env.SC_MORALE_SAVE)
  : await import('@/lib/soccerCareerSave')) as typeof import('@/lib/soccerCareerSave');
const C = (process.env.SC_MORALE_CONTRACTS ? await import(/* @vite-ignore */ process.env.SC_MORALE_CONTRACTS)
  : await import('@/lib/soccerCareerContracts')) as typeof import('@/lib/soccerCareerContracts');
const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const year = (state: CareerState) => state.seasons[state.seasons.length - 1]!.year;
const clamp = (value: number) => Math.max(0, Math.min(100, value));
type Choice = 0 | 1;
type Id = 221 | 222 | 223;
function draws<T>(value: number, action: () => T): { result: T; values: number[] } {
  const values: number[] = [], spy = vi.spyOn(Math, 'random').mockImplementation(() => { values.push(value); return value; });
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
function context(morale = 60): CareerState {
  return restore(draws(0.9, () => {
    const stats = { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70, reflexes: 70 };
    const base = E.initCareer('Pending Morale Fixture', 'England', 'CM', '2020s', stats, 70, 2020, E.FALLBACK_CLUBS, null, 90);
    const club = E.FALLBACK_CLUBS[0];
    return { ...base, age: 23, phase: 'playing', retired: false, personality: 'professor', agentId: 'self',
      currentClub: club.name, currentClubCountry: club.country, currentClubTier: club.tier, currentClubColor: club.color,
      currentLeague: club.league, contractYearsLeft: 4, weeklyWage: 10000, netWorth: 10, morale,
      popularity: 40, socialMediaFollowers: 1, integrityBonus: 5, sponsorBonus: 0.2, marketValue: 4,
      seasons: [{ ...base.seasons[0], year: 2026, age: 23, club: club.name, clubCountry: club.country, clubTier: club.tier,
        type: 'playing', apps: 24, leagueApps: 20, goals: 4, assists: 6, rating: 7, injury: null, injuryWeeks: 0, injurySevere: false }],
      lifeFlags: {}, eventLastFired: {}, pendingEvents: [], seriousInjuries: [],
      statBoostNextSeason: { physical: 2, reflexes: 3 }, events: ['Prepared fictional pending morale context'] } as CareerState;
  }).result);
}
function catalog(state: CareerState): RandomEvent[] {
  const held = JSON.stringify(state), run = draws(0.99, () => E.getAllEvents(state));
  expect(run.values, 'held professor catalog has exactly its two original offer draws').toEqual([0.99, 0.99]);
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
  const held = JSON.stringify(state), queue = state.pendingEvents, run = draws(0.99, () => E.applyEventChoice(state, choice, E.FALLBACK_CLUBS));
  expect(run.values, 'lookup keeps its two original draws and these choices add no draw').toEqual([0.99, 0.99]);
  expect(JSON.stringify(state)).toBe(held); expect(state.pendingEvents).toBe(queue); return run.result;
}
const lines = {
  '221:0': '🎶 Posted your own karaoke disaster. Instant classic',
  '222:0': '🚗 Drove nine hours overnight and still made kickoff',
  '222:1': '🛫 Missed a match by boarding the wrong plane. Iconic, unfortunately',
  '223:0': '🎧 Won the aux cord war. The whale era is over',
  '223:1': '📋 Negotiated the aux schedule. Whales on Wednesdays only',
} as const;
function expected(before: CareerState, id: Id, choice: Choice): CareerState {
  const after = json(before);
  if (id === 221 && choice === 0) { after.socialMediaFollowers = Math.round((before.socialMediaFollowers + 1) * 100) / 100; after.popularity = clamp(before.popularity + 4); }
  else if (id === 222 && choice === 0) { after.morale = clamp(before.morale + 6); after.statBoostNextSeason = { ...before.statBoostNextSeason, physical: (before.statBoostNextSeason.physical ?? 0) - 1 }; }
  else if (id === 222 && choice === 1) { after.morale = clamp(before.morale - 5); after.socialMediaFollowers = Math.round((before.socialMediaFollowers + 0.3) * 100) / 100; }
  else if (id === 223 && choice === 0) after.morale = clamp(before.morale + 6);
  else if (id === 223 && choice === 1) { after.morale = clamp(before.morale + 3); after.integrityBonus = before.integrityBonus + 1; }
  else throw new Error('Unexpected literal fixture choice');
  const line = lines[`${id}:${choice}` as keyof typeof lines];
  after.events = [...before.events, line]; after.lastEventId = id; after.pendingEvents = json(before.pendingEvents.slice(1));
  after.phase = 'random_events'; after.overall = 70; return after;
}
function literal(before: CareerState, after: CareerState, id: Id, choice: Choice): void {
  expect(before.pendingEvents[0].id).toBe(id); expect(json(after)).toEqual(expected(before, id, choice));
  expect(after.eventLastFired?.[String(id)]).toBe(year(before)); expect(after.eventLastFired?.['7777']).toBe(year(before) - 4);
  expect(after.chanceWheel).toBe(before.chanceWheel); expect(json(roundtrip(roundtrip(after)))).toEqual(json(after));
}
function precursor(choice: Choice, loaded: boolean): CareerState {
  const live = waiting(context(), [223, 222, 220]), before = loaded ? roundtrip(live) : live;
  const after = answer(before, choice); literal(before, after, 223, choice);
  expect(after.morale).toBe(choice === 0 ? 66 : 63); expect(after.pendingEvents.map(event => event.id)).toEqual([222, 220]);
  expect(after.eventLastFired?.['222']).toBe(year(before)); return loaded ? roundtrip(after) : after;
}
function loadedOutcome(first: Choice, second: Choice): void {
  const before = precursor(first, true), held = JSON.stringify(before);
  expect(typeof before.pendingEvents[0].choices[second].apply).toBe('undefined');
  const after = answer(before, second), wanted = expected(before, 222, second);
  const applied = after.morale === wanted.morale && (second === 0
    ? after.statBoostNextSeason.physical === wanted.statBoostNextSeason.physical
    : after.socialMediaFollowers === wanted.socialMediaFollowers);
  expect(applied, 'pending morale saved choice lost its actual effect').toBe(true);
  literal(before, after, 222, second); expect(JSON.stringify(before)).toBe(held);
  expect(after.pendingEvents.map(event => event.id)).toEqual([220]);
}
const previews: { id: Id; choice: Choice; clauses: RegExp[]; legacy: string }[] = [
  { id: 221, choice: 0, clauses: [/Followers \+1M/, /Popularity \+4/], legacy: 'Followers +1M, the people love a bad singer' },
  { id: 222, choice: 1, clauses: [/Morale -5/, /Followers \+300k/], legacy: 'Morale -5, the story becomes a documentary punchline' },
  { id: 223, choice: 1, clauses: [/Morale \+3/, /Integrity \+1/], legacy: 'Diplomacy: Morale +3, whales on Wednesdays' },
];

describe('Soccer Career pending morale and truthful Life previews', () => {
  for (const first of [0, 1] as const) for (const second of [0, 1] as const)
    it(`pending morale missing: JSON222 choice${second} resolves after223 choice${first}`, () => loadedOutcome(first, second));
  for (const preview of previews) it(`morale preview missing: ${preview.id} choice${preview.choice} shows the actual effect`, () => {
    const state = context(), held = JSON.stringify(state), actual = draws(0.99, () => L.getLifeEvents(state)).result.find(event => event.id === preview.id);
    expect(actual, 'actual source preview card must exist').toBeDefined();
    expect(preview.clauses.every(clause => clause.test(actual!.choices[preview.choice].consequence)),
      'current Life morale preview omits an actual effect clause').toBe(true);
    const displayed = C.soccerEventChoiceConsequence(state, preview.id, preview.choice, preview.legacy);
    expect(preview.clauses.every(clause => clause.test(displayed)), 'legacy saved Life morale preview still omits an actual effect clause').toBe(true);
    expect(JSON.stringify(state)).toBe(held); expect(C.soccerEventChoiceConsequence(state, 9999, 0, preview.legacy)).toBe(preview.legacy);
    const before = roundtrip(waiting(state, [preview.id, 220])), after = answer(before, preview.choice);
    expect(before.pendingEvents[0].choices[preview.choice].consequence).toBe(actual!.choices[preview.choice].consequence);
    literal(before, after, preview.id, preview.choice);
  });
  for (const [morale, offered] of [[60, true], [61, false], [100, false]] as const)
    it(`pending morale preservation: fresh222 ${offered ? 'is offered' : 'stays absent'} at morale${morale}`, () => {
      const before = context(morale), held = JSON.stringify(before), run = draws(0.99, () => L.getLifeEvents(before));
      expect(run.values).toEqual([0.99, 0.99]); expect(run.result.some(event => event.id === 222)).toBe(offered);
      expect(JSON.stringify(before)).toBe(held); expect(before.pendingEvents).toEqual([]); expect(before.eventLastFired).toEqual({});
    });
  for (const first of [0, 1] as const) for (const second of [0, 1] as const)
    it(`pending morale preservation: live222 choice${second} resolves after223 choice${first}`, () => {
      const before = precursor(first, false); expect(typeof before.pendingEvents[0].choices[second].apply).toBe('function');
      const after = answer(before, second); literal(before, after, 222, second); expect(after.pendingEvents.map(event => event.id)).toEqual([220]);
    });
  for (const choice of [0, 1] as const) it(`pending morale preservation: loaded222 choice${choice} keeps its original low-morale effect`, () => {
    const before = roundtrip(waiting(context(), [222, 220])); expect(before.morale).toBe(60);
    expect(typeof before.pendingEvents[0].choices[choice].apply).toBe('undefined'); literal(before, answer(before, choice), 222, choice);
  });
  for (const choice of [0, 1] as const) it(`pending morale preservation: precursor223 choice${choice} has its exact saved effect`, () => {
    const before = roundtrip(waiting(context(), [223, 222, 220])), after = answer(before, choice);
    literal(before, after, 223, choice); expect(after.pendingEvents.map(event => event.id)).toEqual([222, 220]);
  });
  it('pending morale preservation: pending JSON repair keeps the unplayed queue and stamps', () => {
    const before = waiting(context(), [223, 222, 220]), once = roundtrip(before), twice = roundtrip(once);
    expect(twice.pendingEvents.map(event => event.id)).toEqual([223, 222, 220]); expect(twice.events).toEqual(before.events);
    expect(twice.lastEventId).toBe(before.lastEventId); expect(twice.eventLastFired).toEqual(before.eventLastFired);
    expect(twice.pendingEvents.every(event => event.choices.every(choice => typeof choice.apply === 'undefined'))).toBe(true);
  });
  it('pending morale preservation: resolved JSON repair keeps the answer once and preserves continuation', () => {
    for (const choice of [0, 1] as const) {
      const before = roundtrip(waiting(context(), [222, 220])), after = answer(before, choice); literal(before, after, 222, choice);
      const once = roundtrip(after), twice = roundtrip(once);
      expect(twice.events.filter(line => line === lines[`222:${choice}`])).toHaveLength(1);
      expect(twice.pendingEvents.map(event => event.id)).toEqual([220]); expect(twice.lastEventId).toBe(222);
      expect(E.eventCooldown(before.pendingEvents[0])).toBe(99);
      expect(E.isEventOnCooldown(twice, before.pendingEvents[0], year(twice) + 1)).toBe(true);
      expect(twice.eventLastFired).toEqual(before.eventLastFired);
    }
  });
});
