import { useState } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import SoccerCareerProgramme from '@/components/soccer-career/SoccerCareerProgramme';
import { chooseProgramme, cancelProgramme } from '@/lib/soccerCareerProgramme';
import * as E from '@/lib/soccerCareerEngine';
import { chooseLoyalty, readLoyalty, settleLoyaltySeason } from '@/lib/soccerCareerLoyalty';
import { isSoccerCareerSave, parseSoccerCareerSave, serializeSoccerCareerSave } from '@/lib/soccerCareerSave';

type Frame = 'bidding' | 'pending' | 'expiry';
const choose = chooseProgramme as (c: E.CareerState, id: 'loyalty' | 'negotiation', choice: string, target?: E.ContractOffer) => E.CareerState;
const cancel = cancelProgramme as (c: E.CareerState, id: 'loyalty', target?: E.ContractOffer) => E.CareerState;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const home: E.ClubData = { id: 'loyalty-home', name: 'Loyalty Home FC', country: 'England', tier: 1, color: '#123456', league: 'Fixture League' };
const clubs = [{ ...home, id: 'loyalty-a', name: 'Harbour Loyalty FC' }, { ...home, id: 'loyalty-b', name: 'Riverside Loyalty FC' }];
const skills = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'] as const;
function fixture(frame: Frame = 'bidding', agentId: 'self' | 'shark' = 'self'): E.CareerState {
  const made = E.initCareer('Loyalty Fixture', 'England', 'ST', '2020-24',
    { pace: 75, shooting: 75, passing: 75, dribbling: 75, defending: 75, physical: 75, reflexes: 75 },
    75, 2020, [home], null, 90);
  const row: E.SeasonRecord = { year: 2028, age: 24, club: home.name, clubCountry: home.country, clubTier: 1,
    apps: 32, goals: 17, assists: 8, cleanSheets: 4, yellowCards: 2, redCards: 0, rating: 8, ovr: 75,
    leagueTitle: false, domesticCup: false, championsLeague: false, worldCup: false, ballonDor: false, ballonDorRank: null, type: 'playing',
    intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null };
  const offers: E.ContractOffer[] = [{ club: clubs[0], wage: 10000, contractYears: 3, transferFee: 1 }, { club: clubs[1], wage: 12000, contractYears: 3, transferFee: 4 }];
  return { ...made, age: 24, currentClub: home.name, currentClubCountry: home.country, currentClubTier: 1, currentClubColor: home.color,
    currentLeague: home.league, weeklyWage: 8000, contractYearsLeft: 1, netWorth: 3, totalEarnings: 5, agentFeesPaid: 0, agentId,
    phase: frame === 'pending' ? 'contract_offer' : 'transfer_window', retired: false, seasons: [...made.seasons, row],
    pendingOffers: frame === 'pending' ? offers : [],
    transferSituation: frame === 'bidding' ? { type: 'bidding_war', offerA: offers[0], offerB: offers[1] }
      : frame === 'expiry' ? { type: 'contract_expiry', offers } : null };
}
function offers(c: E.CareerState): E.ContractOffer[] {
  const s = c.transferSituation;
  return s?.type === 'bidding_war' ? [s.offerA, s.offerB] : s?.type === 'contract_expiry' ? s.offers : c.pendingOffers;
}
function held(c: E.CareerState) { return { value: clone(c), draws: vi.mocked(Math.random).mock.calls.length }; }
function raw(name: string, c: E.CareerState, before: ReturnType<typeof held>, observed: unknown) {
  const value = { case: name, fixture: 'Fictional current offers and explicit recorded service seasons. Not a natural-career reproduction.',
    inputHeld: isDeepStrictEqual(c, before.value), draws: vi.mocked(Math.random).mock.results.slice(before.draws).map(r => r.value), observed };
  if (process.env.SC_LOYALTY_TARGET_RAW) { mkdirSync(process.env.SC_LOYALTY_TARGET_RAW, { recursive: true }); writeFileSync(join(process.env.SC_LOYALTY_TARGET_RAW, name + '.json'), JSON.stringify(value, null, 2) + '\n'); }
  expect(c).toEqual(before.value); expect(value.draws).toEqual([]); expect(localStorage.getItem('loyalty-target-unrelated')).toBe('held');
  return value;
}
function onlyLoyalty(before: E.CareerState, after: E.CareerState) {
  const rest = { ...after }; if (before.loyaltyContracts === undefined) delete rest.loyaltyContracts; else rest.loyaltyContracts = before.loyaltyContracts;
  expect(rest).toEqual(before);
}
function reload(c: E.CareerState) {
  localStorage.setItem('soccerCareerSave', serializeSoccerCareerSave(c));
  const loaded = parseSoccerCareerSave(localStorage.getItem('soccerCareerSave')!) as E.CareerState;
  expect(isSoccerCareerSave(loaded)).toBe(true); expect(loaded).toEqual(clone(c)); return loaded;
}
function signed(c: E.CareerState, target: E.ContractOffer) { return reload(E.acceptOffer(c, target)); }
function sameRating(before: E.CareerState, after: E.CareerState) {
  expect(Object.fromEntries(skills.map(k => [k, after[k]]))).toEqual(Object.fromEntries(skills.map(k => [k, before[k]]))); expect(after.overall).toBe(before.overall);
}
beforeEach(() => { localStorage.clear(); localStorage.setItem('loyalty-target-unrelated', 'held'); vi.spyOn(Math, 'random').mockReturnValue(0.5); vi.spyOn(Date, 'now').mockReturnValue(1793793600000); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Soccer selected loyalty offer', () => {
  it('chooses B in the real plans screen and signs and reloads its reduced wage and fixed payout', () => {
    const initial = fixture(), before = held(initial), changed = vi.fn(); let current = initial;
    function App() { const [career, setCareer] = useState(initial); return <SoccerCareerProgramme career={career} onClose={() => undefined} onChange={next => { current = next; changed(next); setCareer(next); }} />; }
    const view = render(<App />); fireEvent.click(view.getByRole('button', { name: 'See my plans' })); fireEvent.click(view.getByRole('button', { name: /Loyalty contract/ }));
    const picker = view.queryByRole('combobox', { name: 'Offer for loyalty terms' }); if (picker) fireEvent.change(picker, { target: { value: '1' } });
    expect(changed).not.toHaveBeenCalled(); fireEvent.click(view.getByRole('button', { name: 'Choose Loyalty payout' }));
    const staged = current, loaded = signed(staged, offers(staged)[1]), deal = readLoyalty(loaded)?.deals[0];
    raw('ui-selected-b', initial, before, { picker: !!picker, pending: readLoyalty(staged)?.pending, signed: { club: loaded.currentClub, wage: loaded.weeklyWage, years: loaded.contractYearsLeft }, deal, callbacks: changed.mock.calls.length });
    onlyLoyalty(initial, staged); sameRating(initial, loaded);
    expect([loaded.currentClub, loaded.weeklyWage, deal?.bonusEuros], 'SC_LOYALTY_TARGET_UI_B').toEqual([clubs[1].name, 10800, 280800]);
    expect(deal).toMatchObject({ club: clubs[1].name, baseWeeklyWage: 12000, weeklyWage: 10800, years: 3, completed: 0, paidEuros: 0, status: 'active' });
    expect(loaded.netWorth).toBe(3); expect(loaded.totalEarnings).toBe(5); expect(loaded.agentFeesPaid).toBe(0); expect(changed).toHaveBeenCalledTimes(1);
  });

  it('retains agent adjusted B terms and pays its literal completion bonus once through recorded service and reload', () => {
    const initial = fixture('expiry', 'shark'), before = held(initial), staged = choose(initial, 'loyalty', 'loyalty', offers(initial)[1]);
    const start = signed(staged, offers(staged)[1]); let paid = start; const progress: { year: number; completed: number | undefined; netWorth: number; totalEarnings: number }[] = [];
    for (const year of [2029, 2030, 2031]) {
      const row: E.SeasonRecord = { ...initial.seasons[initial.seasons.length - 1], year, age: year - 2004, club: clubs[1].name, clubCountry: clubs[1].country };
      const appended = { ...paid, seasons: [...paid.seasons, row], contractYearsLeft: 2031 - year };
      paid = settleLoyaltySeason(appended, row); progress.push({ year, completed: readLoyalty(paid)?.deals[0]?.completed, netWorth: paid.netWorth, totalEarnings: paid.totalEarnings });
    }
    const last = paid.seasons[paid.seasons.length - 1], repeated = settleLoyaltySeason(paid, last), loaded = reload(paid);
    raw('agent-payout-b', initial, before, { quoted: readLoyalty(staged)?.pending, signing: { wage: start.weeklyWage, agentFees: start.agentFeesPaid }, progress, deal: readLoyalty(loaded)?.deals[0], repeatHeld: repeated === paid });
    onlyLoyalty(initial, staged); sameRating(initial, loaded);
    expect([start.weeklyWage, readLoyalty(loaded)?.deals[0]?.paidEuros], 'SC_LOYALTY_TARGET_PAID_B').toEqual([11880, 308880]);
    expect(start.agentFeesPaid).toBe(0.32); expect(progress).toEqual([{ year: 2029, completed: 1, netWorth: 3, totalEarnings: 5 }, { year: 2030, completed: 2, netWorth: 3, totalEarnings: 5 }, { year: 2031, completed: 3, netWorth: 3.30888, totalEarnings: 5.30888 }]);
    expect(readLoyalty(loaded)?.deals[0]).toMatchObject({ club: clubs[1].name, status: 'paid', completed: 3, bonusEuros: 308880, paidEuros: 308880 }); expect(repeated).toBe(paid);
    expect(settleLoyaltySeason(loaded, loaded.seasons[loaded.seasons.length - 1])).toBe(loaded);
  });

  it('keeps a B quote when cash or cancellation targets A and clears only the selected B choice', () => {
    const initial = fixture('pending'), staged = chooseLoyalty(initial, offers(initial)[1], 12000, 'loyalty'), before = held(staged);
    const wrongCash = choose(staged, 'loyalty', 'cash', offers(staged)[0]), wrongCancel = cancel(staged, 'loyalty', offers(staged)[0]);
    const ownCash = choose(staged, 'loyalty', 'cash', offers(staged)[1]), ownCancel = cancel(staged, 'loyalty', offers(staged)[1]);
    raw('cash-cancel-scope', staged, before, { wrongCashHeld: wrongCash === staged, wrongCancelHeld: wrongCancel === staged, ownCash: readLoyalty(ownCash), ownCancel: readLoyalty(ownCancel), pending: readLoyalty(staged)?.pending });
    expect([wrongCash === staged, wrongCancel === staged], 'SC_LOYALTY_TARGET_CANCEL_SCOPE').toEqual([true, true]);
    expect(ownCash).toEqual(initial); expect(ownCancel).toEqual(initial); expect(offers(staged)).toEqual(offers(initial));
  });

  it('refuses cloned stale outside loan short and unsupported targets without changing the first offer or ledger', () => {
    const vectors: { name: string; held: boolean; inputHeld: boolean }[] = [];
    const initial = fixture(), before = held(initial);
    for (const name of ['cloned', 'stale', 'outside', 'loan', 'one-year', 'future-ledger']) {
      const c = clone(initial), originalB = offers(c)[1]; let target = originalB;
      if (name === 'cloned') target = clone(originalB);
      if (name === 'stale' && c.transferSituation?.type === 'bidding_war') c.transferSituation.offerB = { ...originalB, wage: 12100 };
      if (name === 'outside') target = { ...originalB, club: { ...originalB.club, name: 'Outside Loyalty FC' } };
      if (name === 'loan') originalB.isLoan = true;
      if (name === 'one-year') originalB.contractYears = 1;
      if (name === 'future-ledger') Object.assign(c, { loyaltyContracts: { v: 99, deals: [], extra: 'kept' } });
      const snapshot = clone(c), next = choose(c, 'loyalty', 'loyalty', target);
      vectors.push({ name, held: next === c, inputHeld: isDeepStrictEqual(c, snapshot) });
    }
    raw('invalid-targets', initial, before, { vectors });
    expect(vectors.map(v => [v.name, v.held, v.inputHeld]), 'SC_LOYALTY_TARGET_REFUSAL').toEqual(['cloned', 'stale', 'outside', 'loan', 'one-year', 'future-ledger'].map(name => [name, true, true]));
  });

  it('requires fresh selected B terms after a counter and leaves the stale pointer inert', () => {
    const initial = fixture(), staged = chooseLoyalty(initial, offers(initial)[1], 12000, 'loyalty'), before = held(staged), oldB = offers(staged)[1];
    const countered = choose(staged, 'negotiation', 'wage', oldB), currentB = offers(countered)[1];
    const blocked = E.acceptOffer(countered, currentB), stale = choose(countered, 'loyalty', 'loyalty', oldB);
    const renewed = choose(countered, 'loyalty', 'loyalty', currentB), repeat = choose(renewed, 'loyalty', 'loyalty', offers(renewed)[1]), loaded = signed(renewed, offers(renewed)[1]);
    raw('changed-terms-b', staged, before, { counterWage: currentB.wage, blockedHeld: blocked === countered, staleHeld: stale === countered, pending: readLoyalty(renewed)?.pending, signedWage: loaded.weeklyWage, repeatHeld: repeat === renewed });
    expect([stale === countered, readLoyalty(renewed)?.pending?.club, loaded.weeklyWage], 'SC_LOYALTY_TARGET_FRESH_TERMS').toEqual([true, clubs[1].name, 11880]);
    expect(currentB.wage).toBe(13200); expect(blocked).toBe(countered); expect(repeat).toBe(renewed); expect(offers(countered)[0]).toEqual(offers(initial)[0]);
    expect(readLoyalty(loaded)?.deals[0]).toMatchObject({ baseWeeklyWage: 13200, weeklyWage: 11880, bonusEuros: 308880 }); sameRating(initial, loaded);
  });

  it('preserves omitted target first offer signing and legacy cash cancellation in every existing window', () => {
    const frames = (['bidding', 'pending', 'expiry'] as const).map(frame => ({ frame, career: fixture(frame) }));
    const initial = frames[0].career, before = held(initial), results = [];
    for (const { frame, career: c } of frames) {
      const staged = choose(c, 'loyalty', 'loyalty'), loaded = signed(staged, offers(staged)[0]);
      const otherPending = chooseLoyalty(c, offers(c)[1], 12000, 'loyalty');
      results.push({ frame, club: loaded.currentClub, wage: loaded.weeklyWage, bonus: readLoyalty(loaded)?.deals[0]?.bonusEuros, cashHeld: isDeepStrictEqual(choose(otherPending, 'loyalty', 'cash'), c), cancelHeld: isDeepStrictEqual(cancel(otherPending, 'loyalty'), c) });
      onlyLoyalty(c, staged); sameRating(c, loaded);
    }
    raw('legacy-default', initial, before, { results });
    expect(results).toEqual(['bidding', 'pending', 'expiry'].map(frame => ({ frame, club: clubs[0].name, wage: 9000, bonus: 234000, cashHeld: true, cancelHeld: true })));
  });
});
