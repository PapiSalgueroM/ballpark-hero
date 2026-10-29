import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { acceptOffer, acceptLoan, applyRehabChoice, advanceProSeason, FALLBACK_CLUBS, manualRetire, repairCareer } from '@/lib/soccerCareerEngine';
import type { CareerState, ContractOffer } from '@/lib/soccerCareerEngine';
import { chooseProgramme } from '@/lib/soccerCareerProgramme';
import { serializeSoccerCareerSave, parseSoccerCareerSave, isSoccerCareerSave } from '@/lib/soccerCareerSave';
import { chooseLoyalty, commitLoyaltySigning, readLoyalty } from '@/lib/soccerCareerLoyalty';

const offer: ContractOffer = {
  club: { id: 'loyalty-fixture', name: 'Loyalty Fixture Club', country: 'Fixture Country', league: 'Fixture League', color: '#123456', tier: 3 },
  wage: 10000, contractYears: 2, transferFee: 0,
};
function fixture(): CareerState {
  const packet = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
  const saved = packet.saves.find((entry: { id: string }) => entry.id === 'ere');
  if (!saved?.state) throw new Error('Existing admitted complete career fixture ere is required');
  const state = structuredClone(saved.state) as CareerState;
  delete state.agentId;
  state.phase = 'contract_offer'; state.retired = false; state.loan = null;
  state.currentClub = 'Previous Fixture Club'; state.weeklyWage = 8000;
  state.pendingOffers = [structuredClone(offer)]; state.transferSituation = null;
  state.netWorth = 2; state.totalEarnings = 3; state.events = [];
  return state;
}
function activeFixture(): CareerState {
  const before = chooseLoyalty(fixture(), offer, 10000, 'loyalty');
  const next = { ...before, phase: 'playing' as const, currentClub: offer.club.name, weeklyWage: 9000, contractYearsLeft: 2, pendingOffers: [] };
  return commitLoyaltySigning(before, next, offer, 10000);
}

function injuryYear(state: CareerState): CareerState {
  const last = state.seasons[state.seasons.length - 1];
  state.age = last.age + 1;
  state.phase = 'rehab_choice';
  state.pendingRehab = { name: 'Recorded test injury', weeks: 16, year: last.year + 1, specialistCost: null };
  return applyRehabChoice(state, 1);
}
function negotiated(): CareerState {
  const start = fixture();
  start.overall = 85;
  delete start.programme;
  return chooseProgramme(chooseLoyalty(start, offer, 10000, 'loyalty'), 'negotiation', 'wage');
}

