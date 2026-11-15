import { expect, it } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { nrlBenchRotation, nrlHalftimeInterchanges, nrlHoldableReserves, nrlUnavailable } from '@/lib/nrlManager';

const reserveId = 'storm-5-1';
const fixture = { year: 2026, clubId: 'storm', round: 5 } as const;
const clubMatch = (state: NrlCareerState) => state.season.results.find(match => match.round === fixture.round && match.playerScoring)!;
const restore = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));
const plan = { type: 'setOpeningCover', ...fixture, reserveId } as const;

function trainedBench(seed = 88) {
  let state = createNrlCareer(fixture.clubId, seed, fixture.year);
  state = reduceNrlCareer(state, { type: 'startPositionTraining', ...fixture, round: 1, playerId: reserveId, role: 'Fullback' });
  for (let round = 1; round < fixture.round; round++) state = reduceNrlCareer(state, { type: 'advance' });
  expect(state.season.squad.find(player => player.id === reserveId)?.secondaryRole).toBe('Fullback');
  return reduceNrlCareer(state, { type: 'selectBench', slot: 0, playerId: reserveId });
}

it('moves the assigned reserve spell to the trained position in Quick Sim and Live', () => {
  const before = trainedBench();
  const { Fullback: fullback, 'Right Wing': wing } = before.season.lineup;
  const normal = nrlBenchRotation(before.season);
  expect(normal.get(wing)?.id).toBe(reserveId);
  expect(normal.has(fullback)).toBe(false);
  const planned = reduceNrlCareer(before, plan);
  expect(planned.season?.openingCoverId).toBe(reserveId);
  expect(restore(planned)).toEqual(planned);
  const changed = nrlBenchRotation(planned.season);
  expect(changed.get(fullback)?.id).toBe(reserveId);
  expect(changed.has(wing)).toBe(false);
  expect(changed.size).toBe(normal.size);

  const baseline = reduceNrlCareer(before, { type: 'advance' });
  const quick = reduceNrlCareer(restore(planned)!, { type: 'advance' });
  const fitness = (state: NrlCareerState, id: string) => state.season.squad.find(player => player.id === id)!.fitness;
  expect(fitness(quick, fullback) - fitness(baseline, fullback)).toBe(4);
  expect(fitness(quick, wing) - fitness(baseline, wing)).toBe(-4);
  expect(clubMatch(quick).openingCover).toEqual({ reserveId, starterId: fullback });
  expect(clubMatch(quick).benchUsed).toHaveLength(4);
  expect(quick.season.openingCoverId).toBeUndefined();
  expect(restore(quick)).toEqual(quick);
  expect(reduceNrlCareer(quick, plan)).toBe(quick);
  expect(reduceNrlCareer(reduceNrlCareer(planned, { ...plan, reserveId: null }), { type: 'advance' })).toEqual(baseline);

  const live = reduceNrlCareer(planned, { type: 'startLive' });
  expect(restore(live)).toEqual(live);
  expect(reduceNrlCareer(live, { ...plan, reserveId: null })).toBe(live);
  expect(nrlHalftimeInterchanges(live.season)).toContainEqual({ reserveId, starterId: fullback, role: 'Fullback' });
  const unchanged = reduceNrlCareer(live, { type: 'finishLive', ...fixture, tactic: live.season.tactic });
  expect(clubMatch(unchanged)).toEqual(clubMatch(quick));
  const kept = reduceNrlCareer(restore(live)!, { type: 'finishLive', ...fixture, tactic: live.season.tactic,
    interchange: { reserveId, starterId: fullback } });
  expect(clubMatch(kept).halftimeInterchange).toEqual({ reserveId, starterId: fullback });
  expect(restore(kept)).toEqual(kept);
});

it('keeps the reserve cap and clears unavailable or kicker-conflicting assignments', () => {
  const before = trainedBench(33);
  const { Fullback: fullback, Hooker: hooker } = before.season.lineup;
  const nativeFullbackReserve = nrlBenchRotation(before.season).get(fullback)!.id;
  const planned = reduceNrlCareer(before, plan);
  expect(nrlBenchRotation(planned.season).get(fullback)?.id).toBe(reserveId);
  expect([...nrlBenchRotation(planned.season).values()].map(player => player.id)).not.toContain(nativeFullbackReserve);
  expect(nrlHoldableReserves(planned.season).map(player => player.id)).not.toContain(nativeFullbackReserve);
  for (const id of [nativeFullbackReserve, reserveId]) {
    expect(reduceNrlCareer(planned, { type: 'startLive', hold: { ...fixture, reserveId: id } })).toBe(planned);
  }
  const otherHeld = nrlHoldableReserves(planned.season)[0].id;
  const liveWithHold = reduceNrlCareer(planned, { type: 'startLive', hold: { ...fixture, reserveId: otherHeld } });
  expect(restore(liveWithHold)).toEqual(liveWithHold);
  const held = reduceNrlCareer(liveWithHold, { type: 'finishLive', ...fixture, tactic: liveWithHold.season.tactic });
  expect(clubMatch(held).benchUsed).toHaveLength(3);
  expect(clubMatch(held).openingCover).toEqual({ reserveId, starterId: fullback });
  expect(restore(held)).toEqual(held);

  const kicker = reduceNrlCareer(planned, { type: 'setKicker', playerId: fullback });
  expect(kicker.season.openingCoverId).toBeUndefined();
  expect(reduceNrlCareer(kicker, plan)).toBe(kicker);
  expect(restore(kicker)).toEqual(kicker);
  const selected = reduceNrlCareer(planned, { type: 'selectStarter', role: 'Right Wing', playerId: reserveId });
  expect(selected.season.openingCoverId).toBeUndefined();
  expect(reduceNrlCareer(selected, plan)).toBe(selected);
  expect(restore(selected)).toEqual(selected);

  const scored = reduceNrlCareer(planned, { type: 'advance' });
  const match = clubMatch(scored);
  const forged = { ...scored, season: { ...scored.season, results: scored.season.results.map(row =>
    row === match ? { ...match, openingCover: { reserveId, starterId: hooker } } : row) } };
  expect(restore(forged)).toBeNull();
});

it('does not let a trained reserve be assigned again while injured', () => {
  const planned = reduceNrlCareer(trainedBench(30), plan);
  const played = reduceNrlCareer(planned, { type: 'advance' });
  expect(clubMatch(played).openingCover?.reserveId).toBe(reserveId);
  expect(clubMatch(played).injury).toEqual({ playerId: reserveId, rounds: 4 });
  expect(nrlUnavailable(played.season).get(reserveId)).toBe(4);
  expect(played.season.bench).not.toContain(reserveId);
  expect(reduceNrlCareer(played, { ...plan, round: played.season.round })).toBe(played);
  expect(reduceNrlCareer(played, { type: 'selectBench', slot: 0, playerId: reserveId })).toBe(played);
  expect(restore(played)).toEqual(played);
});
