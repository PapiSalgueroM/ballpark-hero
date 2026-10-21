import { describe, expect, it, vi } from 'vitest';
import type { CareerState, RandomEvent } from '@/lib/soccerCareerEngine';
import { validChanceWheel } from '@/lib/careerChanceWheel';

const E = (process.env.SC_PENDING_ENGINE ? await import(/* @vite-ignore */ process.env.SC_PENDING_ENGINE)
  : await import('@/lib/soccerCareerEngine')) as typeof import('@/lib/soccerCareerEngine');
const L = (process.env.SC_PENDING_LIFE ? await import(/* @vite-ignore */ process.env.SC_PENDING_LIFE)
  : await import('@/lib/soccerCareerLife')) as typeof import('@/lib/soccerCareerLife');
const S = (process.env.SC_PENDING_SAVE ? await import(/* @vite-ignore */ process.env.SC_PENDING_SAVE)
  : await import('@/lib/soccerCareerSave')) as typeof import('@/lib/soccerCareerSave');
type Effect = { followers?: number; morale?: number; popularity?: number; integrity?: number; money?: number;
  market?: number; sponsor?: number; agent?: string; boost?: CareerState['statBoostNextSeason'];
  wheel?: { chance: number; title: string; hit: string; miss: string; hitEffect: Effect; missEffect: Effect } };
