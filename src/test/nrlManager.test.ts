import { describe, expect, it } from 'vitest';
import { NRL_CLUBS, NRL_DRAW } from '@/data/nrlManager2026';
import {
  createNrlSeason, isNrlManagerState, nrlFinalsEliminated, nrlLadder, nrlNextRound, nrlRoundFixtures,
  NRL_REGULAR_ROUNDS, NRL_ROLES, readNrlSave, reduceNrlSeason,
  type NrlManagerState, type NrlMatchResult,
} from '@/lib/nrlManager';

const clubId = NRL_CLUBS[0].id;
const advance = (state: NrlManagerState) => reduceNrlSeason(state, { type: 'advance' });
function throughRound(state: NrlManagerState, round: number) {
  while (state.round <= round && state.phase !== 'complete') state = advance(state);
  return state;
}

function expectRealScore(result: NrlMatchResult) {
  for (const [score, scoring] of [
    [result.homeScore, result.homeScoring],
    [result.awayScore, result.awayScoring],
  ] as const) {
    expect(scoring.conversions).toBeLessThanOrEqual(scoring.tries);
    expect(score).toBe(4 * scoring.tries + 2 * scoring.conversions + 2 * scoring.penalties
      + scoring.fieldGoals + 2 * scoring.longFieldGoals);
  }
}

