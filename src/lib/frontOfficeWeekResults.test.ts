import { describe, expect, it } from 'vitest';
import {
  initLeague, readNflGameRatings, readNflSettledWeek, REGULAR_WEEKS, reviewNflWeekRatings,
  settleNflWeekResults, simGame, type LeagueState,
} from '@/lib/frontOffice';
import { isFrontOfficeSave } from '@/lib/frontOfficeSave';

const team = 'KC';
const clone = (league: LeagueState): LeagueState => JSON.parse(JSON.stringify(league));
const ownGame = (league: LeagueState, week: number) =>
  league.schedule[week - 1].find(game => game.home === team || game.away === team)!;

describe('NFL weekly results rating history', () => {
  it('saves exact review deltas only on the user fixture while keeping the scored results identical', () => {
    const fixture = initLeague(() => 0.42);
    const before = clone(fixture);
    const after = clone(fixture);
    let oldDraws = 0;
    let newDraws = 0;
    for (let week = 1; week <= REGULAR_WEEKS; week += 1) {
      before.week = week;
      after.week = week;
      const beforeGames = before.schedule[week - 1].map(game => simGame(game, before.teams, () => { oldDraws++; return 0.42; }));
      const afterGames = after.schedule[week - 1].map(game => simGame(game, after.teams, () => { newDraws++; return 0.42; }));
      const roster = after.teams[team].players;
      const oldRatings = roster.map(player => player.ovr);
      reviewNflWeekRatings(before, team);
      reviewNflWeekRatings(after, team);
      before.schedule[week - 1] = beforeGames;
      after.schedule[week - 1] = settleNflWeekResults(after, afterGames, team);
      expect(after.schedule[week - 1].filter(game => game.ratingChanges)).toEqual([ownGame(after, week)]);
      expect(readNflGameRatings(ownGame(after, week), team)).toEqual(before.ratingReview?.changes);
      expect(readNflGameRatings(ownGame(after, week), team)).toEqual(roster.flatMap((player, i) => player.ovr !== oldRatings[i]
        ? [[player.name, player.ovr - oldRatings[i]]]
        : []));
    }
    expect(after.schedule.flatMap(games => games.flatMap(game => game.ratingChanges?.changes ?? [])).length).toBeGreaterThan(0);
    expect(readNflGameRatings(ownGame(after, 1), team)).toEqual([]);
    expect(newDraws).toBe(oldDraws);
    const roundTrip = clone(after);
    expect(isFrontOfficeSave({ league: roundTrip, myTeam: team, phase: 'recap' }, 'NFL', REGULAR_WEEKS)).toBe(true);
    expect(readNflSettledWeek(roundTrip, 17)).toEqual(after.schedule[16]);
    for (const week of after.schedule) for (const game of week) delete game.ratingChanges;
    expect(after).toEqual(before);
  });

  it('treats legacy, mismatched and malformed data as unavailable without discarding a valid score', () => {
    const league = initLeague(() => 0.42);
    const games = league.schedule[0].map(game => simGame(game, league.teams, () => 0.42));
    league.schedule[0] = games;
    const played = ownGame(league, 1);
    expect(readNflSettledWeek(league, 1)).toEqual(games);
    expect(readNflSettledWeek(league, 2)).toEqual([]);
    expect(readNflGameRatings(played, team)).toBeNull();
    league.ratingReview = { week: 2, team, changes: [['Simulated mover', 1]] };
    expect(settleNflWeekResults(league, games, team)).toBe(games);
    played.ratingChanges = { team: played.home === team ? played.away : played.home, changes: [] };
    expect(readNflGameRatings(played, team)).toBeNull();
    played.ratingChanges = { team, changes: [['', 1]] };
    expect(readNflGameRatings(played, team)).toBeNull();
    const upcoming = ownGame(league, 2);
    upcoming.ratingChanges = { team, changes: [] };
    expect(readNflGameRatings(upcoming, team)).toBeNull();
    expect(readNflSettledWeek(league, 1)).toEqual(games);
  });
});
