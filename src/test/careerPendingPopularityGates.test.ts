import { describe, expect, it, vi } from 'vitest';
import type { CareerState, RandomEvent } from '@/lib/soccerCareerEngine';

const E = (process.env.SC_POPULARITY_ENGINE ? await import(/* @vite-ignore */ process.env.SC_POPULARITY_ENGINE)
  : await import('@/lib/soccerCareerEngine')) as typeof import('@/lib/soccerCareerEngine');
const L = (process.env.SC_POPULARITY_LIFE ? await import(/* @vite-ignore */ process.env.SC_POPULARITY_LIFE)
  : await import('@/lib/soccerCareerLife')) as typeof import('@/lib/soccerCareerLife');
const S = (process.env.SC_POPULARITY_SAVE ? await import(/* @vite-ignore */ process.env.SC_POPULARITY_SAVE)
  : await import('@/lib/soccerCareerSave')) as typeof import('@/lib/soccerCareerSave');
type Effect = { money?: number; morale?: number; popularity?: number; followers?: number; integrity?: number;
  sponsor?: number; flag?: [string, number]; relationship?: boolean;
  wheel?: { chance: number; title: string; hit: string; miss: string; yes: Effect; no: Effect } };
type Spec = { id: number; threshold: number; effects: Effect[] };
const SPECS: Spec[] = [
  { id: 225, threshold: 55, effects: [{ money: 1.5, morale: -10, integrity: -3 }, { integrity: 3 }] },
  { id: 234, threshold: 40, effects: [{ money: -0.3, flag: ['lookalike', 2] }, { flag: ['lookalike', 1] }] },
  { id: 241, threshold: 50, effects: [{ integrity: 4, followers: 0.7, morale: 5 }, { followers: 0.3 }] },
  { id: 243, threshold: 45, effects: [{ followers: 2, popularity: 8, wheel: { chance: 0.5,
    title: 'Reality Dating Show Invite', hit: 'You find a relationship', miss: 'Finale argument',
    yes: { relationship: true, morale: 8 }, no: { morale: -3 } } }, {}] },
  { id: 244, threshold: 45, effects: [{ flag: ['podcast', 1], sponsor: 0.2 }, { integrity: 1 }] },
  { id: 248, threshold: 35, effects: [{ popularity: 5, morale: 4 }, { morale: 1, followers: 0.2 }] },
  { id: 253, threshold: 30, effects: [{ followers: 0.5, popularity: 4, morale: 5 }, { morale: -3, followers: 0.1 },
    { wheel: { chance: 0.5, title: 'Your Mum Is In The Comments', hit: 'Fans love the account takeover', miss: 'Sponsor leaves',
      yes: { followers: 1, popularity: 3 }, no: { sponsor: -0.1, morale: -2 } } }] },
  { id: 256, threshold: 35, effects: [{ followers: 0.4, popularity: 3 }, { followers: 0.5, morale: 3 }, { popularity: -3, morale: -2 }] },
  { id: 257, threshold: 30, effects: [{ flag: ['energyDrink', 1], wheel: { chance: 0.25,
    title: 'The Energy Drink Pitch', hit: 'Product recall', miss: 'Sponsorship succeeds',
    yes: { popularity: -5, morale: -3 }, no: { sponsor: 0.25 } } },
    { flag: ['energyDrink', 1], sponsor: 0.1, integrity: 2 }, { flag: ['energyDrink', 1] }] },
  { id: 268, threshold: 25, effects: [{ integrity: 4, morale: 6, wheel: { chance: 0.2,
    title: "The Under Nines' Medal Night", hit: 'Sponsor trims the deal', miss: 'Sponsor reschedules',
    yes: { sponsor: -0.05 }, no: {} } }, { followers: 0.2, integrity: -1 }, { morale: 3, wheel: { chance: 0.3,
    title: "The Under Nines' Medal Night", hit: 'Late to both events', miss: 'You make both events',
    yes: { popularity: -2 }, no: {} } }] },
  { id: 269, threshold: 40, effects: [{ followers: 0.6, popularity: 4 }, { money: -0.02, popularity: 2, morale: 2 },
    { wheel: { chance: 0.5, title: 'Forty Feet, One Typo', hit: 'The typo trends', miss: 'The typo stays on the banner',
      yes: { followers: 0.3 }, no: {} } }] },
];
const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const year = (state: CareerState) => state.seasons[state.seasons.length - 1]!.year;
const clamp = (value: number) => Math.max(0, Math.min(100, value));
function random<T>(value: number, action: () => T): T {
  const draw = vi.spyOn(Math, 'random').mockReturnValue(value);
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-16T12:00:00Z'));
  try { return action(); } finally { draw.mockRestore(); clock.mockRestore(); }
}
function restore(state: CareerState): CareerState {
  const saved = json(state);
  expect(S.isSoccerCareerSave(saved), 'prepared fictional save must pass the actual save validator').toBe(true);
  return E.repairCareer(saved);
}
function career(popularity: number): CareerState {
  return random(0.9, () => {
    const stats = { pace: 80, shooting: 80, passing: 80, dribbling: 80, defending: 80, physical: 80, reflexes: 80 };
    const initial = E.initCareer('Pending Popularity Fixture', 'England', 'CM', '2020s', stats, 80, 2020, E.FALLBACK_CLUBS, null, 94);
    const club = E.FALLBACK_CLUBS[0];
    return restore({ ...initial, age: 30, phase: 'random_events', retired: false, personality: 'iceman', agentId: 'self',
      currentClub: club.name, currentClubCountry: club.country, currentClubTier: club.tier,
      currentClubColor: club.color, currentLeague: club.league, contractYearsLeft: 4, weeklyWage: 10000,
      seasons: [{ ...initial.seasons[0], year: 2026, age: 30, club: club.name, clubCountry: club.country,
        clubTier: club.tier, type: 'playing', apps: 24, leagueApps: 20, goals: 4, assists: 6, rating: 7,
        injury: null, injuryWeeks: 0, injurySevere: false }],
      popularity, netWorth: 10, morale: 65, integrityBonus: 5, socialMediaFollowers: 2, sponsorBonus: 0.4,
      hasRelationship: false, family: { ...initial.family, isMarried: false }, lifeFlags: {}, eventLastFired: {},
      pendingEvents: [], events: ['Prepared fictional popularity queue'], chanceWheel: undefined });
  });
}
function card(state: CareerState, id: number): RandomEvent {
  const matches = random(0.1, () => L.getLifeEvents(state).filter(event => event.id === id));
  expect(matches, `actual Life catalog must offer fixture card ${id}`).toHaveLength(1);
  return matches[0];
}
function liveCopy(state: CareerState): CareerState { return { ...json(state), pendingEvents: state.pendingEvents }; }
function answer(state: CareerState, choice: number, roll = 0.99): CareerState {
  return random(roll, () => E.applyEventChoice(liveCopy(state), choice, E.FALLBACK_CLUBS));
}
function dropped(spec: Spec): CareerState {
  const state = career(spec.threshold), pendingEvents = [card(state, 213), card(state, spec.id), card(state, 220)];
  const queued: CareerState = { ...state, pendingEvents, eventLastFired: { ...state.eventLastFired, '7777': year(state) - 4 } };
  for (const event of pendingEvents) queued.eventLastFired[E.eventLedgerKey(event)] = year(state);
  const after = answer(queued, 0);
  expect(after.popularity).toBe(spec.threshold - 2);
  expect(after.socialMediaFollowers).toBe(2.5);
  expect(after.pendingEvents.map(event => event.id)).toEqual([spec.id, 220]);
  return after;
}
function literal(before: CareerState, after: CareerState, spec: Spec, choice: number, roll: number): void {
  const expected = json(before), effect = spec.effects[choice];
  const change = (delta: Effect) => {
    expected.netWorth = Math.round((expected.netWorth + (delta.money ?? 0)) * 100) / 100;
    expected.socialMediaFollowers = Math.round((expected.socialMediaFollowers + (delta.followers ?? 0)) * 100) / 100;
    expected.morale = clamp(expected.morale + (delta.morale ?? 0)); expected.popularity = clamp(expected.popularity + (delta.popularity ?? 0));
    expected.integrityBonus += delta.integrity ?? 0;
    if (delta.sponsor !== undefined) expected.sponsorBonus = Math.round(((expected.sponsorBonus ?? 0) + delta.sponsor) * 100) / 100;
    if (delta.flag) expected.lifeFlags = { ...expected.lifeFlags, [delta.flag[0]]: delta.flag[1] };
    if (delta.relationship !== undefined) expected.hasRelationship = delta.relationship;
  };
  change(effect);
  if (effect.wheel) {
    const wheel = effect.wheel, hit = roll < wheel.chance;
    change(hit ? wheel.yes : wheel.no);
    expected.chanceWheel = { title: wheel.title, chance: wheel.chance, roll, hit: wheel.hit, miss: wheel.miss, result: hit, seen: false };
  }
  expected.lastEventId = spec.id; expected.pendingEvents = expected.pendingEvents.slice(1); expected.phase = 'random_events';
  expected.overall = E.calcOverall(expected, expected.position);
  expect(after.events.slice(0, before.events.length)).toEqual(before.events);
  expect(after.events).toHaveLength(before.events.length + 1);
  expect(after.events[after.events.length - 1].trim().length).toBeGreaterThan(0);
  expect({ ...json(after), events: before.events }).toEqual({ ...expected, events: before.events });
  expect(after.eventLastFired).toEqual(before.eventLastFired);
  expect(after.pendingEvents.map(event => event.id)).toEqual([220]);
}

