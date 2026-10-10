import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { advanceProSeason, applyRehabChoice, dismissNewspaper, FALLBACK_CLUBS } from './soccerCareerEngine';
import type { CareerState, ClubData, ContractOffer, SeasonRecord, TransferSituation } from './soccerCareerEngine';
import { cancelProgramme, chooseProgramme, completeProgrammeLoanBuy, nextProgrammeYear, interruptSoccerProgramme, prepareSoccerProgramme, programmeEffects, programmeOptions, programmePromiseBroken, settleSoccerProgramme } from '@/lib/soccerCareerProgramme';

const club: ClubData = { id: 'fixture', name: 'Fixture Club', country: 'Fixture Country', tier: 2, league: 'Fixture League', color: '#112233' };
function row(patch: Partial<SeasonRecord> = {}): SeasonRecord {
  return { year: 2026, age: 24, club: club.name, clubCountry: club.country, clubTier: 2, apps: 32, leagueApps: 28, goals: 20, assists: 12, cleanSheets: 8, yellowCards: 4, redCards: 0, rating: 7.8, injury: null, injuryWeeks: 0, injurySevere: false, leagueTitle: false, domesticCup: false, championsLeague: false, worldCup: false, ballonDor: false, ballonDorRank: null, type: 'playing', intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null, ...patch };
}
function career(patch: Partial<CareerState> = {}): CareerState {
  // Fictional isolated fixture; only fields read by this module are supplied.
  return { playerName: 'Fixture Player', position: 'ST', age: 24, currentClub: club.name, currentClubCountry: club.country, currentClubTier: 2, currentLeague: club.league, currentClubColor: club.color, seasons: [row()], phase: 'playing', retired: false, weeklyWage: 10_000, contractYearsLeft: 2, netWorth: 1, totalEarnings: 2, morale: 50, pendingOffers: [], transferSituation: null, events: [], ...patch } as CareerState;
}
function finish(state: CareerState, patch: Partial<SeasonRecord> = {}): SeasonRecord {
  const season = row({ year: nextProgrammeYear(state)!, age: state.age + 1, club: state.currentClub, ...patch });
  state.seasons = [...state.seasons, season];
  settleSoccerProgramme(state, season);
  return season;
}
function offer(patch: Partial<ContractOffer> = {}): ContractOffer {
  return { club: { ...club, name: 'Offered Club' }, wage: 20_000, contractYears: 3, transferFee: 4, ...patch };
}
const neutral = { appsMult: 1, injuryDelta: 0, goalMult: 1, assistMult: 1, cleanSheetMult: 1, redCardMult: 1, yellowCardMult: 1 };

