import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLUBS, createLeague, LEGACY_SAVE_KEY, readLeagueSave, reduceLeague, SAVE_KEY, type LeagueAction, type LeagueState } from '@/lib/aussieRulesLeague';
import { useAussieRulesLeague } from '@/hooks/useAussieRulesLeague';
import { hashLabel, rngFrom } from '@/lib/careerEngine';

const outward = vi.hoisted(() => ({ record: vi.fn(), refresh: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: outward.refresh }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: outward.record, getCurrentPlayerName: () => 'Fixture manager' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));

beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const bot = (s: LeagueState): LeagueAction => s.phase === 'prepare' ? (s.match ? { type: 'prepare', choice: 'train' } : { type: 'simWeek' })
  : s.phase === 'quarter' || s.phase === 'break' ? { type: 'playMatch', tactic: 'control' }
  : s.phase === 'draft' && s.draft!.at < s.draft!.order.length ? { type: 'draftAuto' } : { type: 'next' };
const until = (s: LeagueState, done: (s: LeagueState) => boolean) => { let state = s; for (let n = 0; !done(state) && n < 5000; n += 1) state = reduceLeague(state, bot(state)); return state; };
const V1_SAVE = JSON.stringify({ version: 1, seed: 1234567, clubId: 'club-0', actions: [] });

describe('Aussie Rules Manager full season engine', () => {
  it('starts 18 fixed clubs of 36 generated players with unique names and a readable save', () => {
    const state = createLeague(2026, 'club-04')!;
    expect(state.clubs.map(club => club.id)).toEqual(CLUBS.map(club => club.id));
    expect(state.clubs.every(club => club.players.length === 36)).toBe(true);
    const names = state.clubs.flatMap(club => club.players.map(player => player.name));
    expect(new Set(names).size).toBe(648);
    expect(state.clubName).toBe(`${CLUBS[4].place} ${CLUBS[4].nickname}`);
    expect(readLeagueSave(JSON.stringify(state))).toEqual(state);
    expect(createLeague(2026, 'club-18')).toBeNull();
  });

  it('reads back a real save in every phase of a season and refuses forged ones', () => {
    let state = createLeague(77, 'club-12')!;
    const phases = new Set<string>();
    for (let n = 0; state.season === 1 && n < 5000; n += 1) {
      expect(readLeagueSave(JSON.stringify(state))).toEqual(state);
      phases.add(state.phase);
      state = reduceLeague(state, bot(state));
    }
    expect([...phases].sort()).toEqual(['draft', 'prepare', 'quarter', 'report', 'seasonOver', 'summer']);
    const forged = JSON.parse(JSON.stringify(state));
    forged.clubs[0].players[0].skill = forged.clubs[0].players[0].potential + 1;
    expect(readLeagueSave(JSON.stringify(forged))).toBeNull();
    expect(readLeagueSave(JSON.stringify({ ...state, version: 1 }))).toBeNull();
  }, 60000); // a whole season of save round trips took 8.2 s on a loaded machine, past the 5 s default

  it('spends the old rating budget one point at a time before summer, through both play modes', () => {
    const opening = createLeague(77, 'club-12', 'afl2026')!;
    const ratings = (state: LeagueState) => state.clubs.flatMap(club => club.players.map(player => player.skill));
    let quick = opening;
    let stepwise = opening;
    let up = 0;
    let down = 0;
    while (quick.stage === 'homeAway') {
      const prepared = reduceLeague(quick, { type: 'prepare', choice: 'rest' });
      const before = ratings(prepared);
      stepwise = reduceLeague(stepwise, { type: 'prepare', choice: 'rest' });
      for (let quarter = 0; quarter < 4; quarter++) {
        stepwise = reduceLeague(stepwise, { type: 'play', tactic: 'control' });
        if (quarter < 3) {
          expect(ratings(stepwise)).toEqual(before);
          stepwise = reduceLeague(stepwise, { type: 'next' });
        }
      }
      const report = reduceLeague(prepared, { type: 'playMatch', tactic: 'control' });
      expect(stepwise).toEqual(report);
      ratings(report).forEach((skill, i) => {
        const delta = skill - before[i];
        expect(Math.abs(delta)).toBeLessThanOrEqual(1);
        if (delta > 0) up++;
        if (delta < 0) down++;
      });
      expect(readLeagueSave(JSON.stringify(report))).toEqual(report);
      quick = reduceLeague(report, { type: 'next' });
      stepwise = reduceLeague(stepwise, { type: 'next' });
    }
    expect(up).toBeGreaterThan(0);
    expect(down).toBeGreaterThan(0);
    const rng = rngFrom(hashLabel(`${opening.seed}|${opening.season}|summer`));
    const oldBudget = opening.clubs.flatMap(club => club.players.map(player => {
      const roll = rng();
      const gain = player.age < 22 ? 2 + Math.floor(roll * 4) : player.age <= 25 ? Math.floor(roll * 4)
        : player.age <= 29 ? -1 + Math.floor(roll * 3) : -(1 + Math.floor(roll * 4));
      return Math.min(player.potential, Math.max(20, player.skill + gain));
    }));
    expect(ratings(quick)).toEqual(oldBudget);

    const completed = until(quick, state => state.phase === 'seasonOver');
    const summer = reduceLeague(completed, { type: 'next' });
    expect(ratings(summer)).toEqual(ratings(quick));
    expect(summer.clubs[0].players[0].age).toBe(completed.clubs[0].players[0].age + 1);
    const second = until(summer, state => state.season === 2);
    const existing = new Map(summer.clubs.flatMap(club => club.players.map(player => [player.id, player.skill])));
    expect(second.clubs.every(club => club.players.every(player => !existing.has(player.id) || existing.get(player.id) === player.skill))).toBe(true);
    expect(second.ratingReview).toBeUndefined();
    const invalid = { ...quick, ratingReview: { round: 0, changes: [[opening.clubs[0].players[0].id, 1]] } };
    expect(readLeagueSave(JSON.stringify(invalid))).toBeNull();
  }, 60000);
});

