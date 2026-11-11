import { describe, expect, it } from 'vitest';
import { mulberry32 } from './leagueCore';
import {
  NHL_ARCHETYPES, nhlAssignRole, nhlCampBattle, nhlRollTeamQuality, simNhlSeason, startNhlCareer,
} from './nhlMyCareer';

function playGoalieSeason(year: number, seed: number, veteran = false) {
  const draft = mulberry32(4);
  const c = startNhlCareer('Goalie Playoff Test', 'G', NHL_ARCHETYPES.G[0], draft, null, year === 2026 ? 'now' : 'y2006');
  c.year = year;
  if (veteran) Object.assign(c, { ovr: 95, pot: 97, age: 26 });
  const teamQuality = nhlRollTeamQuality(null, draft);
  nhlAssignRole(c, teamQuality, draft);
  const rng = mulberry32(seed);
  nhlCampBattle(c, teamQuality, rng);
  const { line, notes } = simNhlSeason(c, teamQuality, rng);
  return { c, line, notes };
}

describe('NHL career goalie playoff wins', () => {
  it.each([[2006, 82], [2012, 48], [2019, 70], [2020, 56], [2026, 84]])(
    'allows one goalie win in a five-game first-round exit in %i',
    (year, slate) => {
      const { c, line, notes } = playGoalieSeason(year, 2);
      expect(line.slate ?? 82).toBe(slate);
      expect(line).toMatchObject({ teamResult: 'Lost in Round 1', poGames: 5, poWins: 1, poSvpct: 0.919 });
      expect(c.seasons.at(-1)).toBe(line);
      expect(notes).toContain('📊 Playoffs: 5 games, 1 win, 0.919 SV%.');
    },
  );

  it.each([
    { seed: 2, teamResult: 'Lost in Round 2', poGames: 10, poWins: 6 },
    { seed: 35, teamResult: 'Lost in Round 2', poGames: 13, poWins: 7 },
    { seed: 42, teamResult: 'Lost the Conference Final', poGames: 18, poWins: 11 },
    { seed: 81, teamResult: 'Lost the Cup Final', poGames: 26, poWins: 15 },
    { seed: 15, teamResult: 'WON THE STANLEY CUP', poGames: 25, poWins: 16 },
  ])('keeps goalie wins within the run when the result is $teamResult over $poGames games', ({ seed, ...expected }) => {
    const { c, line } = playGoalieSeason(2026, seed, true);
    expect(line).toMatchObject(expected);
    expect(c.cups).toBe(expected.teamResult === 'WON THE STANLEY CUP' ? 1 : 0);
  });

  it('keeps a legal three goalie wins in a seven-game first-round exit', () => {
    const { line } = playGoalieSeason(2026, 106);
    expect(line).toMatchObject({ teamResult: 'Lost in Round 1', poGames: 7, poWins: 3, poSvpct: 0.903 });
  });
});
