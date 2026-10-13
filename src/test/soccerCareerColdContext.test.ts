import { describe, expect, it, vi } from 'vitest';
import type { CareerState, RandomEvent } from '@/lib/soccerCareerEngine';

const E = (process.env.SC_COLD_ENGINE ? await import(/* @vite-ignore */ process.env.SC_COLD_ENGINE)
  : await import('@/lib/soccerCareerEngine')) as typeof import('@/lib/soccerCareerEngine');
const A = (process.env.SC_COLD_REALISM ? await import(/* @vite-ignore */ process.env.SC_COLD_REALISM)
  : await import('@/lib/soccerCareerRealismA')) as typeof import('@/lib/soccerCareerRealismA');
const S = (process.env.SC_COLD_SAVE ? await import(/* @vite-ignore */ process.env.SC_COLD_SAVE)
  : await import('@/lib/soccerCareerSave')) as typeof import('@/lib/soccerCareerSave');
const P = (process.env.SC_COLD_PARENT_REALISM ? await import(/* @vite-ignore */ process.env.SC_COLD_PARENT_REALISM)
  : A) as typeof import('@/lib/soccerCareerRealismA');
const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const clamp = (value: number) => Math.max(0, Math.min(100, value));
type Choice = 0 | 1 | 2;

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
  expect(run.values, 'canonical JSON repair consumes no answer draws').toEqual([]);
  expect(JSON.stringify(run.result)).toBe(held); expect(JSON.stringify(state)).toBe(held); return run.result;
}
function context(country = 'Brazil', morale = 60): CareerState {
  return restore(draws(0.9, () => {
    const stats = { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70, reflexes: 70 };
    const base = E.initCareer('Cold Context Fixture', 'England', 'CM', '2020s', stats, 70, 2020, E.FALLBACK_CLUBS, null, 90);
    return { ...base, age: 23, phase: 'playing', retired: false, personality: 'iceman', agentId: 'self',
      currentClub: 'Fixture Rovers', currentClubCountry: country, currentClubTier: 2, currentClubColor: '#238647',
      currentLeague: 'Fixture League', contractYearsLeft: 4, weeklyWage: 10000, netWorth: 10, morale,
      popularity: 60, socialMediaFollowers: 1, integrityBonus: 5, sponsorBonus: 0.2, marketValue: 4, isLeader: false,
      seasons: [{ ...base.seasons[0], year: 2026, age: 23, club: 'Fixture Rovers', clubCountry: country, clubTier: 2,
        type: 'playing', apps: 24, leagueApps: 20, goals: 4, assists: 6, rating: 7, injury: null, injuryWeeks: 0, injurySevere: false }],
      lifeFlags: {}, eventLastFired: {}, pendingEvents: [], seriousInjuries: [],
      statBoostNextSeason: { pace: -1, physical: 2, reflexes: 3 }, events: ['Prepared fictional legacy cold-card context'] } as CareerState;
  }).result);
}
function catalog(state: CareerState): RandomEvent[] {
  const held = JSON.stringify(state), run = draws([0.99, 0.99], () => E.getAllEvents(state));
  expect(run.values).toEqual([0.99, 0.99]); expect(JSON.stringify(state)).toBe(held); return run.result;
}
function legacyCard(): Omit<RandomEvent, 'choices'> & { choices: Omit<RandomEvent['choices'][number], 'apply'>[] } {
  // Complete original serialized426 presentation, checked against the compiled parent.
  return { id: 426, emoji: '❄️', title: 'Minus Twenty And The League Plays On',
    description: 'The pitch is heated. The air is not. Your eyelashes froze during the anthem and a substitute lost feeling in three fingers before he got on.',
    category: 'life', choices: [
      { label: 'Buy the squad proper cold weather kit: €60k', emoji: '🧤', color: 'bg-emerald-600', consequence: 'Net worth -€60k, Morale +8, you lead the room' },
      { label: 'Train in it every day until it stops mattering', emoji: '🥶', color: 'bg-blue-600', consequence: 'Physical +3 next season, Morale -4' },
      { label: 'Book yourself a warm weather camp in the break: €150k', emoji: '🌴', color: 'bg-amber-600', consequence: 'Net worth -€150k, Pace +2 next season, Morale +7' },
    ] };
}
function waiting(): CareerState {
  const state = context(), originalInput: CareerState = process.env.SC_COLD_PARENT_REALISM ? state
    : { ...state, phase: 'random_events', pendingEvents: [legacyCard() as RandomEvent] };
  expect(S.isSoccerCareerSave(json(originalInput))).toBe(true);
  const held = JSON.stringify(originalInput), parent = draws([], () => P.getRealismEventsA(originalInput));
  expect(parent.values).toEqual([]); expect(JSON.stringify(originalInput)).toBe(held);
  const winter = parent.result.filter(event => event.id === 426); expect(winter, 'actual original parent426 must be available').toHaveLength(1);
  expect(json(winter[0])).toEqual(legacyCard());
  const remaining = catalog(state).filter(event => event.id === 220); expect(remaining).toHaveLength(1);
  // Explicit prepared legacy presentation from the actual parent, not picker delivery.
  const live: CareerState = { ...state, phase: 'random_events', pendingEvents: [winter[0], remaining[0]],
    eventLastFired: { '7777': 2022, '426': 2026, 'story:squadChatLeak': 2026 } };
  return { ...restore(live), pendingEvents: live.pendingEvents };
}
function answer(state: CareerState, choice: Choice): CareerState {
  const held = JSON.stringify(state), queue = state.pendingEvents, run = draws([0.99, 0.99], () => E.applyEventChoice(state, choice, E.FALLBACK_CLUBS));
  expect(run.values, 'both original catalog draws remain and426 choices add no effect draw').toEqual([0.99, 0.99]);
  expect(JSON.stringify(state)).toBe(held); expect(state.pendingEvents).toBe(queue); return run.result;
}
function expected(before: CareerState, choice: Choice): CareerState {
  const after = json(before);
  after.morale = clamp(before.morale + [8, -4, 7][choice]);
  if (choice === 0) { after.netWorth = Math.round((before.netWorth - 0.06) * 100) / 100; after.isLeader = true; }
  if (choice === 1) after.statBoostNextSeason.physical = (before.statBoostNextSeason.physical ?? 0) + 3;
  if (choice === 2) { after.netWorth = Math.round((before.netWorth - 0.15) * 100) / 100; after.statBoostNextSeason.pace = (before.statBoostNextSeason.pace ?? 0) + 2; }
  after.events = [...before.events, [
    '❄️ Bought the whole squad arctic grade base layers. Two lads cried, possibly from the cold',
    '❄️ Trained outside all winter in minus twenty. Came out the other side basically weatherproof',
    '❄️ Spent the winter break at a private warm weather camp. Came back tanned, sharp and slightly resented',
  ][choice]];
  after.lastEventId = 426; after.pendingEvents = json(before.pendingEvents.slice(1)); after.phase = 'random_events'; after.overall = 70; return after;
}
function literal(before: CareerState, after: CareerState, choice: Choice): void {
  expect(before.pendingEvents[0].id).toBe(426); expect(json(after)).toEqual(expected(before, choice));
  expect(after.eventLastFired).toEqual({ '7777': 2022, '426': 2026, 'story:squadChatLeak': 2026 });
  expect(after.chanceWheel).toBe(before.chanceWheel); expect(json(roundtrip(roundtrip(after)))).toEqual(json(after));
}

