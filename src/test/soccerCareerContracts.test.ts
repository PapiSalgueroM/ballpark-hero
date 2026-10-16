import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  acceptOffer, advanceProSeason, applyMoralDilemmaChoice, completeClubVerdictMove, dismissAppealResult,
  dismissMoralDilemma, FALLBACK_CLUBS, initCareer, MORAL_DILEMMAS, repairCareer, signExtension, stayAtClub,
  type CareerState, type ContractOffer,
} from '@/lib/soccerCareerEngine';
import { soccerExtensionQuote } from '@/lib/soccerCareerContracts';

const parent = FALLBACK_CLUBS.find(club => club.name === 'Real Madrid')!;
const destination = FALLBACK_CLUBS.find(club => club.name === 'Twente')!;
function career(age = 35, overall = 76, rating = 6.4): CareerState {
  const stats = { pace: overall, shooting: overall, passing: overall, dribbling: overall, defending: overall, physical: overall, reflexes: overall };
  const started = initCareer('Contract Tester', 'Brazil', 'ST', '2020s', stats, overall, 2026, FALLBACK_CLUBS, null, 99);
  const pro = repairCareer(acceptOffer(started, { club: parent, contractYears: 4, wage: 100000, transferFee: 0 }));
  return { ...pro, age, overall, weeklyWage: 100000, agentFeesPaid: 2, phase: 'transfer_window', rival: null,
    seasons: [{ ...started.seasons[0], year: 2027, age: age - 1, type: 'playing', club: parent.name,
      clubCountry: parent.country, clubTier: parent.tier, apps: 32, leagueApps: 30, rating }],
  };
}
function listing(age = 26): CareerState {
  const state = career(age, 66, 5.9);
  state.seasons[0] = { ...state.seasons[0], apps: 2, leagueApps: 2 };
  const loan = age <= 23;
  const offer: ContractOffer = { club: destination, contractYears: loan ? 1 : 3, wage: loan ? state.weeklyWage : 70000,
    transferFee: loan ? 0 : 8, isLoan: loan };
  return { ...state, transferSituation: { type: 'frozen_out', mode: loan ? 'loan_listed' : 'transfer_listed',
    reasons: ['Low minutes', 'Poor form', 'Below the club level'], offers: [offer] } };
}
afterEach(() => vi.restoreAllMocks());

describe('Soccer Career extension terms', () => {
  it('quotes and signs shorter, lower veteran terms, including an expired stay renewal', () => {
    const state = career();
    const before = JSON.stringify(state);
    const random = vi.spyOn(Math, 'random');
    const quote = soccerExtensionQuote(state);
    expect(quote.weeklyWage).toBe(80000);
    expect(quote.contractYears).toBe(1);
    expect(random).not.toHaveBeenCalled();
    expect(JSON.stringify(state)).toBe(before);
    const signed = signExtension(state);
    const renewed = stayAtClub({ ...state, contractYearsLeft: 0 });
    for (const result of [signed, renewed]) {
      expect(result.weeklyWage).toBe(quote.weeklyWage);
      expect(result.contractYearsLeft).toBe(quote.contractYears);
      expect(result.phase).toBe('playing');
      expect(JSON.stringify(result.seasons)).toBe(JSON.stringify(state.seasons));
    }
    expect(JSON.stringify(state)).toBe(before);
  });

  it('keeps an elite veteran raise and a strong veteran flat deal without using youth form', () => {
    expect(soccerExtensionQuote(career(32, 90, 8.2))).toMatchObject({ weeklyWage: 110000, contractYears: 2 });
    expect(soccerExtensionQuote(career(35, 90, 8.2))).toMatchObject({ weeklyWage: 105000, contractYears: 1 });
    expect(soccerExtensionQuote(career(35, 85, 7.5)).weeklyWage).toBe(100000);
    const cameo = career(35, 90, 8.2);
    cameo.seasons[0] = { ...cameo.seasons[0], apps: 2 };
    expect(soccerExtensionQuote(cameo).weeklyWage).toBe(100000);
    expect(soccerExtensionQuote(career(32, 82, 7.2))).toMatchObject({ weeklyWage: 100000, contractYears: 2 });
    const state = career(35, 90, 6.1);
    state.seasons.push({ ...state.seasons[0], type: 'youth', rating: 9.9 });
    expect(soccerExtensionQuote(state).weeklyWage).toBe(80000);
  });

  it.each([0, 0.5, 0.99])('preserves younger terms and their single existing random draw at %s', draw => {
    const state = career(25);
    const random = vi.spyOn(Math, 'random').mockReturnValue(draw);
    expect(soccerExtensionQuote(state)).toMatchObject({ weeklyWage: 115000, contractYears: null });
    expect(random).not.toHaveBeenCalled();
    expect(signExtension(state)).toMatchObject({ weeklyWage: 115000, contractYearsLeft: 2 + Math.floor(draw * 3) });
    expect(random).toHaveBeenCalledTimes(1);
    random.mockClear();
    expect(stayAtClub({ ...state, contractYearsLeft: 0 })).toMatchObject({ weeklyWage: 100000, contractYearsLeft: 2 + Math.floor(draw * 3) });
    expect(random).toHaveBeenCalledTimes(1);
  });
});

