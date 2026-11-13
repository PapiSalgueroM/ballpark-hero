import { describe, expect, it } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerAction, type NrlCareerState } from '@/lib/nrlCareer';
import { nrlHalftimeInterchanges, nrlNextRound } from '@/lib/nrlManager';
import { nrlScorePoints } from '@/lib/nrlPlayerScoring';

const start = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'startLive' });
const finish = (state: NrlCareerState, action: NrlCareerAction) => reduceNrlCareer(state, action);
const raw = JSON.stringify;

describe('NRL 60-minute tactical check', () => {
  it.each([[2026, 'broncos', 1], [2027, 'bears', 7]] as const)('keeps %s settlement exact if the half-time tactic is retained', (year, club, seed) => {
    const state = createNrlCareer(club, seed, year);
    const half = start(state);
    const [interchange, secondInterchange] = nrlHalftimeInterchanges(half.season);
    const choice = { year, round: 1, tactic: 'attack', talk: 'reinforceBasics', interchange, secondInterchange } as const;
    const direct = finish(half, { type: 'finishLive', ...choice });
    const live60 = finish(half, { type: 'reachMinute60', ...choice });
    expect(live60.season.live?.minute60).toBeDefined();
    expect(live60.season.round).toBe(1);
    expect(live60.season.results).toBe(half.season.results);
    expect(live60.players).toBe(half.players);
    expect(live60.finance).toBe(half.finance);
    expect(live60.history).toBe(half.history);
    expect(live60.season.live?.homeScoring).toEqual(half.season.live?.homeScoring);
    const restored = readNrlCareerSave(raw(live60))!;
    expect(raw(restored)).toBe(raw(live60));
    expect(finish(restored, { type: 'reachMinute60', ...choice })).toBe(restored);
    expect(finish(restored, { type: 'finishLive', ...choice })).toBe(restored);
    expect(finish(restored, { type: 'advance' })).toBe(restored);
    expect(finish(restored, { type: 'finishMinute60', year, round: 2, tactic: 'attack' })).toBe(restored);
    const kept = finish(restored, { type: 'finishMinute60', year, round: 1, tactic: 'attack' });
    expect(raw(kept)).toBe(raw(direct));
    expect(finish(kept, { type: 'finishMinute60', year, round: 1, tactic: 'defense' })).toBe(kept);
    const changed = finish(restored, { type: 'finishMinute60', year, round: 1, tactic: 'defense' });
    const result = changed.season.results.find(match => match.homeId === club || match.awayId === club)!;
    expect(result.minute60Tactic).toBe('defense');
    expect(result.halftimeTalk).toBe('reinforceBasics');
    expect(result.secondHalftimeInterchange).toBeDefined();
    expect(raw(readNrlCareerSave(raw(changed)))).toBe(raw(changed));
  });

  it.each([
    [2026, 'broncos', 1, [10, 6], [22, 8], [16, 8]],
    [2027, 'bears', 17, [24, 20], [38, 30], [34, 30]],
  ] as const)('holds the shown score and changes only the final stages with the %s home or away club', (year, club, seed, expected60, unchanged, adjusted) => {
    const half = start(createNrlCareer(club, seed, year));
    const state = finish(half, { type: 'reachMinute60', year, round: 1, tactic: 'balanced' });
    const live = state.season.live!;
    const mid = live.minute60!;
    expect([nrlScorePoints(mid.homeScoring), nrlScorePoints(mid.awayScoring)]).toEqual(expected60);
    const play = (tactic: 'balanced' | 'defense') => finish(state, { type: 'finishMinute60', year, round: 1, tactic });
    const kept = play('balanced');
    const changed = play('defense');
    const managed = (career: NrlCareerState) => career.season.results.find(result => result.homeId === club || result.awayId === club)!;
    expect([managed(kept).homeScore, managed(kept).awayScore]).toEqual(unchanged);
    expect([managed(changed).homeScore, managed(changed).awayScore]).toEqual(adjusted);
    expect(managed(changed).homeScoring.tries >= mid.homeScoring.tries).toBe(true);
    expect(managed(changed).awayScoring.tries >= mid.awayScoring.tries).toBe(true);
    const others = (career: NrlCareerState) => career.season.results.filter(result => result.homeId !== club && result.awayId !== club);
    expect(others(changed)).toEqual(others(kept));
    const forged = { ...state, season: { ...state.season, live: { ...live, minute60: {
      ...mid, homeScoring: { ...mid.homeScoring, tries: mid.homeScoring.tries + 1 },
    } } } };
    expect(readNrlCareerSave(raw(forged))).toBeNull();
  });

  it('uses the selected closing tactic after 60 minutes when a regular match reaches golden point', () => {
    const state = createNrlCareer('bears', 53, 2027);
    const half = start(state);
    const mid = finish(half, { type: 'reachMinute60', year: 2027, round: 1, tactic: 'balanced' });
    const adjusted = finish(mid, { type: 'finishMinute60', year: 2027, round: 1, tactic: 'attack' });
    const match = adjusted.season.results.find(result => result.awayId === 'bears')!;
    expect([match.homeScore, match.awayScore]).toEqual([32, 33]);
    expect(match.goldenPoint).toEqual({ period: 1, score: 'fieldGoals' });
    expect(readNrlCareerSave(raw(adjusted))).toEqual(adjusted);
  });

  it('leaves standings and finance unmodified until a staged finals match settles', () => {
    let before = createNrlCareer('broncos', 78);
    while (!nrlNextRound(before.season).clubMatch?.finalsRound) before = finish(before, { type: 'advance' });
    const half = start(before);
    const { year, round } = half.season;
    const staged = finish(half, { type: 'reachMinute60', year, round, tactic: 'balanced' });
    expect(staged.season.results).toBe(before.season.results);
    expect(staged.finance).toBe(before.finance);
    const full = finish(staged, { type: 'finishMinute60', year, round, tactic: 'attack' });
    const result = full.season.results.find(match => match.round === round && (match.homeId === 'broncos' || match.awayId === 'broncos'));
    expect(result?.finalsRound).toBe(1);
    expect(result?.minute60Tactic).toBe('attack');
    expect(result?.extraTime).toBe(true);
    expect([result?.homeScore, result?.awayScore]).toEqual([32, 34]);
    expect(full.finance.centralFunding).toBeGreaterThan(before.finance.centralFunding);
    expect(finish(full, { type: 'finishMinute60', year, round, tactic: 'attack' })).toBe(full);
  });
});
