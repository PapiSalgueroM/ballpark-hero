import { describe, expect, it } from 'vitest';
import { mulberry32 } from '@/lib/leagueCore';
import {
  MLB_ARCHETYPES, mlbLineOnSlate, mlbStatLineFor, simMlbSeason, startMlbCareer,
  type MlbSeasonLine,
} from '@/lib/mlbMyCareer';

describe('MLB My Career relief appearances', () => {
  it('fits a short closer season into the appearances actually played', () => {
    const c = startMlbCareer('Relief Fixture', 'RP', MLB_ARCHETYPES.RP[0], () => 0.5);
    Object.assign(c, { year: 2038, team: 'KCR', age: 33, ovr: 88, morale: 95, health: 80, role: 'starter' });
    const { line } = simMlbSeason(c, 80, mulberry32(561));

    expect(line).toMatchObject({ games: 35, wins: 5, lossesP: 2, saves: 27, holds: 3, era: 2.44, so: 65 });
  });

  it('fits a setup arm when wins plus holds exceed its workload', () => {
    const rng = () => 0.99;
    const line = mlbStatLineFor({ form: 110, pos: 'RP', kind: 'setup', games: 20 }, rng);

    expect(line).toMatchObject({ wins: 6, lossesP: 5, saves: 0, holds: 14 });
  });

  it('keeps the award draw in sequence when the corrected saves fall below the cutoff', () => {
    const c = startMlbCareer('Relief Fixture', 'RP', MLB_ARCHETYPES.RP[0], () => 0.5);
    Object.assign(c, { year: 2038, team: 'KCR', age: 33, ovr: 92, morale: 95, health: 60, role: 'starter' });
    delete c.rival;
    const rng = mulberry32(6);
    let draws = 0;
    const { line } = simMlbSeason(c, 80, () => { draws += 1; return rng(); });

    expect(line).toMatchObject({ games: 41, wins: 2, lossesP: 0, saves: 37, holds: 2 });
    expect(line.awards).not.toContain('Saves Leader');
    expect(draws).toBe(20);
  });

  it('keeps a feasible hold and loss overlap and checks shortened-season rounding', () => {
    const full: MlbSeasonLine = {
      year: 2020, team: 'KCR', age: 33, ovr: 88, games: 20, slate: 60, wins: 2, lossesP: 2,
      saves: 16, holds: 2, awards: [], teamResult: 'Missed October', salary: 15.3,
    };
    expect(mlbLineOnSlate(full, 162)).toEqual(full);

    const shortened = mlbLineOnSlate(full, 60);
    expect(shortened).toMatchObject({ games: 7, wins: 1, lossesP: 1, saves: 5, holds: 1 });
    expect(full).toMatchObject({ games: 20, wins: 2, lossesP: 2, saves: 16, holds: 2 });
  });

  it('preserves feasible relief, starting pitcher and batting stats', () => {
    const rng = () => 0.5;
    expect(mlbStatLineFor({ form: 85, pos: 'RP', kind: 'setup', games: 62 }, rng))
      .toEqual({ era: 3.4, so: 89, wins: 3, lossesP: 3, saves: 3, holds: 30 });
    expect(mlbStatLineFor({ form: 85, pos: 'SP', kind: 'flame', games: 32 }, rng))
      .toEqual({ era: 4.28, wins: 16, lossesP: 6, so: 202 });
    expect(mlbStatLineFor({ form: 85, pos: '1B', kind: 'masher', games: 158 }, rng))
      .toEqual({ avg: 0.291, hr: 33, rbi: 99, sb: 2, doubles: 36, obp: 0.371 });
  });
});
