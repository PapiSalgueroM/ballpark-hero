import { describe, expect, it } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { nrlHalftimeInterchanges, type NrlHalftimeInterchange, type NrlPlayer } from '@/lib/nrlManager';
import { nrlScorePoints } from '@/lib/nrlPlayerScoring';

const start = (career: NrlCareerState) => reduceNrlCareer(career, { type: 'startLive' });
const result = (career: NrlCareerState) => career.season.results.find(match => match.homeId === career.season.clubId)!;
const raw = (career: NrlCareerState) => JSON.stringify(career);
const finish = (career: NrlCareerState, interchange?: NrlHalftimeInterchange) => reduceNrlCareer(career, {
  type: 'finishLive', year: career.season.year, round: career.season.round, tactic: career.season.tactic, interchange,
});
const choice = { starterId: 'broncos-3-0', reserveId: 'nrl-broncos-2026-28' };

describe('NRL halftime interchange', () => {
  it('keeps an already rotating reserve on, settles once and cannot credit the outgoing starter for second-half scores', () => {
    const kickoff = createNrlCareer('broncos', 76);
    const pending = start(kickoff);
    expect(nrlScorePoints(pending.season.live!.homeScoring)).toBe(0);
    const automatic = finish(pending);
    const expected = result(automatic);
    expect(expected.playerScoring?.lines.find(line => line.playerId === choice.starterId)?.tries).toBe(1);
    expect(nrlHalftimeInterchanges(pending.season)).toContainEqual({ ...choice, role: 'Left Centre' });
    const restored = readNrlCareerSave(raw(pending))!;
    const changed = finish(restored, choice);
    const played = result(changed);
    expect(played.halftimeInterchange).toEqual(choice);
    expect(played.homeScore).toBeGreaterThan(0);
    expect(played.playerScoring?.lines.some(line => line.playerId === choice.starterId)).toBe(false);
    expect(played.playerScoring?.lines.reduce((sum, line) => sum + nrlScorePoints(line), 0)).toBe(played.homeScore);
    expect(played.playerScoring?.starters).toEqual(expected.playerScoring?.starters);
    expect(played.benchUsed).toEqual(expected.benchUsed);
    expect(played.injury).toEqual(expected.injury);
    expect(changed.season.lineup).toEqual(automatic.season.lineup);
    expect(changed.season.round).toBe(2);
    expect(raw(readNrlCareerSave(raw(changed))!)).toBe(raw(changed));
    expect(reduceNrlCareer(changed, { type: 'finishLive', year: 2026, round: 1, tactic: 'balanced', interchange: choice })).toBe(changed);
  });

  it('moves fitness load from starter to reserve and changes some closing scores without rewriting the first half', () => {
    let scoreChanges = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const pending = start(createNrlCareer('broncos', seed));
      const originalHalf = raw(pending);
      const option = nrlHalftimeInterchanges(pending.season)[0];
      expect(option).toBeDefined();
      const { starterId, reserveId } = option!;
      const automatic = finish(pending);
      const manual = finish(pending, { starterId, reserveId });
      const fitness = (state: NrlCareerState, id: string) => state.season.squad.find(player => player.id === id)!.fitness;
      expect(fitness(manual, starterId)).toBe(fitness(automatic, starterId) + 5);
      expect(fitness(manual, reserveId)).toBe(fitness(automatic, reserveId) - 5);
      expect(result(manual).homeScore).toBeGreaterThanOrEqual(nrlScorePoints(pending.season.live!.homeScoring));
      expect(result(manual).awayScore).toBeGreaterThanOrEqual(nrlScorePoints(pending.season.live!.awayScoring));
      expect(raw(pending)).toBe(originalHalf);
      if (result(automatic).homeScore !== result(manual).homeScore || result(automatic).awayScore !== result(manual).awayScore) scoreChanges++;
    }
    expect(scoreChanges).toBeGreaterThan(0);
  });

  it('protects the kicker and refuses illegal pairs, including on a bench with no eligible change', () => {
    const kickoff = createNrlCareer('broncos', 76);
    const bench = new Set(kickoff.season.bench);
    const align = <T extends NrlPlayer>(player: T): T => bench.has(player.id) ? { ...player, role: 'Halfback' } : player;
    const specialty = {
      ...kickoff, players: kickoff.players.map(align),
      season: { ...kickoff.season, squad: kickoff.season.squad.map(align) },
    };
    const loaded = readNrlCareerSave(raw(specialty))!;
    expect(loaded).not.toBeNull();
    const pending = start(loaded);
    expect(pending.season.live).toBeDefined();
    expect(nrlHalftimeInterchanges(pending.season)).toEqual([]);
    expect(finish(pending, { starterId: kickoff.season.kickerId!, reserveId: [...bench][0] })).toBe(pending);
    expect(finish(pending).season.round).toBe(2);
    const normal = start(kickoff);
    expect(finish(normal, { ...choice, reserveId: kickoff.season.lineup.Halfback })).toBe(normal);
    expect(finish(normal, { ...choice, starterId: kickoff.season.lineup['Right Centre'] })).toBe(normal);
  });

  it('rejects an invalid completed interchange receipt', () => {
    const pending = start(createNrlCareer('broncos', 76));
    expect(nrlHalftimeInterchanges(pending.season)).toContainEqual({ ...choice, role: 'Left Centre' });
    const settled = finish(pending, choice);
    const played = result(settled);
    const forged = (interchange: NrlHalftimeInterchange) => readNrlCareerSave(JSON.stringify({
      ...settled, season: { ...settled.season, results: settled.season.results.map(match =>
        match === played ? { ...match, halftimeInterchange: interchange } : match) },
    }));
    expect(forged({ ...choice, starterId: played.playerScoring!.kickerId })).toBeNull();
    expect(forged({ ...choice, reserveId: played.playerScoring!.starters[0] })).toBeNull();
  });
});
