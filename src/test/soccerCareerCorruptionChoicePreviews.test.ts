import { afterAll, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { FALLBACK_CLUBS, initCareer, type CareerState, type RandomEvent } from '@/lib/soccerCareerEngine';
import { getCorruptionEvents } from '@/lib/soccerCareerCorruption';
import { soccerEventChoiceConsequence } from '@/lib/soccerCareerContracts';

/* Prepared fictional career context. The real initializer, corruption catalog
   and existing preview getter run in remote tests. JSON removes actual catalog
   callbacks as a saved pending card does. No choice callback or economy rule is
   executed. Old button labels and event descriptions are outside this scope. */
const FRESH = [
  { id: 315, index: 0, expected: 'Heat +12. To clean dirty money each season, buy a laundering item in My Life > The other list.' },
  { id: 315, index: 1, expected: 'Lose 55% to tax and penalties, Heat drops hard, Integrity +12' },
  { id: 315, index: 2, expected: 'Heat +5. It is still there. It is always still there' },
  { id: 320, index: 0, expected: 'Heat +15 and now two people can ruin you' },
  { id: 320, index: 1, expected: '€2M dirty now, Heat +25' },
  { id: 320, index: 2, expected: 'Heat -30, Integrity +14, Morale up to +10' },
  { id: 325, index: 0, expected: 'Pay 40% of hidden money plus 5% of net worth, Heat drops to almost nothing' },
  { id: 325, index: 1, expected: 'Heat +10, and prosecutors take the refusal personally' },
] as const;
const RESTORED = [
  { key: 'restored315_0', id: 315, index: 0, saved: 'Heat +12 now, but the shady shop unlocks proper laundering', expected: FRESH[0].expected },
  { key: 'restored320_1', id: 320, index: 1, saved: 'Heat +25, but income doubles while it lasts', expected: FRESH[4].expected },
  { key: 'restored320_2', id: 320, index: 2, saved: 'Heat -30, all dirty income ends, Integrity +14', expected: FRESH[5].expected },
  { key: 'restored325_0', id: 325, index: 0, saved: 'Pay 40% of everything hidden, Heat drops to almost nothing', expected: FRESH[6].expected },
] as const;
const CASE_TITLES = {
  restored315_0: 'restored corruption caption 315:0 uses the current consequence',
  restored320_1: 'restored corruption caption 320:1 uses the current consequence',
  restored320_2: 'restored corruption caption 320:2 uses the current consequence',
  restored325_0: 'restored corruption caption 325:0 uses the current consequence',
  fresh: 'fresh corruption choices keep all eight qualified consequences',
  siblings: 'unchanged corruption siblings preserve their saved consequences',
  unknown: 'unknown events and choice indices preserve saved text',
  life: 'existing Life consequence refreshes stay unchanged',
  wage: 'wage-demand consequences still use the current career',
  readOnly: 'corruption caption reads preserve the whole save and random stream',
} as const;
type CaseKey = keyof typeof CASE_TITLES;
type Lookup = { careerIndex: number; id: number; index: number; saved: string; expected: string };
const cases: Partial<Record<CaseKey, unknown>> = {};
const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function prepared<T>(action: () => T): T {
  const random = vi.spyOn(Math, 'random').mockReturnValue(0.99);
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-17T12:00:00Z'));
  try { return action(); } finally { random.mockRestore(); clock.mockRestore(); }
}
function career(): CareerState {
  return prepared(() => {
    const stats = { pace: 84, shooting: 84, passing: 84, dribbling: 84, defending: 84, physical: 84, reflexes: 84 };
    const initial = initCareer('Corruption Caption Fixture', 'England', 'CM', '2020s', stats, 84, 2020, FALLBACK_CLUBS, null, 90);
    const row = initial.seasons[0];
    return { ...initial, phase: 'playing', age: 28, retired: false, overall: 84, weeklyWage: 100000,
      personality: 'professor', agentId: 'self', lifeFlags: {}, eventLastFired: {}, pendingEvents: [],
      netWorth: 10, dirtyMoney: 3, corruptionHeat: 60, integrityBonus: 5, morale: 65,
      seasons: Array.from({ length: 4 }, (_, index) => ({ ...row, year: 2020 + index, age: 24 + index,
        type: 'playing' as const, apps: 32, leagueApps: 30, rating: 7.5 })),
      events: ['Prepared fictional caption context'] };
  });
}
function card(state: CareerState, id: number): RandomEvent {
  const matches = prepared(() => getCorruptionEvents(state).filter(event => event.id === id));
  if (matches.length !== 1) throw new Error('SETUP: actual corruption card ' + id + ' must exist exactly once');
  return matches[0];
}
function observe(key: CaseKey, inputs: CareerState[], lookups: Lookup[], extra: Record<string, unknown> = {}) {
  const before = inputs.map(json), draws: number[] = [];
  const random = vi.spyOn(Math, 'random').mockImplementation(() => { draws.push(0.75); return 0.75; });
  let results: (Lookup & { actual: string })[];
  try { results = lookups.map(lookup => ({ ...lookup, actual: soccerEventChoiceConsequence(inputs[lookup.careerIndex], lookup.id, lookup.index, lookup.saved) })); }
  finally { random.mockRestore(); }
  const evidence = { title: CASE_TITLES[key], before, after: inputs.map(json), draws, lookups: results, ...extra };
  cases[key] = evidence;
  return evidence;
}
function unchanged(evidence: ReturnType<typeof observe>) {
  expect(evidence.after, 'A preview read must preserve the whole initialized save').toEqual(evidence.before);
  expect(evidence.draws, 'A preview read must not consume game randomness').toEqual([]);
}
function namedCaptions(evidence: ReturnType<typeof observe>) {
  for (const lookup of evidence.lookups) expect(lookup.actual, `caption ${lookup.id}:${lookup.index} must retain its literal expected text`).toBe(lookup.expected);
}
afterAll(() => {
  const out = process.env.SC_CORRUPTION_CAPTIONS_RAW;
  if (out) {
    if (!isAbsolute(out)) throw new Error('SC_CORRUPTION_CAPTIONS_RAW must be absolute');
    writeFileSync(out, JSON.stringify({ version: 1, caseTitles: Object.values(CASE_TITLES), cases }, null, 2) + '\n', { flag: 'wx' });
  }
});

describe('Soccer Career restored corruption consequence previews', () => {
  for (const target of RESTORED) {
    it(CASE_TITLES[target.key], () => {
      const state = career(), event = card(state, target.id);
      if (event.choices[target.index].consequence !== target.expected || typeof event.choices[target.index].apply !== 'function') throw new Error('SETUP: the actual qualified fresh choice must match before making the legacy save');
      event.choices[target.index].consequence = target.saved;
      const restored = json({ ...state, phase: 'random_events' as const, pendingEvents: [event] });
      const callbacksAbsent = restored.pendingEvents[0].choices.every(choice => choice.apply === undefined);
      const evidence = observe(target.key, [restored], [{ careerIndex: 0, id: target.id, index: target.index,
        saved: restored.pendingEvents[0].choices[target.index].consequence, expected: target.expected }], { callbacksAbsent });
      expect(callbacksAbsent, 'SETUP: JSON must remove all actual pending-card callbacks').toBe(true);
      unchanged(evidence);
      expect(evidence.lookups[0].actual === target.expected, `Restored corruption choice ${target.id}:${target.index} must show its current qualified consequence`).toBe(true);
    });
  }
  it(CASE_TITLES.fresh, () => {
    const state = career();
    const choices = FRESH.map(target => ({ target, choice: card(state, target.id).choices[target.index] }));
    const evidence = observe('fresh', [state], choices.map(({ target, choice }) => ({ careerIndex: 0, id: target.id, index: target.index, saved: choice.consequence, expected: target.expected })));
    for (const { target, choice } of choices) expect(choice.consequence, `actual fresh corruption choice ${target.id}:${target.index}`).toBe(target.expected);
    namedCaptions(evidence); unchanged(evidence);
  });
  it(CASE_TITLES.siblings, () => {
    const state = career(), siblings = [FRESH[1], FRESH[2], FRESH[3], FRESH[7]];
    const evidence = observe('siblings', [state], siblings.map(target => ({ careerIndex: 0, id: target.id, index: target.index,
      saved: `Saved unchanged sibling ${target.id}:${target.index}`, expected: `Saved unchanged sibling ${target.id}:${target.index}` })));
    namedCaptions(evidence); unchanged(evidence);
  });
  it(CASE_TITLES.unknown, () => {
    const state = career(), evidence = observe('unknown', [state], [
      { careerIndex: 0, id: 999999, index: 0, saved: 'Saved future event consequence', expected: 'Saved future event consequence' },
      { careerIndex: 0, id: 315, index: 99, saved: 'Saved future corruption option', expected: 'Saved future corruption option' },
    ]);
    namedCaptions(evidence); unchanged(evidence);
  });
  it(CASE_TITLES.life, () => {
    const state = career(), evidence = observe('life', [state], [
      { careerIndex: 0, id: 205, index: 1, saved: 'Saved cousin-agent consequence', expected: 'Represent yourself from now on, Morale -5, awkward family dinners' },
      { careerIndex: 0, id: 232, index: 0, saved: '60%: it passes, Legacy +8. 40%: rejected 5 votes to 4, ouch', expected: '60%: Integrity +8, Morale +8. 40%: Morale -5' },
    ]);
    namedCaptions(evidence); unchanged(evidence);
  });
  it(CASE_TITLES.wage, () => {
    const young = career(), veteran = { ...career(), age: 35 }, elite = { ...career(), age: 35, overall: 94 };
    elite.seasons = elite.seasons.map(row => ({ ...row, rating: 8.2 }));
    const evidence = observe('wage', [young, veteran, elite], [
      { careerIndex: 0, id: 16, index: 1, saved: 'Saved wage-demand text', expected: '50% chance: Wage +20% or relationship damaged' },
      { careerIndex: 1, id: 16, index: 1, saved: 'Saved wage-demand text', expected: '50% chance: Current wage held (€100000/wk) or relationship damaged' },
      { careerIndex: 2, id: 16, index: 1, saved: 'Saved wage-demand text', expected: '50% chance: Wage €105000/wk or relationship damaged' },
    ]);
    namedCaptions(evidence); unchanged(evidence);
  });
  it(CASE_TITLES.readOnly, () => {
    const inputs = RESTORED.map(target => {
      const state = career(), event = card(state, target.id);
      return json({ ...state, phase: 'random_events' as const, pendingEvents: [event] });
    });
    const evidence = observe('readOnly', inputs, RESTORED.map((target, careerIndex) => ({ careerIndex, id: target.id, index: target.index, saved: target.expected, expected: target.expected })));
    for (const [index, input] of inputs.entries()) expect(input.pendingEvents[0].choices.every(choice => choice.apply === undefined), `restored read-only input ${index} has no callbacks`).toBe(true);
    namedCaptions(evidence); unchanged(evidence);
  });
});