describe('actual Soccer Career loyalty integration', () => {
  it('signs the quoted lower wage and commits an active deal through the real engine', () => {
    const staged = chooseLoyalty(fixture(), offer, 10000, 'loyalty');
    const actual = acceptOffer(staged, offer);
    expect(actual.weeklyWage).toBe(9000);
    expect(readLoyalty(actual)?.deals[0]).toMatchObject({ status: 'active', bonusEuros: 156000, paidEuros: 0 });
    expect(readLoyalty(actual)?.pending).toBeUndefined();
  });
  it('keeps malformed optional data neutral for actual cash signing and earned money', () => {
    for (const bad of [null, { v: 1, deals: [{ status: 'paid', paidEuros: 156000 }] }]) {
      const input = fixture();
      input.netWorth = 2.156; input.totalEarnings = 3.156;
      const neutral = acceptOffer(structuredClone(input), offer);
      const malformed = structuredClone(input);
      (malformed as unknown as { loyaltyContracts?: unknown }).loyaltyContracts = bad;
      const actual = acceptOffer(malformed, offer);
      expect(actual.currentClub).toBe(offer.club.name);
      expect(actual.weeklyWage).toBe(10000);
      expect(actual.netWorth).toBe(2.156);
      expect(actual.totalEarnings).toBe(3.156);
      expect(actual).toEqual(neutral);
    }
  });
  it('rejects an old contract tap after the actual engine has signed once', () => {
    const signed = acceptOffer(chooseLoyalty(fixture(), offer, 10000, 'loyalty'), offer);
    expect(acceptOffer(signed, offer)).toBe(signed);
  });
  it('refuses the actual accepted counteroffer until loyalty is refreshed or cash is chosen', () => {
    const changed = negotiated();
    const revised = changed.pendingOffers[0];
    expect(revised.wage).toBe(11000);
    expect(revised.club.name).toBe(offer.club.name);
    expect(changed.programme?.negotiated?.slice(-1)[0]).toMatchObject({ accepted: true, mode: 'wage' });
    expect(acceptOffer(changed, revised)).toBe(changed);
    const refreshed = chooseLoyalty(changed, revised, 11000, 'loyalty');
    const signed = acceptOffer(refreshed, revised);
    expect(signed.weeklyWage).toBe(9900);
    expect(readLoyalty(signed)?.deals[0]).toMatchObject({ status: 'active', bonusEuros: 171600 });
    const cash = acceptOffer(chooseLoyalty(changed, revised, 11000, 'cash'), revised);
    expect(cash.weeklyWage).toBe(11000);
    expect(cash).not.toHaveProperty('loyaltyContracts');
  });
  it('keeps a genuinely different current club offer cash eligible', () => {
    const other = { ...offer, club: { ...offer.club, name: 'Different Cash Fixture' } };
    const input = fixture();
    input.pendingOffers.push(other);
    const actual = acceptOffer(chooseLoyalty(input, offer, 10000, 'loyalty'), other);
    expect(actual.currentClub).toBe(other.club.name);
    expect(actual.weeklyWage).toBe(10000);
    expect(actual).not.toHaveProperty('loyaltyContracts');
  });
  it('forfeits an unpaid deal through an actual permanent move', () => {
    const another: ContractOffer = { ...offer, club: { ...offer.club, name: 'Another Fixture Club' } };
    const state = activeFixture();
    state.phase = 'transfer_window'; state.transferSituation = { type: 'one_offer', offer: another };
    const actual = acceptOffer(state, another);
    expect(actual.currentClub).toBe(another.club.name);
    expect(readLoyalty(actual)?.deals[0]).toMatchObject({ status: 'forfeited', reason: 'move', paidEuros: 0 });
    expect(actual.netWorth).toBe(2);
  });
  it('keeps the parent deal and clears an unaccepted other quote when taking an actual loan', () => {
    const state = activeFixture();
    const another = { ...offer, club: { ...offer.club, name: 'Other Permanent Fixture' } };
    state.phase = 'contract_offer'; state.pendingOffers = [another];
    const staged = chooseLoyalty(state, another, 10000, 'loyalty');
    const loan = { ...offer, club: { ...offer.club, name: 'Loan Fixture Club' }, isLoan: true, contractYears: 1 };
    const actual = acceptLoan(staged, loan);
    expect(actual.loan?.parentClub).toBe(offer.club.name);
    expect(readLoyalty(actual)?.deals[0]).toMatchObject({ status: 'active', club: offer.club.name, completed: 0 });
    expect(readLoyalty(actual)?.pending).toBeUndefined();
  });
  it('stages the new choice through the existing programme dispatcher', () => {
    const choose = chooseProgramme as (state: CareerState, id: string, choice: string) => CareerState;
    const state = fixture();
    const actual = choose(state, 'loyalty', 'loyalty');
    expect(readLoyalty(actual)?.pending).toMatchObject({ club: offer.club.name, baseWeeklyWage: 10000, weeklyWage: 9000, bonusEuros: 156000 });
    expect(state).not.toHaveProperty('loyaltyContracts');
  });
  it('closes an active deal through actual manual retirement without paying early', () => {
    const actual = manualRetire(activeFixture());
    expect(actual.retired).toBe(true);
    expect(readLoyalty(actual)?.deals[0]).toMatchObject({ status: 'forfeited', reason: 'retired', paidEuros: 0 });
    expect(actual.netWorth).toBe(2);
  });
  it('settles two real recorded injury years once without adding a global draw', () => {
    const input = activeFixture();
    const neutral = structuredClone(input);
    delete (neutral as unknown as { loyaltyContracts?: unknown }).loyaltyContracts;
    const play = (start: CareerState) => {
      let state = structuredClone(start);
      for (let n = 0; n < 2; n++) {
        state = injuryYear(state);
      }
      return state;
    };
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.1);
    try {
      const base = play(neutral), draws = random.mock.calls.length;
      random.mockClear();
      const actual = play(input);
      expect(random.mock.calls.length).toBe(draws);
      expect(actual.netWorth - base.netWorth).toBeCloseTo(0.156, 12);
      expect(actual.totalEarnings - base.totalEarnings).toBeCloseTo(0.156, 12);
      expect(readLoyalty(actual)?.deals[0]).toMatchObject({ status: 'paid', completed: 2, paidEuros: 156000 });
    } finally { random.mockRestore(); }
  });
  it.each([
    ['banned', 'BANNED'], ['prison', 'PRISON'], ['convicted', 'CONVICTED'], ['ped', 'BANNED (PED)'],
  ] as const)('does not invent loyalty service or pay for actual %s years', (mode, label) => {
    const input = activeFixture();
    input.internationalCareer = false;
    const neutral = structuredClone(input);
    delete (neutral as unknown as { loyaltyContracts?: unknown }).loyaltyContracts;
    const play = (start: CareerState) => {
      let state = structuredClone(start);
      for (let n = 0; n < 2; n++) {
        state.matchFixBanned = mode === 'banned' ? 2 : 0;
        state.prisonSeasons = mode === 'prison' ? 1 : 0;
        state.corruptionHeat = mode === 'convicted' ? 100 : 0;
        state.dirtyMoney = 0;
        state.pedActive = mode === 'ped'; state.pedSeasonsRemaining = mode === 'ped' ? 1 : 0;
        state = advanceProSeason(state, FALLBACK_CLUBS);
        expect(state.seasons[state.seasons.length - 1]).toMatchObject({ club: label, type: 'playing', apps: 0 });
        if (readLoyalty(start)) {
          expect(readLoyalty(state)?.deals[0]).toMatchObject({ status: 'forfeited', reason: 'gap', completed: 0, paidEuros: 0,
            firstYear: input.seasons[input.seasons.length - 1]!.year + 1, finalYear: input.seasons[input.seasons.length - 1]!.year + 2 });
        }
      }
      return state;
    };
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.1);
    try {
      const base = play(neutral), draws = random.mock.calls.length;
      random.mockClear();
      const actual = play(input);
      expect(random.mock.calls.length).toBe(draws);
      expect(actual.netWorth).toBe(base.netWorth);
      expect(actual.totalEarnings).toBe(base.totalEarnings);
    } finally { random.mockRestore(); }
  });
  it('credits the recorded parent through an actual loan injury payroll row', () => {
    const loan = { ...offer, club: { ...offer.club, name: 'Recorded Loan Fixture' }, isLoan: true, contractYears: 1 };
    const input = acceptLoan(activeFixture(), loan);
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.1);
    try {
      const actual = injuryYear(input);
      expect(actual.seasons[actual.seasons.length - 1]).toMatchObject({ club: loan.club.name, onLoanFrom: offer.club.name, apps: 0 });
      expect(readLoyalty(actual)?.deals[0]).toMatchObject({ status: 'active', completed: 1, paidEuros: 0 });
    } finally { random.mockRestore(); }
  });
  it('retains active and paid ledgers through official save parsing and actual load repair', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.1);
    try {
      const active = activeFixture();
      const parsed = parseSoccerCareerSave(serializeSoccerCareerSave(active));
      expect(isSoccerCareerSave(parsed)).toBe(true);
      const loaded = repairCareer(parsed as CareerState);
      expect(readLoyalty(loaded)).toEqual(readLoyalty(active));
      const paid = injuryYear(injuryYear(loaded));
      expect(readLoyalty(paid)?.deals[0]).toMatchObject({ status: 'paid', completed: 2, paidEuros: 156000 });
      const paidParsed = parseSoccerCareerSave(serializeSoccerCareerSave(paid));
      expect(isSoccerCareerSave(paidParsed)).toBe(true);
      const reloaded = repairCareer(paidParsed as CareerState);
      expect(readLoyalty(reloaded)).toEqual(readLoyalty(paid));
      expect(reloaded.netWorth).toBe(paid.netWorth);
      const last = reloaded.seasons[reloaded.seasons.length - 1]!;
      reloaded.age = last.age;
      reloaded.phase = 'rehab_choice';
      reloaded.pendingRehab = { name: 'Repeated saved injury choice', weeks: 16, year: last.year, specialistCost: null };
      const repeated = applyRehabChoice(reloaded, 1);
      expect(repeated.netWorth).toBe(paid.netWorth);
      expect(repeated.totalEarnings).toBe(paid.totalEarnings);
      expect(readLoyalty(repeated)).toEqual(readLoyalty(paid));
    } finally { random.mockRestore(); }
  });
  it('drops only invalid optional loyalty data through the actual load repair', () => {
    const state = fixture();
    (state as unknown as { loyaltyContracts?: unknown }).loyaltyContracts = { v: 1, deals: [{ status: 'paid', bonusEuros: Number.NaN }] };
    const actual = repairCareer(state);
    expect(actual).not.toHaveProperty('loyaltyContracts');
    expect(actual.netWorth).toBe(2);
    expect(actual.playerName).toBe(state.playerName);
    expect(actual.pendingOffers).toEqual(state.pendingOffers);
  });
});