type Spec = { id: number; rate: number; cooldown: number; agent?: string; personality?: string; podcast?: number; effects: Effect[] };
const SPEC: Spec[] = [
  { id: 205, rate: 0.6, cooldown: 2, agent: 'cousin', effects: [{ followers: 0.4, morale: -3 }, { agent: 'self', morale: -5 }] },
  { id: 206, rate: 0.4, cooldown: 2, agent: 'cousin', effects: [{ followers: 0.6, boost: { physical: 1 } }, { morale: -4 }] },
  { id: 207, rate: 0.4, cooldown: 2, agent: 'shark', effects: [{ morale: 5 }, { agent: 'self' }, { market: 3, integrity: -2 }] },
  { id: 208, rate: 0.4, cooldown: 2, agent: 'super', effects: [{ market: 5, morale: -5, integrity: -2 }, { morale: 5, integrity: 3 }] },
  { id: 210, rate: 0.5, cooldown: 2, personality: 'showman', effects: [{ followers: 1.5, wheel: { chance: 0.15,
    title: 'The Halftime Backflip', hit: 'Hamstring tweaked', miss: 'Backflip lands safely', hitEffect: {}, missEffect: {} } }, {}] },
  { id: 211, rate: 0.35, cooldown: 99, personality: 'showman', effects: [{ sponsor: 0.3 }, { integrity: 4, popularity: 4 }] },
  { id: 212, rate: 0.5, cooldown: 2, personality: 'iceman', effects: [{ integrity: 3, popularity: 5 }, { popularity: 2, morale: 2 }] },
  { id: 213, rate: 0.35, cooldown: 2, personality: 'iceman', effects: [{ followers: 0.5, popularity: -2 }, { popularity: 2 }] },
  { id: 214, rate: 0.5, cooldown: 2, personality: 'hothead', effects: [{ money: -0.2, boost: { physical: 1 } }, { integrity: 2, followers: 0.3 }] },
  { id: 215, rate: 0.35, cooldown: 2, personality: 'hothead', effects: [{ morale: 8, money: -0.1 }, { integrity: 3, morale: 3 }] },
  { id: 216, rate: 0.5, cooldown: 2, personality: 'professor', effects: [{ boost: { passing: 1 }, morale: 5 }, { integrity: 2, morale: 3 }] },
  { id: 217, rate: 0.35, cooldown: 99, personality: 'professor', effects: [{ popularity: 4, morale: -3 }, {}] },
  { id: 218, rate: 0.5, cooldown: 2, personality: 'enigma', effects: [{ wheel: { chance: 0.6,
    title: 'The Monastery Offseason', hit: 'Sharper after the retreat', miss: 'Pace drops by 1', hitEffect: {}, missEffect: {} } }, { morale: 3 }] },
  { id: 219, rate: 0.35, cooldown: 99, personality: 'enigma', effects: [{ followers: 0.8, wheel: { chance: 0.5,
    title: 'The Cape Era', hit: 'The cape is loved', miss: 'The cape divides opinion', hitEffect: { popularity: 6 }, missEffect: { popularity: -3 } } }, {}] },
  { id: 245, rate: 0.4, cooldown: 1, podcast: 1, effects: [{ followers: 0.8, popularity: -5 }, { followers: 1.5, integrity: 2 }] },
];
const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const year = (state: CareerState) => state.seasons[state.seasons.length - 1]!.year;
const clamp = (value: number) => Math.max(0, Math.min(100, value));
function draws<T>(input: number | (() => number), action: () => T): { result: T; values: number[] } {
  const values: number[] = [], spy = vi.spyOn(Math, 'random').mockImplementation(() => {
    const value = typeof input === 'number' ? input : input(); values.push(value); return value;
  });
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-13T16:00:00Z'));
  try { return { result: action(), values }; } finally { spy.mockRestore(); clock.mockRestore(); }
}
function restore(state: CareerState): CareerState {
  const serialized = json(state); expect(S.isSoccerCareerSave(serialized), 'actual serialized save must validate').toBe(true);
  const repaired = E.repairCareer(serialized); expect(S.isSoccerCareerSave(repaired)).toBe(true); return repaired;
}
function context(spec: Spec, suffix = ''): CareerState {
  return draws<CareerState>(0.9, () => {
    const stats = { pace: 70, shooting: 70, passing: 70, dribbling: 70, defending: 70, physical: 70, reflexes: 70 };
    const base = E.initCareer(`Pending Life Fixture ${spec.id}${suffix}`, 'England', 'CM', '2020s', stats, 70, 2020, E.FALLBACK_CLUBS, null, 90);
    const club = E.FALLBACK_CLUBS[0];
    return { ...base, age: 23, phase: 'playing', retired: false, personality: spec.personality ?? 'professor', agentId: spec.agent ?? 'self',
      currentClub: club.name, currentClubCountry: club.country, currentClubTier: club.tier, currentClubColor: club.color,
      currentLeague: club.league, contractYearsLeft: 4, weeklyWage: 10000, netWorth: 10, morale: 65,
      popularity: 40, socialMediaFollowers: 1, integrityBonus: 5, sponsorBonus: 0.2, marketValue: 4,
      seasons: [{ ...base.seasons[0], year: 2026, age: 23, club: club.name, clubCountry: club.country, clubTier: club.tier,
        type: 'playing', apps: 24, leagueApps: 20, goals: 4, assists: 6, rating: 7, injury: null, injuryWeeks: 0, injurySevere: false }],
      lifeFlags: spec.podcast ? { podcast: 1 } : {}, eventLastFired: {}, pendingEvents: [], seriousInjuries: [],
      statBoostNextSeason: { physical: 2, reflexes: 3 }, events: ['Prepared fictional pending decision context'] };
  }).result;
}
function original(state: CareerState, id: number): RandomEvent {
  const matches = draws(0.1, () => L.getLifeEvents(state).filter(event => event.id === id)).result;
  expect(matches, `fixture must offer original Life card ${id}`).toHaveLength(1); return matches[0];
}
function waiting(state: CareerState, event: RandomEvent): CareerState {
  // Prepared nonterminal continuation only. The source Life card is not answered here.
  const sentinel = draws(0.99, () => E.getAllEvents(state).find(card => card.id === 220)).result;
  expect(sentinel, 'held source sentinel must exist').toBeDefined();
  return { ...state, phase: 'random_events', pendingEvents: [event, sentinel!],
    eventLastFired: { ...state.eventLastFired, [String(event.id)]: year(state), '7777': year(state) - 4 } };
}
function queued(spec: Spec): CareerState {
  const state = context(spec); return waiting(state, original(state, spec.id));
}
function invalid(state: CareerState, spec: Spec): CareerState {
  return { ...state, ...(spec.agent ? { agentId: 'self' } : spec.personality
    ? { personality: spec.personality === 'iceman' ? 'showman' : 'iceman' } : { lifeFlags: { ...state.lifeFlags, podcast: 0 } }) };
}
function literal(before: CareerState, after: CareerState, spec: Spec, choice: number, roll = 0.99): void {
  const expected = json(before), effect = spec.effects[choice];
  const apply = (delta: Effect) => {
    expected.socialMediaFollowers = Math.round((expected.socialMediaFollowers + (delta.followers ?? 0)) * 100) / 100;
    expected.netWorth = Math.round((expected.netWorth + (delta.money ?? 0)) * 100) / 100;
    expected.morale = clamp(expected.morale + (delta.morale ?? 0));
    expected.popularity = clamp(expected.popularity + (delta.popularity ?? 0));
    expected.integrityBonus += delta.integrity ?? 0; expected.marketValue += delta.market ?? 0;
    if (delta.sponsor !== undefined) expected.sponsorBonus = Math.round(((expected.sponsorBonus ?? 0) + delta.sponsor) * 100) / 100;
    if (delta.agent) expected.agentId = delta.agent;
    for (const [key, value] of Object.entries(delta.boost ?? {})) {
      const skill = key as keyof CareerState['statBoostNextSeason'];
      expected.statBoostNextSeason[skill] = (expected.statBoostNextSeason[skill] ?? 0) + value!;
    }
  };
  apply(effect);
  if (effect.wheel) {
    const wheel = effect.wheel, hit = roll < wheel.chance; apply(hit ? wheel.hitEffect : wheel.missEffect);
    expected.chanceWheel = { title: wheel.title, chance: wheel.chance, roll, hit: wheel.hit, miss: wheel.miss, result: hit, seen: false };
    if ((spec.id === 210 && hit) || (spec.id === 218 && !hit)) expected.pace = Math.max(20, Math.min(99, expected.pace - 1));
    if (spec.id === 218 && hit) expected.statBoostNextSeason = {
      ...before.statBoostNextSeason, pace: (before.statBoostNextSeason.pace ?? 0) + 1,
      shooting: (before.statBoostNextSeason.shooting ?? 0) + 1, passing: (before.statBoostNextSeason.passing ?? 0) + 1,
      dribbling: (before.statBoostNextSeason.dribbling ?? 0) + 1, defending: (before.statBoostNextSeason.defending ?? 0) + 1,
      physical: (before.statBoostNextSeason.physical ?? 0) + 1, reflexes: (before.statBoostNextSeason.reflexes ?? 0) + 1,
    };
  }
  expected.lastEventId = spec.id; expected.pendingEvents = expected.pendingEvents.slice(1); expected.phase = 'random_events';
  expected.overall = E.calcOverall(expected, expected.position);
  expect(after.events.slice(0, before.events.length)).toEqual(before.events);
  expect(after.events).toHaveLength(before.events.length + 1);
  expect(after.events[after.events.length - 1].trim().length).toBeGreaterThan(0);
  expect({ ...json(after), events: before.events }).toEqual({ ...expected, events: before.events });
  expect(after.pendingEvents.map(card => card.id)).toEqual([220]);
}
function skipped(before: CareerState, after: CareerState): void {
  const expected = json(before), id = before.pendingEvents[0].id;
  expected.lastEventId = id; expected.pendingEvents = expected.pendingEvents.slice(1); expected.phase = 'random_events';
  if (expected.eventLastFired?.[String(id)] === year(before)) delete expected.eventLastFired[String(id)];
  expect(json(after)).toEqual(expected);
}
function eligible(state: CareerState): Spec[] {
  return SPEC.filter(spec => spec.agent ? state.agentId === spec.agent : spec.personality
    ? state.personality === spec.personality : state.lifeFlags?.podcast === 1);
}

