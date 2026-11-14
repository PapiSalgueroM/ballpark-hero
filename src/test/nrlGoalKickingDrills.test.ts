import { describe, expect, it } from 'vitest';
import { createNrlCareer, nrlOppositionReport, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { createNrlSeason, nrlNextRound, readNrlSave } from '@/lib/nrlManager';

const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const read = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));
const preparation = ({ season }: NrlCareerState) => ({
  type: 'prepare', choice: 'goalKickingDrills', year: season.year, clubId: season.clubId, round: season.round,
} as const);
const drills = (state: NrlCareerState) => reduceNrlCareer(state, preparation(state));

describe('NRL goal-kicking drills', () => {
  it.each([[2026, 'broncos', 16], [2027, 'bears', 1]] as const)(
    'uses the existing training workload and settles the same opening lineup in Quick or Live in %s', (year, clubId, seed) => {
      const initial = createNrlCareer(clubId, seed, year);
      const { round, tactic } = initial.season;
      const base = nrlOppositionReport(initial)!;
      const trained = reduceNrlCareer(initial, { type: 'prepare', choice: 'train' });
      const prepared = drills(initial);
      expect(prepared.season.preparation).toBe('goalKickingDrills');
      expect(read(prepared)).toEqual(prepared);
      const report = nrlOppositionReport(prepared)!;
      expect(report.attackEdge - base.attackEdge).toBeCloseTo(-0.72);
      expect(report.defenseEdge - base.defenseEdge).toBeCloseTo(-0.72);
      expect(nrlOppositionReport(trained)!.attackEdge - report.attackEdge).toBeCloseTo(7);
      const quick = advance(prepared);
      const trainedResult = advance(trained);
      expect(quick.season.preparation).toBeNull();
      expect(quick.season.squad.map(player => player.fitness)).toEqual(trainedResult.season.squad.map(player => player.fitness));
      const played = quick.season.results.find(match => match.playerScoring)!;
      expect(played.goalKickingDrills).toBe(true);
      expect(played.injury).toEqual(trainedResult.season.results.find(match => match.playerScoring)?.injury);
      expect(quick.season.results.filter(match => !match.playerScoring)).toEqual(advance(initial).season.results.filter(match => !match.playerScoring));

      const half = reduceNrlCareer(prepared, { type: 'startLive' });
      expect(half.season.live).toBeDefined();
      expect(read(half)).toEqual(half);
      expect(reduceNrlCareer(half, { ...preparation(half), choice: null })).toBe(half);
      const live = reduceNrlCareer(read(half)!, { type: 'finishLive', year, round, tactic });
      expect(live).toEqual(quick);
      expect(read(live)).toEqual(live);
      const minute60 = reduceNrlCareer(half, { type: 'reachMinute60', year, round, tactic });
      expect(minute60.season.live?.minute60).toBeDefined();
      expect(read(minute60)).toEqual(minute60);
      const closing = reduceNrlCareer(read(minute60)!, { type: 'finishMinute60', year, round, tactic });
      expect(read(closing)).toEqual(closing);
      const closedMatch = closing.season.results.find(match => match.playerScoring)!;
      expect(closedMatch.goalKickingDrills).toBe(true);
      expect(closedMatch.homeScoring).toEqual(played.homeScoring);
      expect(closedMatch.awayScoring).toEqual(played.awayScoring);
      expect(closedMatch.scorePeriods?.at60).toBeDefined();
      expect(closedMatch.scorePeriods?.halfTime).toEqual(played.scorePeriods?.halfTime);
  });

  it('fences the choice to the current playable fixture and leaves the original save bytes when cleared', () => {
    const initial = createNrlCareer('storm', 39);
    const prepared = drills(initial);
    const action = preparation(initial);
    expect(JSON.stringify(reduceNrlCareer(prepared, { ...action, choice: null }))).toBe(JSON.stringify(initial));
    const second = advance(initial);
    expect(reduceNrlCareer(second, action)).toBe(second);
    for (const stale of [{ ...action, clubId: 'broncos' }, { ...action, year: 2027 }]) {
      expect(reduceNrlCareer(initial, stale)).toBe(initial);
    }
    const bye = createNrlCareer('panthers', 16);
    expect(nrlNextRound(bye.season).clubStatus).toBe('bye');
    expect(drills(bye)).toBe(bye);
    expect(read({ ...bye, season: { ...bye.season, preparation: 'goalKickingDrills' } })).toBeNull();
    const legacy = createNrlSeason('storm', 39);
    expect(readNrlSave(JSON.stringify({ ...legacy, preparation: 'goalKickingDrills' }))).toBeNull();
    const imported = readNrlCareerSave(JSON.stringify(legacy))!;
    expect(drills(imported)).toBe(imported);
    expect(read({ ...imported, season: { ...imported.season, preparation: 'goalKickingDrills' } })).toBeNull();

    let finals = initial;
    while (finals.season.phase === 'regular') finals = advance(finals);
    expect(nrlNextRound(finals.season).clubMatch).toBeDefined();
    const final = drills(finals);
    expect(read(final)).toEqual(final);
    const played = advance(final);
    expect(played.season.results.find(match => match.round === final.season.round && match.playerScoring)?.goalKickingDrills).toBe(true);
    expect(read(played)).toEqual(played);
  });

  it('recognizes a receipt only for a managed match and only when drills were selected', () => {
    const initial = createNrlCareer('storm', 39);
    const plain = advance(initial);
    expect(plain.season.results.every(match => match.goalKickingDrills === undefined)).toBe(true);
    const completed = advance(drills(initial));
    const withReceipt = completed.season.results.findIndex(match => match.goalKickingDrills);
    expect(withReceipt).toBeGreaterThanOrEqual(0);
    const other = completed.season.results.findIndex(match => !match.playerScoring);
    const forged = (index: number, goalKickingDrills: boolean) => ({
      ...completed, season: { ...completed.season, results: completed.season.results.map((match, i) =>
        i === index ? { ...match, goalKickingDrills } : match) },
    });
    expect(readNrlCareerSave(JSON.stringify(forged(other, true)))).toBeNull();
    expect(readNrlCareerSave(JSON.stringify(forged(withReceipt, false)))).toBeNull();
  });
});
