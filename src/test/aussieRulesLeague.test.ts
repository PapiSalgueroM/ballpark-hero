import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLUBS, createLeague, LEGACY_SAVE_KEY, readLeagueSave, reduceLeague, SAVE_KEY, type LeagueAction, type LeagueState } from '@/lib/aussieRulesLeague';
import { useAussieRulesLeague } from '@/hooks/useAussieRulesLeague';

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
  });
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