describe('Soccer Career saved pending Life choices', () => {
  for (const spec of SPEC) {
    it(`pending life missing: ${spec.id} saved choices remain resolvable`, () => {
      const live = queued(spec); expect(live.pendingEvents[0].choices).toHaveLength(spec.effects.length);
      for (let choice = 0; choice < spec.effects.length; choice++) {
        const before = restore(live), held = json(before);
        expect(typeof before.pendingEvents[0].choices[choice].apply).toBe('undefined');
        const after = draws(0.99, () => E.applyEventChoice(before, choice, E.FALLBACK_CLUBS)).result;
        expect(after.eventLastFired?.[String(spec.id)] === year(before), `pending Life ${spec.id} lost its saved choice`).toBe(true);
        literal(before, after, spec, choice); expect(json(before)).toEqual(held);
        expect(restore(after).eventLastFired).toEqual(after.eventLastFired);
      }
    });
    it(`pending life preservation: ${spec.id} invalid context still skips`, () => {
      const before = restore(invalid(queued(spec), spec)), held = json(before);
      const after = draws(0.99, () => E.applyEventChoice(before, 0, E.FALLBACK_CLUBS)).result;
      expect(after.eventLastFired?.[String(spec.id)] === year(before), `invalid Life ${spec.id} must not resolve`).toBe(false);
      skipped(before, after); expect(json(before)).toEqual(held);
      expect(draws(0.99, () => L.getLifeEvents(before)).values).toEqual(Array(eligible(before).length).fill(0.99));
    });
  }
  it('pending life preservation: fresh thresholds keep their original draw ordinals', () => {
    for (const spec of SPEC) {
      const state = context(spec), gates = eligible(state), held = json(state);
      for (let ordinal = 0; ordinal < gates.length; ordinal++) for (const offset of [-0.000001, 0]) {
        const values = gates.map(() => 0.99); values[ordinal] = gates[ordinal].rate + offset;
        let cursor = 0;
        const read = draws(() => values[cursor++] ?? 0.99, () => L.getLifeEvents(state));
        expect(read.values).toEqual(values);
        const offers = read.result.filter(card => SPEC.some(item => item.id === card.id)).map(card => card.id);
        expect(offers.includes(gates[ordinal].id), `fresh Life ${gates[ordinal].id} offer threshold changed`).toBe(offset < 0);
        expect(offers).toEqual(offset < 0 ? [gates[ordinal].id] : []);
        expect(json(state)).toEqual(held);
      }
    }
  });
  it('pending life preservation: pending catalog reads consume original draws and preserve bytes', () => {
    for (const spec of SPEC) {
      const state = restore(queued(spec)), held = JSON.stringify(state), count = eligible(state).length;
      for (let repeat = 0; repeat < 2; repeat++) {
        const read = draws(0.99, () => L.getLifeEvents(state));
        expect(read.values.length, 'pending Life catalog skipped an original offer draw').toBe(count);
        expect(read.values).toEqual(Array(count).fill(0.99));
        expect(JSON.stringify(state)).toBe(held);
      }
    }
  });
  it('pending life preservation: a genuinely unknown saved card still skips', () => {
    const before = restore(queued(SPEC[5])); before.pendingEvents[0].id = 9999;
    before.eventLastFired = { ...before.eventLastFired, '9999': year(before) };
    const after = draws(0.99, () => E.applyEventChoice(before, 0, E.FALLBACK_CLUBS)).result; skipped(before, after);
  });
  it('pending life preservation: an unavailable choice index still skips without rewards', () => {
    const before = restore(queued(SPEC[5]));
    const after = draws(0.99, () => E.applyEventChoice(before, 99, E.FALLBACK_CLUBS)).result; skipped(before, after);
  });
  it('pending life preservation: actual wheels retain literal odds rolls and both results', () => {
    for (const spec of SPEC.filter(item => item.effects[0].wheel)) for (const roll of [0.1, 0.99]) {
      const before = queued(spec), lookup = draws(0.99, () => E.getAllEvents(before)).values.length;
      let ordinal = 0;
      const run = draws(() => ordinal++ < lookup ? 0.99 : roll, () => E.applyEventChoice(before, 0, E.FALLBACK_CLUBS));
      expect(run.values).toEqual([...Array(lookup).fill(0.99), roll]);
      expect(validChanceWheel(run.result.chanceWheel)).toBe(true);
      literal(before, run.result, spec, 0, roll);
      expect(restore(run.result).chanceWheel).toEqual(run.result.chanceWheel);
    }
  });
  it('pending life preservation: original cooldowns keep exact season boundaries', () => {
    for (const spec of SPEC) {
      const state = queued(spec), card = state.pendingEvents[0];
      expect(E.eventCooldown(card)).toBe(spec.cooldown);
      expect(E.isEventOnCooldown(state, card, year(state) + spec.cooldown)).toBe(true);
      expect(E.isEventOnCooldown(state, card, year(state) + spec.cooldown + 1)).toBe(false);
    }
  });
  it('pending life preservation: resolved live outcomes survive repeated JSON reloads', () => {
    for (const spec of SPEC) {
      const live = queued(spec), before = { ...restore(live), pendingEvents: live.pendingEvents };
      const after = draws(0.99, () => E.applyEventChoice(before, 0, E.FALLBACK_CLUBS)).result;
      literal(before, after, spec, 0);
      expect(json(restore(restore(after)))).toEqual(json(after));
      expect(after.pendingEvents.some(card => card.id === spec.id)).toBe(false);
    }
  });
  it('pending life preservation: absent legacy ledgers never invent an offer stamp', () => {
    const before = queued(SPEC[5]); delete before.eventLastFired;
    const after = draws(0.99, () => E.applyEventChoice(before, 1, E.FALLBACK_CLUBS)).result;
    literal(before, after, SPEC[5], 1); expect(after.eventLastFired).toBeUndefined();
    expect(restore(after).eventLastFired).toBeUndefined();
  });
  it('pending life preservation: original live choice inputs remain immutable', () => {
    for (const spec of SPEC) for (let choice = 0; choice < spec.effects.length; choice++) {
      const before = queued(spec), held = JSON.stringify(before);
      draws(0.99, () => E.applyEventChoice(before, choice, E.FALLBACK_CLUBS));
      expect(JSON.stringify(before)).toBe(held);
    }
  });
  it('pending life preservation: H original wrong-personality 211 skip remains intact', () => {
    const before = restore({ ...queued(SPEC[5]), personality: 'iceman' });
    expect(draws(0.99, () => E.getAllEvents(before).some(card => card.id === 211)).result, 'H original 211 profile gate must still reject').toBe(false);
    const after = draws(0.99, () => E.applyEventChoice(before, 0, E.FALLBACK_CLUBS)).result;
    skipped(before, after); expect(after.eventLastFired?.['7777']).toBe(year(before) - 4);
  });
});
