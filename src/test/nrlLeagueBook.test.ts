import { describe, expect, it } from 'vitest';
import { createNrlCareer, nrlSeasonOut, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { nrlLeagueFixtures, nrlLeagueLeaders, nrlLeagueMatch } from '@/lib/nrlLeagueBook';
import { nrlScorePoints } from '@/lib/nrlPlayerScoring';

const year = 2026;
const round = 14;
const clubId = 'storm';
const destinationId = 'dragons';
const move = { type: 'acceptCaretakerJob', year, round, clubId, destinationId } as const;
const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const reload = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));

const withoutLeagueBook = ({ leagueBook, latestLeagueBook, leagueBookFromYear, ...state }: NrlCareerState): NrlCareerState => state;
const fields = ['tries', 'conversions', 'penalties', 'fieldGoals', 'longFieldGoals'] as const;

function reachVacancy(initial: NrlCareerState): NrlCareerState {
  let state = reduceNrlCareer(initial, { type: 'signSponsor', year, clubId, offer: 'twoSeason' });
  for (let index = 1; index < round; index++) state = advance(state);
  expect(state.season.round).toBe(round);
  expect(state.season.results).toHaveLength(98);
  return state;
}

function finish(initial: NrlCareerState): NrlCareerState {
  let state = initial;
  for (let index = 0; index < 36 && state.season.phase !== 'complete'; index++) state = advance(state);
  expect(state.season.phase).toBe('complete');
  return state;
}

