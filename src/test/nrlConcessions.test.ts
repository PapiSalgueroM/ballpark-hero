import { describe, expect, it } from 'vitest';
import { nrlSeasonPlan } from '@/data/nrlManagerSeasons';
import {
  createNrlCareer, nrlCareerCap, nrlCareerFinance, nrlConcessionsQuote, nrlFinanceForecast,
  readNrlCareerSave, reduceNrlCareer, runNrlFastForward, type NrlCareerState,
} from '@/lib/nrlCareer';
import { createNrlSeason, nrlNextRound, nrlRegularRounds } from '@/lib/nrlManager';

const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const buy = (state: NrlCareerState) => reduceNrlCareer(state, {
  type: 'upgradeConcessions', year: state.season.year, clubId: state.season.clubId, round: state.season.round,
});
const reload = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));
const next = (state: NrlCareerState, clubId?: string) => reduceNrlCareer(state, {
  type: 'startNextSeason', move: clubId ? { fromYear: state.season.year, clubId } : undefined,
});
const close = (state: NrlCareerState) => {
  while (state.season.phase !== 'complete') state = advance(state);
  return state;
};

describe('NRL home-ground concessions', () => {
  it.each([[2026, 'storm'], [2027, 'bears']] as const)('prices and pays back a %s purchase according to eligible home fixtures', (year, clubId) => {
    const initial = createNrlCareer(clubId, 4, year);
    const upcomingHome = nrlSeasonPlan(year).draw.flatMap((fixtures, index) =>
      index && fixtures.some(([home]) => home === clubId) ? [index + 1] : []);
    const untouched = JSON.stringify(initial);
    expect(nrlConcessionsQuote(initial)).toMatchObject({
      installed: false, active: false, cost: 250_000, perHomeMatch: 25_000, matchesToPayBack: 10,
      remainingHomeMatches: upcomingHome.length, projectedIncome: upcomingHome.length * 25_000,
      paybackRound: upcomingHome[9], reason: null,
    });
    expect(JSON.stringify(reload(initial))).toBe(untouched);
    const purchased = buy(initial);
    expect(purchased.season).toBe(initial.season);
    expect(purchased.players).toBe(initial.players);
    expect(nrlCareerCap(purchased)).toEqual(nrlCareerCap(initial));
    expect(nrlCareerFinance(purchased).cash).toBe(nrlCareerFinance(initial).cash - 250_000);
    expect(nrlConcessionsQuote(purchased)).toMatchObject({ installed: true, active: false, income: 0 });
    expect(buy(purchased)).toBe(purchased);
    expect(reload(purchased)).toEqual(purchased);
    const forecast = nrlFinanceForecast(purchased)!;
    expect(forecast.projectedConcessions).toBe(upcomingHome.length * 25_000);
    expect(forecast.closingLow - nrlFinanceForecast(initial)!.closingLow).toBe(forecast.projectedConcessions - 250_000);

    let ordinary = initial;
    let upgraded = purchased;
    for (let round = 1; round <= nrlRegularRounds(year); round++) {
      ordinary = advance(ordinary);
      upgraded = advance(upgraded);
      const receipts = upcomingHome.filter(matchRound => matchRound <= round).length * 25_000;
      expect(upgraded.season).toEqual(ordinary.season);
      expect(upgraded.finance.gateReceipts).toBe(ordinary.finance.gateReceipts);
      expect(upgraded.finance.concessionReceipts ?? 0).toBe(receipts);
      expect(nrlCareerFinance(upgraded).cash - nrlCareerFinance(ordinary).cash).toBe(receipts - 250_000);
      expect(nrlConcessionsQuote(upgraded).matchesToPayBack).toBe(Math.max(0, 10 - receipts / 25_000));
    }
    expect(reload(upgraded)).toEqual(upgraded);
  });

  it('preserves the investment at its club through a move, return and exact save replay', () => {
    const closed = close(buy(createNrlCareer('storm', 4)));
    const earnedFixtures = closed.season.results.filter(match => match.homeId === 'storm' && match.round > 1 && match.tieId !== 'GF');
    const earned = earnedFixtures.length * 25_000;
    expect(closed.history[0].finance).toMatchObject({ concessionsUpgradeRound: 1, concessionReceipts: earned });
    expect(reload(closed)).toEqual(closed);
    const stayed = next(closed);
    expect(stayed.finance.concessionsUpgradeRound).toBeUndefined();
    expect(nrlConcessionsQuote(stayed)).toMatchObject({ installed: true, active: true, income: earned });
    expect(buy(stayed)).toBe(stayed);
    const perth = next(closed, 'bears');
    expect(nrlConcessionsQuote(perth)).toMatchObject({ installed: false, income: 0 });
    const returned = next(close(perth), 'storm');
    expect(nrlConcessionsQuote(returned)).toMatchObject({ installed: true, active: true, income: earned });
    expect(reload(returned)).toEqual(returned);
    const archived = returned.history[0];
    expect(reload({ ...returned, history: [{ ...archived,
      finance: { ...archived.finance!, concessionReceipts: earned + 25_000, cash: archived.finance!.cash + 25_000, profit: archived.finance!.profit + 25_000 },
    }, returned.history[1]], finance: { ...returned.finance, openingCash: returned.finance.openingCash + 25_000 } })).toBeNull();
  });

  it('projects late purchases conservatively and pays home finals except for a designated-home Grand Final', () => {
    let initial = createNrlCareer('storm', 8);
    while (initial.season.round < nrlRegularRounds(2026)) initial = advance(initial);
    expect(nrlConcessionsQuote(initial)).toMatchObject({ remainingHomeMatches: 0, projectedIncome: 0, paybackRound: undefined });
    let purchased = buy(initial);
    expect(nrlCareerFinance(purchased).cash).toBe(nrlCareerFinance(initial).cash - 250_000);
    const venues: string[] = [];
    while (purchased.season.phase !== 'complete') {
      const fixture = nrlNextRound(purchased.season).clubMatch;
      const eligible = fixture?.homeId === 'storm' && fixture.tieId !== 'GF';
      const expected = Number(eligible && purchased.season.phase === 'finals') * 25_000;
      expect(nrlFinanceForecast(purchased)?.projectedConcessions).toBe(expected);
      const before = purchased.finance.concessionReceipts ?? 0;
      purchased = advance(purchased);
      if (fixture?.homeId === 'storm' && fixture.tieId) venues.push(fixture.tieId);
      expect((purchased.finance.concessionReceipts ?? 0) - before).toBe(expected);
    }
    expect(venues).toEqual(['QF1', 'PF1', 'GF']);
    expect(purchased.finance.concessionReceipts).toBe(50_000);
    expect(reload(purchased)).toEqual(purchased);
    const stayed = next(purchased);
    expect(nrlConcessionsQuote(stayed)).toMatchObject({ active: true, matchesToPayBack: 8 });
    expect(reload(advance(stayed))).toEqual(advance(stayed));
  });

  it('refuses stale, unreserved, imported and live actions and rejects impossible receipts', () => {
    const initial = createNrlCareer('storm', 4);
    const poor = { ...initial, finance: { ...initial.finance, openingCash: 249_999 } };
    expect(nrlConcessionsQuote(poor).reason).toMatch(/needs more cash/);
    expect(buy(poor)).toBe(poor);
    const reserved = { ...initial, finance: { ...initial.finance, openingCash: 750_000,
      coachHire: { role: 'attack' as const, round: 1, paidRounds: 0 } } };
    expect(nrlConcessionsQuote(reserved).reason).toMatch(/assistant.*wages/);
    expect(buy(reserved)).toBe(reserved);
    const imported = readNrlCareerSave(JSON.stringify(createNrlSeason('storm', 4)))!;
    expect(buy(imported)).toBe(imported);
    const live = reduceNrlCareer(initial, { type: 'startLive' });
    expect(live.season.live).toBeDefined();
    expect(buy(live)).toBe(live);
    const second = advance(initial);
    expect(reduceNrlCareer(second, { type: 'upgradeConcessions', year: 2026, clubId: 'storm', round: 1 })).toBe(second);
    const purchased = buy(initial);
    expect(reload({ ...purchased, finance: { ...purchased.finance, concessionReceipts: 25_000 } })).toBeNull();
    expect(reload({ ...initial, finance: { ...initial.finance, concessionsUpgradeRound: 2 } })).toBeNull();
    expect(reload({ ...initial, finance: { ...initial.finance, concessionReceipts: 0 } })).toBeNull();
  });

  it('settles the same concession income in live play and fast-forward as Quick Sim', () => {
    let purchased = buy(createNrlCareer('storm', 4));
    while (purchased.season.round === 1 || nrlNextRound(purchased.season).clubMatch?.homeId !== 'storm') purchased = advance(purchased);
    const quick = advance(purchased);
    const live = reduceNrlCareer(purchased, { type: 'startLive' });
    const completed = reduceNrlCareer(live, { type: 'finishLive', year: live.season.year, round: live.season.round, tactic: live.season.tactic });
    expect(completed.season.round).toBe(quick.season.round);
    expect(completed.finance.concessionReceipts).toBe(quick.finance.concessionReceipts);
    expect(quick.finance.concessionReceipts).toBe(25_000);
    expect(reload(completed)).toEqual(completed);
    const { year, clubId, round } = purchased.season;
    const result = runNrlFastForward(purchased, { year, clubId, round, through: round + 1 });
    const expected = result.state.season.round === round + 1 ? quick : advance(quick);
    expect(result.state.season.round).toBeGreaterThan(round);
    expect(JSON.stringify(result.state)).toBe(JSON.stringify(expected));
  });
});
