import { describe, expect, it } from 'vitest';
import {
  createNrlCareer, nrlOppositionReport, nrlReserveGradeCandidates, readNrlCareerSave, reduceNrlCareer, type NrlCareerState,
} from '@/lib/nrlCareer';
import { createNrlSeason, nrlNextRound } from '@/lib/nrlManager';

const run = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const raw = JSON.stringify;
const read = (state: NrlCareerState) => readNrlCareerSave(raw(state));

function setRecovery(state: NrlCareerState, playerId: string | null) {
  const { year, clubId, round } = state.season;
  return reduceNrlCareer(state, { type: 'setIndividualRecovery', year, clubId, round, playerId });
}

const managedResult = (state: NrlCareerState, round: number) => state.season.results.find(match =>
  match.round === round && (match.homeId === state.season.clubId || match.awayId === state.season.clubId))!;

describe('NRL individual recovery', () => {
  it.each([[2026, 'broncos', 1], [2027, 'bears', 17]] as const)('uses one player’s recovery fitness while keeping team drills in %s', (year, clubId, seed) => {
    const initial = reduceNrlCareer(createNrlCareer(clubId, seed, year), { type: 'prepare', choice: 'train' });
    const playerId = initial.season.lineup.Halfback;
    const recovery = setRecovery(initial, playerId);
    expect(recovery.season.individualRecoveryId).toBe(playerId);
    expect(recovery.season.preparation).toBe('train');
    expect(recovery.season.lineup).toBe(initial.season.lineup);
    expect(recovery.season.bench).toBe(initial.season.bench);
    const report = nrlOppositionReport(recovery)!;
    const ordinary = nrlOppositionReport(initial)!;
    expect(report.attackEdge).toBeGreaterThan(ordinary.attackEdge);
    expect(report.attackEdge - ordinary.attackEdge).toBeCloseTo(report.defenseEdge - ordinary.defenseEdge);
    const settled = run(recovery);
    const usual = run(initial);
    expect(settled.season.individualRecoveryId).toBeUndefined();
    expect(managedResult(settled, initial.season.round).individualRecoveryId).toBe(playerId);
    expect(managedResult(settled, initial.season.round).injury).toEqual(managedResult(usual, initial.season.round).injury);
    expect(settled.season.lineup).toEqual(usual.season.lineup);
    expect(settled.season.bench).toEqual(usual.season.bench);
    expect(settled.season.results.filter(match => match.homeId !== clubId && match.awayId !== clubId))
      .toEqual(usual.season.results.filter(match => match.homeId !== clubId && match.awayId !== clubId));
    expect(settled.season.squad.filter(player => player.id !== playerId)).toEqual(usual.season.squad.filter(player => player.id !== playerId));
    const fitness = (state: NrlCareerState) => state.season.squad.find(player => player.id === playerId)!.fitness;
    expect(fitness(settled) - fitness(usual)).toBe(4);
    expect(read(settled)).toEqual(settled);
    expect(managedResult(run(settled), settled.season.round)?.individualRecoveryId).toBeUndefined();
  });

  it('retains the queue through reload at half time and 60 minutes and settles once', () => {
    const initial = reduceNrlCareer(createNrlCareer('broncos', 1), { type: 'prepare', choice: 'train' });
    const planned = setRecovery(initial, initial.season.lineup.Halfback);
    expect(raw(read(planned))).toBe(raw(planned));
    const half = reduceNrlCareer(planned, { type: 'startLive' });
    expect(raw(read(half))).toBe(raw(half));
    const match = { year: half.season.year, round: half.season.round, tactic: half.season.tactic };
    const paused = reduceNrlCareer(read(half)!, { type: 'reachMinute60', ...match });
    expect(paused.season.live?.minute60).toBeDefined();
    expect(paused.finance).toEqual(planned.finance);
    expect(paused.season.squad).toEqual(planned.season.squad);
    expect(raw(read(paused))).toBe(raw(paused));
    expect(setRecovery(half, null)).toBe(half);
    expect(setRecovery(paused, paused.season.lineup.Hooker)).toBe(paused);
    const finished = reduceNrlCareer(read(paused)!, { type: 'finishMinute60', ...match });
    expect(raw(finished)).toBe(raw(run(planned)));
    expect(reduceNrlCareer(finished, { type: 'finishMinute60', ...match })).toBe(finished);
  });

  it('changes a seeded match through the selected starter’s kickoff fitness', () => {
    const train = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'prepare', choice: 'train' });
    const roundTwo = train(run(train(createNrlCareer('broncos', 6))));
    const playerId = roundTwo.season.lineup.Halfback;
    const ordinary = managedResult(run(roundTwo), 2);
    const recovery = managedResult(run(setRecovery(roundTwo, playerId)), 2);
    expect([ordinary.homeScore, ordinary.awayScore]).toEqual([22, 24]);
    expect([recovery.homeScore, recovery.awayScore]).toEqual([22, 18]);
    expect(recovery.playerScoring?.starters).toEqual(ordinary.playerScoring?.starters);
    expect(recovery.benchUsed).toEqual(ordinary.benchUsed);
  });

  it('refuses stale and invalid choices and restores exact bytes when the choice is cleared', () => {
    const initial = createNrlCareer('broncos', 1);
    const playerId = initial.season.lineup.Halfback;
    const action = { type: 'setIndividualRecovery', year: 2026, clubId: 'broncos', round: 1, playerId } as const;
    const planned = reduceNrlCareer(initial, action);
    expect(reduceNrlCareer(planned, action)).toBe(planned);
    expect(raw(setRecovery(planned, null))).toBe(raw(initial));
    expect(setRecovery(initial, 'rival-player')).toBe(initial);
    expect(read({ ...initial, season: { ...initial.season, individualRecoveryId: 'rival-player' } })).toBeNull();
    const second = run(initial);
    expect(reduceNrlCareer(second, action)).toBe(second);
    expect(reduceNrlCareer(initial, { ...action, year: 2027 })).toBe(initial);
    expect(reduceNrlCareer(initial, { ...action, clubId: 'bears' })).toBe(initial);
    const teamRecovery = reduceNrlCareer(initial, { type: 'prepare', choice: 'recover' });
    expect(setRecovery(teamRecovery, playerId)).toBe(teamRecovery);
    expect(raw(reduceNrlCareer(planned, { type: 'prepare', choice: 'recover' }))).toBe(raw(teamRecovery));
    const bye = createNrlCareer('panthers', 16);
    expect(nrlNextRound(bye.season).clubStatus).toBe('bye');
    expect(setRecovery(bye, bye.season.lineup.Halfback)).toBe(bye);
    const old = readNrlCareerSave(raw(createNrlSeason('broncos', 16)))!;
    expect(old.legacySeason).toBe(true);
    expect(setRecovery(old, old.season.lineup.Halfback)).toBe(old);
  });

  it('drops a queued player only if a reserve-grade assignment makes them unavailable', () => {
    const initial = createNrlCareer('broncos', 1);
    const reserve = nrlReserveGradeCandidates(initial)[0];
    expect(reserve).toBeDefined();
    const setup = setRecovery(initial, reserve.id);
    expect(setup.season.individualRecoveryId).toBe(reserve.id);
    const sent = reduceNrlCareer(setup, { type: 'startReserveGrade', year: 2026, clubId: 'broncos', round: 1, playerId: reserve.id });
    expect(sent.season.reserveGrade?.playerId).toBe(reserve.id);
    expect(sent.season.individualRecoveryId).toBeUndefined();
    expect(setRecovery(sent, reserve.id)).toBe(sent);
    expect(read(sent)).toEqual(sent);
    expect(read({ ...sent, season: { ...sent.season, individualRecoveryId: reserve.id } })).toBeNull();
  });
});