describe('NRL Manager season', () => {
  it('starts with 13 eligible starters and can rotate in a reserve from the same role', () => {
    const state = createNrlSeason(clubId, 42);
    expect(state.squad).toHaveLength(26);
    expect(new Set(state.squad.map(player => player.name)).size).toBe(26);
    expect(new Set(Object.values(state.lineup)).size).toBe(13);
    const role = NRL_ROLES[0];
    const reserve = state.squad.find(player => player.role === role && player.id !== state.lineup[role])!;
    expect(reduceNrlSeason(state, { type: 'selectStarter', role: NRL_ROLES[1], playerId: reserve.id })).toBe(state);
    const swapped = reduceNrlSeason(state, { type: 'selectStarter', role, playerId: reserve.id });
    expect(swapped.lineup[role]).toBe(reserve.id);
    expect(state.lineup[role]).not.toBe(reserve.id);
    expect(isNrlManagerState(swapped)).toBe(true);
  });

  it('plays all fixtures once, credits byes and reconciles the regular-season ladder', () => {
    const start = createNrlSeason(clubId, 81);
    const first = advance(start);
    expect(first.round).toBe(2);
    expect(nrlNextRound(start)).toMatchObject({ title: 'Round 1', round: 1, finalsRound: null });
    expect(first.results.map(({ homeId, awayId }) => [homeId, awayId])).toEqual(NRL_DRAW[0]);
    expect(nrlLadder(first).filter(row => row.byes === 1)).toHaveLength(17 - 2 * NRL_DRAW[0].length);

    const finished = throughRound(first, NRL_REGULAR_ROUNDS);
    expect(finished.phase).toBe('finals');
    expect(finished.results).toHaveLength(204);
    expect(finished.results.map(({ homeId, awayId }) => [homeId, awayId])).toEqual(NRL_DRAW.flat());
    finished.results.forEach(expectRealScore);
    const table = nrlLadder(finished);
    expect(table).toHaveLength(17);
    for (const row of table) {
      expect(row.played).toBe(24);
      expect(row.byes).toBe(3);
      expect(row.wins + row.losses + row.draws).toBe(24);
      expect(row.points).toBe(2 * row.wins + row.draws + 6);
      expect(row.differential).toBe(row.pointsFor - row.pointsAgainst);
    }
    expect(table.reduce((sum, row) => sum + row.points, 0)).toBe(510);
    expect(table.reduce((sum, row) => sum + row.differential, 0)).toBe(0);
    const ordered = [...table].sort((a, b) => b.points - a.points || b.differential - a.differential);
    expect(table).toEqual(ordered);
  });

  it('resolves nine finals with the qualifying losers alive and preliminary crossovers', () => {
    const regular = throughRound(createNrlSeason(clubId, 7), NRL_REGULAR_ROUNDS);
    const seeds = nrlLadder(regular).map(row => row.clubId);
    expect(nrlRoundFixtures(regular).map(({ homeId, awayId }) => [homeId, awayId])).toEqual([
      [seeds[0], seeds[3]], [seeds[1], seeds[2]], [seeds[4], seeds[7]], [seeds[5], seeds[6]],
    ]);
    const afterFirst = advance(regular);
    const week1 = afterFirst.results.slice(-4);
    const winner = (match: NrlMatchResult) => match.homeScore > match.awayScore ? match.homeId : match.awayId;
    const loser = (match: NrlMatchResult) => match.homeScore < match.awayScore ? match.homeId : match.awayId;
    expect(nrlRoundFixtures(afterFirst).map(({ homeId, awayId }) => [homeId, awayId])).toEqual([
      [loser(week1[0]), winner(week1[2])], [loser(week1[1]), winner(week1[3])],
    ]);
    expect(nrlFinalsEliminated(afterFirst)).toEqual(new Set([...seeds.slice(8), loser(week1[2]), loser(week1[3])]));
    const afterSemis = advance(afterFirst);
    const semis = afterSemis.results.slice(-2);
    expect(nrlRoundFixtures(afterSemis).map(({ homeId, awayId }) => [homeId, awayId])).toEqual([
      [winner(week1[0]), winner(semis[1])], [winner(week1[1]), winner(semis[0])],
    ]);

    const complete = throughRound(afterSemis, NRL_REGULAR_ROUNDS + 4);
    expect(complete.phase).toBe('complete');
    const finals = complete.results.slice(204);
    expect(finals).toHaveLength(9);
    expect(finals.every(match => match.homeScore !== match.awayScore)).toBe(true);
    finals.forEach(expectRealScore);
    expect(complete.championId).toBe(winner(finals[8]));
    expect(nrlLadder(complete)).toEqual(nrlLadder(regular));
    expect(nrlFinalsEliminated(complete).size).toBe(16);
    expect(nrlRoundFixtures(complete)).toEqual([]);
    expect(nrlNextRound(complete)).toMatchObject({ title: 'Season complete', clubStatus: 'complete', clubMatch: null });
    expect(advance(complete)).toBe(complete);
  });

  it('lets training, recovery and tactics alter the managed club while leaving other fixtures seeded', () => {
    let trainingBoosts = 0;
    let attackingScores = 0;
    let defendingConcedes = 0;
    let baselineScores = 0;
    let baselineConcedes = 0;
    const homeId = NRL_DRAW[0][0][0];
    for (let seed = 1; seed <= 160; seed++) {
      const fresh = createNrlSeason(homeId, seed);
      const starter = fresh.lineup[NRL_ROLES[0]];
      const base = advance(fresh);
      const train = advance(reduceNrlSeason(fresh, { type: 'prepare', choice: 'train' }));
      const recover = advance(reduceNrlSeason(fresh, { type: 'prepare', choice: 'recover' }));
      const attack = advance(reduceNrlSeason(fresh, { type: 'setTactic', tactic: 'attack' }));
      const defense = advance(reduceNrlSeason(fresh, { type: 'setTactic', tactic: 'defense' }));
      expect(train.preparation).toBeNull();
      expect(recover.squad.find(player => player.id === starter)!.fitness)
        .toBeGreaterThan(train.squad.find(player => player.id === starter)!.fitness);
      expect(attack.results.slice(1)).toEqual(base.results.slice(1));
      trainingBoosts += train.results[0].homeScore - base.results[0].homeScore;
      attackingScores += attack.results[0].homeScore;
      defendingConcedes += defense.results[0].awayScore;
      baselineScores += base.results[0].homeScore;
      baselineConcedes += base.results[0].awayScore;
    }
    expect(trainingBoosts).toBeGreaterThan(0);
    expect(attackingScores).toBeGreaterThan(baselineScores);
    expect(defendingConcedes).toBeLessThan(baselineConcedes);
  });

  it('uses scoring percentage when two clubs have equal points and differential', () => {
    const matches = advance(createNrlSeason(clubId, 70)).results.slice(0, 2);
    const table = nrlLadder({
      year: 2026,
      round: 2,
      results: [{ ...matches[0], homeScore: 18, awayScore: 12 }, { ...matches[1], homeScore: 24, awayScore: 18 }],
    });
    const first = table.findIndex(row => row.clubId === matches[0].homeId);
    const second = table.findIndex(row => row.clubId === matches[1].homeId);
    expect(first).toBeLessThan(second);
  });

  it('shows a regular-season bye and maintains fitness over a season of training', () => {
    const firstRoundClubs = new Set(NRL_DRAW[0].flat());
    const byeClub = NRL_CLUBS.find(club => !firstRoundClubs.has(club.id))!;
    const bye = createNrlSeason(byeClub.id, 12);
    expect(nrlNextRound(bye)).toMatchObject({ clubStatus: 'bye', clubMatch: null });
    const first = advance(bye);
    expect(first.squad.every(player => player.fitness === 100)).toBe(true);
    let state = first;
    while (state.phase === 'regular') state = advance(reduceNrlSeason(state, { type: 'prepare', choice: 'train' }));
    const starters = new Set(Object.values(state.lineup));
    expect(state.squad.filter(player => starters.has(player.id)).every(player => player.fitness >= 55)).toBe(true);
  });

  it('plays Perth in a separate 2027 season and rejects cross-year saves', () => {
    const year = 2027;
    const perthId = 'bears';
    const perth = createNrlSeason(perthId, 62, year);
    expect(perth.year).toBe(2027);
    expect(nrlLadder(perth)).toHaveLength(18);
    expect(nrlLadder(createNrlSeason(clubId, 62)).map(row => row.clubId)).not.toContain(perthId);
    expect(() => createNrlSeason(perthId, 62, 2026)).toThrow(RangeError);
    expect(readNrlSave(JSON.stringify({ ...perth, year: 2026 }))).toBeNull();

    const midseason = throughRound(perth, 12);
    const restored = readNrlSave(JSON.stringify(midseason));
    expect(restored).toEqual(midseason);
    const regular = throughRound(restored!, 27);
    expect(regular.results).toHaveLength(216);
    expect(nrlLadder(regular).every(row => row.played === 24 && row.byes === 3)).toBe(true);
    expect(nrlNextRound(regular)).toMatchObject({ round: 28, finalsRound: 1 });
    const complete = throughRound(regular, 31);
    expect(complete.results).toHaveLength(225);
    expect(complete.championId).toBeTruthy();
    expect(readNrlSave(JSON.stringify(complete))).toEqual(complete);

    const sameClub = throughRound(createNrlSeason(clubId, 62, 2027), 6);
    expect(readNrlSave(JSON.stringify({ ...sameClub, year: 2026 }))).toBeNull();
    const { year: omitted, ...missingYear } = sameClub;
    expect(omitted).toBe(2027);
    expect(readNrlSave(JSON.stringify(missingYear))).toBeNull();
  });

  it('resumes deterministically and rejects corrupted fixtures, scoring, lineups and saves', () => {
    const midseason = throughRound(createNrlSeason(clubId, 22), 13);
    const restored = readNrlSave(JSON.stringify(midseason));
    expect(restored).toEqual(midseason);
    expect(throughRound(restored!, 31)).toEqual(throughRound(midseason, 31));
    const complete = throughRound(midseason, 31);
    expect(readNrlSave(JSON.stringify(complete))).toEqual(complete);
    expect(readNrlSave(JSON.stringify({ ...complete, championId: null }))).toBeNull();
    expect(readNrlSave(JSON.stringify({ ...midseason, round: midseason.round + 1 }))).toBeNull();
    expect(isNrlManagerState({ ...midseason, results: [{ ...midseason.results[0], homeScore: 300 }, ...midseason.results.slice(1)] })).toBe(false);
    expect(isNrlManagerState({ ...midseason, results: [...midseason.results.slice(1), midseason.results[0]] })).toBe(false);
    expect(isNrlManagerState({ ...midseason, lineup: { ...midseason.lineup, [NRL_ROLES[0]]: midseason.lineup[NRL_ROLES[1]] } })).toBe(false);
    expect(readNrlSave('{')).toBeNull();
    expect(readNrlSave(null)).toBeNull();
  });
});
