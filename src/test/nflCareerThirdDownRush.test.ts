import { describe, expect, it } from 'vitest';
import { keyedRng } from '@/lib/keyedRng';
import { ARCHETYPES, applyNflThirdDownRush, progress, simSeason, startCareer, type CareerPos } from '@/lib/nflMyCareer';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { deriveSeasonOrWhy, disagreements, soFar } from '@/lib/season/core';
import { NFL_SEASON } from '@/lib/season/nfl';
import { buildUsSeason, type UsRow } from '@/lib/season/us';
import { nflSeasonReview } from '@/lib/usCareerSeasonReview';
import { currentUsCareerProgramme, prepareUsCareerProgramme, restoreUsCareerProgramme, saveUsCareerProgramme, settleUsCareerProgramme, usProgrammeDefaults, usProgrammeMenus } from '@/lib/usCareerProgramme';

function makePlayer(pos: CareerPos, era = 'now') {
  const c = startCareer('Defender', pos, ARCHETYPES[pos][0], keyedRng('rush draft'), null, era);
  return { ...c, team: 'KC', role: 'starter' as const, ovr: 84, pot: 91, health: 99, contractYears: 1 };
}
const packageChoice = { ...usProgrammeDefaults(), tactics: 'third-down-rush' as const };
function play(c: ReturnType<typeof makePlayer>, take: boolean) {
  const saved = saveUsCareerProgramme(c, 'nfl', take ? packageChoice : usProgrammeDefaults());
  const loaded = JSON.parse(JSON.stringify(saved)) as typeof saved;
  let draws = 0;
  const rng = () => { draws++; return 0.78; };
  const prep = prepareUsCareerProgramme(loaded, 'nfl');
  const result = simSeason(loaded, 78, rng, true, prep);
  restoreUsCareerProgramme(loaded, prep);
  progress(loaded, rng, result.line.seasonRating);
  const receipt = settleUsCareerProgramme(loaded, result.line, 'nfl', prep);
  return { ...result, loaded, draws, receipt };
}
describe('NFL third-down rush package', () => {
  it.each([['LB', 'now'], ['EDGE', 'y2005']] as const)('reallocates actual tackles into third-down sack opportunities for a %s in %s', (pos, era) => {
    const c = makePlayer(pos, era);
    const usual = play(c, false), packageRun = play(c, true);
    const rush = packageRun.line.thirdDownRush;
    expect(rush).toBeDefined();
    expect(rush!.calls).toBe(Math.ceil(usual.line.games / 2));
    expect(rush!.sacks).toBeGreaterThan(0);
    expect(rush!.sacks).toBeLessThan(rush!.calls);
    expect(packageRun.line.sacks).toBe(usual.line.sacks! + rush!.sacks);
    expect(packageRun.line.tackles).toBe(usual.line.tackles! - rush!.calls + rush!.sacks);
    expect(packageRun.line.teamResult).toBe(usual.line.teamResult);
    expect(packageRun.line.poStats).toEqual(usual.line.poStats);
    expect(packageRun.draws).toBe(usual.draws);
    expect(packageRun.loaded.contractYears).toBe(0);
    expect(packageRun.receipt?.decisions[0]).toMatchObject({ outcome: 'completed', actual: rush!.sacks });
    expect(packageRun.loaded.programme).toBeUndefined();
    expect(nflSeasonReview(JSON.parse(JSON.stringify(packageRun.line)), pos).regular.map(s => s.label)).toContain('Third-down rush');
    expect(usual.line.thirdDownRush).toBeUndefined();
    if (era === 'now') {
      const row = packageRun.line as unknown as UsRow;
      const replay = buildUsSeason(NFL_SEASON, packageRun.loaded, row, NFL_CAREER_SPORT.teamLabelOf);
      if (replay.ok === false) throw new Error(replay.line);
      const season = deriveSeasonOrWhy(replay.sport, row, replay.ctx);
      if (typeof season === 'string') throw new Error(season);
      expect(disagreements(replay.sport, row, replay.ctx, season)).toEqual([]);
      expect(soFar(season, packageRun.line.games)).toMatchObject({ tackles: row.tackles, sacks: row.sacks });
    }
  });
  it('keeps existing sack tackles, caps new full sacks and never charges unused calls', () => {
    const capped = { games: 17, tackles: 80, sacks: 22.5 };
    expect(applyNflThirdDownRush(capped, 90, () => 0)).toEqual({ calls: 0, sacks: 0 });
    expect(capped).toEqual({ games: 17, tackles: 80, sacks: 22.5 });
    const thin = { games: 17, tackles: 9, sacks: 7.5 };
    expect(applyNflThirdDownRush(thin, 90, () => 1)).toEqual({ calls: 1, sacks: 0 });
    expect(thin).toEqual({ games: 17, tackles: 8, sacks: 7.5 });
    const nearlyCapped = { games: 17, tackles: 70, sacks: 21 };
    expect(applyNflThirdDownRush(nearlyCapped, 90, () => 0)).toEqual({ calls: 2, sacks: 2 });
    expect(nearlyCapped).toEqual({ games: 17, tackles: 70, sacks: 23 });
  });
  it('uses actual appearances and lets better form win the same rush', () => {
    const line = { games: 5, tackles: 40, sacks: 4.5 };
    expect(applyNflThirdDownRush({ ...line }, 64, () => 0.35)).toEqual({ calls: 3, sacks: 0 });
    expect(applyNflThirdDownRush({ ...line }, 90, () => 0.35)).toEqual({ calls: 3, sacks: 3 });
    expect(applyNflThirdDownRush({ ...line, games: 0 }, 90, () => 0)).toEqual({ calls: 0, sacks: 0 });
  });
  it('offers the new assignment only to the two NFL front-seven positions, and expires it across a year or team change', () => {
    const options = (pos: CareerPos) => usProgrammeMenus(makePlayer(pos), 'nfl').find(m => m.id === 'tactics')!.options.map(o => o.id);
    expect(options('LB')).toContain('third-down-rush');
    expect(options('EDGE')).toContain('third-down-rush');
    for (const pos of ['CB','QB','WR','RB','TE','K'] as const) expect(options(pos)).not.toContain('third-down-rush');
    const c = makePlayer('LB');
    expect(saveUsCareerProgramme(c,'mlb',packageChoice)).toBe(c);
    const plan = saveUsCareerProgramme(c,'nfl',packageChoice);
    expect(currentUsCareerProgramme({ ...plan, year: c.year+1 },'nfl')).toBeNull();
    expect(currentUsCareerProgramme({ ...plan, team: 'BUF' },'nfl')).toBeNull();
  });
});
