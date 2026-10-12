import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  acceptLoan, acceptOffer, acceptRetirementSuggestion, advanceProSeason, announceFarewellSeason, applyRehabChoice,
  declineRetirementSuggestion, dismissBallonDor, dismissDebut, dismissNewspaper,
  dismissRivalryEvent, dismissSummary, dismissWorldCup, FALLBACK_CLUBS, manualRetire,
  type CareerState, type SeasonRecord,
} from '@/lib/soccerCareerEngine';
import {
  announceSoccerFarewell, farewellEligibility, farewellSeasonComplete, readSoccerFarewell,
  type SoccerFarewellPlan,
} from '@/lib/soccerCareerFarewell';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const recorded = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8')).saves.find((save: { id: string }) => save.id === 'ere').state as CareerState;
function career(age = 31): CareerState {
  const state = clone(recorded);
  state.playerName = 'Farewell Fixture';
  state.age = age;
  state.seasons[state.seasons.length - 1].age = age;
  state.overall = 80; state.peakOverall = 80;
  state.phase = 'playing'; state.retired = false; state.retirementSuggested = true;
  state.matchFixBanned = 0; state.prisonSeasons = 0; state.corruptionHeat = 0;
  state.dirtyMoney = 0; state.pedActive = false; state.pedSeasonsRemaining = 0;
  state.pendingSummary = null; state.pendingNews = []; state.pendingRehab = null;
  state.pendingBallonDor = null; state.pendingWorldCup = null; state.pendingTournament = null;
  state.pendingRivalryEvent = null; state.intStats.debutYear = -1;
  state.rival = null; state.events = []; state.loan = null;
  return state;
}
function run<T>(seed: number, action: () => T): { value: T; draws: number[] } {
  let a = seed >>> 0;
  const draws: number[] = [];
  const random = vi.spyOn(Math, 'random').mockImplementation(() => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    draws.push(value); return value;
  });
  try { return { value: action(), draws }; } finally { random.mockRestore(); }
}
function finalRow(state: CareerState, patch: Partial<SeasonRecord> = {}): CareerState {
  const plan = readSoccerFarewell(state)!;
  const source = state.seasons[plan.sourceCount - 1];
  const row: SeasonRecord = { ...source, year: plan.year, age: source.age + 1,
    club: state.currentClub, clubCountry: state.currentClubCountry, clubTier: state.currentClubTier,
    apps: 20, leagueApps: 18, goals: 4, assists: 3, cleanSheets: 0, rating: 6.8,
    leagueTitle: false, domesticCup: false, championsLeague: false, worldCup: false,
    ballonDor: false, ballonDorRank: null, injury: null, injuryWeeks: 0, injurySevere: false, ...patch };
  return { ...state, age: row.age, seasons: [...state.seasons, row], pendingSummary: row, phase: 'season_summary' };
}
function toSummary(state: CareerState): CareerState {
  if (state.phase === 'rehab_choice') state = applyRehabChoice(state, 1);
  if (state.phase === 'newspaper') state = dismissNewspaper(state);
  expect(state.phase).toBe('season_summary');
  expect(state.pendingSummary).toEqual(state.seasons[state.seasons.length - 1]);
  return state;
}
function finish(state: CareerState): CareerState {
  state = dismissSummary(toSummary(state), FALLBACK_CLUBS);
  for (let i = 0; i < 6 && !state.retired; i++) {
    if (state.phase === 'ballon_dor') state = dismissBallonDor(state, FALLBACK_CLUBS);
    else if (state.phase === 'international_debut') state = dismissDebut(state, FALLBACK_CLUBS);
    else if (state.phase === 'world_cup') state = dismissWorldCup(state, FALLBACK_CLUBS);
    else if (state.phase === 'rivalry_event') state = dismissRivalryEvent(state, FALLBACK_CLUBS);
    else throw new Error(`Farewell escaped to ${state.phase}`);
  }
  return state;
}
afterEach(() => vi.restoreAllMocks());

