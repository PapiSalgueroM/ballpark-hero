import { describe, expect, it } from 'vitest';
import { ARCHETYPES, shouldRetire, simSeason, startCareer, teamLabelOf } from '@/lib/nflMyCareer';
import { deriveSeasonOrWhy } from '@/lib/season/core';
import { NFL_SEASON } from '@/lib/season/nfl';
import { buildUsSeason } from '@/lib/season/us';

function stream(seed: number) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function receiver() {
  const career = startCareer('Replay Receiver', 'TE', ARCHETYPES.TE[0], stream(137));
  return { ...career, age: 35, year: 2038, team: 'CHI', ovr: 65, morale: 20, role: 'starter' as const };
}

describe('NFL tight end receiving touchdowns', () => {
  it('saves a catchless season with no receiving touchdown and can show every game', () => {
    const career = receiver();
    expect(shouldRetire(career)).toBe(false);
    const rng = stream(2171);
    let draws = 0;
    const { line } = simSeason(career, 62, () => { draws++; return rng(); });

    expect(line).toMatchObject({ games: 17, rec: 0, recYds: 0, recTd: 0, teamResult: 'Missed the playoffs' });
    expect(draws).toBe(23);
    const row = { ...line };
    const built = buildUsSeason(NFL_SEASON, career, row, teamLabelOf);
    if (built.ok === false) throw new Error(built.line);
    const season = deriveSeasonOrWhy(built.sport, row, built.ctx);
    expect(typeof season === 'string' ? season : season.games.length).toBe(17);
  });

  it('keeps the same bound on the 16-game schedule and for a backup', () => {
    const historical = { ...receiver(), year: 2019, eraId: 'y2005' };
    const backup = { ...receiver(), role: 'backup' as const };
    expect(simSeason(historical, 62, stream(2171)).line).toMatchObject({ games: 16, rec: 0, recYds: 0, recTd: 0 });
    expect(simSeason(backup, 62, stream(5158)).line).toMatchObject({ games: 8, rec: 0, recYds: 0, recTd: 0 });
  });

  it('keeps an ordinary receiving line and the previous season intact', () => {
    const career = { ...receiver(), ovr: 85, morale: 70 };
    const previous = { ...simSeason({ ...receiver(), year: 2037 }, 62, stream(2171)).line, recTd: 1 };
    career.seasons.push(previous);
    const bytes = JSON.stringify(previous);
    const { line } = simSeason(career, 62, stream(2171));

    expect(line).toMatchObject({ games: 17, rec: 47, recYds: 523, recTd: 8 });
    expect(JSON.stringify(career.seasons[0])).toBe(bytes);
  });
});
