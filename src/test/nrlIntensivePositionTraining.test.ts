import { describe, expect, it } from 'vitest';
import { createNrlCareer, nrlPositionTraining, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { nrlLadder, nrlMatchFitness, nrlStarterOptions, NRL_ROLES } from '@/lib/nrlManager';

const year = 2026, clubId = 'sharks', playerId = 'sharks-6-0', role = 'Halfback', round = 2;
const frame = { year, clubId, round, playerId, startedRound: round } as const;
const queue = { type: 'setIntensivePositionTraining', ...frame, enabled: true } as const;
const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const train = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'prepare', choice: 'train' });
const player = (state: NrlCareerState) => state.season.squad.find(row => row.id === playerId)!;
const read = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));
const played = (state: NrlCareerState, playedRound: number) => state.season.results.find(
  row => row.round === playedRound && row.playerScoring)!;
const fixture = () => reduceNrlCareer(train(advance(train(createNrlCareer(clubId, 5, year)))), {
  type: 'startPositionTraining', year, clubId, round, playerId, role,
});

describe('NRL intensive match-week position training', () => {
  it('spends one named session only after a club match settles through Quick Sim or resumed Live', () => {
    const usual = fixture();
    expect(nrlPositionTraining(usual)?.remaining).toBe(4);
    expect(player(usual).name).toBe('Tane Nairn');
    expect(nrlMatchFitness(usual.season, player(usual))).toBe(88);
    const queued = reduceNrlCareer(usual, queue);
    expect(queued?.season?.intensivePositionTrainingId).toBe(playerId);
    expect(nrlMatchFitness(queued.season, player(queued))).toBe(84);
    expect(nrlPositionTraining(queued)?.remaining).toBe(4);
    expect(queued.season.squad).toBe(usual.season.squad);
    expect(queued.finance).toBe(usual.finance);
    expect(queued.season.results).toBe(usual.season.results);
    expect(read(queued)).toEqual(queued);
    expect(reduceNrlCareer(queued, queue)).toBe(queued);
    expect(JSON.stringify(reduceNrlCareer(queued, { ...queue, enabled: false }))).toBe(JSON.stringify(usual));

    const half = reduceNrlCareer(queued, { type: 'startLive' });
    expect(read(half)).toEqual(half);
    expect(nrlPositionTraining(half)?.remaining).toBe(4);
    expect(reduceNrlCareer(half, { ...queue, enabled: false })).toBe(half);
    const finished = reduceNrlCareer(read(half)!, { type: 'finishLive', year, round, tactic: 'balanced' });
    expect(finished).toEqual(advance(queued));
    const normal = advance(usual);
    expect(player(normal).fitness - player(finished).fitness).toBe(4);
    expect(nrlPositionTraining(normal)?.remaining).toBe(3);
    expect(nrlPositionTraining(finished)?.remaining).toBe(2);
    expect(nrlPositionTraining(finished)?.intensiveMatch).toBe(round);
    expect(played(finished, round).intensivePositionTrainingId).toBe(playerId);
    expect(finished.season.intensivePositionTrainingId).toBeUndefined();
    expect(read(finished)).toEqual(finished);
    expect(reduceNrlCareer(finished, { ...queue, round: 3 })).toBe(finished);
  });

  it('allows a new Halfback selection one fixture earlier in the Sharks run', () => {
    const usual = fixture();
    const intoRoundFive = (state: NrlCareerState) => advance(advance(advance(state)));
    const skipped = intoRoundFive(usual);
    const accelerated = intoRoundFive(reduceNrlCareer(usual, queue));
    expect(nrlPositionTraining(skipped)?.remaining).toBe(1);
    expect(player(skipped).secondaryRole).toBeUndefined();
    expect(player(accelerated).secondaryRole).toBe(role);
    expect(nrlPositionTraining(accelerated)).toBeNull();
    const replacement = nrlStarterOptions(accelerated.season, 'Five-eighth').find(row => row.id !== playerId)!;
    const select = (state: NrlCareerState, target: 'Five-eighth' | 'Halfback', id: string) =>
      reduceNrlCareer(state, { type: 'selectStarter', role: target, playerId: id });
    const control = select(skipped, 'Five-eighth', replacement.id);
    expect(select(control, role, playerId)).toBe(control);
    const selected = select(select(accelerated, 'Five-eighth', replacement.id), role, playerId);
    const ordinary = advance(control), trained = advance(read(selected)!);
    expect(played(trained, 5).playerScoring?.starters[NRL_ROLES.indexOf(role)]).toBe(playerId);
    expect([played(ordinary, 5).homeScore, played(ordinary, 5).awayScore]).toEqual([20, 24]);
    expect([played(trained, 5).homeScore, played(trained, 5).awayScore]).toEqual([20, 18]);
    const points = (state: NrlCareerState) => nrlLadder(state.season).find(row => row.clubId === clubId)?.points;
    expect([points(ordinary), points(trained)]).toEqual([6, 8]);
    expect(read(trained)).toEqual(trained);
  });

  it('rejects stale orders and forged preparation without the associated course', () => {
    const initial = fixture();
    for (const invalid of [{ ...queue, round: 1 }, { ...queue, startedRound: 1 }, { ...queue, year: 2027 },
      { ...queue, playerId: initial.season.lineup.Halfback }]) {
      expect(reduceNrlCareer(initial, invalid)).toBe(initial);
    }
    const booked = reduceNrlCareer(initial, queue);
    expect(read({ ...booked, positionTraining: undefined })).toBeNull();
    expect(read({ ...booked, season: { ...booked.season, intensivePositionTrainingId: initial.season.lineup.Halfback } })).toBeNull();
    const paid = advance(booked);
    expect(read({ ...paid, positionTraining: { ...paid.positionTraining!, intensiveMatch: 1 } })).toBeNull();
    const attemptedRecovery = { type: 'setIndividualRecovery', year, clubId, round, playerId } as const;
    expect(reduceNrlCareer(booked, attemptedRecovery)).toBe(booked);
    const recovery = reduceNrlCareer(initial, attemptedRecovery);
    expect(reduceNrlCareer(recovery, queue)).toBe(recovery);
    const cancelCourse = { type: 'cancelPositionTraining', year, clubId, playerId, role, startedRound: round } as const;
    expect(reduceNrlCareer(booked, cancelCourse)).toEqual(reduceNrlCareer(initial, cancelCourse));
    const live = reduceNrlCareer(booked, { type: 'startLive' });
    expect(reduceNrlCareer(live, cancelCourse)).toBe(live);
  });

  it('shares the one course acceleration with the existing bye session', () => {
    const playerId = 'panthers-6-1';
    const frame = { year, clubId: 'panthers', round: 1, playerId, startedRound: 1 } as const;
    const initial = reduceNrlCareer(createNrlCareer(frame.clubId, 16, year), { type: 'startPositionTraining', ...frame, role });
    expect(reduceNrlCareer(initial, { type: 'setIntensivePositionTraining', ...frame, enabled: true })).toBe(initial);
    const bye = reduceNrlCareer(initial, { type: 'runIntensiveBye', ...frame });
    expect(nrlPositionTraining(bye)).toMatchObject({ intensiveBye: 1, remaining: 2 });
    expect(reduceNrlCareer(bye, { type: 'setIntensivePositionTraining', ...frame, round: 2, enabled: true })).toBe(bye);
    expect(read(bye)).toEqual(bye);
  });
});