describe('Soccer career programme outcomes', () => {
  it('tactics finisher changes expected goals and assists with a recorded choice', () => {
    const original = career(); const before = structuredClone(original);
    const state = chooseProgramme(original, 'tactics', 'finisher');
    expect(programmeEffects(state).goalMult).toBe(1.12);
    expect(programmeEffects(state).assistMult).toBe(0.90);
    expect(state.programme?.plan?.choices.tactics).toBe('finisher');
    expect(original).toEqual(before);
    expect(finish(state).programme?.status).toBe('completed');
  });
  it('tactics creator has the opposite scoring tradeoff', () => {
    const effect = programmeEffects(chooseProgramme(career(), 'tactics', 'creator'));
    expect(effect.assistMult).toBe(1.12); expect(effect.goalMult).toBe(0.90);
  });
  it('tactics cover changes clean sheet expectation without adding saved clean sheets', () => {
    const state = chooseProgramme(career({ position: 'GK' }), 'tactics', 'cover');
    expect(programmeEffects(state).cleanSheetMult).toBe(1.08);
    expect(finish(state, { goals: 0, assists: 0, cleanSheets: 10 }).cleanSheets).toBe(10);
  });
  it('tactics outfield duties reject a keeper and unknown choice', () => {
    const keeper = career({ position: 'GK' });
    expect(chooseProgramme(keeper, 'tactics', 'finisher')).toBe(keeper);
    const state = career(); expect(chooseProgramme(state, 'tactics', 'invented')).toBe(state);
  });
  it('position training takes two consecutive played years and improves actual selection', () => {
    let state = chooseProgramme(career(), 'position', 'RW');
    expect(programmeEffects(state).appsMult).toBe(0.97);
    expect(finish(state).programme?.secondaryPosition).toBeNull();
    state.phase = 'playing'; state = chooseProgramme(state, 'position', 'RW'); prepareSoccerProgramme(state);
    expect(finish(state).programme?.secondaryPosition).toBe('RW');
    expect(state.position).toBe('ST'); expect(state.programme?.secondaryPosition?.position).toBe('RW');
    expect(programmeEffects(state).appsMult).toBe(1.03);
  });
  it('position incompatible groups and primary position do not train', () => {
    const state = career(); expect(chooseProgramme(state, 'position', 'CB')).toBe(state); expect(chooseProgramme(state, 'position', 'ST')).toBe(state);
  });
  it('position an interrupted year cannot graduate', () => {
    const state = chooseProgramme(career(), 'position', 'RW'); finish(state, { apps: 0, leagueApps: 0, goals: 0, assists: 0, injurySevere: true });
    expect(state.programme?.secondaryTraining).toBeUndefined(); expect(state.programme?.secondaryPosition).toBeUndefined();
  });
  it('position a paused training year resets consecutive progress', () => {
    let state = chooseProgramme(career(), 'position', 'RW'); finish(state);
    state.seasons.push(row({ year: 2028 })); state = chooseProgramme(state, 'position', 'RW'); prepareSoccerProgramme(state); finish(state);
    expect(state.programme?.secondaryTraining?.seasons).toBe(1); expect(state.programme?.secondaryPosition).toBeUndefined();
  });
  it('position a move cancels training and learned club selection benefit', () => {
    let state = chooseProgramme(career(), 'position', 'RW'); finish(state); state = chooseProgramme(state, 'position', 'RW'); finish(state);
    state.currentClub = 'Another Club'; prepareSoccerProgramme(state);
    expect(state.programme?.secondaryTraining).toBeUndefined(); expect(state.programme?.secondaryPosition).toBeUndefined(); expect(programmeEffects(state)).toEqual(neutral);
  });
  it('set_pieces penalty allocation is a subset of recorded goals', () => {
    const state = chooseProgramme(career(), 'set_pieces', 'penalties'); expect(programmeEffects(state).goalMult).toBe(1.04);
    const season = finish(state, { goals: 23 }); expect(season.goals).toBe(23); expect(season.programme?.penaltyGoals).toBe(4); expect(season.programme?.freeKickGoals).toBe(0);
  });
  it('set_pieces free kick allocation preserves all actual totals', () => {
    const state = chooseProgramme(career(), 'set_pieces', 'free_kicks'); const season = finish(state, { goals: 20, assists: 7 });
    expect(season.programme?.freeKickGoals).toBe(3); expect(season.programme?.penaltyGoals).toBe(0); expect(season.goals).toBe(20); expect(season.assists).toBe(7);
  });
  it('set_pieces no played goals creates no duty credit', () => {
    const season = finish(chooseProgramme(career(), 'set_pieces', 'penalties'), { apps: 0, leagueApps: 0, goals: 0, assists: 0 });
    expect(season.programme?.penaltyGoals).toBe(0); expect(season.programme?.status).toBe('interrupted');
  });
  it('promise actual league appearances meet the agreed target', () => {
    const state = chooseProgramme(career(), 'promise', 'starter'); expect(programmeEffects(state).appsMult).toBe(1.08);
    const season = finish(state, { leagueApps: 26 }); expect(season.programme?.promise).toBe('met'); expect(state.morale).toBe(53);
  });
  it('promise a fit league shortfall earns a recorded broken promise', () => {
    const state = chooseProgramme(career(), 'promise', 'rotation'); finish(state, { leagueApps: 17 });
    expect(state.morale).toBe(45); expect(programmePromiseBroken(state)).toBe(true);
  });
  it.each([{ injury: 'Hamstring', injuryWeeks: 4 }, { suspensionMatches: 3 }, { leagueApps: undefined }])('promise availability or missing league data excuses the target %j', patch => {
    const state = chooseProgramme(career(), 'promise', 'starter'); const season = finish(state, { leagueApps: 8, ...patch });
    expect(season.programme?.promise).toBe('excused'); expect(state.morale).toBe(50); expect(programmePromiseBroken(state)).toBe(false);
  });
  it('promise a past or foreign verdict cannot carry to the next club', () => {
    const state = chooseProgramme(career(), 'promise', 'starter'); finish(state, { leagueApps: 8 }); state.currentClub = 'Another Club'; expect(programmePromiseBroken(state)).toBe(false);
    state.currentClub = club.name; state.seasons.push(row({ year: 2028 })); expect(programmePromiseBroken(state)).toBe(false);
  });
  it('negotiation changes the actual professional offer once and keeps current pay', () => {
    const original = career({ phase: 'transfer_window', transferSituation: { type: 'one_offer', offer: offer() } }); const before = structuredClone(original);
    const state = chooseProgramme(original, 'negotiation', 'wage');
    expect(state.transferSituation).toEqual({ type: 'one_offer', offer: offer({ wage: 22_000 }) }); expect(state.weeklyWage).toBe(10_000); expect(original).toEqual(before);
    expect(chooseProgramme(state, 'negotiation', 'wage')).toBe(state);
  });
  it('negotiation shorter terms have the stated wage cost', () => {
    const state = chooseProgramme(career({ phase: 'transfer_window', transferSituation: { type: 'one_offer', offer: offer() } }), 'negotiation', 'shorter');
    expect(state.transferSituation).toEqual({ type: 'one_offer', offer: offer({ wage: 19_000, contractYears: 2 }) });
  });
  it.each<TransferSituation>([{ type: 'dream_club', offer: offer() }, { type: 'request_result', offer: offer() }, { type: 'bidding_war', offerA: offer(), offerB: offer({ wage: 30_000 }) }, { type: 'contract_expiry', offers: [offer()] }, { type: 'frozen_out', mode: 'transfer_listed', reasons: [], offers: [offer()] }])('negotiation canonical displayed offer path %j', situation => {
    const state = chooseProgramme(career({ phase: 'transfer_window', transferSituation: situation }), 'negotiation', 'wage');
    expect(state.programme?.negotiated).toEqual([{ year: 2027, club: 'Offered Club', mode: 'wage', accepted: true }]); expect(JSON.stringify(state.transferSituation)).toContain('22000');
  });
  it('negotiation rejects a loan, absent offer and one-year shortening', () => {
    for (const pending of [offer({ isLoan: true }), offer({ contractYears: 1 })]) {
      const state = career({ phase: 'transfer_window', transferSituation: { type: 'one_offer', offer: pending } }); expect(chooseProgramme(state, 'negotiation', 'shorter')).toBe(state);
    }
    const state = career({ phase: 'transfer_window' }); expect(chooseProgramme(state, 'negotiation', 'wage')).toBe(state);
  });
  it('negotiation youth first offer is updated through its actual stored path', () => {
    const state = chooseProgramme(career({ phase: 'contract_offer', pendingOffers: [offer()] }), 'negotiation', 'wage'); expect(state.pendingOffers[0].wage).toBe(22_000);
  });
  it('negotiation a rejected wage ask holds the complete offer and consumes the chance', () => {
    const original = career({ phase: 'transfer_window', overall: 80, seasons: [row({ rating: 6.5 })], transferSituation: { type: 'one_offer', offer: offer() } });
    const state = chooseProgramme(original, 'negotiation', 'wage');
    expect(state.transferSituation).toEqual(original.transferSituation); expect(state.weeklyWage).toBe(original.weeklyWage);
    expect(state.programme?.negotiated?.[0].accepted).toBe(false); expect(programmeOptions(state).find(card => card.id === 'negotiation')?.outcome).toContain('rejected');
    expect(chooseProgramme(state, 'negotiation', 'shorter')).toBe(state);
  });
  it('negotiation a different offer club has its own current choice and context', () => {
    let state = chooseProgramme(career({ phase: 'transfer_window', transferSituation: { type: 'one_offer', offer: offer() } }), 'negotiation', 'wage');
    state = { ...state, transferSituation: { type: 'one_offer', offer: offer({ club: { ...club, name: 'Second Offered Club' } }) } };
    const view = programmeOptions(state).find(card => card.id === 'negotiation')!;
    expect(view.choice).toBeNull(); expect(view.context).toContain('Second Offered Club'); expect(view.choices[0].eligible).toBe(true);
  });
  it('bonuses exact quoted cash is paid once and survives reload', () => {
    const state = chooseProgramme(career(), 'bonuses', 'goals'); state.weeklyWage = 30_000; const season = finish(state, { goals: 15 });
    expect(season.programme?.bonusEuros).toBe(40_000); expect(state.netWorth).toBe(1.04); expect(state.totalEarnings).toBe(2.04);
    const loaded = JSON.parse(JSON.stringify(state)) as CareerState; const bytes = JSON.stringify(loaded); settleSoccerProgramme(loaded, loaded.seasons[loaded.seasons.length - 1]); expect(JSON.stringify(loaded)).toBe(bytes);
  });
  it.each([['appearances', { leagueApps: 24 }], ['assists', { assists: 10 }]] as const)('bonuses %s pays from actual target data', (choice, patch) => {
    const season = finish(chooseProgramme(career(), 'bonuses', choice), patch); expect(season.programme?.bonusEuros).toBe(40_000);
  });
  it('bonuses missing league data and under-target totals do not pay', () => {
    const state = chooseProgramme(career(), 'bonuses', 'appearances'); finish(state, { leagueApps: undefined }); expect(state.netWorth).toBe(1);
    const other = chooseProgramme(career(), 'bonuses', 'goals'); finish(other, { goals: 14 }); expect(other.netWorth).toBe(1);
  });
  it('bonuses a serious injury preserves a target actually earned while zero apps cannot earn it', () => {
    const state = chooseProgramme(career(), 'bonuses', 'goals'); const season = finish(state, { injurySevere: true, goals: 15 }); expect(season.programme?.bonusEuros).toBe(40_000); expect(state.netWorth).toBe(1.04);
    const empty = chooseProgramme(career(), 'bonuses', 'goals'); finish(empty, { apps: 0, leagueApps: 0, goals: 0, assists: 0, injurySevere: true }); expect(empty.netWorth).toBe(1); expect(empty.programme?.receipts[0].bonusEuros).toBe(0);
  });
  it('adaptation settling sacrifices selection for recorded morale', () => {
    const state = chooseProgramme(career({ seasons: [row({ club: 'Previous Club' })] }), 'adaptation', 'settle'); expect(programmeEffects(state).appsMult).toBe(0.95);
    finish(state); expect(state.morale).toBe(55);
  });
  it('adaptation integration offers selection at an injury cost', () => {
    const state = chooseProgramme(career({ seasons: [row({ club: 'Previous Club' })] }), 'adaptation', 'integrate'); expect(programmeEffects(state).appsMult).toBe(1.04); expect(programmeEffects(state).injuryDelta).toBe(0.01);
  });
  it('adaptation cannot repeat at the same club or guess a missing past club', () => {
    const same = career(); expect(chooseProgramme(same, 'adaptation', 'settle')).toBe(same);
    const missing = career({ seasons: [] }); expect(chooseProgramme(missing, 'adaptation', 'settle')).toBe(missing);
  });
  it('fitness managed return reduces risk with fewer planned appearances', () => {
    const state = chooseProgramme(career({ seriousInjuries: [{ year: 2026, name: 'Fixture injury', weeks: 24, path: 'plan', setback: false }] }), 'fitness', 'managed'); expect(programmeEffects(state).appsMult).toBe(0.90); expect(programmeEffects(state).injuryDelta).toBe(-0.03);
  });
  it('fitness full workload has the actual stated injury tradeoff', () => {
    const state = chooseProgramme(career({ seriousInjuries: [{ year: 2026, name: 'Fixture injury', weeks: 24, path: 'plan', setback: false }] }), 'fitness', 'full'); expect(programmeEffects(state).appsMult).toBe(1.04); expect(programmeEffects(state).injuryDelta).toBe(0.03);
  });
  it('fitness a stale injury cannot activate the return programme', () => {
    const state = career({ seriousInjuries: [{ year: 2024, name: 'Fixture injury', weeks: 24, path: 'plan', setback: false }] }); expect(chooseProgramme(state, 'fitness', 'managed')).toBe(state);
  });
  it('captain calm leadership lowers both card rates at a selection cost', () => {
    const state = chooseProgramme(career({ isClubCaptain: true, captainClub: club.name }), 'captain', 'calm'); const effects = programmeEffects(state); expect(effects.redCardMult).toBe(0.80); expect(effects.yellowCardMult).toBe(0.80); expect(effects.appsMult).toBe(0.98);
  });
  it('captain rally raises selection and yellow card expectation', () => {
    const state = chooseProgramme(career({ isClubCaptain: true, captainClub: club.name }), 'captain', 'rally'); expect(programmeEffects(state).appsMult).toBe(1.04); expect(programmeEffects(state).yellowCardMult).toBe(1.10);
  });
  it('captain a foreign armband and a non-captain cannot choose duties', () => {
    const state = career({ isClubCaptain: true, captainClub: 'Another Club' }); expect(chooseProgramme(state, 'captain', 'calm')).toBe(state);
    const other = career(); expect(chooseProgramme(other, 'captain', 'rally')).toBe(other);
  });
  it('loan buy settles real permanent terms once instead of returning', () => {
    const state = chooseProgramme(career({ loan: { parentClub: 'Parent Club', parentCountry: 'Parent Country', parentTier: 1, parentLeague: 'Parent League', parentColor: '#445566' } }), 'loan', 'buy');
    expect(completeProgrammeLoanBuy(state, club)).toBe(false); finish(state); expect(state.loan?.parentClub).toBe('Parent Club');
    expect(completeProgrammeLoanBuy(state, club)).toBe(true); expect(state.loan).toBeNull(); expect(state.currentClub).toBe(club.name); expect(state.contractYearsLeft).toBe(2); expect(state.weeklyWage).toBe(10_000); expect(state.netWorth).toBe(1);
    const bytes = JSON.stringify(state); expect(completeProgrammeLoanBuy(state, club)).toBe(false); expect(JSON.stringify(state)).toBe(bytes);
  });
  it('loan an interrupted year cannot complete the purchase', () => {
    const state = chooseProgramme(career({ loan: { parentClub: 'Parent Club', parentCountry: 'Parent Country', parentTier: 1, parentLeague: 'Parent League', parentColor: '#445566' } }), 'loan', 'buy'); finish(state, { apps: 0, leagueApps: 0, goals: 0, assists: 0, injurySevere: true }); expect(completeProgrammeLoanBuy(state, club)).toBe(false); expect(state.loan).not.toBeNull();
  });
  it('loan wrong destination or changed parent cannot consume a saved option', () => {
    const state = chooseProgramme(career({ loan: { parentClub: 'Parent Club', parentCountry: 'Parent Country', parentTier: 1, parentLeague: 'Parent League', parentColor: '#445566' } }), 'loan', 'buy'); finish(state); expect(completeProgrammeLoanBuy(state, { ...club, name: 'Wrong Club' })).toBe(false); state.loan!.parentClub = 'Different Parent'; expect(completeProgrammeLoanBuy(state, club)).toBe(false);
  });
  it('loan permanent players cannot queue an option', () => {
    const state = career(); expect(chooseProgramme(state, 'loan', 'buy')).toBe(state);
  });
  it('reading absent old saves preserves every field and consumes no random draws', () => {
    const state = career(); const bytes = JSON.stringify(state); const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Unexpected draw'); });
    try { expect(programmeEffects(state)).toEqual(neutral); expect(programmeOptions(state)).toHaveLength(10); prepareSoccerProgramme(state); const season = row({ year: 2027 }); settleSoccerProgramme(state, season); expect(season.programme).toBeUndefined(); expect(JSON.stringify(state)).toBe(bytes); expect(random).not.toHaveBeenCalled(); } finally { random.mockRestore(); }
  });
  it('invalid programme and year data are neutral', () => {
    for (const programme of [{ version: 2, receipts: [] }, { version: 1, receipts: null }, { version: 1, receipts: [null] }, { version: 1, receipts: [], negotiated: 'bad' }, { version: 1, receipts: [], plan: { year: NaN, club: club.name, choices: {} } }, { version: 1, receipts: [], plan: { year: 2027, club: club.name, choices: { tactics: 'invented' } } }]) {
      const state = career({ programme: programme as unknown as CareerState['programme'] }); expect(programmeEffects(state)).toEqual(neutral); expect(chooseProgramme(state, 'tactics', 'finisher')).toBe(state);
    }
    const state = career({ seasons: [row({ year: NaN })] }); expect(nextProgrammeYear(state)).toBeNull(); expect(chooseProgramme(state, 'tactics', 'finisher')).toBe(state);
  });
  it('choices cancel without changing other saved plans or original input', () => {
    const state = chooseProgramme(chooseProgramme(career(), 'tactics', 'creator'), 'bonuses', 'goals'); const before = structuredClone(state); const cancelled = cancelProgramme(state, 'bonuses');
    expect(cancelled.programme?.plan?.choices.tactics).toBe('creator'); expect(cancelled.programme?.plan?.choices.bonuses).toBeUndefined(); expect(cancelled.programme?.plan?.bonusEuros).toBeUndefined(); expect(state).toEqual(before);
  });
  it('moves and stale years clear plans before actual play', () => {
    for (const change of ['club', 'year']) { const state = chooseProgramme(career(), 'tactics', 'finisher'); if (change === 'club') state.currentClub = 'Another Club'; else state.seasons.push(row({ year: 2028 })); prepareSoccerProgramme(state); expect(state.programme?.plan).toBeUndefined(); expect(programmeEffects(state)).toEqual(neutral); }
  });
  it('prepare and settlement detach optional state before changing a shallow engine copy', () => {
    const original = chooseProgramme(career(), 'tactics', 'creator'); const before = structuredClone(original); const state = { ...original };
    prepareSoccerProgramme(state); finish(state);
    expect(original).toEqual(before); expect(original.programme?.plan?.choices.tactics).toBe('creator'); expect(state.programme?.plan).toBeUndefined();
  });
  it('view labels old outcomes with their actual recorded year and club', () => {
    const state = chooseProgramme(career(), 'tactics', 'creator'); finish(state); state.currentClub = 'Another Club';
    expect(programmeOptions(state).find(card => card.id === 'tactics')?.outcome).toContain('2027 at Fixture Club:');
    expect(programmeOptions(career({ position: 'GK' })).find(card => card.id === 'position')?.context).toContain('No compatible second position');
  });
  it('settlement rejects foreign, nonplaying and invalid recorded rows', () => {
    const state = chooseProgramme(career(), 'bonuses', 'goals'); const before = structuredClone(state);
    for (const patch of [{ club: 'Wrong Club' }, { type: 'youth' as const }, { apps: -1 }, { goals: NaN }]) settleSoccerProgramme(state, row({ year: 2027, ...patch })); expect(state).toEqual(before);
  });
  it('reading never accesses hidden awards or changes the saved primary season identity', () => {
    const state = chooseProgramme(career(), 'tactics', 'creator'); Object.defineProperty(state, 'awards', { get() { throw new Error('Award read'); }, configurable: true }); Object.defineProperty(state, 'pendingBallonDor', { get() { throw new Error('Award read'); }, configurable: true }); expect(programmeOptions(state)).toHaveLength(10); expect(programmeEffects(state).assistMult).toBe(1.12);
  });
});

