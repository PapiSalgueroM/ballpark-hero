import { describe, expect, it } from 'vitest';
import { keyedRng } from '@/lib/keyedRng';
import { CHANGEUP_REPS, changeupExperience, pitchChangeups } from '@/lib/mlbChangeup';
import { MLB_ARCHETYPES, simMlbSeason, startMlbCareer, type MlbCareerPos } from '@/lib/mlbMyCareer';
import { mlbSeasonReview } from '@/lib/usCareerSeasonReview';
import { prepareUsCareerProgramme, restoreUsCareerProgramme, saveUsCareerProgramme, settleUsCareerProgramme, usProgrammeDefaults, usProgrammeMenus } from '@/lib/usCareerProgramme';

function pitcher(pos: MlbCareerPos, year: number, seed: number) {
  const c = startMlbCareer('Pitcher ' + seed, pos, MLB_ARCHETYPES[pos][0], keyedRng('draft ' + seed), undefined, year < 2026 ? 'y2004' : 'now');
  Object.assign(c, { year, team: 'DET', ovr: 84, pot: 93, health: 92, contractYears: 3, role: 'starter' });
  delete c.rival;
  return c;
}
function play(pos: MlbCareerPos, year: number, seed: number, feature: boolean) {
  const c = saveUsCareerProgramme(pitcher(pos, year, seed), 'mlb', feature ? { ...usProgrammeDefaults(), tactics: 'two-strike-changeup' } : null);
  const rng = keyedRng('match ' + seed);
  const prep = prepareUsCareerProgramme(c, 'mlb');
  const { line } = simMlbSeason(c, 78, rng, true, prep);
  restoreUsCareerProgramme(c, prep);
  const receipt = settleUsCareerProgramme(c, line, 'mlb', prep);
  return { c, line, receipt, prep, next: rng() };
}

describe('MLB two-strike changeup', () => {
  it.each([['SP', 2026], ['RP', 2026], ['SP', 2020], ['RP', 2020]] as const)('records actual %s outings and charges the exact trade in %i', (pos, year) => {
    let strikeouts = 0, walks = 0, fatigue = 0;
    for (let n = 0; n < 40; n++) {
      const usual = play(pos, year, n, false), trained = play(pos, year, n, true);
      const p = trained.line.changeup!;
      expect(usual.line.changeup).toBeUndefined();
      expect(p.faced).toBe(usual.line.games);
      expect(p.strikeouts + p.walks).toBeLessThanOrEqual(p.faced);
      expect(trained.line.so).toBe(usual.line.so! + p.strikeouts);
      expect(trained.line.era).toBe(usual.line.era);
      expect(trained.next).toBe(usual.next);
      expect(p.fatigue).toBe(Math.min(3, Math.floor(p.walks / 3)));
      expect(trained.c.health).toBe(usual.c.health - p.fatigue!);
      expect(trained.receipt?.decisions[0]).toMatchObject({ actual: p.strikeouts, outcome: 'completed' });
      const held = JSON.stringify(trained.c);
      settleUsCareerProgramme(trained.c, trained.line, 'mlb', trained.prep);
      expect(JSON.stringify(trained.c)).toBe(held);
      strikeouts += p.strikeouts; walks += p.walks; fatigue += p.fatigue!;
    }
    expect(strikeouts).toBeGreaterThan(0);
    expect(walks).toBeGreaterThan(0);
    expect(fatigue).toBeGreaterThan(0);
  });

  it('carries earned command across clubs and time off without crediting unrelated old seasons', () => {
    let gained = 0, avoided = 0;
    for (let n = 0; n < 100; n++) {
      const c = pitcher('RP', 2027, n);
      const history = [{ games: 24, changeup: pitchChangeups(c, 24, 80) }, { games: 57 }];
      expect(changeupExperience(history)).toBe(24);
      const atNewClub = { ...c, team: 'SEA', year: 2030 };
      const fresh = pitchChangeups(atNewClub, 20, 80);
      const practiced = pitchChangeups({ ...atNewClub, seasons: JSON.parse(JSON.stringify(history)) }, 20, 80);
      expect(practiced.experienceBefore).toBe(24);
      expect(practiced.strikeouts).toBeGreaterThanOrEqual(fresh.strikeouts);
      expect(practiced.walks).toBeLessThanOrEqual(fresh.walks);
      gained += practiced.strikeouts - fresh.strikeouts;
      avoided += fresh.walks - practiced.walks;
      expect(changeupExperience([...history, { games: 20, changeup: practiced }])).toBe(CHANGEUP_REPS);
      expect(changeupExperience([{ ...history[0], games: 1 }])).toBe(0);
    }
    expect(gained).toBeGreaterThan(75);
    expect(avoided).toBeGreaterThan(50);
  });

  it('offers the choice only to an eligible pitcher and reports only recorded pitching outcomes', () => {
    const arm = pitcher('SP', 2026, 0);
    const offered = (c: typeof arm) => usProgrammeMenus(c, 'mlb').some(m => m.options.some(o => o.id === 'two-strike-changeup'));
    expect(offered(arm)).toBe(true);
    for (const c of [{ ...arm, pos: 'C' as const }, { ...arm, contractYears: 0 }, { ...arm, retired: true }, { ...arm, suspendedSeasons: 1 }]) expect(offered(c)).toBe(false);
    const usual = play('SP', 2026, 0, false).line, trained = play('SP', 2026, 0, true).line;
    expect(mlbSeasonReview(usual, 'SP').regular.some(s => /changeup/i.test(s.label))).toBe(false);
    expect(mlbSeasonReview(trained, 'C').regular.some(s => /changeup/i.test(s.label))).toBe(false);
    expect(mlbSeasonReview(JSON.parse(JSON.stringify(trained)), 'SP').regular).toContainEqual(expect.objectContaining({
      label: 'Extra changeup strikeouts', value: String(trained.changeup!.strikeouts),
    }));
    expect(mlbSeasonReview(trained, 'SP').regular).toContainEqual(expect.objectContaining({
      label: 'Changeup development', value: `0 to ${Math.min(CHANGEUP_REPS, trained.games)} of 40 outings`,
    }));
  });

  it('ignores a saved call from another season or club without shifting the season draw', () => {
    for (const stale of [{ year: 2025 }, { team: 'SEA' }]) {
      const c = saveUsCareerProgramme(pitcher('SP', 2026, 3), 'mlb', { ...usProgrammeDefaults(), tactics: 'two-strike-changeup' });
      const prep = prepareUsCareerProgramme(c, 'mlb')!;
      const rng = keyedRng('match 3');
      const { line } = simMlbSeason(c, 78, rng, true, { ...prep, plan: { ...prep.plan, ...stale } });
      const usual = play('SP', 2026, 3, false);
      expect(line).toEqual(usual.line);
      expect(rng()).toBe(usual.next);
    }
  });
});
