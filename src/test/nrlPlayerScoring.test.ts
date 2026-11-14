import { describe, expect, it } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { createNrlSeason, nrlBench, nrlInjuries, reduceNrlSeason, type NrlMatchResult } from '@/lib/nrlManager';
import { nrlArchivedScoringLeaders, nrlScorePoints, nrlScoringLeaders } from '@/lib/nrlPlayerScoring';

const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const open = (seed: number) => createNrlCareer('broncos', seed, 2026);
const ownMatch = (state: NrlCareerState) => state.season.results.find(match => match.homeId === 'broncos' || match.awayId === 'broncos')!;
const fields = ['tries', 'conversions', 'penalties', 'fieldGoals', 'longFieldGoals'] as const;
const strip = ({ playerScoring, ratingChanges, ...match }: NrlMatchResult) => match;

describe('NRL Manager player scoring', () => {
  it('credits all five scoring counters to actual match participants, including used reserves', () => {
    let creditedReserve = false;
    for (let seed = 1; seed <= 120; seed++) {
      const initial = open(seed);
      const state = advance(initial);
      const match = ownMatch(state);
      const report = match.playerScoring!;
      expect(report.starters).toHaveLength(13);
      expect(new Set(report.starters)).toEqual(new Set(Object.values(initial.season.lineup)));
      const participants = new Set([...report.starters, ...match.benchUsed!]);
      expect(report.lines.every(line => participants.has(line.playerId))).toBe(true);
      expect(report.lines.filter(line => line.conversions || line.penalties).every(line => line.playerId === report.kickerId)).toBe(true);
      if (report.lines.some(line => match.benchUsed!.includes(line.playerId))) creditedReserve = true;
      for (const field of fields) {
        expect(report.lines.reduce((sum, line) => sum + line[field], 0)).toBe(match.homeScoring[field]);
      }
      expect(report.lines.reduce((sum, line) => sum + nrlScorePoints(line), 0)).toBe(match.homeScore);
      expect(state.season.results.filter(match => match.playerScoring)).toEqual([match]);
    }
    expect(creditedReserve).toBe(true);
  });

  it('changes credited kicks while preserving the entire simulated round and fitness', () => {
    const initial = open(4);
    const kickerId = initial.season.lineup.Fullback;
    expect(initial.season.kickerId).toBe(initial.season.lineup.Halfback);
    expect(reduceNrlCareer(initial, { type: 'setKicker', playerId: nrlBench(initial.season)[0] })).toBe(initial);
    const edited = reduceNrlCareer(initial, { type: 'setKicker', playerId: kickerId });
    expect(edited.season.kickerId).toBe(kickerId);
    expect(readNrlCareerSave(JSON.stringify(edited))).toEqual(edited);
    const before = advance(initial);
    const after = advance(edited);
    expect(after.season.results.map(strip)).toEqual(before.season.results.map(strip));
    expect(after.season.squad).toEqual(before.season.squad);
    expect(after.finance).toEqual(before.finance);
    const report = ownMatch(after).playerScoring!;
    expect(report.kickerId).toBe(kickerId);
    expect(report.lines.find(line => line.playerId === kickerId)?.conversions).toBeGreaterThan(0);
    expect(report.lines.filter(line => line.playerId !== kickerId).every(line => line.conversions === 0 && line.penalties === 0)).toBe(true);
    expect(advance(edited)).toEqual(after);
  });

  it('keeps the match credit after injury and uses a fit starting kicker next', () => {
    const state = open(4);
    const kicker = state.season.lineup.Fullback;
    const named = reduceNrlCareer(state, { type: 'setKicker', playerId: kicker });
    const after = advance(named);
    const match = ownMatch(after);
    expect(match.injury?.playerId).toBe(kicker);
    expect(match.playerScoring?.kickerId).toBe(kicker);
    expect(nrlInjuries(after.season).has(kicker)).toBe(true);
    expect(after.season.kickerId).toBe(after.season.lineup.Halfback);
    expect(reduceNrlCareer(after, { type: 'setKicker', playerId: kicker })).toBe(after);
    expect(readNrlCareerSave(JSON.stringify(after))).toEqual(after);
  });

  it('retains compact season totals by player and clears only the live match receipts on rollover', () => {
    let state = open(4);
    while (state.season.phase !== 'complete') state = advance(state);
    const leaders = nrlScoringLeaders(state.season);
    expect(leaders.length).toBeGreaterThan(0);
    const history = state.history[0].scoring!;
    expect(nrlArchivedScoringLeaders(history)).toEqual(leaders);
    const next = reduceNrlCareer(state, { type: 'startNextSeason' });
    expect(next.season.results).toEqual([]);
    expect(nrlScoringLeaders(next.season)).toEqual([]);
    expect(next.history[0].scoring).toEqual(history);
    expect(readNrlCareerSave(JSON.stringify(next))?.history[0].scoring).toEqual(history);
  });

  it('opens old saves without inventing a scorer and begins tracking after rollover', () => {
    const { kickerId, ...oldSeason } = open(4).season;
    const old = readNrlCareerSave(JSON.stringify({ ...open(4), season: oldSeason }))!;
    const restored = advance(old);
    expect(restored.season.results.every(match => !match.playerScoring)).toBe(true);
    expect(restored.season.results).toEqual(advance(open(4)).season.results.map(strip));
    const v1 = createNrlSeason('broncos', 4);
    expect(advance(readNrlCareerSave(JSON.stringify(v1))!).season.results).toEqual(reduceNrlSeason(v1, { type: 'advance' }).results);
    let finished = restored;
    while (finished.season.phase !== 'complete') finished = advance(finished);
    expect(finished.history[0].scoring).toBeUndefined();
    expect(reduceNrlCareer(finished, { type: 'startNextSeason' }).season.kickerId).toBeTruthy();
  });

  it('rejects forged counts or a scorer who did not take part', () => {
    const initial = open(4);
    const state = advance(initial);
    const match = ownMatch(state);
    const report = match.playerScoring!;
    const unused = nrlBench(initial.season).find(id => !match.benchUsed!.includes(id))!;
    const first = report.lines[0];
    const save = (line: typeof first) => readNrlCareerSave(JSON.stringify({
      ...state, season: { ...state.season, results: state.season.results.map(result => result === match
        ? { ...match, playerScoring: { ...report, lines: [line, ...report.lines.slice(1)] } } : result) },
    }));
    expect(save({ ...first, tries: first.tries + 1 })).toBeNull();
    expect(save({ ...first, playerId: unused })).toBeNull();
  });
});
