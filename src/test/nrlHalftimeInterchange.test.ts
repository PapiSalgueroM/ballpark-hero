import { describe, expect, it } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { nrlHalftimeInterchanges, nrlHoldableReserves, nrlNextRound, type NrlHalftimeInterchange, type NrlPlayer } from '@/lib/nrlManager';
import { nrlScorePoints } from '@/lib/nrlPlayerScoring';

const start = (career: NrlCareerState) => reduceNrlCareer(career, { type: 'startLive' });
const result = (career: NrlCareerState) => career.season.results.find(match => match.homeId === career.season.clubId)!;
const raw = (career: NrlCareerState) => JSON.stringify(career);
const finish = (career: NrlCareerState, interchange?: NrlHalftimeInterchange) => reduceNrlCareer(career, {
  type: 'finishLive', year: career.season.year, round: career.season.round, tactic: career.season.tactic, interchange,
});
const choice = { starterId: 'broncos-3-0', reserveId: 'nrl-broncos-2026-28' };
const hold = { year: 2026, round: 1, reserveId: choice.reserveId };

describe('NRL reserve held for halftime', () => {
  it('restores the exact halftime and only counts the held reserve if brought on', () => {
    const kickoff = createNrlCareer('broncos', 76);
    const action = { type: 'startLive', hold } as const;
    const pending = reduceNrlCareer(kickoff, action);
    expect(pending.season.live?.heldReserveId).toBe(choice.reserveId);
    const restored = readNrlCareerSave(raw(pending))!;
    expect(raw(restored)).toBe(raw(pending));

    const stayedOff = finish(restored);
    const opening = result(stayedOff).benchUsed ?? [];
    expect(result(finish(start(kickoff))).benchUsed).toHaveLength(4);
    expect(opening).toHaveLength(3);
    expect(opening).not.toContain(choice.reserveId);
    expect(result(stayedOff).playerScoring?.lines.some(line => line.playerId === choice.reserveId)).toBe(false);
    const played = finish(restored, choice);
    const match = result(played);
    expect(match.benchUsed).toEqual([...opening, choice.reserveId]);
    expect(match.halftimeInterchange).toEqual({ ...choice, enteredAtHalf: true });
    expect(match.playerScoring?.lines.reduce((sum, line) => sum + nrlScorePoints(line), 0)).toBe(match.homeScore);
    expect(match.homeScore).toBeGreaterThanOrEqual(nrlScorePoints(pending.season.live!.homeScoring));
    expect(match.awayScore).toBeGreaterThanOrEqual(nrlScorePoints(pending.season.live!.awayScoring));
    expect(raw(readNrlCareerSave(raw(played))!)).toBe(raw(played));
    expect(finish(played, choice)).toBe(played);
    const fitness = (state: NrlCareerState, id: string) => state.season.squad.find(player => player.id === id)!.fitness;
    expect(fitness(played, choice.starterId)).toBe(fitness(stayedOff, choice.starterId) + 7);
    expect(fitness(played, choice.reserveId)).toBe(fitness(stayedOff, choice.reserveId) - 8);
  });

  it('credits first-half scores to the starting player and second-half scores to the entrant', () => {
    const firstOnly = { starterId: 'broncos-2-0', reserveId: 'nrl-broncos-2026-27' };
    const firstHalf = reduceNrlCareer(createNrlCareer('broncos', 20), { type: 'startLive', hold: { ...hold, reserveId: firstOnly.reserveId } });
    expect(firstHalf.season.live!.homeScoring.tries).toBe(2);
    const firstResult = result(finish(firstHalf, firstOnly));
    expect(firstResult.homeScoring.tries).toBe(2);
    expect(firstResult.playerScoring?.lines.find(line => line.playerId === firstOnly.starterId)?.tries).toBe(1);
    expect(firstResult.playerScoring?.lines.some(line => line.playerId === firstOnly.reserveId)).toBe(false);

    const secondHalf = reduceNrlCareer(createNrlCareer('broncos', 76), { type: 'startLive', hold });
    expect(secondHalf.season.live!.homeScoring.tries).toBe(0);
    const secondResult = result(finish(secondHalf, choice));
    expect(secondResult.playerScoring?.lines.find(line => line.playerId === choice.reserveId)?.tries).toBe(1);
    expect(secondResult.playerScoring?.lines.some(line => line.playerId === choice.starterId)).toBe(false);
  });

  it('keeps an opening reserve eligible to stay on and includes an entrant in injury exposure', () => {
    const pending = reduceNrlCareer(createNrlCareer('broncos', 76), { type: 'startLive', hold });
    const rotating = nrlHalftimeInterchanges(pending.season).find(option => !option.enteredAtHalf)!;
    const rotatingResult = result(finish(pending, rotating));
    expect(rotatingResult.halftimeInterchange).toEqual({ starterId: rotating.starterId, reserveId: rotating.reserveId });
    expect(rotatingResult.benchUsed).toEqual(result(finish(pending)).benchUsed);
    expect(rotatingResult.benchUsed).not.toContain(choice.reserveId);

    const injuryChoice = { ...choice, reserveId: 'broncos-3-1' };
    const injuryHalf = reduceNrlCareer(createNrlCareer('broncos', 39), { type: 'startLive', hold: { ...hold, reserveId: injuryChoice.reserveId } });
    expect(result(finish(injuryHalf)).injury?.playerId).toBe('broncos-4-0');
    const injured = finish(injuryHalf, injuryChoice);
    expect(result(injured).injury).toEqual({ playerId: injuryChoice.reserveId, rounds: 2 });
    expect(readNrlCareerSave(raw(injured))).toEqual(injured);
  });

  it('keeps a real finals matchup reloadable and does not allow a held reserve for a bye', () => {
    let career = createNrlCareer('storm', 4);
    let sawBye = false;
    for (let step = 0; step < 31; step++) {
      const { season } = career;
      const reserve = nrlHoldableReserves(season)[0];
      expect(reserve).toBeDefined();
      const action = { type: 'startLive', hold: { year: season.year, round: season.round, reserveId: reserve.id } } as const;
      const fixture = nrlNextRound(season).clubMatch;
      if (!fixture) {
        expect(reduceNrlCareer(career, action)).toBe(career);
        sawBye = true;
      } else if (fixture.finalsRound) {
        const pending = reduceNrlCareer(career, action);
        const restored = readNrlCareerSave(raw(pending))!;
        expect(raw(restored)).toBe(raw(pending));
        const after = finish(restored, { starterId: season.lineup[reserve.role], reserveId: reserve.id });
        const settled = after.season.results.find(match => match.tieId === fixture.tieId)!;
        expect(settled.halftimeInterchange?.enteredAtHalf).toBe(true);
        expect(settled.benchUsed?.at(-1)).toBe(reserve.id);
        expect(raw(readNrlCareerSave(raw(after))!)).toBe(raw(after));
        expect(sawBye).toBe(true);
        return;
      }
      career = reduceNrlCareer(career, { type: 'advance' });
    }
    throw new Error('The seeded Storm career never reached a managed final.');
  });

  it('rejects a non-reserve at kickoff and a reserve other than the held one for first entry', () => {
    const kickoff = createNrlCareer('broncos', 76);
    const pending = reduceNrlCareer(kickoff, { type: 'startLive', hold });
    expect(reduceNrlCareer(kickoff, { type: 'startLive', hold: { ...hold, reserveId: choice.starterId } })).toBe(kickoff);
    expect(reduceNrlCareer(kickoff, { type: 'startLive', hold: { ...hold, round: 2 } })).toBe(kickoff);
    expect(finish(pending, { ...choice, reserveId: 'unknown' })).toBe(pending);
    const changedKicker = reduceNrlCareer(kickoff, { type: 'setKicker', playerId: choice.starterId });
    expect(reduceNrlCareer(changedKicker, { type: 'startLive', hold })).toBe(changedKicker);
    const { live } = pending.season;
    const savedWith = (change: Partial<NonNullable<typeof live>>) => readNrlCareerSave(raw({ ...pending,
      season: { ...pending.season, live: { ...live!, ...change } },
    }));
    expect(savedWith({ heldReserveId: kickoff.season.kickerId })).toBeNull();
    expect(savedWith({ homeScoring: { ...live!.homeScoring, tries: 1 } })).toBeNull();
  });
});

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