describe('Soccer Career pending popularity gates', () => {
  for (const spec of SPECS) {
    it(`pending popularity missing: ${spec.id} keeps offered choices after a popularity drop and reload`, () => {
      const live = dropped(spec), held = json(live);
      expect(live.pendingEvents[0].choices).toHaveLength(spec.effects.length);
      for (let choice = 0; choice < spec.effects.length; choice++) for (const roll of spec.effects[choice].wheel ? [0.01, 0.99] : [0.99]) {
        const liveAfter = answer(live, choice, roll);
        literal(live, liveAfter, spec, choice, roll);
        const saved = restore(live);
        expect(typeof saved.pendingEvents[0].choices[choice].apply).toBe('undefined');
        const resolved = random(0.99, () => L.getLifeEvents(saved).find(event => event.id === spec.id));
        expect(typeof resolved?.choices[choice]?.apply === 'function', `pending popularity ${spec.id} callback missing after reload`).toBe(true);
        const savedAfter = answer(saved, choice, roll);
        literal(saved, savedAfter, spec, choice, roll);
        expect(json(savedAfter)).toEqual(json(liveAfter));
        expect(json(restore(savedAfter))).toEqual(json(savedAfter));
        expect(json(live)).toEqual(held);
      }
    });
  }
  it('pending popularity preservation: fresh offers keep every original threshold', () => {
    for (const spec of SPECS) {
      expect(random(0.99, () => L.getLifeEvents(career(spec.threshold - 1)).some(event => event.id === spec.id))).toBe(false);
      expect(random(0.99, () => L.getLifeEvents(career(spec.threshold)).some(event => event.id === spec.id))).toBe(true);
    }
  });
  it('pending popularity preservation: an unrelated pending card never unlocks a fresh offer', () => {
    for (const spec of SPECS) {
      const state = career(spec.threshold - 2), pendingEvents = [card(state, 220)];
      expect(random(0.99, () => L.getLifeEvents({ ...state, pendingEvents }).some(event => event.id === spec.id))).toBe(false);
    }
  });
  it('pending popularity preservation: queued cards retain age relationship and story guards', () => {
    const blockers: [number, (state: CareerState) => CareerState][] = [
      [225, state => ({ ...state, age: 25 })], [234, state => ({ ...state, lifeFlags: { lookalike: 2 } })],
      [243, state => ({ ...state, hasRelationship: true })], [243, state => ({ ...state, family: { ...state.family, isMarried: true } })],
      [244, state => ({ ...state, lifeFlags: { podcast: 1 } })], [257, state => ({ ...state, lifeFlags: { energyDrink: 1 } })],
    ];
    for (const [id, block] of blockers) {
      const spec = SPECS.find(item => item.id === id)!;
      const before = restore(block(dropped(spec))), held = json(before);
      expect(random(0.99, () => L.getLifeEvents(before).some(event => event.id === id))).toBe(false);
      const after = answer(before, 0), expected = json(before);
      expected.lastEventId = id; expected.pendingEvents = expected.pendingEvents.slice(1); expected.phase = 'random_events';
      delete expected.eventLastFired[E.eventLedgerKey(before.pendingEvents[0])];
      expect(json(after)).toEqual(expected);
      expect(json(before)).toEqual(held);
    }
  });
  it('pending popularity preservation: existing wax statue queue still resolves both choices', () => {
    const spec: Spec = { id: 233, threshold: 60, effects: [{ followers: 0.8, popularity: 4 }, { popularity: -3 }] };
    for (const choice of [0, 1]) {
      const before = restore(dropped(spec));
      literal(before, answer(before, choice), spec, choice, 0.99);
    }
  });
});
