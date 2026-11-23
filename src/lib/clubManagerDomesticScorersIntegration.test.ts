import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  applyForJob, careerLeagueOf, domesticCupScorerRace, engineRegistrations, finishSeason, loadCareer, playNextEntry,
  REAL_LEAGUES, restoreEngineRegistrations, saveCareer, startCareer, startNextSeason,
  type CareerState, type MatchWeekReport,
} from './clubManager';
import { joinClubNow, startMidSeason } from './clubManagerCalendar';
import { serializeParkedCareer } from './clubManagerParkedSave';

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

function tape<T>(seed: number, run: () => T): { value: T; draws: number[] } {
  const original = Math.random;
  const draws: number[] = [];
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(seed ^ seed >>> 15, seed | 1);
    mixed ^= mixed + Math.imul(mixed ^ mixed >>> 7, mixed | 61);
    const roll = ((mixed ^ mixed >>> 14) >>> 0) / 4294967296;
    draws.push(roll);
    return roll;
  };
  try { return { value: run(), draws }; } finally { Math.random = original; }
}

function next(state: CareerState, seed: number) {
  const through = state.week + 1;
  return tape(seed + through, () => playNextEntry(state, {
    skipHalftime: true, untilWeek: through,
  }));
}

function playTo(state: CareerState, seed: number, until: number): { state: CareerState; reports: MatchWeekReport[] } {
  const reports: MatchWeekReport[] = [];
  while (state.week < until) {
    const { value: step } = next(state, seed);
    if (step.state.week <= state.week) throw new Error(`Domestic cup fixture stalled at week ${state.week}`);
    state = step.state;
    if (step.report?.competition === 'cup') reports.push(step.report);
  }
  return { state, reports };
}

function expectReconciled(state: CareerState): void {
  const ledger = state.domesticCupScorers;
  expect(ledger).toBeDefined();
  const goals = state.cupBracket?.reduce((sum, tie) => sum + (tie.homeGoals ?? 0) + (tie.awayGoals ?? 0), 0);
  expect(ledger!.unresolved + ledger!.ownGoals + ledger!.players.reduce((sum, row) => sum + row[3], 0)).toBe(goals);
}

