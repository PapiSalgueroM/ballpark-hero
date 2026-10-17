import { afterAll, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import { acceptOffer, FALLBACK_CLUBS, initCareer, type CareerState, type ContractOffer } from '@/lib/soccerCareerEngine';
import { getCorruptionEvents } from '@/lib/soccerCareerCorruption';
import { soccerEventChoiceConsequence } from '@/lib/soccerCareerContracts';

const CURRENT = 'Current wage +8%, Integrity +10';
const LEGACY = 'Wage +8% permanently, Integrity +10';
const CALLBACK_EVENT = '📃 Insisted every euro went on the official contract. Your accountant framed it';
const TITLES = {
  fresh: 'fresh contract choice describes the current wage increase',
  restored: 'restored contract choice refreshes the current wage caption',
  callback: 'the actual contract choice raises the current wage with existing rounding',
  newContract: 'accepting a new contract replaces the earlier current-wage increase',
  siblingsAndCaptions: 'the other contract choice and existing shared captions stay unchanged',
  wageAndUnknown: 'wage-demand and unknown-caption fallbacks keep their existing behavior',
  readOnly: 'restored caption reads preserve the whole save and random stream',
} as const;
type Key = keyof typeof TITLES;
type Lookup = { careerIndex: number; id: number; index: number; saved: string; expected: string };
const cases: Partial<Record<Key, unknown>> = {};
const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function prepared<T>(action: () => T): T {
  const random = vi.spyOn(Math, 'random').mockReturnValue(0.99);
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-17T12:00:00Z'));
  try { return action(); } finally { random.mockRestore(); clock.mockRestore(); }
}
function career(wage = 100000): CareerState {
  return prepared(() => {
    const stats = { pace: 84, shooting: 84, passing: 84, dribbling: 84, defending: 84, physical: 84, reflexes: 84 };
    const initial = initCareer('Current Wage Fixture', 'England', 'CM', '2020s', stats, 84, 2020, FALLBACK_CLUBS, null, 90);
    const season = initial.seasons[0];
    return { ...initial, phase: 'playing', age: 28, retired: false, overall: 84, weeklyWage: wage,
      currentClub: 'Wage Fixture Town', currentClubCountry: 'England', currentClubTier: 2, currentLeague: 'Fixture League',
      personality: 'professor', agentId: 'self', pendingEvents: [], pendingOffers: [], lifeFlags: {}, eventLastFired: {},
      netWorth: 10, dirtyMoney: 3, corruptionHeat: 60, integrityBonus: 5, morale: 65,
      seasons: Array.from({ length: 4 }, (_, index) => ({ ...season, year: 2020 + index, age: 24 + index,
        club: 'Wage Fixture Town', type: 'playing' as const, apps: 32, leagueApps: 30, rating: 7.5 })),
      events: ['Prepared fictional current-wage context'] };
  });
}
function card(state: CareerState, id = 332) {
  const found = prepared(() => getCorruptionEvents(state).filter(event => event.id === id));
  if (found.length !== 1 || typeof found[0].choices[1]?.apply !== 'function') throw new Error('SETUP: actual corruption card and callback required');
  return found[0];
}
function measured<T>(action: () => T) {
  const draws: number[] = [];
  const random = vi.spyOn(Math, 'random').mockImplementation(() => { draws.push(0.75); return 0.75; });
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-17T12:00:00Z'));
  try { return { value: action(), draws }; } finally { random.mockRestore(); clock.mockRestore(); }
}
function reads(key: Key, inputs: CareerState[], lookups: Lookup[], extra: Record<string, unknown> = {}) {
  const before = inputs.map(json);
  const observed = measured(() => lookups.map(lookup => ({ ...lookup,
    actual: soccerEventChoiceConsequence(inputs[lookup.careerIndex], lookup.id, lookup.index, lookup.saved) })));
  const row = { title: TITLES[key], before, after: inputs.map(json), draws: observed.draws, lookups: observed.value, ...extra };
  cases[key] = row;
  return row;
}
function unchanged(row: ReturnType<typeof reads>) {
  expect(row.after, 'Caption reads preserve the whole initialized save').toEqual(row.before);
  expect(row.draws, 'Caption reads consume no game randomness').toEqual([]);
}
function literalCaptions(row: ReturnType<typeof reads>) {
  for (const lookup of row.lookups) expect(lookup.actual, `literal caption ${lookup.id}:${lookup.index}`).toBe(lookup.expected);
}
function applyCurrentChoice(input: CareerState) {
  // The live callback stays outside the career. Presentation changes must not
  // contaminate whole-save comparisons of its unchanged mechanical outcome.
  const event = card(input);
  const before = json(input), working = json(input);
  const observed = measured(() => event.choices[1].apply(working));
  return { label: 'actual-332-choice', before, inputAfter: json(working), after: json(observed.value), draws: observed.draws };
}
afterAll(() => {
  const destination = process.env.SC_CURRENT_WAGE_RAW;
  if (!destination) return;
  if (!isAbsolute(destination)) throw new Error('SC_CURRENT_WAGE_RAW must be absolute');
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, JSON.stringify({ version: 1, caseTitles: Object.values(TITLES), cases }, null, 2) + '\n', { flag: 'wx' });
});

