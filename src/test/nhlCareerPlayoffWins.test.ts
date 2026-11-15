import { describe, expect, it } from 'vitest';
import { keyedRng } from '@/lib/keyedRng';
import { NHL_ARCHETYPES, simNhlSeason, startNhlCareer } from '@/lib/nhlMyCareer';
import { nhlSeasonReview } from '@/lib/usCareerSeasonReview';

function playGoalie(seed: number, ovr: number) {
  const rng = keyedRng('nhl-playoffs-pr' + seed);
  const career = startNhlCareer('Fixture Goaltender', 'G', NHL_ARCHETYPES.G[0], rng, null as never, 'now');
  Object.assign(career, { team: 'TOR', ovr, pot: 99, health: 97, age: 26 });
  delete career.rival;
  return simNhlSeason(career, 94, rng, true);
}

describe('NHL My Career postseason goalie wins', () => {
  it.each([
    [2, 75, 'Lost in Round 1', 5, 1],
    [0, 90, 'Lost in Round 2', 9, 5],
    [63, 90, 'Lost the Conference Final', 19, 11],
    [37, 75, 'Lost the Cup Final', 25, 15],
  ] as const)('fits the goalie wins to the actual result and games for seed %i at overall %i', (seed, ovr, teamResult, poGames, poWins) => {
    const { line, notes } = playGoalie(seed, ovr);
    expect(line).toMatchObject({ teamResult, poGames, poWins });
    expect(notes).toContain(`📊 Playoffs: ${poGames} games, ${poWins} wins, ${line.poSvpct!.toFixed(3)} SV%.`);
    expect(nhlSeasonReview(line, 'G').postseason).toContainEqual(expect.objectContaining({ label: 'Wins', value: String(poWins) }));
  });

  it('keeps the recorded number in Career Log for an older result', () => {
    const legacy = { ...playGoalie(2, 75).line, poWins: 2 };
    const bytes = JSON.stringify(legacy);
    expect(nhlSeasonReview(legacy, 'G').postseason).toContainEqual(expect.objectContaining({ label: 'Wins', value: '2' }));
    expect(JSON.stringify(legacy)).toBe(bytes);
  });
});