describe('NRL league performances', () => {
  it('gives every played fixture a match book entry and preserves it across a midyear appointment', () => {
    const initial = createNrlCareer(clubId, 3, year, true);
    const before = reachVacancy(initial);
    expect(before.leagueBook).toMatchObject({ year });
    expect(before.leagueBook?.fixtures).toHaveLength(98);
    const moved = reduceNrlCareer(before, move);
    expect(moved.season.clubId).toBe(destinationId);
    expect(moved.leagueBook).toBe(before.leagueBook);
    const after = advance(moved);
    expect(after.leagueBook?.fixtures).toHaveLength(after.season.results.length);
    const rivalResult = after.season.results.find(match => match.round === round && match.homeId === clubId);
    expect(rivalResult).toMatchObject({ awayId: 'knights', homeScore: 50, awayScore: 8 });
    expect(rivalResult?.playerScoring).toBeUndefined();
    const rival = nrlLeagueMatch(after.leagueBook, round, clubId, 'knights')!;
    expect(rival.home.scoring).toEqual(rivalResult?.homeScoring);
    expect(rival.away.scoring).toEqual(rivalResult?.awayScoring);
    expect(rival.home.starters).toHaveLength(13);
    expect(rival.away.starters).toHaveLength(13);
    expect(rival.home.bench).toEqual([]);
    expect(rival.away.bench).toEqual([]);
    expect(rival.home.scorers.find(row => row.name === 'Arlo Hanley')).toMatchObject({ tries: 1, conversions: 7 });
    expect(rival.home.scorers.reduce((total, scorer) => total + nrlScorePoints(scorer), 0)).toBe(50);
    expect(rival.away.scorers.reduce((total, scorer) => total + nrlScorePoints(scorer), 0)).toBe(8);
    const managed = after.season.results.find(match => match.round === round && match.playerScoring)!;
    const sheet = nrlLeagueMatch(after.leagueBook, round, managed.homeId, managed.awayId)!;
    const selected = managed.homeId === destinationId ? sheet.home : sheet.away;
    expect(selected.starters.map(player => player.id)).toEqual(managed.playerScoring!.starters);
    expect(selected.bench.map(player => player.id)).toEqual(managed.benchUsed ?? []);
    expect(selected.scorers.map(({ name, ...scorer }) => scorer)).toEqual(managed.playerScoring!.lines);
    expect(reload(after)).toEqual(after);
    expect(JSON.stringify(withoutLeagueBook(after))).toEqual(JSON.stringify(advance(reduceNrlCareer(
      reachVacancy(withoutLeagueBook(initial)), move,
    ))));
  });

  it('retains the completed league book once and starts a clean active book next season', () => {
    const initial = createNrlCareer(clubId, 3, year, true);
    const moved = reduceNrlCareer(reachVacancy(initial), move);
    const finished = finish(moved);
    const control = finish(reduceNrlCareer(reachVacancy(withoutLeagueBook(initial)), move));
    expect(JSON.stringify(withoutLeagueBook(finished))).toEqual(JSON.stringify(control));
    expect(finished.leagueBook?.fixtures).toHaveLength(213);
    const leaders = nrlLeagueLeaders(finished.leagueBook);
    expect(leaders.reduce((total, player) => total + player.starts, 0)).toBe(213 * 26);
    for (const field of fields) {
      const points = finished.season.results.reduce((total, match) => total + match.homeScoring[field] + match.awayScoring[field], 0);
      expect(points).toBeGreaterThan(0);
      expect(leaders.reduce((total, player) => total + player[field], 0)).toBe(points);
    }
    const next = reduceNrlCareer(finished, { type: 'startNextSeason' });
    expect(next.season.year).toBe(2027);
    expect(next.leagueBook).toMatchObject({ year: 2027, fixtures: [] });
    expect(next.latestLeagueBook).toBe(finished.leagueBook);
    expect(reload(next)).toEqual(next);
    expect(JSON.stringify(finished.leagueBook).length).toBeLessThan(125_000);
    expect(nrlLeagueFixtures(next.latestLeagueBook).at(-1)).toMatchObject({ finalsRound: 4 });
  });

  it('rejects a different club’s starter, an invented bench use, miscredited scores and a truncated archive', () => {
    const moved = reduceNrlCareer(reachVacancy(createNrlCareer(clubId, 3, year, true)), move);
    const after = advance(moved);
    const index = after.leagueBook!.fixtures.findIndex(([at, home, away]) => at === round && home === clubId && away === 'knights');
    const wrongStarter = structuredClone(after);
    const wrong = wrongStarter.leagueBook!.fixtures[index];
    wrong[5][0][0] = wrong[6][0][0];
    expect(reload(wrongStarter)).toBeNull();
    const inventedReserve = structuredClone(after);
    const fixture = inventedReserve.leagueBook!.fixtures[index];
    fixture[5][1].push(inventedReserve.leagueBook!.players.findIndex(([, , club], player) =>
      club === clubId && !fixture[5][0].includes(player)));
    expect(reload(inventedReserve)).toBeNull();
    const missingTry = structuredClone(after);
    missingTry.leagueBook!.fixtures[index][5][3][0][1]--;
    expect(reload(missingTry)).toBeNull();
    const archived = reduceNrlCareer(finish(after), { type: 'startNextSeason' });
    const incomplete = structuredClone(archived);
    incomplete.latestLeagueBook!.fixtures.pop();
    expect(reload(incomplete)).toBeNull();
  });

  it('archives a fully simulated season out without adding managed appearances or changing its outcomes', () => {
    const complete = finish(createNrlCareer(clubId, 4, year));
    const leave = { type: 'leaveClub', year, clubId } as const;
    const sitOut = { type: 'simulateSeasonOut', year, clubId } as const;
    const departed = reduceNrlCareer(reduceNrlCareer(complete, leave), sitOut);
    const destinationId = nrlSeasonOut(departed)!.vacancies[0].clubId;
    const rejoin = { type: 'acceptVacancy', year, clubId, destinationId, joinYear: 2028 } as const;
    const next = reduceNrlCareer(departed, rejoin);
    expect(next.season.year).toBe(2028);
    expect(next.leagueBook?.fixtures).toEqual([]);
    expect(next.latestLeagueBook?.year).toBe(2027);
    expect(nrlLeagueFixtures(next.latestLeagueBook)).toHaveLength(225);
    expect(nrlLeagueLeaders(next.latestLeagueBook).every(player => player.starts === player.appearances)).toBe(true);
    expect(reload(next)).toEqual(next);
    expect(withoutLeagueBook(next)).toEqual(withoutLeagueBook(reduceNrlCareer(withoutLeagueBook(departed), rejoin)));
  });

  it('starts recording an older save when its next real season begins', () => {
    const initial = withoutLeagueBook(createNrlCareer(clubId, 3, year));
    expect(reload(initial)).toEqual(initial);
    const next = advance(initial);
    expect(next.season.round).toBe(2);
    expect(next.leagueBook).toBeUndefined();
    expect(reload(next)).toEqual(next);
    const rollover = reduceNrlCareer(finish(next), { type: 'startNextSeason' });
    expect(rollover.leagueBook).toMatchObject({ year: 2027, fixtures: [] });
    expect(rollover.leagueBookFromYear).toBe(2027);
    expect(rollover.latestLeagueBook).toBeUndefined();
    expect(reload(rollover)).toEqual(rollover);
    expect(reload({ ...rollover, leagueBookFromYear: undefined })).toBeNull();
    expect(reload({ ...rollover, leagueBookFromYear: 2028 })).toBeNull();
    const firstRound = advance(rollover);
    expect(firstRound.leagueBook?.fixtures).toHaveLength(firstRound.season.results.length);
    const archived = reduceNrlCareer(finish(firstRound), { type: 'startNextSeason' });
    expect(archived.leagueBookFromYear).toBe(2027);
    expect(archived.leagueBook).toMatchObject({ year: 2028, fixtures: [] });
    expect(archived.latestLeagueBook).toMatchObject({ year: 2027 });
    expect(nrlLeagueFixtures(archived.latestLeagueBook)).toHaveLength(225);
    expect(reload(archived)).toEqual(archived);
  });
});
