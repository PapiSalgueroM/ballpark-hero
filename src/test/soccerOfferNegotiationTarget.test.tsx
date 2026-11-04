import { useState } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import SoccerCareerProgramme from '@/components/soccer-career/SoccerCareerProgramme';
import { chooseProgramme } from '@/lib/soccerCareerProgramme';
import * as E from '@/lib/soccerCareerEngine';
import { agentWageMult } from '@/lib/soccerCareerLife';
import { chooseLoyalty, readLoyalty } from '@/lib/soccerCareerLoyalty';
import { isSoccerCareerSave, parseSoccerCareerSave, serializeSoccerCareerSave } from '@/lib/soccerCareerSave';

type Frame = 'bidding' | 'pending' | 'expiry';
const targetCounter = chooseProgramme as (career: E.CareerState, id: 'negotiation', choice: 'wage' | 'shorter', target?: E.ContractOffer) => E.CareerState;
const stats = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'] as const;
const home: E.ClubData = { id: 'offer-home', name: 'Offer Home FC', country: 'England', tier: 1, color: '#123456', league: 'Fixture League' };
const clubs = [
  { ...home, id: 'offer-a', name: 'Harbour Offer FC' },
  { ...home, id: 'offer-b', name: 'Riverside Offer FC' },
  { ...home, id: 'offer-c', name: 'Valley Offer FC' },
];
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function fixture(frame: Frame = 'bidding', rating = 8, agentId: 'self' | 'shark' = 'self') {
  const made = E.initCareer('Offer Fixture', 'England', 'ST', '2020-24',
    { pace: 75, shooting: 75, passing: 75, dribbling: 75, defending: 75, physical: 75, reflexes: 75 },
    75, 2020, [home], null, 90);
  const row: E.SeasonRecord = { year: 2028, age: 24, club: home.name, clubCountry: home.country, clubTier: 1,
    apps: 32, goals: 17, assists: 8, cleanSheets: 4, yellowCards: 2, redCards: 0, rating, ovr: 75,
    leagueTitle: false, domesticCup: false, championsLeague: false, worldCup: false,
    ballonDor: false, ballonDorRank: null, type: 'playing',
    intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null };
  const offers: E.ContractOffer[] = [
    { club: clubs[0], wage: 10000, contractYears: 3, transferFee: 1 },
    { club: clubs[1], wage: 12000, contractYears: 4, transferFee: 4 },
    { club: clubs[2], wage: 9000, contractYears: 2, transferFee: 0 },
  ];
  const career: E.CareerState = { ...made, age: 24, currentClub: home.name, currentClubCountry: home.country,
    currentClubTier: 1, currentClubColor: home.color, currentLeague: home.league,
    weeklyWage: 8000, contractYearsLeft: 1, netWorth: 3, totalEarnings: 5, agentFeesPaid: 0,
    phase: frame === 'pending' ? 'contract_offer' : 'transfer_window', retired: false, agentId,
    seasons: [...made.seasons, row], pendingOffers: frame === 'pending' ? offers : [],
    transferSituation: frame === 'bidding' ? { type: 'bidding_war', offerA: offers[0], offerB: offers[1] }
      : frame === 'expiry' ? { type: 'contract_expiry', offers: offers.slice(0, 2) } : null };
  return career;
}
function offers(career: E.CareerState): E.ContractOffer[] {
  const s = career.transferSituation;
  if (s?.type === 'bidding_war') return [s.offerA, s.offerB];
  if (s?.type === 'contract_expiry') return s.offers;
  return career.pendingOffers;
}
function start(career: E.CareerState) {
  return { bytes: JSON.stringify(career), draws: vi.mocked(Math.random).mock.calls.length };
}
function keep(name: string, career: E.CareerState, held: ReturnType<typeof start>, observed: unknown) {
  const raw = { case: name, fixture: 'Explicit fictional offers and one controlled senior season, not natural career reproduction.',
    inputHeld: JSON.stringify(career) === held.bytes,
    draws: vi.mocked(Math.random).mock.results.slice(held.draws).map(row => row.value), observed };
  if (process.env.SC_OFFER_NEGOTIATION_RAW) {
    mkdirSync(process.env.SC_OFFER_NEGOTIATION_RAW, { recursive: true });
    writeFileSync(join(process.env.SC_OFFER_NEGOTIATION_RAW, name + '.json'), JSON.stringify(raw, null, 2) + '\n');
  }
  return raw;
}
function retained(career: E.CareerState, held: ReturnType<typeof start>) {
  expect(JSON.stringify(career)).toBe(held.bytes);
  expect(vi.mocked(Math.random).mock.calls.length).toBe(held.draws);
  expect(localStorage.getItem('offer-unrelated')).toBe('held');
}
function outsideTerms(before: E.CareerState, after: E.CareerState) {
  const actual = { ...after, transferSituation: before.transferSituation, pendingOffers: before.pendingOffers };
  if (before.programme === undefined) delete actual.programme; else actual.programme = before.programme;
  expect(actual).toEqual(before);
}
function signAndReload(career: E.CareerState, offer: E.ContractOffer) {
  const signed = E.acceptOffer(career, offer);
  const encoded = serializeSoccerCareerSave(signed);
  localStorage.setItem('soccerCareerSave', encoded);
  const loaded = parseSoccerCareerSave(localStorage.getItem('soccerCareerSave')!) as E.CareerState;
  return { signed, loaded, codecValid: isSoccerCareerSave(loaded), codecHeld: isDeepStrictEqual(loaded, clone(signed)) };
}
function signedHeld(before: E.CareerState, result: ReturnType<typeof signAndReload>) {
  expect(result.codecValid).toBe(true);
  expect(result.loaded).toEqual(clone(result.signed));
  expect(result.loaded.phase).toBe('playing');
  expect(result.loaded.currentClub).toBe(clubs[1].name);
  expect(Object.fromEntries(stats.map(key => [key, result.loaded[key]]))).toEqual(Object.fromEntries(stats.map(key => [key, before[key]])));
  expect(result.loaded.overall).toBe(before.overall);
}
beforeEach(() => {
  localStorage.clear(); localStorage.setItem('offer-unrelated', 'held');
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  vi.spyOn(Date, 'now').mockReturnValue(1793793600000);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Soccer selected offer negotiation', () => {
  it('selects offer B in the real plans screen, counters it, signs and reloads its exact wage', () => {
    const initial = fixture(), held = start(initial), changed = vi.fn();
    let current = initial;
    function App() {
      const [career, setCareer] = useState(initial);
      return <SoccerCareerProgramme career={career} onClose={() => undefined} onChange={next => {
        current = next; changed(next); setCareer(next);
      }} />;
    }
    const view = render(<App />);
    fireEvent.click(view.getByRole('button', { name: 'See my plans' }));
    fireEvent.click(view.getByRole('button', { name: /Contract counteroffer/ }));
    const picker = view.queryByRole('combobox', { name: 'Offer to negotiate' });
    if (picker) fireEvent.change(picker, { target: { value: '1' } });
    fireEvent.click(view.getByRole('button', { name: 'Choose Ask for more pay' }));
    const negotiated = current, pair = offers(negotiated), repeat = targetCounter(negotiated, 'negotiation', 'wage', pair[1]);
    const other = targetCounter(negotiated, 'negotiation', 'wage', pair[0]);
    const result = signAndReload(negotiated, pair[1]);
    const raw = keep('wage-selected-b', initial, held, { pickerPresent: picker !== null,
      actualOffers: pair, negotiated: negotiated.programme?.negotiated, repeatHeld: repeat === negotiated,
      otherOffers: offers(other), otherLedger: other.programme?.negotiated,
      signed: { wage: result.loaded.weeklyWage, years: result.loaded.contractYearsLeft, club: result.loaded.currentClub },
      codecValid: result.codecValid, codecHeld: result.codecHeld, callbacks: changed.mock.calls.length });
    expect(pair[1].wage, 'SC_OFFER_TARGET_UI_B').toBe(13200);
    expect(pair[1]).toEqual({ ...offers(initial)[1], wage: 13200 });
    expect(pair[0]).toEqual(offers(initial)[0]);
    expect(negotiated.programme?.negotiated).toEqual([{ year: 2029, club: clubs[1].name, mode: 'wage', accepted: true }]);
    expect(repeat).toBe(negotiated);
    expect(other).not.toBe(negotiated);
    expect(offers(other)[0].wage).toBe(11000);
    expect(other.programme?.negotiated?.map(row => row.club)).toEqual([clubs[1].name, clubs[0].name]);
    expect(result.loaded.weeklyWage).toBe(13200); expect(result.loaded.contractYearsLeft).toBe(4);
    expect(result.loaded.agentFeesPaid).toBe(0);
    expect(raw.draws).toEqual([]); expect(changed).toHaveBeenCalledTimes(1);
    outsideTerms(initial, negotiated); signedHeld(initial, result); retained(initial, held);
  });

  it('shortens the selected pending offer and retains the real agent wage and fee transforms', () => {
    const initial = fixture('pending', 8, 'shark'), held = start(initial);
    const next = targetCounter(initial, 'negotiation', 'shorter', offers(initial)[1]), pair = offers(next);
    const result = signAndReload(next, pair[1]);
    const raw = keep('shorter-pending-b', initial, held, { actualOffers: pair, negotiated: next.programme?.negotiated,
      signed: { wage: result.loaded.weeklyWage, years: result.loaded.contractYearsLeft, agentFeesPaid: result.loaded.agentFeesPaid },
      codecValid: result.codecValid, codecHeld: result.codecHeld });
    expect([pair[1].wage, pair[1].contractYears], 'SC_OFFER_TARGET_SHORTER_B').toEqual([11400, 3]);
    expect(pair[0]).toEqual(offers(initial)[0]); expect(pair[2]).toEqual(offers(initial)[2]);
    expect(pair[1]).toEqual({ ...offers(initial)[1], wage: 11400, contractYears: 3 });
    expect(agentWageMult(initial.agentId)).toBe(1.1);
    expect(result.loaded.weeklyWage).toBe(12540); expect(result.loaded.contractYearsLeft).toBe(3);
    expect(result.loaded.agentFeesPaid).toBe(0.32);
    expect(raw.draws).toEqual([]); outsideTerms(initial, next); signedHeld(initial, result); retained(initial, held);
  });

  it('counters an expiry offer before applying the existing quoted loyalty contract and codec', () => {
    const initial = fixture('expiry', 8, 'shark'), held = start(initial);
    const next = targetCounter(initial, 'negotiation', 'wage', offers(initial)[1]), target = offers(next)[1];
    const withLoyalty = chooseLoyalty(next, target, Math.round(target.wage * agentWageMult(next.agentId)), 'loyalty');
    const result = signAndReload(withLoyalty, target), ledger = readLoyalty(result.loaded);
    const raw = keep('loyalty-expiry-b', initial, held, { actualOffers: offers(next),
      quoted: readLoyalty(withLoyalty)?.pending, signed: { wage: result.loaded.weeklyWage, years: result.loaded.contractYearsLeft, agentFeesPaid: result.loaded.agentFeesPaid },
      loyalty: ledger, codecValid: result.codecValid, codecHeld: result.codecHeld });
    expect([result.loaded.weeklyWage, result.loaded.contractYearsLeft], 'SC_OFFER_TARGET_LOYALTY_B').toEqual([13068, 4]);
    expect(offers(next)[0]).toEqual(offers(initial)[0]);
    expect(ledger?.deals).toHaveLength(1);
    expect(ledger?.deals[0]).toMatchObject({ club: clubs[1].name, baseWeeklyWage: 14520,
      weeklyWage: 13068, bonusEuros: 453024, years: 4, completed: 0, status: 'active', paidEuros: 0 });
    expect(ledger?.pending).toBeUndefined();
    expect(result.loaded.agentFeesPaid).toBe(0.32);
    expect(result.loaded.netWorth).toBe(initial.netWorth); expect(result.loaded.totalEarnings).toBe(initial.totalEarnings);
    expect(raw.draws).toEqual([]); outsideTerms(initial, next); signedHeld(initial, result); retained(initial, held);
  });

  it('records a rejected B attempt once while preserving both offers and leaving A available', () => {
    const initial = fixture('bidding', 7.4), held = start(initial);
    const next = targetCounter(initial, 'negotiation', 'wage', offers(initial)[1]);
    const repeat = targetCounter(next, 'negotiation', 'wage', offers(next)[1]);
    const other = targetCounter(next, 'negotiation', 'wage', offers(next)[0]);
    const raw = keep('rejected-b', initial, held, { actualOffers: offers(next), first: next.programme?.negotiated,
      repeatHeld: repeat === next, second: other.programme?.negotiated, otherChanged: other !== next });
    expect(next.programme?.negotiated, 'SC_OFFER_TARGET_REJECT_B').toEqual([{ year: 2029, club: clubs[1].name, mode: 'wage', accepted: false }]);
    expect(offers(next)).toEqual(offers(initial)); expect(repeat).toBe(next);
    expect(other).not.toBe(next); expect(offers(other)).toEqual(offers(initial));
    expect(other.programme?.negotiated).toEqual([
      { year: 2029, club: clubs[1].name, mode: 'wage', accepted: false },
      { year: 2029, club: clubs[0].name, mode: 'wage', accepted: false },
    ]);
    expect(raw.draws).toEqual([]); outsideTerms(initial, next); retained(initial, held);
  });

  it('refuses stale, outside, loan and invalid explicit targets without touching the current first offer', () => {
    const vectors: { name: string; same: boolean; inputHeld: boolean; draws: number[] }[] = [];
    for (const name of ['cloned', 'outside', 'stale', 'loan', 'invalid-wage', 'invalid-club']) {
      const initial = fixture(), held = start(initial), originalB = offers(initial)[1];
      let target = originalB;
      if (name === 'cloned') target = clone(originalB);
      if (name === 'outside') target = { ...originalB, club: clubs[2] };
      if (name === 'stale') {
        if (initial.transferSituation?.type !== 'bidding_war') throw new Error('Expected fixture bidding frame');
        initial.transferSituation = { ...initial.transferSituation, offerB: { ...originalB, wage: 12500 } };
      }
      if (name === 'loan') originalB.isLoan = true;
      if (name === 'invalid-wage') originalB.wage = 0;
      if (name === 'invalid-club') originalB.club = { ...clubs[1], name: '' };
      const before = JSON.stringify(initial), drawStart = vi.mocked(Math.random).mock.calls.length;
      const result = targetCounter(initial, 'negotiation', 'wage', target);
      vectors.push({ name, same: result === initial, inputHeld: JSON.stringify(initial) === before,
        draws: vi.mocked(Math.random).mock.results.slice(drawStart).map(row => row.value) });
      expect(localStorage.getItem('offer-unrelated')).toBe('held');
      expect(vi.mocked(Math.random).mock.calls.length).toBe(held.draws);
    }
    const initial = fixture(), held = start(initial);
    keep('invalid-targets', initial, held, vectors);
    expect(vectors.map(row => row.same), 'SC_OFFER_TARGET_REFUSAL').toEqual(Array(6).fill(true));
    expect(vectors.every(row => row.inputHeld && row.draws.length === 0)).toBe(true);
  });

  it('preserves omitted-target first-offer behavior through signing and the existing save codec', () => {
    const outcomes: unknown[] = [];
    for (const frame of ['bidding', 'pending', 'expiry'] as const) {
      const initial = fixture(frame), held = start(initial);
      const next = chooseProgramme(initial, 'negotiation', 'wage'), pair = offers(next), result = signAndReload(next, pair[0]);
      outcomes.push({ frame, offers: pair, signed: { wage: result.loaded.weeklyWage, years: result.loaded.contractYearsLeft, club: result.loaded.currentClub },
        codecValid: result.codecValid, codecHeld: result.codecHeld });
      expect(pair[0]).toEqual({ ...offers(initial)[0], wage: 11000 });
      expect(pair.slice(1)).toEqual(offers(initial).slice(1));
      expect(result.loaded.weeklyWage).toBe(11000); expect(result.loaded.contractYearsLeft).toBe(3);
      expect(result.loaded.currentClub).toBe(clubs[0].name);
      expect(result.codecValid).toBe(true); expect(result.loaded).toEqual(clone(result.signed));
      outsideTerms(initial, next); retained(initial, held);
    }
    const initial = fixture(), held = start(initial);
    keep('legacy-default', initial, held, outcomes);
  });
});