describe('Soccer programme zero-appearance interruptions', () => {
  it.each(['Fixture Club', 'BANNED', 'BANNED (PED)', 'PRISON', 'CONVICTED'])('records interrupted %s rows against the actual held club without changing saved stats', savedClub => {
    let state = chooseProgramme(chooseProgramme(career({ loan: { parentClub: 'Parent Club', parentCountry: 'Parent Country', parentTier: 1, parentLeague: 'Parent League', parentColor: '#445566' } }), 'loan', 'buy'), 'bonuses', 'goals');
    state = chooseProgramme(chooseProgramme(state, 'position', 'RW'), 'promise', 'starter');
    state.programme!.secondaryTraining = { club: club.name, from: 'ST', target: 'RW', year: 2026, seasons: 1 };
    const original = structuredClone(state); const copy = { ...state };
    const season = row({ year: 2027, club: savedClub, apps: 0, leagueApps: 0, goals: 0, assists: 0, cleanSheets: 0, rating: 0 });
    const saved = structuredClone(season); const money = [copy.netWorth, copy.totalEarnings, copy.morale];
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Unexpected interruption draw'); });
    try {
      interruptSoccerProgramme(copy, season);
      expect(season).toEqual({ ...saved, programme: { year: 2027, club: club.name, choices: original.programme!.plan!.choices, status: 'interrupted', outcomes: { loan: 'The year was interrupted; no progress or bonus was earned.', bonuses: 'The year was interrupted; no progress or bonus was earned.', position: 'The year was interrupted; no progress or bonus was earned.', promise: 'The year was interrupted; no progress or bonus was earned.' }, bonusEuros: 0, penaltyGoals: 0, freeKickGoals: 0, secondaryPosition: null, promise: 'excused' } });
      expect([copy.netWorth, copy.totalEarnings, copy.morale]).toEqual(money);
      expect(copy.programme?.plan).toBeUndefined(); expect(copy.programme?.secondaryTraining).toBeUndefined(); expect(copy.programme?.loanBuy).toBeUndefined();
      expect(state).toEqual(original); expect(random).not.toHaveBeenCalled();
      const bytes = JSON.stringify({ copy, season }); interruptSoccerProgramme(copy, season); expect(JSON.stringify({ copy, season })).toBe(bytes);
    } finally { random.mockRestore(); }
  });
  it('rejects foreign, nonzero, wrong-year and nonplaying interruption rows', () => {
    const state = chooseProgramme(career(), 'bonuses', 'goals'); const before = structuredClone(state);
    for (const patch of [{ club: 'Wrong Club' }, { year: 2028 }, { type: 'youth' as const }, { apps: 1 }, { goals: 1 }, { assists: 1 }, { cleanSheets: 1 }]) {
      const season = row({ year: 2027, apps: 0, goals: 0, assists: 0, cleanSheets: 0, ...patch }); const saved = structuredClone(season);
      interruptSoccerProgramme(state, season); expect(season).toEqual(saved); expect(state).toEqual(before);
    }
    const absent = career(); const bytes = JSON.stringify(absent); interruptSoccerProgramme(absent, row({ year: 2027, apps: 0, goals: 0, assists: 0, cleanSheets: 0 })); expect(JSON.stringify(absent)).toBe(bytes);
  });
  it.each(['ban', 'prison', 'ped', 'legacy rehab', 'legacy conviction'] as const)('settles the actual %s engine path once and preserves its entire no-plan result and draw count', path => {
    const captured = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8')).saves.find((entry: { id: string }) => entry.id === 'ere').state as CareerState;
    const input = structuredClone(captured); input.internationalCareer = false;
    if (path === 'ban') input.matchFixBanned = 2;
    if (path === 'prison') input.prisonSeasons = 1;
    if (path === 'ped') { input.pedActive = true; input.pedSeasonsRemaining = 2; }
    if (path.startsWith('legacy')) input.age = input.seasons[input.seasons.length - 1].age + 1;
    if (path === 'legacy rehab') { input.phase = 'rehab_choice'; input.pendingRehab = { name: 'Recorded test injury', weeks: 16, year: nextProgrammeYear(input)!, specialistCost: null }; }
    if (path === 'legacy conviction') { input.phase = 'newspaper'; input.pendingSummary = null; input.prisonSeasons = 1; }
    const planning = { ...input, phase: 'playing' as const };
    const opted = chooseProgramme(chooseProgramme(planning, 'tactics', 'creator'), 'bonuses', 'goals'); opted.phase = input.phase;
    const invoke = (state: CareerState) => path === 'legacy rehab' ? applyRehabChoice(state, 1) : path === 'legacy conviction' ? dismissNewspaper(state) : advanceProSeason(state, FALLBACK_CLUBS);
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.1);
    try {
      const base = invoke(structuredClone(input)); const baseDraws = random.mock.calls.length; random.mockClear();
      const actual = invoke(structuredClone(opted)); expect(random.mock.calls.length).toBe(baseDraws);
      const season = actual.seasons[actual.seasons.length - 1]; const expectedClub = path === 'ban' ? 'BANNED' : path === 'prison' ? 'PRISON' : path === 'ped' ? 'BANNED (PED)' : path === 'legacy conviction' ? 'CONVICTED' : input.currentClub;
      expect(season.club).toBe(expectedClub); expect(season.apps).toBe(0); expect(season.programme?.status).toBe('interrupted');
      const receipt = { year: nextProgrammeYear(input)!, club: input.currentClub, choices: { tactics: 'creator', bonuses: 'goals' }, status: 'interrupted' as const, outcomes: { tactics: 'The year was interrupted; no progress or bonus was earned.', bonuses: 'The year was interrupted; no progress or bonus was earned.' }, bonusEuros: 0, penaltyGoals: 0, freeKickGoals: 0, secondaryPosition: null, promise: null };
      const expected = structuredClone(base); expected.programme = { version: 1, receipts: [receipt] }; expected.seasons[expected.seasons.length - 1].programme = receipt;
      if (expected.pendingSummary) expected.pendingSummary.programme = receipt;
      expect(actual).toEqual(expected);
      const bytes = JSON.stringify(actual); interruptSoccerProgramme(actual, season); expect(JSON.stringify(actual)).toBe(bytes);
    } finally { random.mockRestore(); }
  });
});