import { expect, it } from 'vitest';
import { createNrlCareer, nrlCareerCap, nrlCareerFinance, nrlPhysioQuote,
  readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { nrlInjuries, nrlStarterOptions } from '@/lib/nrlManager';

function toRound(career: NrlCareerState, round: number) {
  while (career.season.round < round) career = reduceNrlCareer(career, { type: 'advance' });
  return career;
}
const cash = (career: NrlCareerState) => nrlCareerFinance(career).cash;

it.each([
  [2026, 'broncos', 2, 12, 'broncos-12-0', 'Right Second Row', 15],
  [2027, 'bears', 12, 22, 'bears-10-1', 'Prop 10', 24],
] as const)('buys one dated treatment and makes a real earlier selection possible in %i', (
  year, clubId, seed, round, playerId, role, earlier,
) => {
  const initial = toRound(createNrlCareer(clubId, seed, year), round);
  const quote = nrlPhysioQuote(initial, playerId);
  if (quote.ok === false) throw new Error(quote.reason);
  expect(quote).toMatchObject({ cost: 60000, before: earlier + 1 - round, after: earlier - round });
  const action = { type: 'bookPhysio', year, clubId, round, playerId } as const;
  const paid = reduceNrlCareer(initial, action);
  expect(paid).not.toBe(initial);
  expect(cash(initial) - cash(paid)).toBe(60000);
  expect(nrlCareerCap(paid)).toEqual(nrlCareerCap(initial));
  expect(paid.season.results).toBe(initial.season.results);
  expect(paid.season.physio).toEqual({ playerId, injuryRound: round - 1, round });
  expect(paid.finance.physio).toEqual(paid.season.physio);
  expect(nrlInjuries(paid.season).get(playerId)).toBe(earlier - round);
  expect(nrlInjuries({ ...paid.season, round: round - 1 }).has(playerId)).toBe(false);
  expect(nrlStarterOptions(paid.season, role).some(row => row.id === playerId)).toBe(false);
  expect(reduceNrlCareer(paid, action)).toBe(paid);
  expect(reduceNrlCareer(initial, { ...action, round: round - 1 })).toBe(initial);
  expect(reduceNrlCareer({ ...initial, finance: { ...initial.finance, openingCash: initial.finance.openingCash - cash(initial) + 59999 } }, action).season)
    .toBe(initial.season);
  const resumed = readNrlCareerSave(JSON.stringify(paid))!;
  expect(resumed).toEqual(paid);
  const raced = toRound(resumed, earlier);
  const ordinary = toRound(initial, earlier);
  expect(raced.season.results).toEqual(ordinary.season.results);
  expect(nrlStarterOptions(raced.season, role).some(row => row.id === playerId)).toBe(true);
  expect(nrlStarterOptions(ordinary.season, role).some(row => row.id === playerId)).toBe(false);
  const selected = reduceNrlCareer(raced, { type: 'selectStarter', role, playerId });
  const played = reduceNrlCareer(selected, { type: 'advance' });
  expect(played.season.results.find(row => row.round === earlier && row.playerScoring)?.playerScoring?.starters).toContain(playerId);
  expect(readNrlCareerSave(JSON.stringify(played))).toEqual(played);
  const bad = { ...played, finance: { ...played.finance, physio: undefined } };
  expect(readNrlCareerSave(JSON.stringify(bad))).toBeNull();
  const forged = { playerId, injuryRound: round - 1, round: earlier };
  expect(readNrlCareerSave(JSON.stringify({
    ...played, season: { ...played.season, physio: forged }, finance: { ...played.finance, physio: forged },
  }))).toBeNull();
  let ended = played;
  while (ended.season.phase !== 'complete') ended = reduceNrlCareer(ended, { type: 'advance' });
  const next = reduceNrlCareer(ended, { type: 'startNextSeason' });
  expect(next.season.physio).toBeUndefined();
  expect(next.finance.physio).toBeUndefined();
  expect(next.history.at(-1)?.finance?.physio).toEqual(paid.finance.physio);
  expect(JSON.stringify(readNrlCareerSave(JSON.stringify(next)))).toBe(JSON.stringify(next));
});

it('keeps reserved assistant wages and a live pause protected from extra purchases', () => {
  const year = 2026, clubId = 'broncos', round = 12, playerId = 'broncos-12-0';
  const opening = createNrlCareer(clubId, 2);
  const withCoach = reduceNrlCareer(opening, { type: 'hireCoach', year, round: 1, role: 'attack' });
  const initial = toRound(withCoach, round);
  const action = { type: 'bookPhysio', year, clubId, round, playerId } as const;
  const constrained = { ...initial, finance: { ...initial.finance, openingCash: initial.finance.openingCash - cash(initial) + 60_000 } };
  expect(nrlPhysioQuote(constrained, playerId)).toEqual({ ok: false, reason: 'Club cash is reserved for the assistant’s wages.' });
  expect(reduceNrlCareer(constrained, action)).toBe(constrained);
  const halftime = reduceNrlCareer(initial, { type: 'startLive' });
  expect(halftime.season.live).toBeDefined();
  expect(reduceNrlCareer(halftime, action)).toBe(halftime);
});
