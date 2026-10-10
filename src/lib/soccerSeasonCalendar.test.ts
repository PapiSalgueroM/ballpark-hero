import { describe, expect, it } from 'vitest';
import { cupCalendar, nextCupGame, visibleCupGames } from '@/lib/soccerSeasonCalendar';
import type { SavedSeasonCompetition } from './soccerSeasonCompetitions';
const domestic: SavedSeasonCompetition = { id: 'domestic', name: 'Saved cup', result: 'Winners', matches: [
  { round: 'Early rounds', opponent: null, goalsFor: null, goalsAgainst: null, result: 'Through' },
  { round: 'Quarter-final', opponent: 'Saved opponent A', goalsFor: 2, goalsAgainst: 1, home: true, result: 'Through' },
  { round: 'Semi-final', opponent: 'Saved opponent B', goalsFor: 1, goalsAgainst: 0, result: 'Through' },
  { round: 'Final', opponent: 'Saved opponent C', goalsFor: 1, goalsAgainst: 1, result: 'Winners', note: '5-4 on penalties' },
] };
describe('saved cups between league games', () => {
  it('puts the first domestic entry after five league games without inventing early matches', () => {
    const calendar = cupCalendar([domestic], 38);
    expect(calendar[0].afterLeague).toBe(5); expect(calendar[0].match.opponent).toBeNull(); expect(calendar[0].match.goalsFor).toBeNull();
    expect(nextCupGame(calendar, 4, new Set())).toBeNull(); expect(nextCupGame(calendar, 5, new Set())?.id).toBe('domestic:0');
  });
  it('reveals the next actual saved opponent after the preceding result only', () => {
    const calendar = cupCalendar([domestic], 38), seen = new Set<string>();
    expect(visibleCupGames(calendar, seen).map(game => game.match.opponent)).toEqual([null]);
    seen.add('domestic:0'); expect(visibleCupGames(calendar, seen).map(game => game.match.opponent)).toEqual([null, 'Saved opponent A']);
    expect(nextCupGame(calendar, 38, seen)?.match.opponent).toBe('Saved opponent A');
  });
  it('a saved elimination creates no later cup fixtures', () => {
    const lost = { ...domestic, result: 'Knocked out', matches: domestic.matches.map((match, index) => index === 1 ? { ...match, goalsFor: 0, goalsAgainst: 1, result: 'Out' } : match) };
    expect(cupCalendar([lost], 38).map(game => game.id)).toEqual(['domestic:0', 'domestic:1']);
  });
  it('a first-leg loss still keeps the second leg and its deciding aggregate', () => {
    const competition: SavedSeasonCompetition = { id: 'club', name: 'Saved club cup', result: 'Quarter-final', matches: [
      { round: 'Round of 16, leg 1', opponent: 'Saved opponent', goalsFor: 0, goalsAgainst: 1, home: false },
      { round: 'Round of 16, leg 2', opponent: 'Saved opponent', goalsFor: 2, goalsAgainst: 0, home: true, result: 'Through', note: '2-1 on aggregate' },
      { round: 'Quarter-final, leg 1', opponent: 'Next opponent', goalsFor: 0, goalsAgainst: 0, home: true },
    ] };
    const calendar = cupCalendar([competition], 38);
    expect(calendar).toHaveLength(3); expect(nextCupGame(calendar, 38, new Set(['club:0']))?.match.note).toBe('2-1 on aggregate');
  });
  it('a group loss keeps later recorded group games', () => {
    const group: SavedSeasonCompetition = { id: 'club', name: 'Saved club cup', result: 'Group stage', matches: [
      { round: 'Group stage, game 1', opponent: 'Saved A', goalsFor: 0, goalsAgainst: 2 }, { round: 'Group stage, game 2', opponent: 'Saved B', goalsFor: 1, goalsAgainst: 0 },
    ] };
    expect(cupCalendar([group], 38)).toHaveLength(2);
  });
  it('a second saved group stage follows the first even when game numbers restart', () => {
    const group: SavedSeasonCompetition = { id: 'club', name: 'Saved club cup', result: 'Group stage', matches: [
      ...Array.from({ length: 6 }, (_, index) => ({ round: `Group stage, game ${index + 1}`, opponent: 'Saved A', goalsFor: 1, goalsAgainst: 0 })),
      ...Array.from({ length: 6 }, (_, index) => ({ round: `Second group stage, game ${index + 1}`, opponent: 'Saved B', goalsFor: 1, goalsAgainst: 0 })),
    ] };
    const games = cupCalendar([group], 38);
    expect(games[6].afterLeague).toBeGreaterThan(games[5].afterLeague); expect(games[11].afterLeague).toBeLessThan(23);
  });
  it('copies every recorded score, venue, personal goal and penalty note without changing input', () => {
    const before = structuredClone(domestic), calendar = cupCalendar([domestic], 38);
    expect(calendar.map(game => game.match)).toEqual(domestic.matches); expect(domestic).toEqual(before);
    calendar[1].match.goalsFor = 9; expect(domestic.matches[1].goalsFor).toBe(2);
  });
  it('keeps two competitions separate and ordered between actual league rounds', () => {
    const club: SavedSeasonCompetition = { id: 'club', name: 'Saved club cup', result: 'Group stage', matches: [{ round: 'Group stage, game 1', opponent: 'Saved A', goalsFor: 0, goalsAgainst: 1 }] };
    expect(cupCalendar([domestic, club], 38).map(game => game.id)).toEqual(['club:0', 'domestic:0', 'domestic:1', 'domestic:2', 'domestic:3']);
  });
  it.each([0, -1, NaN, 1.5, Number.MAX_SAFE_INTEGER + 1])('refuses an invalid league frame %s', games => { expect(cupCalendar([domestic], games)).toEqual([]); });
  it('old winners without saved matches do not gain invented fixtures', () => { expect(cupCalendar([{ ...domestic, matches: [] }], 38)).toEqual([]); });
  it('invalid score or venue data cannot enter a played calendar', () => { expect(cupCalendar([{ ...domestic, matches: [{ ...domestic.matches[1], goalsFor: -1 }] }], 38)).toEqual([]); });
  it('short result-only seasons still place each kept game within the league frame', () => { expect(cupCalendar([domestic], 2).every(game => game.afterLeague >= 1 && game.afterLeague <= 2)).toBe(true); });
});