describe('Soccer Career current wage choice captions', () => {
  it(TITLES.fresh, () => {
    const state = career(), event = card(state), choice = event.choices[1];
    const row = reads('fresh', [state], [{ careerIndex: 0, id: 332, index: 1, saved: choice.consequence, expected: CURRENT }],
      { catalogConsequence: choice.consequence, callbackPresent: typeof choice.apply === 'function' });
    unchanged(row);
    expect(choice.consequence === CURRENT && row.lookups[0].actual === CURRENT,
      'Fresh corruption choice 332:1 must describe the current wage increase').toBe(true);
  });
  it(TITLES.restored, () => {
    const state = career(), event = card(state);
    event.choices[1].consequence = LEGACY;
    const restored = json({ ...state, phase: 'random_events' as const, pendingEvents: [event] });
    const callbacksAbsent = restored.pendingEvents[0].choices.every(choice => choice.apply === undefined);
    const row = reads('restored', [restored], [{ careerIndex: 0, id: 332, index: 1,
      saved: restored.pendingEvents[0].choices[1].consequence, expected: CURRENT }], { callbacksAbsent });
    expect(callbacksAbsent, 'SETUP: JSON removes all actual pending-card callbacks').toBe(true);
    unchanged(row);
    expect(row.lookups[0].actual === CURRENT, 'Restored corruption choice 332:1 must describe the current wage increase').toBe(true);
  });
  it(TITLES.callback, () => {
    const samples = [0, 100000, 100001], expectedWages = [0, 108000, 108001];
    const operations = samples.map(wage => applyCurrentChoice(career(wage)));
    cases.callback = { title: TITLES.callback, currentEvent: null, operations };
    for (const [index, operation] of operations.entries()) {
      expect(operation.after.weeklyWage, `actual wage outcome from ${samples[index]}`).toBe(expectedWages[index]);
      expect(operation.after).toEqual({ ...operation.before, weeklyWage: expectedWages[index], integrityBonus: 15,
        events: [...operation.before.events, CALLBACK_EVENT] });
      expect(operation.inputAfter).toEqual(operation.after); expect(operation.draws).toEqual([]);
      expect(operation.after.pendingEvents).toEqual([]);
    }
  });
  it(TITLES.newContract, () => {
    const raised = applyCurrentChoice(career());
    const offer: ContractOffer = { club: { id: 'wage-fixture-united', name: 'Wage Fixture United', country: 'England', tier: 2, color: '#123456', league: 'Fixture League' },
      contractYears: 3, wage: 70000, transferFee: 0 };
    const input = json({ ...raised.after, phase: 'transfer_window' as const, pendingOffers: [offer] });
    const before = json(input), offerBefore = json(offer);
    const accepted = measured(() => acceptOffer(input, offer));
    const operation = { label: 'public-acceptOffer', before, inputAfter: json(input), after: json(accepted.value), draws: accepted.draws,
      offerBefore, offerAfter: json(offer) };
    cases.newContract = { title: TITLES.newContract, currentEvent: null, operations: [raised, operation] };
    expect(raised.after.weeklyWage).toBe(108000); expect(operation.before.agentId).toBe('self');
    expect(operation.after.weeklyWage).toBe(70000); expect(operation.after.contractYearsLeft).toBe(3);
    expect(operation.after.currentClub).toBe('Wage Fixture United'); expect(operation.after.phase).toBe('playing');
    expect(operation.after.pendingOffers).toEqual([]); expect(operation.after.integrityBonus).toBe(15);
    expect(operation.after.dirtyMoney).toBe(operation.before.dirtyMoney); expect(operation.after.netWorth).toBe(operation.before.netWorth);
    expect(operation.inputAfter).toEqual(before); expect(operation.offerAfter).toEqual(offerBefore); expect(operation.draws).toEqual([]);
  });
  it(TITLES.siblingsAndCaptions, () => {
    const state = career(), sibling = card(state).choices[0];
    const row = reads('siblingsAndCaptions', [state], [
      { careerIndex: 0, id: 332, index: 0, saved: sibling.consequence, expected: '€3M dirty, Heat +18' },
      { careerIndex: 0, id: 315, index: 0, saved: 'Saved old business consequence', expected: 'Heat +12. To clean dirty money each season, buy a laundering item in My Life > The other list.' },
      { careerIndex: 0, id: 232, index: 0, saved: 'Saved old statue consequence', expected: '60%: Integrity +8, Morale +8. 40%: Morale -5' },
    ]);
    expect(sibling.consequence).toBe('€3M dirty, Heat +18'); literalCaptions(row); unchanged(row);
  });
  it(TITLES.wageAndUnknown, () => {
    const young = career(), veteran = { ...career(), age: 35 }, elite = { ...career(), age: 35, overall: 94 };
    elite.seasons = elite.seasons.map(season => ({ ...season, rating: 8.2 }));
    const row = reads('wageAndUnknown', [young, veteran, elite], [
      { careerIndex: 0, id: 16, index: 1, saved: 'Saved wage demand', expected: '50% chance: Wage +20% or relationship damaged' },
      { careerIndex: 1, id: 16, index: 1, saved: 'Saved wage demand', expected: '50% chance: Current wage held (€100000/wk) or relationship damaged' },
      { careerIndex: 2, id: 16, index: 1, saved: 'Saved wage demand', expected: '50% chance: Wage €105000/wk or relationship damaged' },
      { careerIndex: 0, id: 999999, index: 0, saved: 'Saved future event', expected: 'Saved future event' },
      { careerIndex: 0, id: 332, index: 99, saved: 'Saved future contract choice', expected: 'Saved future contract choice' },
    ]);
    literalCaptions(row); unchanged(row);
  });
  it(TITLES.readOnly, () => {
    const restored = json(career());
    const row = reads('readOnly', [restored], [
      { careerIndex: 0, id: 332, index: 1, saved: CURRENT, expected: CURRENT },
      { careerIndex: 0, id: 332, index: 0, saved: 'Untouched sibling text', expected: 'Untouched sibling text' },
    ]);
    literalCaptions(row); unchanged(row);
  });
});