describe('Soccer Career cold context and saved winter choices', () => {
  for (const country of ['Brazil', 'England', 'Finland', ''] as const)
    it(`cold context missing: fresh426 stays absent with ${country || 'empty'} country`, () => {
      const before = context(country), held = JSON.stringify(before), run = draws([], () => A.getRealismEventsA(before));
      expect(run.values).toEqual([]); expect(JSON.stringify(before)).toBe(held);
      expect(!run.result.some(event => event.id === 426), 'fresh extreme cold card has no supported saved weather context').toBe(true);
      expect(catalog(before).some(event => event.id === 426)).toBe(false); expect(before.pendingEvents).toEqual([]);
    });
  for (const choice of [0, 1, 2] as const) it(`cold context preservation: live426 choice${choice} keeps its original whole effect`, () => {
    for (const morale of [60, 0, 100]) {
      const before = { ...waiting(), morale }; expect(typeof before.pendingEvents[0].choices[choice].apply).toBe('function');
      literal(before, answer(before, choice), choice);
    }
  });
  for (const choice of [0, 1, 2] as const) it(`cold context preservation: JSON426 choice${choice} keeps its effect after a club country change`, () => {
    const before = roundtrip(roundtrip({ ...waiting(), currentClub: 'Second Fixture Club', currentClubCountry: 'Finland', currentLeague: 'Second Fixture League' }));
    expect(typeof before.pendingEvents[0].choices[choice].apply).toBe('undefined'); literal(before, answer(before, choice), choice);
    expect(before.currentClubCountry).toBe('Finland'); expect(before.seasons[0].clubCountry).toBe('Brazil');
  });
  it('cold context preservation: saved426 keeps every original label caption and card field', () => {
    const before = roundtrip(roundtrip(waiting())), held = JSON.stringify(before), run = draws([], () => A.getRealismEventsA(before));
    expect(run.values).toEqual([]); expect(JSON.stringify(before)).toBe(held);
    expect(json(run.result.find(event => event.id === 426))).toEqual(before.pendingEvents[0]);
    expect(before.pendingEvents[0].choices.map(choice => [choice.label, choice.consequence])).toEqual([
      ['Buy the squad proper cold weather kit: €60k', 'Net worth -€60k, Morale +8, you lead the room'],
      ['Train in it every day until it stops mattering', 'Physical +3 next season, Morale -4'],
      ['Book yourself a warm weather camp in the break: €150k', 'Net worth -€150k, Pace +2 next season, Morale +7'],
    ]);
  });
  it('cold context preservation: pending JSON repair keeps the whole unplayed queue and stamps', () => {
    const before = waiting(), twice = roundtrip(roundtrip(before)); expect(json(twice)).toEqual(json(before));
    expect(twice.pendingEvents.map(event => event.id)).toEqual([426, 220]);
    expect(twice.pendingEvents.every(event => event.choices.every(choice => typeof choice.apply === 'undefined'))).toBe(true);
  });
  it('cold context preservation: resolved JSON repair keeps its answer once and continuation', () => {
    for (const choice of [0, 1, 2] as const) {
      const before = roundtrip(roundtrip(waiting())), after = answer(before, choice); literal(before, after, choice);
      const twice = roundtrip(roundtrip(after)), wanted = expected(before, choice).events;
      expect(twice.events.filter(line => line === wanted[wanted.length - 1])).toHaveLength(1);
      expect(twice.pendingEvents.map(event => event.id)).toEqual([220]); expect(twice.lastEventId).toBe(426);
    }
  });
  it('cold context preservation: original426 cooldown keeps its exact two-season boundary', () => {
    const before = roundtrip(waiting()), event = before.pendingEvents[0], held = JSON.stringify(before);
    expect(E.eventLedgerKey(event)).toBe('426'); expect(E.eventCooldown(event)).toBe(2);
    expect(E.isEventOnCooldown(before, event, 2026)).toBe(true); expect(E.isEventOnCooldown(before, event, 2028)).toBe(true);
    expect(E.isEventOnCooldown(before, event, 2029)).toBe(false); expect(JSON.stringify(before)).toBe(held);
  });
  it('cold context preservation: unrelated RealismA cards keep their original context gates', () => {
    for (const state of [context(), { ...context('England'), netWorth: 0, currentClubTier: 1, popularity: 0 },
      { ...context(), currentClubTier: 3, lifeFlags: { rMumHouse: 1, rKitSystem: 1 } }]) {
      const held = JSON.stringify(state), current = draws([], () => A.getRealismEventsA(state)), original = draws([], () => P.getRealismEventsA(state));
      expect(current.values).toEqual([]); expect(original.values).toEqual([]); expect(JSON.stringify(state)).toBe(held);
      expect(json(current.result.filter(event => event.id !== 426))).toEqual(json(original.result.filter(event => event.id !== 426)));
      expect(current.result.some(event => event.id === 430)).toBe(state.currentClubTier >= 3);
      expect(current.result.some(event => event.id === 429)).toBe(!!state.currentClubCountry && state.currentClubCountry !== state.nationality);
    }
  });
  it('cold context preservation: catalog reads keep the complete input and original draws', () => {
    const before = roundtrip(roundtrip(waiting())), held = JSON.stringify(before), all = catalog(before);
    expect(all.some(event => event.id === 426)).toBe(true); expect(all.some(event => event.id === 220)).toBe(true);
    expect(JSON.stringify(before)).toBe(held); expect(before.eventLastFired).toEqual({ '7777': 2022, '426': 2026, 'story:squadChatLeak': 2026 });
  });
});