describe('Soccer Career farewell declaration', () => {
  it('saves the next year without playing, draws, or input mutation', () => {
    const state = career(); const before = clone(state);
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('declaration drew'); });
    expect(farewellEligibility(state)).toMatchObject({ eligible: true, year: 2029 });
    const result = announceFarewellSeason(state, FALLBACK_CLUBS);
    expect(readSoccerFarewell(result)).toEqual({ version: 1, year: 2029, sourceCount: 4,
      sourceYear: 2028, sourceAge: 31, announcedAge: 31, club: 'Twente', sourcePhase: 'playing' });
    expect(result.age).toBe(state.age); expect(result.phase).toBe('playing');
    expect(result.seasons).toBe(state.seasons); expect(result.isFinalSeason).toBe(true);
    expect(result.events).toHaveLength(state.events.length + 1);
    expect(farewellSeasonComplete(result)).toBe(false);
    expect(announceFarewellSeason(result, FALLBACK_CLUBS)).toBe(result);
    expect(random).not.toHaveBeenCalled(); expect(state).toEqual(before);
  });

  it.each([18, 29, 44, 45])('does not promise another playable year from age %s', age => {
    const state = career(age);
    expect(farewellEligibility(state).eligible).toBe(false);
    expect(announceFarewellSeason(state, FALLBACK_CLUBS)).toBe(state);
  });

  it.each(['youth', 'transfer_window', 'season_summary', 'newspaper', 'rehab_choice', 'retired'] as const)('does not declare from %s', phase => {
    const state = { ...career(), phase };
    expect(announceSoccerFarewell(state)).toBe(state);
  });

  it.each([32, 33, 42])('keeps the forced-health limit at pending age %s', pendingAge => {
    const state = career(pendingAge - 1); state.overall = 49;
    expect(farewellEligibility(state).eligible).toBe(pendingAge < 33);
  });

  it('accepts the final playable age and a genuine already-aged suggestion', () => {
    expect(farewellEligibility(career(43))).toMatchObject({ eligible: true, year: 2029 });
    const pending = { ...career(43), age: 44, phase: 'retirement_suggestion' as const };
    const plan = announceSoccerFarewell(pending);
    expect(readSoccerFarewell(plan)).toMatchObject({ announcedAge: 44, sourceAge: 43, year: 2029 });
  });

  it('rejects a phase that does not match the recorded age', () => {
    const state = career(); state.age += 1;
    expect(announceSoccerFarewell(state)).toBe(state);
    state.phase = 'retirement_suggestion'; state.age += 1;
    expect(announceSoccerFarewell(state)).toBe(state);
  });

  it('needs an actual senior playing source, not academy or manager rows', () => {
    const state = career();
    state.seasons[state.seasons.length - 1].type = 'manager';
    expect(farewellEligibility(state).eligible).toBe(false);
    state.seasons = state.seasons.map(row => ({ ...row, type: 'youth', clubTier: 99 }));
    expect(farewellEligibility(state).eligible).toBe(false);
  });
});

describe('Soccer Career saved farewell validation', () => {
  const defects: [string, (plan: SoccerFarewellPlan) => unknown][] = [
    ['wrong version', p => ({ ...p, version: 2 })], ['wrong target year', p => ({ ...p, year: p.year + 1 })],
    ['wrong source count', p => ({ ...p, sourceCount: p.sourceCount - 1 })], ['wrong source year', p => ({ ...p, sourceYear: p.sourceYear - 1 })],
    ['wrong source age', p => ({ ...p, sourceAge: p.sourceAge + 1 })], ['wrong announced age', p => ({ ...p, announcedAge: p.announcedAge + 1 })],
    ['empty club', p => ({ ...p, club: '' })], ['wrong phase', p => ({ ...p, sourcePhase: 'world_cup' })],
    ['extra key', p => ({ ...p, extra: true })], ['missing key', p => { const result: Partial<SoccerFarewellPlan> = { ...p }; delete result.club; return result; }],
    ['nonfinite year', p => ({ ...p, year: NaN })], ['fractional count', p => ({ ...p, sourceCount: 4.5 })],
    ['array', () => []], ['null', () => null], ['string', () => 'final'],
  ];
  it.each(defects)('ignores %s and preserves its raw payload', (_label, corrupt) => {
    const state = announceSoccerFarewell(career());
    state.farewellSeason = corrupt(state.farewellSeason!) as SoccerFarewellPlan;
    const raw = state.farewellSeason;
    expect(readSoccerFarewell(state)).toBeNull();
    expect(farewellSeasonComplete(state)).toBe(false);
    expect(announceSoccerFarewell(state)).toBe(state);
    expect(state.farewellSeason).toBe(raw);
  });

  it('does not accept missing, wrong, or extra endpoint records', () => {
    const state = announceSoccerFarewell(career());
    const complete = finalRow(state);
    expect(farewellSeasonComplete(complete)).toBe(true);
    expect(readSoccerFarewell({ ...complete, age: complete.age + 1 })).toBeNull();
    expect(readSoccerFarewell(finalRow(state, { year: 2030 }))).toBeNull();
    expect(readSoccerFarewell(finalRow(state, { age: 35 }))).toBeNull();
    expect(readSoccerFarewell({ ...complete, seasons: [...complete.seasons, complete.seasons[complete.seasons.length - 1]] })).toBeNull();
    expect(farewellSeasonComplete(finalRow(state, { type: 'retired' }))).toBe(false);
  });

  it('keeps the year-level declaration across actual transfer and loan moves', () => {
    const state = announceSoccerFarewell(career());
    const club = FALLBACK_CLUBS.find(row => row.name === 'Norwich City')!;
    const offer = { club, contractYears: 2, wage: state.weeklyWage, transferFee: 0 };
    for (const moved of [acceptOffer(state, offer), acceptLoan(state, { ...offer, isLoan: true })]) {
      expect(readSoccerFarewell(moved)).toEqual(state.farewellSeason);
      expect(readSoccerFarewell(moved)?.club).toBe('Twente');
      expect(farewellSeasonComplete(finalRow(moved))).toBe(true);
    }
  });

  it('ignores the old final-season marker for automatic retirement', () => {
    const state = career(); state.isFinalSeason = true;
    expect(readSoccerFarewell(state)).toBeNull();
    const result = dismissSummary({ ...state, phase: 'season_summary' }, FALLBACK_CLUBS);
    expect(result.retired).toBe(false); expect(result.phase).toBe('social_media_action');
  });
});

