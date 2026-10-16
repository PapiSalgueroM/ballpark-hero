import { describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { CareerState, RandomEvent } from '@/lib/soccerCareerEngine';

const E = (process.env.SC_OVERALL_ENGINE ? await import(/* @vite-ignore */ process.env.SC_OVERALL_ENGINE)
  : await import('@/lib/soccerCareerEngine')) as typeof import('@/lib/soccerCareerEngine');
const L = (process.env.SC_OVERALL_LIFE ? await import(/* @vite-ignore */ process.env.SC_OVERALL_LIFE)
  : await import('@/lib/soccerCareerLife')) as typeof import('@/lib/soccerCareerLife');
const S = (process.env.SC_OVERALL_SAVE ? await import(/* @vite-ignore */ process.env.SC_OVERALL_SAVE)
  : await import('@/lib/soccerCareerSave')) as typeof import('@/lib/soccerCareerSave');
type Effect = { money?: number; morale?: number; integrity?: number; followers?: number;
  wheel?: { chance: number; title: string; hit: string; miss: string; yes: Effect; no: Effect } };
type Spec = { id: number; threshold: number; minAge: number; effects: Effect[] };
const SPECS: Spec[] = [
  { id: 232, threshold: 84, minAge: 27, effects: [{ wheel: { chance: 0.6, title: 'The Statue Vote',
    hit: 'Statue vote passes', miss: 'Statue vote fails', yes: { integrity: 8, morale: 8 }, no: { morale: -5 } } }, { integrity: 10 }] },
  { id: 249, threshold: 86, minAge: 29, effects: [{ money: 2, followers: 2 }, { integrity: 2 }] },
];
const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const observations: unknown[] = [];
function retain(row: unknown) {
  observations.push(json(row));
  if (process.env.SC_OVERALL_RAW) {
    mkdirSync(dirname(process.env.SC_OVERALL_RAW), { recursive: true });
    writeFileSync(process.env.SC_OVERALL_RAW, JSON.stringify({ fixture: 'Prepared actual catalog queue and boundary stats, no natural delivery frequency claim', observations }, null, 2));
  }
}
function random<T>(roll: number, action: () => T): { value: T; draws: number[] } {
  const draws: number[] = [];
  const rng = vi.spyOn(Math, 'random').mockImplementation(() => { draws.push(roll); return roll; });
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-16T12:00:00Z'));
  try { return { value: action(), draws }; } finally { rng.mockRestore(); clock.mockRestore(); }
}
function restore(state: CareerState): CareerState {
  const parsed = S.parseSoccerCareerSave(S.serializeSoccerCareerSave(state));
  expect(S.isSoccerCareerSave(parsed), 'prepared fictional save must pass the actual validator').toBe(true);
  return E.repairCareer(parsed as CareerState);
}
function career(overall: number): CareerState {
  return random(0.99, () => {
    const stats = { pace: overall, shooting: overall, passing: overall - 3, dribbling: overall,
      defending: overall, physical: overall, reflexes: overall };
    const initial = E.initCareer('Pending Overall Fixture', 'England', 'CM', 'modern', stats, overall, 2020, E.FALLBACK_CLUBS, null, 94);
    const club = E.FALLBACK_CLUBS[0];
    return restore({ ...initial, ...stats, overall: E.calcOverall(stats, 'CM'), age: 30, phase: 'random_events', retired: false,
      personality: 'iceman', agentId: 'self', currentClub: club.name, currentClubCountry: club.country, currentClubTier: club.tier,
      currentClubColor: club.color, currentLeague: club.league, contractYearsLeft: 4, weeklyWage: 10000,
      seasons: [{ ...initial.seasons[0], year: 2026, age: 30, club: club.name, clubCountry: club.country,
        clubTier: club.tier, type: 'playing', apps: 24, leagueApps: 20, goals: 4, assists: 6, rating: 7,
        injury: null, injuryWeeks: 0, injurySevere: false }], netWorth: 4, popularity: 45, morale: 65, integrityBonus: 5,
      socialMediaFollowers: 2, lifeFlags: {}, eventLastFired: {}, pendingEvents: [],
      events: ['Prepared fictional overall queue'], chanceWheel: undefined });
  }).value;
}
function card(state: CareerState, id: number): RandomEvent {
  const matches = random(0.99, () => L.getLifeEvents(state).filter(event => event.id === id)).value;
  expect(matches, `actual catalog offers prepared card ${id}`).toHaveLength(1); return matches[0];
}
function answer(state: CareerState, choice: number, roll = 0.99) {
  return random(roll, () => E.applyEventChoice({ ...json(state), pendingEvents: state.pendingEvents }, choice, E.FALLBACK_CLUBS));
}
function dropped(spec: Spec, scenario: 'below' | 'above'): CareerState {
  const state = career(spec.threshold + (scenario === 'above' ? 1 : 0));
  const pendingEvents = [card(state, 260), card(state, spec.id), card(state, 238)];
  const queued = { ...state, pendingEvents, eventLastFired: { ...state.eventLastFired, '7777': 2022 } };
  for (const event of pendingEvents) queued.eventLastFired[E.eventLedgerKey(event)] = 2026;
  const before = json(queued), reply = answer(queued, 1), after = reply.value;
  retain({ kind: 'predecessor', scenario, id: spec.id, before, after, inputAfter: queued, draws: reply.draws });
  const expected = json(before);
  expected.passing -= 1; expected.morale -= 6; expected.overall -= 1;
  expected.lastEventId = 260; expected.pendingEvents = expected.pendingEvents.slice(1);
  expected.events.push('🤕 Played on after the head knock. The fog took a month to lift. Passing -1');
  expected.chanceWheel = { title: 'The Head Knock', chance: 0.65, roll: 0.99, hit: 'You play without a setback',
    miss: 'The head knock has a cost', result: false, seen: false };
  expect(json(after)).toEqual(expected); expect(after.age).toBe(30);
  expect(after.overall).toBe(spec.threshold - (scenario === 'below' ? 1 : 0));
  expect(json(queued)).toEqual(before); return after;
}
function literal(before: CareerState, after: CareerState, spec: Spec, choice: number, roll: number) {
  const expected = json(before), effect = spec.effects[choice];
  const change = (delta: Effect) => {
    expected.netWorth = Math.round((expected.netWorth + (delta.money ?? 0)) * 100) / 100;
    expected.morale = Math.max(0, Math.min(100, expected.morale + (delta.morale ?? 0)));
    expected.integrityBonus += delta.integrity ?? 0;
    expected.socialMediaFollowers = Math.round((expected.socialMediaFollowers + (delta.followers ?? 0)) * 100) / 100;
  };
  change(effect);
  if (effect.wheel) {
    const w = effect.wheel; change(roll < w.chance ? w.yes : w.no);
    expected.chanceWheel = { title: w.title, chance: w.chance, roll, hit: w.hit, miss: w.miss, result: roll < w.chance, seen: false };
  }
  expected.lastEventId = spec.id; expected.pendingEvents = expected.pendingEvents.slice(1); expected.phase = 'random_events';
  expect(after.netWorth).toBeGreaterThanOrEqual(0);
  expect(after.events.slice(0, before.events.length)).toEqual(before.events); expect(after.events).toHaveLength(before.events.length + 1);
  expect(after.events[after.events.length - 1]?.trim().length).toBeGreaterThan(0);
  expect({ ...json(after), events: before.events }).toEqual({ ...expected, events: before.events });
  expect(after.eventLastFired).toEqual(before.eventLastFired);
}
function outcomes(spec: Spec, scenario: 'below' | 'above') {
  const before = dropped(spec, scenario), held = json(before), rows = [];
  for (let choice = 0; choice < spec.effects.length; choice++) for (const roll of spec.effects[choice].wheel ? [0.01, 0.99] : [0.99]) {
    const live = answer(before, choice, roll), saved = restore(before), savedHeld = json(saved);
    expect(typeof saved.pendingEvents[0].choices[choice].apply).toBe('undefined');
    const available = random(0.99, () => L.getLifeEvents(saved).find(event => event.id === spec.id)).value;
    const reloaded = answer(saved, choice, roll);
    retain({ kind: 'target', scenario, id: spec.id, choice, roll, callbackAvailable: typeof available?.choices[choice]?.apply === 'function',
      before: held, savedBefore: savedHeld, liveAfter: live.value, reloadedAfter: reloaded.value,
      inputAfter: before, savedInputAfter: saved, liveDraws: live.draws, reloadDraws: reloaded.draws });
    literal(before, live.value, spec, choice, roll); expect(json(before)).toEqual(held); expect(json(saved)).toEqual(savedHeld);
    rows.push({ choice, roll, live, saved, reloaded, available });
  }
  // Retain every branch before the single exact expected callback assertion.
  expect(rows.every(row => typeof row.available?.choices[row.choice]?.apply === 'function'), `pending overall ${spec.id} callback missing after reload`).toBe(true);
  for (const row of rows) {
    literal(row.saved, row.reloaded.value, spec, row.choice, row.roll);
    expect(json(row.reloaded.value)).toEqual(json(row.live.value)); expect(row.reloaded.draws).toEqual(row.live.draws);
    expect(json(restore(row.reloaded.value))).toEqual(json(row.reloaded.value));
  }
}

describe('Soccer Career pending overall gates', () => {
  for (const spec of SPECS) it(`pending overall missing: ${spec.id} keeps offered choices after a stat loss and reload`, () => outcomes(spec, 'below'));
  it('pending overall preservation: fresh offers keep both original thresholds', () => {
    for (const spec of SPECS) for (const above of [false, true]) {
      const state = career(spec.threshold - (above ? 0 : 1)), before = json(state);
      const offered = random(0.99, () => L.getLifeEvents(state).some(event => event.id === spec.id));
      retain({ kind: 'fresh', id: spec.id, above, before, inputAfter: state, offered: offered.value, draws: offered.draws });
      expect(offered.value).toBe(above); expect(json(state)).toEqual(before);
    }
  });
  it('pending overall preservation: unrelated queued cards never unlock a fresh offer', () => {
    for (const spec of SPECS) {
      const state = career(spec.threshold - 1); state.pendingEvents = [card(state, 238)]; const before = json(state);
      const offered = random(0.99, () => L.getLifeEvents(state).some(event => event.id === spec.id));
      retain({ kind: 'unrelated', id: spec.id, before, inputAfter: state, offered: offered.value, draws: offered.draws });
      expect(offered.value).toBe(false); expect(json(state)).toEqual(before);
    }
  });
  it('pending overall preservation: original age guards still hold with pending metadata', () => {
    for (const spec of SPECS) for (const oldEnough of [false, true]) {
      const state = career(spec.threshold); state.pendingEvents = [card(state, spec.id), card(state, 238)];
      state.age = spec.minAge - (oldEnough ? 0 : 1); const before = json(state);
      const offered = random(0.99, () => L.getLifeEvents(state).some(event => event.id === spec.id));
      retain({ kind: 'age', id: spec.id, oldEnough, before, inputAfter: state, offered: offered.value, draws: offered.draws });
      expect(offered.value).toBe(oldEnough); expect(json(state)).toEqual(before);
    }
  });
  it('pending overall preservation: saved choices at the threshold keep all five original outcomes', () => {
    for (const spec of SPECS) outcomes(spec, 'above');
  });
});
