import { expect, it } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { nrlHalftimeInterchanges, nrlMinute60Interchanges } from '@/lib/nrlManager';

function lineup(year: 2026 | 2027, clubId: string, seed: number) {
  let state = createNrlCareer(clubId, seed, year);
  const primary = state.season.lineup.Hooker, deputy = state.season.lineup.Lock;
  const roles = ['Lock', 'Fullback', 'Left Wing', 'Hooker'] as const;
  const reserves = roles.map(role => state.season.squad.find(player =>
    player.role === role && player.id !== state.season.lineup[role])!);
  state = reduceNrlCareer(state, { type: 'setKicker', playerId: primary });
  reserves.forEach(({ id }, slot) => { state = reduceNrlCareer(state, { type: 'selectBench', slot, playerId: id }); });
  state = reduceNrlCareer(state, { type: 'setOpenInterchange', year, clubId, round: 1, enabled: true });
  expect(state.season.openInterchange).toBe(true);
  const context = { year, round: 1, tactic: 'balanced' } as const;
  const nominate = (playerId: string | null) => reduceNrlCareer(state, { type: 'setBackupKicker', year, clubId, round: 1, playerId });
  return { context, primary, deputy, reserveId: reserves[3].id, nominate };
}

const start = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'startLive' });
const read = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));
const report = (state: NrlCareerState) => state.season.results.find(result => result.playerScoring)!;
const replaceResult = (state: NrlCareerState, original: ReturnType<typeof report>, change: Partial<ReturnType<typeof report>>) => ({
  ...state, season: { ...state.season, results: state.season.results.map(match => match === original ? { ...match, ...change } : match) },
});

it.each([[2026, 'broncos', 1], [2027, 'bears', 1]] as const)(
  'hands over the actual late place kicks in %i with the same first 60 minutes', (year, clubId, seed) => {
    const { context, primary, deputy, reserveId, nominate } = lineup(year, clubId, seed);
    const live = start(nominate(deputy));
    const at60 = reduceNrlCareer(live, { type: 'reachMinute60', ...context });
    expect(read(at60)).toEqual(at60);
    expect(nrlMinute60Interchanges(at60.season)).toContainEqual({ starterId: primary, reserveId, role: 'Hooker' });
    const play = { type: 'finishMinute60', ...context } as const;
    const ordinary = reduceNrlCareer(at60, play);
    const replaced = reduceNrlCareer(at60, { ...play, reserveId });
    const result = report(replaced), baseline = report(ordinary);
    expect(result.scorePeriods?.at60).toEqual(baseline.scorePeriods?.at60);
    expect(result.scorePeriods?.halfTime).toEqual(baseline.scorePeriods?.halfTime);
    expect(result.minute60Interchange).toEqual({ starterId: primary, reserveId });
    const atHome = result.homeId === clubId;
    const pause = at60.season.live!.minute60!;
    const before = atHome ? pause.homeScoring : pause.awayScoring, total = atHome ? result.homeScoring : result.awayScoring;
    const scoring = result.playerScoring!;
    expect(scoring.kickerHandoff).toEqual({ playerId: deputy, openingConversions: before.conversions, openingPenalties: before.penalties });
    const goals = (id: string) => {
      const line = scoring.lines.find(row => row.playerId === id);
      return [line?.conversions ?? 0, line?.penalties ?? 0];
    };
    expect(goals(primary)).toEqual([before.conversions, before.penalties]);
    expect(goals(deputy)).toEqual([total.conversions - before.conversions, total.penalties - before.penalties]);
    expect(goals(primary).reduce((sum, kicks) => sum + kicks)).toBe(1);
    expect(goals(deputy).reduce((sum, kicks) => sum + kicks)).toBe(1);
    expect(replaced.season.squad.find(player => player.id === primary)?.fitness)
      .toBe(ordinary.season.squad.find(player => player.id === primary)!.fitness + 4);
    expect(read(replaced)).toEqual(replaced);
    expect(read(replaceResult(replaced, result, { minute60Interchange: undefined }))).toBeNull();
    expect(read(replaceResult(replaced, result, { scorePeriods: { ...result.scorePeriods!, at60: undefined } }))).toBeNull();
    expect(read(replaceResult(replaced, result, { playerScoring: { ...scoring, kickerHandoff: undefined } }))).toBeNull();
  },
);

it('keeps the original kicker when the named backup is absent or has been interchanged', () => {
  const { context, primary, deputy, reserveId, nominate } = lineup(2026, 'broncos', 1);
  const play = { type: 'finishMinute60', ...context, reserveId } as const;
  for (const state of [nominate(null), reduceNrlCareer(nominate(deputy), {
    type: 'selectStarter', role: 'Lock', playerId: nominate(null).season.bench![0],
  })]) {
    const at60 = reduceNrlCareer(start(state), { type: 'reachMinute60', ...context });
    expect(nrlMinute60Interchanges(at60.season).some(row => row.starterId === primary)).toBe(false);
    expect(reduceNrlCareer(at60, play)).toBe(at60);
  }
  const live = start(nominate(deputy));
  const interchange = nrlHalftimeInterchanges(live.season).find(row => row.starterId === deputy)!;
  expect(interchange).toBeDefined();
  const at60 = reduceNrlCareer(live, { type: 'reachMinute60', ...context, interchange });
  expect(at60.season.live?.minute60?.interchange?.starterId).toBe(deputy);
  expect(nrlMinute60Interchanges(at60.season).some(row => row.starterId === primary)).toBe(false);
  expect(reduceNrlCareer(at60, play)).toBe(at60);
});