describe('Soccer Career club decisions', () => {
  it.each([21, 26])('completes the existing listed destination, reloads and acknowledges it once at age %s', age => {
    const state = listing(age);
    const input = JSON.stringify(state);
    const moved = completeClubVerdictMove(state);
    expect(moved.currentClub).toBe(destination.name);
    expect(moved.transferSituation).toMatchObject({ type: 'club_move', mode: age <= 23 ? 'loan' : 'sale',
      fromClub: parent.name, toClub: destination.name, wage: moved.weeklyWage, contractYears: moved.contractYearsLeft });
    expect(moved.phase).toBe('transfer_window');
    expect(moved.pendingLoanOffers).toBeNull();
    expect(moved.frozenOut).toBe(0);
    expect(age <= 23 ? moved.loan?.parentClub : moved.loan).toBe(age <= 23 ? parent.name : null);
    expect(age <= 23 ? moved.agentFeesPaid : moved.agentFeesPaid > state.agentFeesPaid).toBe(age <= 23 ? state.agentFeesPaid : true);
    expect(JSON.stringify(state)).toBe(input);
    expect(JSON.stringify(moved.seasons)).toBe(JSON.stringify(state.seasons));
    const reloaded = JSON.parse(JSON.stringify(moved)) as CareerState;
    const saved = JSON.stringify(reloaded);
    expect(completeClubVerdictMove(reloaded)).toBe(reloaded);
    expect(JSON.stringify(repairCareer(reloaded))).toBe(saved);
    const continued = stayAtClub(reloaded);
    expect(continued.phase).toBe('playing');
    expect(continued.transferSituation).toBeNull();
    expect(continued.agentFeesPaid).toBe(moved.agentFeesPaid);
    expect(continued.events).toEqual(moved.events);
    expect(continued.weeklyWage).toBe(moved.weeklyWage);
    expect(continued.contractYearsLeft).toBe(moved.contractYearsLeft);
  });

  it('applies the club move during the actual window transition without an accept action', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.7);
    const state = { ...listing(26), transferSituation: null, phase: 'red_card_appeal_result' as const,
      pendingAppealResult: null, pendingEvents: [] };
    const next = dismissAppealResult(state, FALLBACK_CLUBS);
    expect(next.phase).toBe('transfer_window');
    expect(next.transferSituation?.type).toBe('club_move');
    expect(next.currentClub).not.toBe(state.currentClub);
  });

  it('keeps the parent contract on a forced loan and returns there after the played loan season', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.7);
    const state = listing(21);
    const moved = completeClubVerdictMove(state);
    expect(moved.weeklyWage).toBe(state.weeklyWage);
    expect(moved.contractYearsLeft).toBe(state.contractYearsLeft);
    const played = advanceProSeason(stayAtClub(moved), FALLBACK_CLUBS);
    expect(played.seasons.at(-1)?.club).toBe(destination.name);
    expect(played.seasons.at(-1)?.onLoanFrom).toBe(parent.name);
    expect(played.currentClub).toBe(parent.name);
    expect(played.loan).toBeNull();
  });

  it('keeps releases, empty listings, voluntary offers and old loaded verdicts unchanged', () => {
    for (const situation of [
      { ...listing().transferSituation!, mode: 'released' },
      { ...listing().transferSituation!, offers: [] },
      { type: 'no_interest' },
    ]) {
      const state = { ...listing(), transferSituation: situation } as CareerState;
      const before = JSON.stringify(state);
      expect(completeClubVerdictMove(state)).toBe(state);
      expect(JSON.stringify(state)).toBe(before);
    }
    const old = listing();
    const before = JSON.stringify(old);
    expect(JSON.stringify(repairCareer(old))).toBe(before);
    expect(old.transferSituation?.type).toBe('frozen_out');
  });
});

