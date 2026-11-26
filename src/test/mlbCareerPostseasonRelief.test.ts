import { describe, expect, it } from 'vitest';
import { keyedRng } from '@/lib/keyedRng';
import { MLB_ARCHETYPES, simMlbSeason, startMlbCareer } from '@/lib/mlbMyCareer';
import { mlbSeasonReview } from '@/lib/usCareerSeasonReview';
import { prepareUsCareerProgramme, restoreUsCareerProgramme, saveUsCareerProgramme, settleUsCareerProgramme, usProgrammeDefaults } from '@/lib/usCareerProgramme';

function october(year: number, seed: number, book = false, health = 100, quality = 92, push = false) {
  const rng = keyedRng('relief-postseason-' + seed);
  const original = startMlbCareer('October ' + seed, 'RP', MLB_ARCHETYPES.RP[0], rng, undefined, year < 2026 ? 'y2004' : 'now');
  Object.assign(original, { year, team: 'DET', ovr: 85, pot: 92, health, age: 27, role: 'starter', contractYears: 2 });
  delete original.rival;
  const c = saveUsCareerProgramme(original, 'mlb', book || push ? { ...usProgrammeDefaults(), tactics: book ? 'extra-relief' : 'normal', workload: push ? 'push' : 'normal' } : null);
  const prep = prepareUsCareerProgramme(c, 'mlb');
  let draws = 0;
  const { line, notes } = simMlbSeason(c, quality, () => { draws++; return rng(); }, true, prep);
  restoreUsCareerProgramme(c, prep);
  const receipt = settleUsCareerProgramme(c, line, 'mlb', prep);
  return { c, line, notes, receipt, prep, draws, next: rng() };
}

describe('MLB relief pitching in October', () => {
  it.each([
    [2026, 3, 62, 13, 5, '5 appearances, 3.21 ERA, 7 K', 24],
    [2020, 2, 23, 6, 3, '3 appearances, 4.50 ERA, 4 K', 23],
    [2016, 0, 68, 1, 0, 'No pitching appearances', 22],
    [2016, 1, 66, 1, 1, '1 appearance, 4.92 ERA, 1 K', 22],
  ] as const)('keeps the team run and saves the personal pitching line in %i, seed %i', (year, seed, games, poGames, poAppearances, poLine, draws) => {
    const result = october(year, seed);
    expect(result.line).toMatchObject({ games, poGames, poAppearances, poLine });
    expect(result.draws).toBe(draws);
    const log = mlbSeasonReview(JSON.parse(JSON.stringify(result.line)), 'RP').postseason;
    expect(log.find(s => s.label === 'Appearances')?.value).toBe(String(poAppearances));
    expect(log.find(s => s.label === 'Team postseason games')?.value).toBe(String(poGames));
    if (poAppearances === 0) {
      expect(log.map(s => s.label)).toEqual(['Team postseason games', 'Appearances']);
      expect(result.line.poEra).toBeUndefined();
      expect(result.line.poStrikeouts).toBeUndefined();
    } else {
      expect(log.find(s => s.label === 'ERA')?.value).toBe(result.line.poEra!.toFixed(2));
      expect(log.find(s => s.label === 'Strikeouts')?.value).toBe(String(result.line.poStrikeouts));
    }
  });

  it('can pitch an extra playoff game, then pays once when the season settles', () => {
    const usual = october(2026, 3);
    const extra = october(2026, 3, true);
    expect(extra.line).toMatchObject({ poAppearances: 6, poExtraRelief: true, poGames: 13, games: 62, teamResult: usual.line.teamResult });
    expect(extra.line.poStrikeouts).toBeGreaterThan(usual.line.poStrikeouts!);
    expect(extra.line.awards).toEqual(usual.line.awards);
    expect([extra.draws, extra.next]).toEqual([usual.draws, usual.next]);
    expect(extra.c.health).toBe(usual.c.health - 3);
    expect(extra.receipt?.decisions).toEqual([{ section: 'tactics', label: 'Take one extra playoff outing', outcome: 'completed', actual: 1, unit: 'extra playoff appearance' }]);
    const saved = JSON.stringify(extra.c);
    expect(settleUsCareerProgramme(extra.c, extra.line, 'mlb', extra.prep)).toBeNull();
    expect(JSON.stringify(extra.c)).toBe(saved);
  });

  it('waives the cost when the pitcher has no health to spend or already played every team game', () => {
    for (const [year, seed, health] of [[2026, 3, 2], [2016, 1, 100]]) {
      const usual = october(year, seed, false, health);
      const extra = october(year, seed, true, health);
      expect(extra.line).toEqual(usual.line);
      expect(extra.c.health).toBe(usual.c.health);
      expect(extra.receipt?.decisions[0].outcome).toBe('unused');
      expect(extra.next).toBe(usual.next);
    }
  });

  it('preserves a historical pitching summary without assigning missing appearances', () => {
    const { line } = october(2016, 0);
    const previous = { ...line, poAppearances: undefined, poLine: '1 appearance, 3.89 ERA, 1 K' };
    const saved = JSON.stringify(previous);
    const log = mlbSeasonReview(previous, 'RP').postseason;
    expect(log).toContainEqual({ label: 'Performance', value: previous.poLine });
    expect(log.some(s => s.label === 'Appearances')).toBe(false);
    expect(JSON.stringify(previous)).toBe(saved);
  });

  it('cannot pay for an extra outing with the temporary health restored after training', () => {
    const usual = october(2016, 2, false, 3, 92, true);
    const extra = october(2016, 2, true, 3, 92, true);
    expect(usual.prep?.healthDelta).toBe(-3);
    expect(usual.line.poGames).toBeGreaterThan(0);
    expect(usual.c.health).toBe(0);
    expect(extra.line).toEqual(usual.line);
    expect(extra.c.health).toBe(0);
    expect(extra.receipt?.decisions.find(d => d.section === 'tactics')?.outcome).toBe('unused');
  });
});