describe('Domestic cup scorer settlement', () => {
  const registrations = engineRegistrations();

  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(1791633600000);
  });

  afterAll(() => {
    restoreEngineRegistrations(registrations);
    localStorage.clear();
    vi.useRealTimers();
  });

  it('continues crediting settled ties after Everton goes out in the first round', () => {
    const seed = 982022;
    const initial = tape(seed, () => startCareer('Everton')).value;
    const { state: eliminated, reports } = playTo(initial, seed, 10);
    expect(eliminated.cupRound).toBe('out');
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ home: 'Everton', away: 'Liverpool', homeGoals: 1, awayGoals: 3 });
    expect(eliminated.domesticCupScorers?.nights).toBe(1);
    const known = eliminated.domesticCupScorers!.players.filter(([, , club]) => club === 'Everton');
    expect(known.length).toBeGreaterThan(0);
    expectReconciled(eliminated);
    expect(domesticCupScorerRace(eliminated)).toMatchObject({ status: 'racing', leaders: [] });

    const played = playTo(eliminated, seed, 49);
    expect(played.reports).toHaveLength(0);
    expect(played.state.cupBracket?.find(tie => tie.round === 'F')).toMatchObject({ winner: 'Manchester City', pens: true });
    expect(played.state.domesticCupScorers?.nights).toBe(4);
    expect(played.state.domesticCupScorers?.players.filter(([, , club]) => club === 'Everton')).toEqual(known);
    expectReconciled(played.state);
    expect(domesticCupScorerRace(played.state)).toMatchObject({
      status: 'winner', leaders: [expect.objectContaining({ name: 'Alexander Isak', club: 'Liverpool', goals: 4 })],
    });
  });

  it('credits the played match by club through away and neutral fixtures when Liverpool wins', () => {
    const seed = 987419;
    const initial = tape(seed, () => startCareer('Liverpool')).value;
    const played = playTo(initial, seed, 49);
    expect(played.state.cupRound).toBe('won');
    expect(played.reports).toHaveLength(4);
    expect(played.reports[1].away).toBe('Liverpool');
    expect(played.reports[3].detail?.venue).toBe('neutral');
    expect(played.state.cupBracket?.find(tie => tie.round === 'F')?.winner).toBe('Liverpool');
    expect(played.state.domesticCupScorers?.nights).toBe(4);
    expectReconciled(played.state);
    const ownGoals = played.reports.flatMap(report => report.myScorers).filter(goal => !goal.og);
    const recorded = played.state.domesticCupScorers!.players.filter(([, , club]) => club === 'Liverpool');
    for (const [, player, , goals] of recorded) {
      expect(goals).toBe(ownGoals.filter(goal => goal.name === player).length);
    }
    expect(recorded.reduce((sum, row) => sum + row[3], 0)).toBe(ownGoals.length);
    const winner = { name: 'Brian Brobbey', club: 'Sunderland', goals: 4 };
    expect(domesticCupScorerRace(played.state)).toMatchObject({ status: 'winner', leaders: [expect.objectContaining(winner)] });

    const season = playTo(played.state, seed, played.state.calendar.length).state;
    const finished = tape(seed + 200, () => finishSeason(season)).value;
    const award = { competition: 'FA Cup', winners: [winner] };
    expect(finished.summary.domesticScorerAward).toEqual(award);
    expect(saveCareer(finished.state)).toBe(true);
    const reloaded = loadCareer();
    expect(reloaded?.domesticCupScorers).toEqual(played.state.domesticCupScorers);
    expect(reloaded?.pendingSummary?.domesticScorerAward).toEqual(award);
    expect(loadCareer(serializeParkedCareer(finished.state))?.history.find(row => row.season === season.season)?.domesticScorerAward)
      .toEqual(award);
    const nextState = tape(seed + 201, () => startNextSeason(reloaded!, 'Bayern Munich')).value;
    expect(nextState.clubName).toBe('Bayern Munich');
    expect(careerLeagueOf(nextState).cupName).toBe('DFB-Pokal');
    expect(nextState.domesticCupScorers?.nights).toBe(0);
    expect(nextState.history.find(row => row.season === season.season)?.domesticScorerAward).toEqual(award);
  });

  it('starts an old pristine draw at its first kickoff without backfilling sealed results', () => {
    const seed = 982022;
    const initial = tape(seed, () => startCareer('Everton')).value;
    const first = playTo(initial, seed, 9).state;
    delete first.domesticCupScorers;
    const eliminated = playTo(loadCareer(JSON.stringify(first))!, seed, 10).state;
    expect(eliminated.domesticCupScorers?.nights).toBe(1);
    expectReconciled(eliminated);

    const old = copy(eliminated);
    delete old.domesticCupScorers;
    const finished = playTo(loadCareer(JSON.stringify(old))!, seed, 49).state;
    expect(finished.cupBracket?.find(tie => tie.round === 'F')?.winner).toBe('Manchester City');
    expect(finished.domesticCupScorers).toBeUndefined();
    expect(domesticCupScorerRace(finished)).toMatchObject({ status: 'unavailable', leaders: [] });
    expect(tape(seed + 200, () => finishSeason(finished)).value.summary.domesticScorerAward).toBeUndefined();
  });

  it('keeps a new first run-in and a midseason replacement bracket untracked', () => {
    const seed = 982022;
    const initial = tape(seed, () => startCareer('Everton')).value;
    const takeover = tape(seed + 201, () => startMidSeason(initial, 'autumn')).value;
    expect(takeover.cupBracket?.some(tie => tie.winner)).toBe(true);
    expect(takeover.domesticCupScorers).toBeUndefined();
    expect(domesticCupScorerRace(takeover).status).toBe('unavailable');

    const original = playTo(initial, seed, 10).state;
    const oldLedger = JSON.stringify(original.domesticCupScorers);
    const club = 'Bayern Munich';
    const league = REAL_LEAGUES.find(item => item.clubs.includes(club));
    if (!league) throw new Error('The fixture needs a second country');
    original.jobHunt = { open: { club, league: league.id, tier: 1, season: original.season, week: original.week,
      matchesLeft: 0, roll: 0, status: 'accepted' }, cooldowns: [], sentSeason: original.season, sent: 1, summerMove: null };
    const moved = tape(seed + 202, () => joinClubNow(original)).value;
    expect(moved?.clubName).toBe(club);
    expect(moved?.domesticCupScorers).toBeUndefined();
    const nextCup = moved!.calendar.findIndex((slot, week) => week >= moved!.week && slot.type === 'cup');
    expect(nextCup).toBeGreaterThanOrEqual(moved!.week);
    const after = playTo(moved!, seed + 500, nextCup + 1).state;
    expect(after.domesticCupScorers).toBeUndefined();
    expect(domesticCupScorerRace(after).status).toBe('unavailable');
    expect(JSON.stringify(original.domesticCupScorers)).toBe(oldLedger);
  });

  it('archives a completed FA Cup award after taking an accepted job before the season ends', () => {
    const seed = 987419;
    const initial = tape(seed, () => startCareer('Liverpool')).value;
    const beforeFinal = playTo(initial, seed, 43).state;
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.01);
    let applied: CareerState | null;
    try { applied = applyForJob(beforeFinal, 'Bayern Munich'); } finally { random.mockRestore(); }
    expect(applied?.jobHunt?.open?.status).toBe('pending');
    const final = playTo(applied!, seed, 49).state;
    expect(final.cupRound).toBe('won');
    expect(final.jobHunt?.open?.status).toBe('accepted');
    expect(final.week).toBeLessThan(final.calendar.length);
    const moved = tape(seed + 202, () => joinClubNow(final)).value;
    expect(moved?.clubName).toBe('Bayern Munich');
    expect(domesticCupScorerRace(moved!).status).toBe('unavailable');
    const award = { competition: 'FA Cup', winners: [{ name: 'Brian Brobbey', club: 'Sunderland', goals: 4 }] };
    expect(moved?.pendingDomesticScorerAward).toEqual(award);
    expect(moved?.domesticCupScorers).toBeUndefined();
    const stored = loadCareer(JSON.stringify(moved));
    expect(stored?.pendingDomesticScorerAward).toEqual(award);
    const season = playTo(stored!, seed + 222, stored!.calendar.length).state;
    const finish = tape(seed + 200, () => finishSeason(season)).value;
    expect(finish.summary.domesticScorerAward).toEqual(award);
    expect(finish.state.history.find(row => row.season === season.season)?.domesticScorerAward).toEqual(award);
    const nextSeason = tape(seed + 201, () => startNextSeason(finish.state)).value;
    expect(nextSeason.pendingDomesticScorerAward).toBeUndefined();
    expect(nextSeason.history.find(row => row.season === season.season)?.domesticScorerAward).toEqual(award);
  });

  it('uses existing short-field byes and treats uncertain scorers openly', () => {
    const seed = 912321;
    const scotland = tape(seed, () => startCareer('Aberdeen')).value;
    expect(scotland.cupByes).toHaveLength(4);
    const finished = playTo(scotland, seed, scotland.calendar.length).state;
    expect(finished.cupBracket).toHaveLength(11);
    expect(finished.domesticCupScorers?.nights).toBe(4);
    expectReconciled(finished);
    expect(domesticCupScorerRace(finished)).toMatchObject({ status: 'undecided', leaders: [] });
    expect(tape(seed + 200, () => finishSeason(finished)).value.summary.domesticScorerAward).toBeUndefined();
  });
});
