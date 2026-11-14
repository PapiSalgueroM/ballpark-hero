import { beforeAll, describe, expect, it } from 'vitest';
import { FORMATIONS, effectiveXIWithSlots, fitGrade, isAvailable, matchEdge, preMatchRead } from '@/lib/clubManager';
import { answerHotSeatPress, dailyHotSeat, handoverState, hotSeatLineup, hotSeatPool, hotSeatPreMatchRead, hotSeatReplacementLineup, hotSeatReserves, pendingPress, playHotSeatMatch, replayHotSeat, startHotSeat, type HotSeatRun } from '@/lib/managerHotSeat';

let free: HotSeatRun;
let nextFormation: number;

beforeAll(() => {
  free = startHotSeat({ club: hotSeatPool()[0].club, seed: 42, rules: 1331, tie: 1603 });
  nextFormation = FORMATIONS.findIndex((formation, index) => index !== free.state.formationIndex && formation.name === '3-4-2-1');
  expect(nextFormation).toBeGreaterThanOrEqual(0);
}, 120000);

describe('Manager Hot Seat free play formations', () => {
  it('previews the actual eligible XI, applies the formation at kickoff, and replays the match', () => {
    const preview = hotSeatLineup(free, nextFormation);
    const starters = effectiveXIWithSlots(preview);
    expect(preview.formationIndex).toBe(nextFormation);
    expect(free.state.formationIndex).not.toBe(nextFormation);
    expect(new Set(starters.map(({ p }) => p.id)).size).toBe(11);
    expect(starters.every(({ p }) => isAvailable(p))).toBe(true);
    expect(matchEdge(preview)).not.toBe(matchEdge(free.state));

    const played = playHotSeatMatch(free, 'balanced', null, nextFormation);
    expect(played.actions).toEqual([{ t: 'match', m: 'balanced', talk: null, formation: nextFormation }]);
    expect(played.state.formationIndex).toBe(nextFormation);
    expect(played.state.xiIds).toEqual(preview.xiIds);
    expect(played.target).toBe(free.target);
    const replayed = replayHotSeat(played.setup, played.actions);
    expect(replayed.log).toEqual(played.log);
    expect(replayed.state.formationIndex).toBe(nextFormation);
    expect(effectiveXIWithSlots(replayed.state).map(({ p }) => p.name)).toEqual(effectiveXIWithSlots(played.state).map(({ p }) => p.name));
  }, 120000);

  it('keeps legacy match actions unchanged when there is no valid formation change', () => {
    const legacy = playHotSeatMatch(free, 'balanced', null);
    for (const index of [free.state.formationIndex, -1, FORMATIONS.length, 0.5]) {
      const run = playHotSeatMatch(free, 'balanced', null, index);
      expect(hotSeatLineup(free, index)).toBe(free.state);
      expect(run.actions).toEqual(legacy.actions);
      expect(run.log).toEqual(legacy.log);
    }
  }, 120000);

  it('offers every available outfield reserve and starts the selected one without moving the other ten', () => {
    const original = hotSeatLineup(free, nextFormation);
    const xi = effectiveXIWithSlots(original);
    const slot = xi.findIndex(({ slot }) => slot?.label === 'CB');
    const options = hotSeatReserves(original, slot);
    const startingIds = xi.map(({ p }) => p.id);
    const eligible = original.squad.filter(p => !startingIds.includes(p.id) && isAvailable(p) && p.position !== 'GK');
    expect(options.map(p => p.id).sort()).toEqual(eligible.map(p => p.id).sort());
    const reserve = [...options].filter(p => fitGrade(p, xi[slot].slot!) === 'wrong').sort((a, b) => a.rating - b.rating)[0];
    expect(reserve).toBeDefined();
    const replacement = { slot, outId: xi[slot].p.id, playerId: reserve.id };
    const expectedIds = startingIds.map((id, index) => index === slot ? reserve.id : id);
    expect(effectiveXIWithSlots(hotSeatReplacementLineup(original, replacement)!).map(({ p }) => p.id)).toEqual(expectedIds);

    const played = playHotSeatMatch(free, 'balanced', null, nextFormation, replacement);
    expect(played.actions).toEqual([{ t: 'match', m: 'balanced', talk: null, formation: nextFormation, replacement }]);
    expect(played.state.xiIds).toEqual(expectedIds);
    expect(played.state.squad.find(p => p.id === reserve.id)?.apps).toBe((reserve.apps ?? 0) + 1);
    const replayed = replayHotSeat(played.setup, JSON.parse(JSON.stringify(played.actions)));
    expect(replayed.log).toEqual(played.log);
    expect(replayed.state.xiIds).toEqual(expectedIds);
    expect(replayed.state.squad.find(p => p.id === reserve.id)?.apps).toBe((reserve.apps ?? 0) + 1);
  }, 120000);

  it('rejects unavailable players, starters, stale outgoing identities, and keeper swaps', () => {
    const xi = effectiveXIWithSlots(free.state);
    const slot = xi.findIndex(({ slot }) => slot?.label === 'CB');
    const goalkeeperSlot = xi.findIndex(({ slot }) => slot?.label === 'GK');
    const reserve = hotSeatReserves(free.state, slot)[0];
    const replacement = { slot, outId: xi[slot].p.id, playerId: reserve.id };
    const injured = { ...free.state, squad: free.state.squad.map(p => p.id === reserve.id ? { ...p, injuryWeeks: 2 } : p) };
    expect(hotSeatReserves(injured, slot).some(p => p.id === reserve.id)).toBe(false);
    expect(hotSeatReplacementLineup(injured, replacement)).toBeNull();
    for (const bad of [
      { ...replacement, outId: 'stale' },
      { ...replacement, playerId: xi[goalkeeperSlot].p.id },
      { ...replacement, slot: goalkeeperSlot, outId: xi[goalkeeperSlot].p.id },
    ]) {
      expect(playHotSeatMatch(free, 'balanced', null, undefined, bad)).toBe(free);
    }
    expect(replayHotSeat(free.setup, [{ t: 'match', m: 'balanced', talk: null, replacement: { ...replacement, outId: 'stale' } }]).actions).toEqual([]);
  }, 120000);

  it('ignores attempted formation changes in the shared Daily', () => {
    const daily = startHotSeat(dailyHotSeat('2026-11-14'));
    const index = (daily.state.formationIndex + 1) % FORMATIONS.length;
    const original = playHotSeatMatch(daily, 'balanced', null);
    const attempted = playHotSeatMatch(daily, 'balanced', null, index, { slot: 1, outId: 'outgoing', playerId: 'reserve' });
    expect(hotSeatLineup(daily, index)).toBe(daily.state);
    expect(attempted.actions).toEqual(original.actions);
    expect(attempted.log).toEqual(original.log);
    expect(attempted.state.formationIndex).toBe(original.state.formationIndex);
  }, 120000);

  it('reports actual squad rating gains and losses from settled matches and replays them', () => {
    let run = startHotSeat({ ...free.setup, club: 'Manchester City', inSeasonRatings: true });
    expect(run.state.inSeasonRatings).toBe(true);
    const moves: number[] = [];
    let unchanged = 0;
    for (let i = 0; i < 8 && !run.verdict; i++) {
      if (pendingPress(run)) run = answerHotSeatPress(run, 0);
      const before = new Map(run.state.squad.map(p => [p.id, p.rating]));
      run = playHotSeatMatch(run, 'balanced', null);
      const fixture = run.log.at(-1)!;
      const expected = run.state.squad.flatMap(p => {
        const start = before.get(p.id);
        return start !== undefined && start !== p.rating ? [{ id: p.id, name: p.name, before: start, after: p.rating }] : [];
      });
      expect(fixture.ratingChanges?.filter(p => !p.onLoan)).toEqual(expected);
      if (!fixture.counts) expect(fixture.ratingChanges).toEqual([]);
      if (!fixture.ratingChanges?.length) unchanged += 1;
      moves.push(...expected.map(p => p.after - p.before));
    }
    expect(moves).toContain(1);
    expect(moves).toContain(-1);
    expect(unchanged).toBeGreaterThan(0);
    expect(run.verdict?.kind).toBe('survived');
    expect(handoverState(run).inSeasonRatings).toBe(true);
    expect(replayHotSeat(run.setup, JSON.parse(JSON.stringify(run.actions))).log).toEqual(run.log);
  }, 120000);

  it('leaves older Free Play and shared Daily on their original rating rules', () => {
    const old = playHotSeatMatch(free, 'balanced', null);
    expect(old.state.inSeasonRatings).toBeUndefined();
    expect(old.log[0]).not.toHaveProperty('ratingChanges');
    expect(replayHotSeat(old.setup, old.actions).log).toEqual(old.log);

    const setup = dailyHotSeat('2026-10-10');
    const current = playHotSeatMatch(startHotSeat(setup), 'balanced', null);
    const injected = playHotSeatMatch(startHotSeat({ ...setup, inSeasonRatings: true }), 'balanced', null);
    expect(injected.state.inSeasonRatings).toBeUndefined();
    expect(injected.log).toEqual(current.log);
    expect(injected.log[0]).not.toHaveProperty('ratingChanges');
  }, 120000);

  it('reads a vacant fullback slot under the same policy as the archived Daily kickoff', () => {
    const daily = startHotSeat(dailyHotSeat('2026-10-10'));
    const { state } = daily;
    const xiIds = state.xiIds.map((id, i) => ['RB', 'LB'].includes(FORMATIONS[state.formationIndex].slots[i].label) ? null : id);
    const clubStrengths = Object.fromEntries(Object.entries(state.clubStrengths).map(([club, strength]) =>
      [club, club === state.clubName ? strength : strength - 3]));
    const lineup = { ...state, xiIds, clubStrengths };
    const current = 'Two defeats in three, against a side you are better than. They know it and so do you.';
    expect(preMatchRead(lineup)).toBe(current);
    expect(hotSeatPreMatchRead(daily, lineup)).toBe('Nothing between the sides. This is a game about who wants it more.');
    expect(hotSeatPreMatchRead({ ...daily, setup: { ...daily.setup, daily: '2026-11-14' } }, lineup)).toBe(current);
    expect(hotSeatPreMatchRead(free, lineup)).toBe(current);
  }, 120000);
});