describe('Soccer Career farewell engine boundaries', () => {
  it('resumes the already-aged warning exactly like the original Keep Playing continuation', () => {
    const pending = { ...career(29), age: 30, overall: 70, retirementSuggested: true, phase: 'retirement_suggestion' as const };
    const declared = announceSoccerFarewell(pending);
    const expected = run(311, () => declineRetirementSuggestion(clone(declared), FALLBACK_CLUBS));
    const actual = run(311, () => announceFarewellSeason(clone(pending), FALLBACK_CLUBS));
    expect(actual).toEqual(expected);
    expect(actual.value.age).toBe(30); expect(actual.value.seasons).toHaveLength(pending.seasons.length + 1);
    expect(actual.value.seasons[actual.value.seasons.length - 1].year).toBe(2029);
    expect(announceFarewellSeason(actual.value, FALLBACK_CLUBS)).toBe(actual.value);
    expect(declineRetirementSuggestion(actual.value, FALLBACK_CLUBS)).toBe(actual.value);
  });

  it('suppresses the existing warning only for a validated declared year', () => {
    const state = career(34); state.overall = 65; state.peakOverall = 85; state.retirementSuggested = false;
    const legacy = run(881, () => advanceProSeason(clone(state), FALLBACK_CLUBS));
    expect(legacy.value.phase).toBe('retirement_suggestion'); expect(legacy.value.seasons).toHaveLength(state.seasons.length);
    const declared = run(881, () => advanceProSeason(announceSoccerFarewell(clone(state)), FALLBACK_CLUBS));
    expect(declared.value.phase).not.toBe('retirement_suggestion');
    expect(declared.value.seasons).toHaveLength(state.seasons.length + 1);
    const repeated = { ...state, retirementSuggested: true };
    const result = run(981, () => advanceProSeason(announceSoccerFarewell(repeated), FALLBACK_CLUBS));
    expect(result.value.phase).not.toBe('retirement_suggestion');
    expect(farewellSeasonComplete(result.value)).toBe(true);
  });

  it('plays one actual year and retires after the recorded summary without another age or row', () => {
    const state = announceSoccerFarewell(career());
    const played = run(41, () => advanceProSeason(clone(state), FALLBACK_CLUBS)).value;
    expect(farewellSeasonComplete(played)).toBe(true);
    const originalRows = clone(played.seasons); const age = played.age;
    const ended = run(17, () => finish(played)).value;
    expect(ended.retired).toBe(true); expect(ended.phase).toBe('retirement_ceremony');
    expect(ended.age).toBe(age); expect(ended.seasons).toEqual(originalRows);
    expect(ended.legacy).not.toBeNull();
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('retired callback drew'); });
    expect(advanceProSeason(ended, FALLBACK_CLUBS)).toBe(ended);
    expect(manualRetire(ended)).toBe(ended); expect(dismissSummary(ended, FALLBACK_CLUBS)).toBe(ended);
    expect(applyRehabChoice(ended, 1)).toBe(ended); expect(dismissNewspaper(ended)).toBe(ended);
    expect(acceptRetirementSuggestion(ended)).toBe(ended);
    expect(random).not.toHaveBeenCalled();
  });

  it.each([['ban', 'BANNED'], ['prison', 'PRISON']] as const)('ends the actual %s year, including an interrupted active loan', (kind, marker) => {
    const state = career();
    const parent = { parentClub: state.currentClub, parentTier: state.currentClubTier, parentLeague: state.currentLeague,
      parentCountry: state.currentClubCountry, parentColor: state.currentClubColor };
    const loanClub = FALLBACK_CLUBS.find(club => club.name === 'Norwich City')!;
    state.loan = parent; state.currentClub = loanClub.name; state.currentClubTier = loanClub.tier;
    state.currentClubCountry = loanClub.country; state.currentLeague = loanClub.league; state.currentClubColor = loanClub.color;
    if (kind === 'ban') state.matchFixBanned = 2; else state.prisonSeasons = 1;
    const played = run(72, () => advanceProSeason(announceSoccerFarewell(state), FALLBACK_CLUBS)).value;
    expect(played.seasons[played.seasons.length - 1]).toMatchObject({ club: marker, apps: 0, year: 2029, age: 32 });
    const beforeRow = clone(played.seasons[played.seasons.length - 1]);
    const ended = run(78, () => finish(played)).value;
    expect(ended.retired).toBe(true); expect(ended.loan).toBeNull(); expect(ended.currentClub).toBe(parent.parentClub);
    expect(ended.seasons[ended.seasons.length - 1]).toEqual(beforeRow);
    expect(ended.seasons).toHaveLength(state.seasons.length + 1);
  });

  it.each(['PED', 'conviction', 'severe injury'] as const)('records and finishes an actual %s interruption', kind => {
    const state = career();
    if (kind === 'PED') { state.pedActive = true; state.pedSeasonsRemaining = 2; }
    if (kind === 'conviction') { state.corruptionHeat = 100; state.dirtyMoney = 0; }
    let played: CareerState | null = null;
    for (let seed = 1; seed <= 160 && !played; seed++) {
      const result = run(seed, () => advanceProSeason(announceSoccerFarewell(clone(state)), FALLBACK_CLUBS)).value;
      const row = result.seasons[result.seasons.length - 1];
      if ((kind === 'PED' && row.club === 'BANNED (PED)') || (kind === 'conviction' && row.club === 'CONVICTED')
        || (kind === 'severe injury' && result.phase === 'rehab_choice' && row.injurySevere)) played = result;
    }
    expect(played, `actual ${kind} branch was not reached`).not.toBeNull();
    const row = clone(played!.seasons[played!.seasons.length - 1]);
    const ended = run(71, () => finish(played!)).value;
    expect(ended.retired).toBe(true); expect(ended.seasons).toHaveLength(state.seasons.length + 1);
    expect(ended.seasons[ended.seasons.length - 1]).toEqual(row);
    if (kind === 'severe injury') { expect(ended.seriousInjuries?.length).toBeGreaterThan(0); expect(ended.pendingRehab).toBeNull(); }
  }, 30000);

  it.each(['rehab', 'conviction'] as const)('repairs a genuinely missing legacy %s row once before its final summary', kind => {
    let state = announceSoccerFarewell(career()); state = { ...state, age: 32 };
    if (kind === 'rehab') {
      state.phase = 'rehab_choice'; state.pendingRehab = { name: 'Recorded injury', weeks: 16, year: 2029, specialistCost: null };
      state = run(231, () => applyRehabChoice(state, 1)).value;
    } else {
      state.phase = 'newspaper'; state.prisonSeasons = 1;
      state = run(231, () => dismissNewspaper(state)).value;
    }
    expect(state.seasons).toHaveLength(5); expect(state.phase).toBe('season_summary');
    expect(state.pendingSummary).toMatchObject({ year: 2029, age: 32, apps: 0 });
    const before = clone(state.seasons);
    const ended = run(239, () => finish(state)).value;
    expect(ended.retired).toBe(true); expect(ended.seasons).toEqual(before);
  });

  it('drains every queued ceremony in the old order before retiring, without a market or social roll', () => {
    const state = finalRow(announceSoccerFarewell(career()));
    state.pendingBallonDor = { year: 2029, nominees: [], playerRank: null, playerPoints: 0, playerNominated: false };
    state.intStats.debutYear = 2029;
    state.pendingWorldCup = { year: 2029, nation: state.nationality, matches: [], playerApps: 0, playerGoals: 0,
      playerAssists: 0, playerAvgRating: 0, result: 'Group Stage', bestPlayer: false };
    state.pendingRivalryEvent = { id: 118, emoji: 'test', title: 'Recorded rivalry invitation', description: 'Held event', consequence: 'Held result' };
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('extra offseason draw'); });
    let result = dismissSummary(state, FALLBACK_CLUBS);
    expect(result.phase).toBe('ballon_dor'); expect(result.retired).toBe(false);
    result = dismissBallonDor(result, FALLBACK_CLUBS); expect(result.phase).toBe('international_debut');
    result = dismissDebut(result, FALLBACK_CLUBS); expect(result.phase).toBe('world_cup');
    result = dismissWorldCup(result, FALLBACK_CLUBS); expect(result.phase).toBe('rivalry_event');
    result = dismissRivalryEvent(result, FALLBACK_CLUBS);
    expect(result.phase).toBe('retirement_ceremony'); expect(result.retired).toBe(true);
    expect(result.pendingSummary).toBeNull(); expect(result.pendingBallonDor).toBeNull();
    expect(result.pendingWorldCup).toBeNull(); expect(result.pendingRivalryEvent).toBeNull();
    expect(result.seasons).toEqual(state.seasons); expect(random).not.toHaveBeenCalled();
  });

  it('preserves the existing hard retirement if the body or maximum age stops the year', () => {
    const state = announceSoccerFarewell(career(43));
    state.age = 44; state.seasons[state.seasons.length - 1].age = 44;
    expect(readSoccerFarewell(state)).toBeNull();
    const actual = run(118, () => advanceProSeason(clone(state), FALLBACK_CLUBS));
    const raw = state.farewellSeason;
    const baseline = clone(state); delete baseline.farewellSeason;
    const old = run(118, () => advanceProSeason(baseline, FALLBACK_CLUBS));
    expect(actual.draws).toEqual(old.draws); expect(actual.value).toEqual({ ...old.value, farewellSeason: raw });
    expect(actual.value.retired).toBe(true); expect(actual.value.age).toBe(45);
    expect(actual.value.seasons[actual.value.seasons.length - 1].type).toBe('retired');
  });

  it('keeps complete actual continuation state and draws neutral for malformed saved data', () => {
    const state = career();
    const malformed = { version: 1, year: 9999, unexpected: 'preserve me' } as unknown as SoccerFarewellPlan;
    const actual = run(238, () => advanceProSeason({ ...clone(state), farewellSeason: malformed }, FALLBACK_CLUBS));
    const old = run(238, () => advanceProSeason(clone(state), FALLBACK_CLUBS));
    expect(actual.draws).toEqual(old.draws);
    expect(actual.value).toEqual({ ...old.value, farewellSeason: malformed });
  });

  it('does not override a genuine forced-health retirement during the declared year', () => {
    const state = announceSoccerFarewell(career(32)); state.overall = 49;
    expect(readSoccerFarewell(state)).not.toBeNull();
    const actual = run(619, () => advanceProSeason(clone(state), FALLBACK_CLUBS));
    const baseline = clone(state); delete baseline.farewellSeason;
    const old = run(619, () => advanceProSeason(baseline, FALLBACK_CLUBS));
    expect(actual.draws).toEqual(old.draws);
    expect(actual.value).toEqual({ ...old.value, farewellSeason: state.farewellSeason });
    expect(actual.value.retired).toBe(true); expect(actual.value.phase).toBe('retirement_ceremony');
    expect(actual.value.seasons[actual.value.seasons.length - 1]).toMatchObject({ type: 'retired', age: 33, year: 2029 });
    expect(farewellSeasonComplete(actual.value)).toBe(false);
  });

  it('ends an announced active loan on immediate retirement without inventing a final row', () => {
    const original = career();
    const destination = FALLBACK_CLUBS.find(club => club.name === 'Norwich City')!;
    const loan = acceptLoan(original, { club: destination, contractYears: 1, wage: original.weeklyWage, transferFee: 0, isLoan: true });
    const announced = announceSoccerFarewell(loan); const before = clone(announced);
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('loan retirement drew'); });
    const ended = manualRetire(announced);
    expect(ended.retired).toBe(true); expect(ended.phase).toBe('retirement_ceremony');
    expect(ended.loan).toBeNull(); expect(ended.currentClub).toBe(original.currentClub);
    expect(ended.currentClubTier).toBe(original.currentClubTier); expect(ended.currentLeague).toBe(original.currentLeague);
    expect(ended.seasons).toEqual(announced.seasons); expect(ended.age).toBe(announced.age);
    expect(ended.events.slice(-2)[0]).toBe(`🔙 The loan ends. You return to ${original.currentClub} before retiring.`);
    expect(announced).toEqual(before); expect(random).not.toHaveBeenCalled();
  });
});
