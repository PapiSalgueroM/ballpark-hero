import { describe, expect, it } from 'vitest';
import {
  createNrlCareer, loadNrlOpeningMatchdayCareer, nrlCareerMarket, nrlContractCounteroffer, nrlContractOffer, nrlSelectionPromise, nrlSelectionPromiseCandidates,
  readNrlCareerSave, reduceNrlCareer, type NrlCareerState,
} from '@/lib/nrlCareer';
import { nrlNextRound, nrlRegularRounds } from '@/lib/nrlManager';

const raw = JSON.stringify;
const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const save = (state: NrlCareerState) => readNrlCareerSave(raw(state));
const promise = (state: NrlCareerState, playerId: string) => {
  const { year, clubId, round } = state.season;
  return reduceNrlCareer(state, { type: 'makeSelectionPromise', year, clubId, round, playerId });
};
const price = (state: NrlCareerState, id: string) =>
  nrlCareerMarket(state).find(entry => entry.player.id === id)!.askingSalary;

describe('NRL selection promises', () => {
  it.each([[2026, 'broncos'], [2027, 'bears']] as const)('ends a pending %i promise without earning a later discount', (year, clubId) => {
    const initial = createNrlCareer(clubId, 1, year);
    const player = nrlSelectionPromiseCandidates(initial).find(candidate => Object.values(initial.season.lineup).includes(candidate.id))!;
    let state = promise(initial, player.id);
    while ((nrlSelectionPromise(state)?.appearances ?? 0) < 3) state = advance(state);
    const { round } = state.season;
    const action = { type: 'endSelectionPromise', year, clubId, round, playerId: player.id, startedRound: 1 } as const;
    const ended = reduceNrlCareer(state, action);
    expect(ended.season).toBe(state.season);
    expect(nrlSelectionPromise(ended)).toMatchObject({ status: 'ended', endedRound: round, appearances: 3 });
    expect(raw(save(ended))).toBe(raw(ended));
    expect(reduceNrlCareer(ended, action)).toBe(ended);
    expect(reduceNrlCareer(state, { ...action, round: round - 1 })).toBe(state);
    expect(reduceNrlCareer(state, { ...action, startedRound: 2 })).toBe(state);
    const earned = advance(state);
    const played = advance(ended);
    expect(played.season).toEqual(earned.season);
    expect(nrlSelectionPromise(earned)?.status).toBe('kept');
    expect(nrlSelectionPromise(played)).toMatchObject({ status: 'ended', appearances: 3 });
    expect(price(played, player.id)).toBeGreaterThan(price(earned, player.id));
    expect(nrlSelectionPromiseCandidates(played)).toEqual([]);
    expect(reduceNrlCareer(earned, { ...action, round: earned.season.round })).toBe(earned);
    expect(save({ ...played, selectionPromise: { ...ended.selectionPromise!, endedRound: earned.season.round } })).toBeNull();
    expect(raw(save(played))).toBe(raw(played));
    let finished = played;
    while (finished.season.phase !== 'complete') finished = advance(finished);
    expect(nrlSelectionPromise(save(finished)!)).toMatchObject({ status: 'ended', endedRound: round, appearances: 3 });
    expect(reduceNrlCareer(finished, { type: 'startNextSeason' }).selectionPromise).toBeUndefined();
  });

  it.each([[2026, 'broncos'], [2027, 'bears']] as const)('earns one capped renewal discount from actual starts in %s', (year, clubId) => {
    const initial = createNrlCareer(clubId, 1, year);
    const chosen = nrlSelectionPromiseCandidates(initial).find(player => Object.values(initial.season.lineup).includes(player.id))!;
    const initialPrice = price(initial, chosen.id);
    let state = promise(initial, chosen.id);
    expect(state.selectionPromise).toEqual({ playerId: chosen.id, startedRound: 1 });
    expect(nrlSelectionPromise(state)).toMatchObject({ appearances: 0, eligible: 0, status: 'pending' });
    expect(raw(save(state))).toBe(raw(state));
    expect(price(state, chosen.id)).toBe(initialPrice);
    expect(promise(state, nrlSelectionPromiseCandidates(initial)[0].id)).toBe(state);
    while (nrlSelectionPromise(state)?.status === 'pending') state = advance(state);
    expect(nrlSelectionPromise(state)).toMatchObject({ appearances: 4, eligible: 4, status: 'kept' });
    const discounted = Math.ceil(initialPrice * 0.95);
    expect(price(state, chosen.id)).toBe(discounted);
    expect(nrlContractOffer(state, chosen.id, discounted, 1)).toMatchObject({ ok: true, contract: { clubId, salary: discounted } });
    expect(nrlContractOffer(state, chosen.id, discounted - 1, 1).ok).toBe(false);
    expect(nrlContractCounteroffer(state, chosen.id, discounted - 1).ok).toBe(false);
    const signed = reduceNrlCareer(state, { type: 'offerContract', playerId: chosen.id, salary: discounted, years: 1 });
    expect(signed.players.find(player => player.id === chosen.id)?.futureContract?.salary).toBe(discounted);
    expect(raw(save(signed))).toBe(raw(signed));
  });

  it('uses the regular-series window, requires six remaining fixtures and clears on rollover', () => {
    const initial = createNrlCareer('panthers', 2);
    expect(nrlNextRound(initial.season).clubStatus).toBe('bye');
    const named = new Set([...Object.values(initial.season.lineup), ...initial.season.bench!]);
    const candidate = nrlSelectionPromiseCandidates(initial).find(player => !named.has(player.id))!;
    const asking = price(initial, candidate.id);
    let state = promise(initial, candidate.id);
    state = advance(state);
    expect(nrlSelectionPromise(state)).toMatchObject({ eligible: 0, appearances: 0 });
    while (nrlSelectionPromise(state)?.status === 'pending') state = advance(state);
    expect(nrlSelectionPromise(state)).toMatchObject({ status: 'missed', eligible: 6, appearances: 0 });
    expect(price(state, candidate.id)).toBe(asking);
    expect(raw(save(state))).toBe(raw(state));
    while (state.season.phase !== 'complete') state = advance(state);
    expect(reduceNrlCareer(state, { type: 'startNextSeason' }).selectionPromise).toBeUndefined();

    let late = initial;
    while (late.season.round < nrlRegularRounds(2026) - 4) late = advance(late);
    expect(nrlSelectionPromiseCandidates(late)).toEqual([]);
    expect(promise(late, candidate.id)).toBe(late);
    expect(save({ ...late, selectionPromise: { playerId: candidate.id, startedRound: late.season.round } })).toBeNull();
  });

  it('refuses stale, mixed-club and live choices and never applies advance during a saved half', () => {
    const initial = createNrlCareer('broncos', 1);
    const chosen = nrlSelectionPromiseCandidates(initial)[0];
    expect(reduceNrlCareer(initial, { type: 'makeSelectionPromise', year: 2026, clubId: 'broncos', round: 2, playerId: chosen.id })).toBe(initial);
    const rival = initial.players.find(player => player.contract?.clubId === 'titans')!;
    expect(promise(initial, rival.id)).toBe(initial);
    const half = reduceNrlCareer(initial, { type: 'startLive' });
    expect(promise(half, chosen.id)).toBe(half);
    const opted = promise(initial, chosen.id);
    const opened = reduceNrlCareer(opted, { type: 'startLive' });
    expect(nrlSelectionPromise(opened)).toMatchObject({ eligible: 0, appearances: 0 });
    expect(raw(save(opened))).toBe(raw(opened));
    expect(advance(opened)).toBe(opened);
  });

  it('counts a recorded interchange but skips a match served during a real judiciary suspension', () => {
    const rotation = promise(createNrlCareer('broncos', 1), 'broncos-8-1');
    const played = advance(rotation);
    const match = played.season.results.find(result => result.homeId === 'broncos' || result.awayId === 'broncos')!;
    expect(match.playerScoring?.starters).not.toContain('broncos-8-1');
    expect(match.benchUsed).toContain('broncos-8-1');
    expect(nrlSelectionPromise(played)).toMatchObject({ appearances: 1, eligible: 1 });
    const started = promise(createNrlCareer('broncos', 2, 2026, false, true), 'broncos-1-0');
    const reported = advance(started);
    expect(reported.season.judiciary?.case).toMatchObject({ playerId: 'broncos-1-0', round: 1 });
    const accepted = reduceNrlCareer(reported, { type: 'resolveJudiciary', year: 2026, clubId: 'broncos', caseRound: 1, decision: 'plea' });
    expect(nrlNextRound(accepted.season).clubMatch).toBeTruthy();
    const served = advance(accepted);
    expect(nrlSelectionPromise(served)).toMatchObject({ appearances: 1, eligible: 1 });
    expect(raw(save(served))).toBe(raw(served));
  });

  it('excludes an injury and a same-round reserve-grade assignment using persisted evidence', () => {
    const injured = advance(promise(createNrlCareer('broncos', 4), 'broncos-1-0'));
    expect(injured.season.results.find(result => result.injury)?.injury).toEqual({ playerId: 'broncos-1-0', rounds: 3 });
    expect(nrlSelectionPromise(injured)).toMatchObject({ appearances: 1, eligible: 1 });
    expect(nrlSelectionPromise(advance(injured))).toMatchObject({ appearances: 1, eligible: 1 });
    const planned = promise(createNrlCareer('broncos', 2), 'broncos-2-1');
    const assigned = reduceNrlCareer(planned, { type: 'startReserveGrade', playerId: 'broncos-2-1', year: 2026, clubId: 'broncos', round: 1 });
    expect(assigned.season.reserveGrade?.playerId).toBe('broncos-2-1');
    expect(raw(save(assigned))).toBe(raw(assigned));
    expect(nrlSelectionPromise(advance(assigned))).toMatchObject({ appearances: 0, eligible: 0 });
  });

  it('offers selection promises only to generated players, including on the optional named roster', async () => {
    const named = await loadNrlOpeningMatchdayCareer('broncos', 1, false);
    const player = named.season.squad.find(row => row.id.startsWith('nrl-real-'))!;
    expect(player).toBeDefined();
    expect(nrlSelectionPromiseCandidates(named).some(row => row.id === player.id)).toBe(false);
    expect(promise(named, player.id)).toBe(named);
  });
});
