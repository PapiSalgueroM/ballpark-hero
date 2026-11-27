import { describe, expect, it } from 'vitest';
import { keyedRng } from '@/lib/keyedRng';
import { nbaLateClockOptions, playNbaLateClock } from '@/lib/nbaLateClock';
import { NBA_CAREER_SPORT as sport } from '@/lib/nbaCareerSport';
import { nbaSeasonReview } from '@/lib/usCareerSeasonReview';
import { currentUsCareerProgramme, prepareUsCareerProgramme, restoreUsCareerProgramme, saveUsCareerProgramme, settleUsCareerProgramme, usProgrammeDefaults, usProgrammeMenus } from '@/lib/usCareerProgramme';

function player(era = 'now') {
  return sport.startCareer('Test Guard', 'PG', sport.create.archetypes.PG[0], keyedRng('late-clock draft'), null, era);
}
function play(career: ReturnType<typeof player>, read?: 'late-shot' | 'late-pass') {
  const c = structuredClone(career);
  const chosen = read ? saveUsCareerProgramme(c, 'nba', { ...usProgrammeDefaults(), tactics: read }) : c;
  const resumed = JSON.parse(JSON.stringify(chosen)) as typeof chosen;
  const prep = prepareUsCareerProgramme(resumed, 'nba'), rng = keyedRng('same full season');
  const result = sport.simSeason(resumed, 80, rng, true, prep);
  restoreUsCareerProgramme(resumed, prep);
  sport.progress(resumed, rng, result.line.seasonRating);
  return { ...result, next: rng(), receipt: settleUsCareerProgramme(resumed, result.line, 'nba', prep), resumed };
}
describe('NBA late-clock reads', () => {
  it.each(['now', 'y2004'])('changes the actual regular season box score in both directions in %s', era => {
    const c = player(era), usual = play(c);
    const shot = play(c, 'late-shot'), pass = play(c, 'late-pass');
    expect(shot.line.ppg).toBeGreaterThan(usual.line.ppg);
    expect(shot.line.apg).toBeLessThan(usual.line.apg);
    expect(pass.line.ppg).toBeLessThan(usual.line.ppg);
    expect(pass.line.apg).toBeGreaterThan(usual.line.apg);
    const x = shot.line.lateClock!, y = pass.line.lateClock!;
    expect(x.possessions).toBe(y.possessions);
    expect(x.matching + y.matching).toBe(x.possessions);
    for (const result of [shot, pass]) {
      const { line, receipt } = result, r = line.lateClock!;
      const sign = r.read === 'late-shot' ? 1 : -1;
      expect(line.ppg).toBe(Math.round((usual.line.ppg + sign * 2 * r.baskets / line.games) * 10) / 10);
      expect(line.apg).toBe(Math.round((usual.line.apg - sign * r.baskets / line.games) * 10) / 10);
      expect(r.baskets).toBeLessThanOrEqual(r.matching);
      expect(line.clubWins).toBe(usual.line.clubWins);
      expect(line.poPpg).toBe(usual.line.poPpg);
      expect(line.games).toBe(usual.line.games);
      expect(result.next).toBe(usual.next);
      expect(receipt?.decisions[0]).toMatchObject({ outcome:'completed', actual:r.baskets });
      expect(JSON.stringify(nbaSeasonReview(JSON.parse(JSON.stringify(line))))).toContain('Late-clock');
      expect(currentUsCareerProgramme(result.resumed, 'nba')).toBeNull();
    }
    expect(usual.line.lateClock).toBeUndefined();
  });
  it('scouts the same schedule after reload and apportions the opportunities by minutes and appearances', () => {
    const c = player(), stat = { mpg: 40, ppg: 16, apg: 6 };
    const shot = playNbaLateClock(c, 'late-shot', 82, { ...stat });
    const pass = playNbaLateClock(JSON.parse(JSON.stringify(c)), 'late-pass', 82, { ...stat });
    expect(shot.coverage).toBe(pass.coverage);
    expect(nbaLateClockOptions(c).every(option => option.effect.includes(shot.coverage))).toBe(true);
    expect(shot.matching + pass.matching).toBe(82);
    expect(playNbaLateClock(c, 'late-shot', 82, { ...stat, mpg: 20 }).possessions).toBe(41);
    expect(playNbaLateClock(c, 'late-shot', 40, { ...stat }).possessions).toBe(40);
    const shortened = { ...stat };
    expect(playNbaLateClock(c, 'late-shot', 0, shortened)).toMatchObject({ possessions: 0, matching: 0, baskets: 0 });
    expect(shortened).toEqual(stat);
  });
  it('moves neither side of a basket when the scoring or assist limit is reached', () => {
    const c = player();
    for (const [read, ppg, apg] of [['late-shot', 38, 5], ['late-shot', 12, 0.3], ['late-pass', 1, 6], ['late-pass', 14, 13]] as const) {
      const stat = { mpg: 36, ppg, apg };
      const result = playNbaLateClock(c, read, 82, stat);
      expect(result.matching).toBeGreaterThan(0);
      expect(result.baskets).toBe(0);
      expect(stat).toEqual({ mpg: 36, ppg, apg });
    }
  });
  it('never books NBA sets in another sport or a suspended season', () => {
    const c = player(), options = usProgrammeMenus(c, 'nba').find(m => m.id === 'tactics')!.options;
    expect(options.filter(o => o.id === 'late-shot' || o.id === 'late-pass')).toHaveLength(2);
    const plan = { ...usProgrammeDefaults(), tactics: 'late-pass' as const };
    expect(saveUsCareerProgramme(c, 'nhl', plan)).toBe(c);
    const banned = { ...c, suspendedSeasons: 1 };
    expect(saveUsCareerProgramme(banned, 'nba', plan)).toBe(banned);
    const trained = saveUsCareerProgramme(c, 'nba', plan);
    expect(currentUsCareerProgramme({ ...trained, year: c.year+1 }, 'nba')).toBeNull();
    expect(currentUsCareerProgramme({ ...trained, team: c.team+'2' }, 'nba')).toBeNull();
  });
});
