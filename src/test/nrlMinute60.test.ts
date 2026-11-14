import { describe, expect, it } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerAction, type NrlCareerState } from '@/lib/nrlCareer';
import { nrlHalftimeInterchanges, nrlHoldableReserves, nrlNextRound } from '@/lib/nrlManager';
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
    expect(JSON.stringify(kept, (key, value) => key === 'at60' ? undefined : value)).toBe(raw(direct));
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

  it.each([
    [2026, 'broncos', 1, 'standard', 'balanced', 'middle', [10, 6], [22, 8], [16, 8]],
    [2027, 'bears', 16, 'counter', 'defense', 'wide', [18, 16], [24, 26], [24, 22]],
    [2026, 'broncos', 1, 'wide', 'balanced', 'standard', [10, 6], [28, 8], [22, 8]],
    [2027, 'bears', 2, 'standard', 'attack', 'counter', [12, 16], [16, 22], [16, 17]],
  ] as const)('holds the %i opening score and applies only the requested closing plan', (
    year, clubId, seed, opening, tactic, attackPlan, at60, original, changed,
  ) => {
    const before = createNrlCareer(clubId, seed, year);
    const kickoff = finish(before, { type: 'setAttackPlan', year, clubId, round: 1, attackPlan: opening });
    const half = start(kickoff);
    const mid = finish(half, { type: 'reachMinute60', year, round: 1, tactic: 'balanced' });
    const ordinary = { type: 'finishMinute60', year, round: 1, tactic } as const;
    const control = finish(mid, ordinary);
    const switched = finish(mid, { ...ordinary, attackPlan });
    const own = (career: NrlCareerState) => career.season.results.find(match => match.homeId === clubId || match.awayId === clubId)!;
    const oldMatch = own(control), newMatch = own(switched);
    expect([oldMatch.homeScore, oldMatch.awayScore]).toEqual(original);
    expect([newMatch.homeScore, newMatch.awayScore]).toEqual(changed);
    expect(newMatch.minute60AttackPlan).toBe(attackPlan);
    expect(newMatch.minute60Tactic).toBe(tactic === 'balanced' ? undefined : tactic);
    expect(newMatch.scorePeriods?.halfTime).toEqual(oldMatch.scorePeriods?.halfTime);
    expect(newMatch.scorePeriods?.at60).toEqual(at60);
    expect(oldMatch.scorePeriods?.at60).toEqual(at60);
    expect(switched.season.results.filter(match => match !== newMatch)).toEqual(control.season.results.filter(match => match !== oldMatch));
    expect(finish(mid, { ...ordinary, attackPlan: opening })).toEqual(control);
    expect(finish(half, { ...ordinary, attackPlan })).toBe(half);
    expect(finish(mid, { ...ordinary, attackPlan, round: 2 })).toBe(mid);
    expect(finish(mid, { ...ordinary, attackPlan: 'invalid' as never })).toBe(mid);
    expect(readNrlCareerSave(raw(switched))).toEqual(switched);
    const forged = { ...switched, season: { ...switched.season, results: switched.season.results.map(match =>
      match === newMatch ? { ...match, scorePeriods: undefined } : match) } };
    expect(readNrlCareerSave(raw(forged))).toBeNull();
    if (attackPlan === 'counter') expect(newMatch.goldenPoint).toEqual({ period: 1, score: 'fieldGoals' });
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

  it.each([
    [2026, 'broncos', 1, [10, 6], [22, 8], [28, 8]],
    [2027, 'bears', 17, [24, 20], [38, 30], [38, 30]],
  ] as const)('settles a still-held reserve only after the %s score at 60', (year, club, seed, at60, skippedScore, lateScore) => {
    const before = createNrlCareer(club, seed, year);
    const held = nrlHoldableReserves(before.season)[0];
    const early = finish(before, { type: 'startLive', hold: { year, round: 1, reserveId: held.id } });
    const rotations = nrlHalftimeInterchanges(early.season);
    const [rotating, secondRotating] = rotations;
    const watch = { type: 'reachMinute60', year, round: 1, tactic: 'balanced' } as const;
    const late = { type: 'finishMinute60', year, round: 1, tactic: 'balanced', reserveId: held.id } as const;
    const mid = finish(early, watch);
    const live = mid.season.live!.minute60!;
    expect([nrlScorePoints(live.homeScoring), nrlScorePoints(live.awayScoring)]).toEqual(at60);
    const { reserveId: _omitted, ...keep } = late;
    const skipped = finish(mid, keep);
    const matchFor = (s: NrlCareerState) => s.season.results.find(result => result.homeId === club || result.awayId === club)!;
    const otherMatches = (s: NrlCareerState) => s.season.results.filter(result => result !== matchFor(s));
    expect([matchFor(skipped).homeScore, matchFor(skipped).awayScore]).toEqual(skippedScore);
    expect(matchFor(skipped).benchUsed).not.toContain(held.id);
    expect(finish(mid, { ...late, reserveId: rotating.reserveId })).toBe(mid);
    const starterId = before.season.lineup[held.role];
    const alreadyUsed = finish(early, { ...watch, interchange: { starterId, reserveId: held.id } });
    expect(finish(alreadyUsed, late)).toBe(alreadyUsed);
    const alreadySecond = finish(early, { ...watch, interchange: rotating, secondInterchange: { starterId, reserveId: held.id } });
    expect(finish(alreadySecond, late)).toBe(alreadySecond);
    const noHold = finish(start(before), watch);
    expect(finish(noHold, late)).toBe(noHold);

    const after = finish(readNrlCareerSave(raw(mid))!, late);
    const match = matchFor(after);
    expect([match.homeScore, match.awayScore]).toEqual(lateScore);
    expect(match.minute60Interchange).toEqual({ starterId, reserveId: held.id });
    expect(match.benchUsed).toEqual([...matchFor(skipped).benchUsed!, held.id]);
    expect(match.playerScoring?.starters).toContain(starterId);
    expect(match.homeScoring.tries).toBeGreaterThanOrEqual(live.homeScoring.tries);
    expect(match.awayScoring.tries).toBeGreaterThanOrEqual(live.awayScoring.tries);
    expect(after.season.round).toBe(2);
    const fitness = (s: NrlCareerState, id: string) => s.season.squad.find(player => player.id === id)!.fitness;
    expect(fitness(after, held.id)).toBe(fitness(skipped, held.id) - 4);
    expect(fitness(after, starterId)).toBe(fitness(skipped, starterId) + 4);
    expect(raw(readNrlCareerSave(raw(after)))).toBe(raw(after));
    expect(finish(after, late)).toBe(after);
    expect(otherMatches(after)).toEqual(otherMatches(skipped));

    const twoAtHalf = finish(early, { ...watch, interchange: rotating, secondInterchange: secondRotating });
    const afterThree = finish(twoAtHalf, late);
    const afterThreeMatch = matchFor(afterThree);
    expect(afterThreeMatch.halftimeInterchange).toMatchObject({ reserveId: rotating.reserveId });
    expect(afterThreeMatch.secondHalftimeInterchange).toMatchObject({ reserveId: secondRotating.reserveId });
    expect(afterThreeMatch.minute60Interchange).toEqual({ starterId, reserveId: held.id });
    expect(afterThreeMatch.benchUsed).toHaveLength(4);
    expect(new Set(afterThreeMatch.benchUsed).size).toBe(4);
    expect(raw(readNrlCareerSave(raw(afterThree)))).toBe(raw(afterThree));
  });

  it('credits the late reserve with the final try in the Bears golden-point fixture', () => {
    const year = 2027;
    const before = createNrlCareer('bears', 38, year);
    const reserve = nrlHoldableReserves(before.season)[0];
    const half = finish(before, { type: 'startLive', hold: { year, round: 1, reserveId: reserve.id } });
    const mid = finish(half, { type: 'reachMinute60', year, round: 1, tactic: 'balanced' });
    const lastScore = mid.season.live!.minute60!.awayScoring;
    expect(nrlScorePoints(lastScore)).toBe(20);
    const after = finish(mid, { type: 'finishMinute60', year, round: 1, tactic: 'balanced', reserveId: reserve.id });
    const match = after.season.results.find(result => result.awayId === 'bears')!;
    expect(match.awayScoring.tries - lastScore.tries).toBe(1);
    expect(match.playerScoring?.lines.find(line => line.playerId === reserve.id)).toMatchObject({ tries: 1 });
    expect(match.goldenPoint).toEqual({ period: 1, score: 'fieldGoals' });
    expect(readNrlCareerSave(raw(after))).toEqual(after);
    const wrongReserve = { ...match, minute60Interchange: { ...match.minute60Interchange, reserveId: match.playerScoring!.kickerId } };
    const bad = { ...after, season: { ...after.season, results: after.season.results.map(result => result === match ? wrongReserve : result) } };
    expect(readNrlCareerSave(raw(bad))).toBeNull();
  });

  it('leaves standings and finance unmodified until a staged finals match settles', () => {
    let before = createNrlCareer('broncos', 95);
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
    expect([result?.homeScore, result?.awayScore]).toEqual([22, 16]);
    expect(full.finance.centralFunding).toBeGreaterThan(before.finance.centralFunding);
    expect(finish(full, { type: 'finishMinute60', year, round, tactic: 'attack' })).toBe(full);
  });
});
