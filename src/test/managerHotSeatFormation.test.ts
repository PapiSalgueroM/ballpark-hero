import { beforeAll, describe, expect, it } from 'vitest';
import { FORMATIONS, effectiveXIWithSlots, isAvailable, matchEdge, preMatchRead } from '@/lib/clubManager';
import { dailyHotSeat, hotSeatLineup, hotSeatPool, hotSeatPreMatchRead, playHotSeatMatch, replayHotSeat, startHotSeat, type HotSeatRun } from '@/lib/managerHotSeat';

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

  it('ignores attempted formation changes in the shared Daily', () => {
    const daily = startHotSeat(dailyHotSeat('2026-11-14'));
    const index = (daily.state.formationIndex + 1) % FORMATIONS.length;
    const original = playHotSeatMatch(daily, 'balanced', null);
    const attempted = playHotSeatMatch(daily, 'balanced', null, index);
    expect(hotSeatLineup(daily, index)).toBe(daily.state);
    expect(attempted.actions).toEqual(original.actions);
    expect(attempted.log).toEqual(original.log);
    expect(attempted.state.formationIndex).toBe(original.state.formationIndex);
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
