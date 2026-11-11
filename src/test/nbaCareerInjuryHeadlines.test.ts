import { describe, expect, it } from 'vitest';
import { nbaHeadlinesFor } from '@/lib/nbaCareerLoop';
import { NBA_ARCHETYPES, nbaProgress, simNbaSeason, startNbaCareer } from '@/lib/nbaMyCareer';

function play(year: number, injuryDraws: number[] = []) {
  const career = startNbaCareer('Jordan Fixture', 'PG', NBA_ARCHETYPES.PG[0], () => 0.5);
  Object.assign(career, { year, ovr: 81, role: 'starter', health: injuryDraws.length ? 50 : 100 });
  let draw = 0;
  const { line, notes } = simNbaSeason(career, 75, () => injuryDraws[draw++] ?? 0.99);
  nbaProgress(career, () => 0.99);
  const injuries = nbaHeadlinesFor(career, line).filter(headline => headline.startsWith('Injury cost'));
  return { line, notes, injuries };
}

describe('NBA My Career injury headlines', () => {
  it.each([[2011, 66], [2020, 72], [2026, 82]])(
    '%i: does not report an injury after playing all %i games',
    (year, games) => {
      const { line, injuries } = play(year);
      expect(line.games).toBe(games);
      expect(injuries).toEqual([]);
    },
  );

  it.each([[2011, 47, 19], [2020, 52, 20], [2026, 59, 23]])(
    'reports the games actually missed in %i',
    (year, games, missed) => {
      const { line, notes, injuries } = play(year, [0.01, 0.45]);
      expect(line.games).toBe(games);
      expect(notes).toContain('🚑 Missed ' + missed + ' games hurt.');
      expect(injuries).toEqual(['Injury cost Jordan Fixture ' + missed + ' games this season']);
    },
  );
});