describe('useAussieRulesLeague', () => {
  it('removes the old ten round save on start and writes the whole state after each action', () => {
    localStorage.setItem(LEGACY_SAVE_KEY, V1_SAVE);
    const { result } = renderHook(() => useAussieRulesLeague());
    expect(result.current.state).toBeNull();
    act(() => { expect(result.current.start(99, 'club-02')).toBe(true); });
    expect(localStorage.getItem(LEGACY_SAVE_KEY)).toBeNull();
    act(() => { expect(result.current.dispatch({ type: 'prepare', choice: 'rest' })).toBe(true); });
    expect(readLeagueSave(localStorage.getItem(SAVE_KEY))).toEqual(result.current.state);
    act(() => { expect(result.current.dispatch({ type: 'prepare', choice: 'rest' })).toBe(false); });
  });

  it('records one completion for each finished season and stays quiet when a finished season is restored', () => {
    const { result, unmount } = renderHook(() => useAussieRulesLeague());
    act(() => { result.current.start(31, 'club-07'); });
    const play = (done: (s: LeagueState) => boolean) => { for (let n = 0; !done(result.current.state!) && n < 5000; n += 1) act(() => { result.current.dispatch(bot(result.current.state!)); }); };
    play(s => s.phase === 'seasonOver');
    expect(outward.record).toHaveBeenCalledTimes(1);
    expect(outward.record).toHaveBeenCalledWith('/aussie-rules-manager', undefined, 'Fixture manager', 0);
    unmount();
    const restored = renderHook(() => useAussieRulesLeague());
    expect(restored.result.current.state!.phase).toBe('seasonOver');
    expect(outward.record).toHaveBeenCalledTimes(1);
    const again = restored.result;
    for (let n = 0; !(again.current.state!.season === 2 && again.current.state!.phase === 'seasonOver') && n < 5000; n += 1) act(() => { again.current.dispatch(bot(again.current.state!)); });
    expect(outward.record).toHaveBeenCalledTimes(2);
  });

  it('keeps playing in memory with a notice when storage refuses writes', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    const { result } = renderHook(() => useAussieRulesLeague());
    act(() => { result.current.start(5, 'club-00'); });
    expect(result.current.state).not.toBeNull();
    expect(result.current.storageNotice).toMatch(/could not save/);
    act(() => { result.current.dispatch({ type: 'prepare', choice: 'train' }); });
    expect(result.current.state!.phase).toBe('quarter');
  });

  it('refuses an unreadable save whole, says so and leaves it in place', () => {
    const state = until(createLeague(8, 'club-09')!, s => s.round === 2);
    const broken = JSON.parse(JSON.stringify(state));
    broken.clubs[3].players.pop();
    localStorage.setItem(SAVE_KEY, JSON.stringify(broken));
    const { result } = renderHook(() => useAussieRulesLeague());
    expect(result.current.state).toBeNull();
    expect(result.current.storageNotice).toMatch(/could not be read/);
    expect(localStorage.getItem(SAVE_KEY)).toBe(JSON.stringify(broken));
  });
});