describe('Soccer Career rival-club wage terms', () => {
  it.each([
    { id: 'young29', age: 29, overall: 76, rating: 6.4, apps: 32, form: 'playing', agent: 'self', wage: 100000, want: 100000, fees: 2 },
    { id: 'weak32', age: 32, overall: 76, rating: 6.4, apps: 32, form: 'playing', agent: 'self', wage: 100000, want: 90000, fees: 2 },
    { id: 'weak35', age: 35, overall: 76, rating: 6.4, apps: 32, form: 'playing', agent: 'self', wage: 100000, want: 80000, fees: 2 },
    { id: 'holding35', age: 35, overall: 85, rating: 7.5, apps: 32, form: 'playing', agent: 'self', wage: 100000, want: 100000, fees: 2 },
    { id: 'elite32', age: 32, overall: 90, rating: 8.2, apps: 32, form: 'playing', agent: 'self', wage: 100000, want: 110000, fees: 2 },
    { id: 'elite35', age: 35, overall: 90, rating: 8.2, apps: 32, form: 'playing', agent: 'self', wage: 100000, want: 105000, fees: 2 },
    { id: 'cameo35', age: 35, overall: 90, rating: 8.2, apps: 2, form: 'playing', agent: 'self', wage: 100000, want: 100000, fees: 2 },
    { id: 'latest-youth35', age: 35, overall: 76, rating: 6.4, apps: 32, form: 'latest-youth', agent: 'self', wage: 100000, want: 80000, fees: 2 },
    { id: 'youth-only35', age: 35, overall: 90, rating: 9.9, apps: 32, form: 'youth-only', agent: 'self', wage: 100000, want: 85000, fees: 2 },
    { id: 'super35', age: 35, overall: 76, rating: 6.4, apps: 32, form: 'playing', agent: 'super', wage: 100000, want: 100000, fees: 2.6 },
    { id: 'shark35', age: 35, overall: 76, rating: 6.4, apps: 32, form: 'playing', agent: 'shark', wage: 100000, want: 88000, fees: 2.4 },
    { id: 'cousin35', age: 35, overall: 76, rating: 6.4, apps: 32, form: 'playing', agent: 'cousin', wage: 100000, want: 76000, fees: 2.15 },
    { id: 'market35', age: 35, overall: 76, rating: 6.4, apps: 32, form: 'playing', agent: 'self', wage: 100, want: 400, fees: 2 },
  ] as const)('prices the actual rival choice and Continue at $id without another draw', spec => {
    const fixtureDraws: { value: number; caller: string | null }[] = [], draws: { value: number; caller: string | null }[] = [];
    let fixtureSetup = true;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      const value = fixtureSetup ? 0.7 : 0; (fixtureSetup ? fixtureDraws : draws).push({ value, caller: new Error().stack ?? null }); return value;
    });
    const state = career(spec.age, spec.overall, spec.rating);
    state.weeklyWage = spec.wage; state.agentId = spec.agent;
    state.seasons[0] = { ...state.seasons[0], apps: spec.apps, leagueApps: Math.min(spec.apps, 30) };
    if (spec.form === 'latest-youth') state.seasons.push({ ...state.seasons[0], type: 'youth', rating: 9.9 });
    if (spec.form === 'youth-only') state.seasons = state.seasons.map(row => ({ ...row, type: 'youth' as const, rating: 9.9 }));
    state.rival = { name: 'Contract Rival', nationality: 'Brazil', position: 'ST', club: destination.name, clubTier: destination.tier,
      overall: 76, careerGoals: 0, careerAssists: 0, careerApps: 0, leagueTitles: 0, championsLeagues: 0,
      worldCups: 0, ballonDors: 0, intCaps: 0, intGoals: 0, marketValue: 1, age: spec.age, retired: false };
    state.phase = 'moral_dilemma'; state.pendingMoralDilemma = MORAL_DILEMMAS.find(row => row.id === 'rival_club_offer')!;
    state.isClubCaptain = true; state.captainClub = parent.name; state.captainSeasons = 1;
    const input = JSON.stringify(state), history = JSON.stringify(state.seasons); fixtureSetup = false;
    let chosen: CareerState | undefined, continued: CareerState | undefined, chosenBefore: string | null = null, completed = false;
    let failure: { classification: string; name: string; message: string; stack: string | null } | null = null;
    try {
      chosen = applyMoralDilemmaChoice(state, 0); chosenBefore = JSON.stringify(chosen);
      continued = dismissMoralDilemma(chosen, FALLBACK_CLUBS);
      expect(continued.weeklyWage, `SOCCER_RIVAL_WAGE_${spec.id}`).toBe(spec.want);
      expect(chosen.pendingRivalMove).toBe(destination.name);
      expect(chosen.netWorth - state.netWorth).toBeCloseTo(10, 6); expect(continued.netWorth).toBe(chosen.netWorth);
      expect(continued.currentClub).toBe(destination.name); expect(continued.contractYearsLeft).toBe(4);
      expect(continued.phase).toBe('playing'); expect(continued.pendingRivalMove).toBeNull();
      expect(continued.agentFeesPaid).toBe(spec.fees); expect(continued.isClubCaptain).toBe(false); expect(continued.captainClub).toBeNull();
      expect(JSON.stringify(state)).toBe(input); expect(JSON.stringify(chosen)).toBe(chosenBefore);
      expect(JSON.stringify(continued.seasons)).toBe(history);
      expect(draws.map(row => row.value)).toEqual([0, 0]);
      expect(draws[0].caller).toContain('wageForTier'); expect(draws[1].caller).toContain('realisticTransferFee');
      completed = true;
    } catch (error) {
      failure = { classification: error instanceof Error && error.name === 'AssertionError' ? 'assertion' : 'action-exception',
        name: error instanceof Error ? error.name : typeof error, message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack ?? null : null };
      throw error;
    } finally {
      const out = process.env.SOCCER_RIVAL_WAGES_OUT;
      if (out !== undefined) {
        if (!out.trim()) throw new Error('SOCCER_RIVAL_WAGES_OUT must name an evidence directory');
        mkdirSync(out, { recursive: true }); writeFileSync(join(out, `${spec.id}.json`), JSON.stringify({
          id: spec.id, title: `prices the actual rival choice and Continue at ${spec.id} without another draw`,
          scope: 'Complete saved JSON snapshots of the declared fixture and actual choice/Continue. Functions and undefined fields are outside this saved JSON claim. Fixed0.7 fixture setup draws are separate from the zero action tape.',
          spec, inputBefore: input, inputAfter: JSON.stringify(state), choiceBefore: chosenBefore,
          choiceAfter: chosen ? JSON.stringify(chosen) : null, result: continued ? JSON.stringify(continued) : null,
          fixtureDraws, draws, completed, failure,
        }, null, 2));
      }
    }
  });
});
