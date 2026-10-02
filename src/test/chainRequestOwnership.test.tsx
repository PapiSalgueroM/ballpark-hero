import { act, cleanup, renderHook, type RenderHookResult } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTennisChain } from '@/hooks/useTennisChain';
import { useNascarChain } from '@/hooks/useNascarChain';

// All validator answers and connections below are synthetic test fixtures.
const boundary = vi.hoisted(() => ({ invoke: vi.fn(), record: vi.fn(), toast: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: boundary.invoke } } }));
vi.mock('@/lib/completions', () => ({ recordCompletion: boundary.record, getCurrentPlayerName: () => 'ChainFixtureGuest' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { error: boundary.toast, success: vi.fn() } }));
vi.mock('@/lib/dateUtils', () => ({ getTodayET: () => '2026-10-02' }));

type ChainState = NonNullable<ReturnType<typeof useTennisChain>['gameState']> | NonNullable<ReturnType<typeof useNascarChain>['gameState']>;
type ChainApi = {
  gameState: ChainState | null;
  validating: boolean;
  startGame: (mode: 'daily' | 'unlimited') => void;
  makeGuess: (name: string) => Promise<void>;
  giveUp: () => void;
  resetGame: () => void;
};
type HookView = RenderHookResult<ChainApi, undefined>;
type Reply = { data: { valid: boolean; fullName?: string; connection?: string; unverified?: boolean; reason?: string } | null; error: Error | null };
type Outcome = 'accepted' | 'rejected' | 'unverified' | 'transport error';
const games = [
  { label: 'Tennis', slug: 'tennis-chain', endpoint: 'tennis-chain-validate', useChain: useTennisChain },
  { label: 'NASCAR', slug: 'nascar-chain', endpoint: 'nascar-chain-validate', useChain: useNascarChain },
];

function deferred() {
  let resolve!: (reply: Reply) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<Reply>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const accepted = (name: string): Reply => ({ data: { valid: true, fullName: name, connection: 'Synthetic fixture connection' }, error: null });
const currentName = (state: ChainState) => 'currentPlayer' in state ? state.currentPlayer : state.currentDriver;
const usedNames = (state: ChainState) => 'usedPlayers' in state ? state.usedPlayers : state.usedDrivers;
const names = (state: ChainState) => state.chain.map(link => 'playerName' in link ? link.playerName : link.driverName);

function begin(view: HookView, name: string) {
  let work!: Promise<void>;
  act(() => { work = view.result.current.makeGuess(name); });
  return work;
}
async function settle(request: ReturnType<typeof deferred>, work: Promise<void>, outcome: Outcome, name = 'Fixture Late Canonical') {
  await act(async () => {
    if (outcome === 'transport error') request.reject(new Error('Synthetic transport failure'));
    else request.resolve(outcome === 'accepted' ? accepted(name) : {
      data: { valid: false, reason: 'Synthetic delayed rejection', ...(outcome === 'unverified' ? { unverified: true } : {}) }, error: null,
    });
    await work;
  });
}
async function addLink(view: HookView, name: string) {
  boundary.invoke.mockResolvedValueOnce(accepted(name));
  await act(async () => { await view.result.current.makeGuess(name); });
}

beforeEach(() => {
  vi.clearAllMocks();
  boundary.invoke.mockReset();
  vi.spyOn(Math, 'random').mockReturnValue(0);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

for (const game of games) describe(`${game.label} chain request ownership`, () => {
  function start() {
    const view = renderHook<ChainApi, undefined>(() => game.useChain());
    act(() => view.result.current.startGame('daily'));
    return view;
  }

  it('ordinary acceptance preserves connection, used names, score and one completion', async () => {
    const view = start();
    const starter = currentName(view.result.current.gameState!);
    await addLink(view, 'Fixture First Canonical');
    const state = view.result.current.gameState!;
    expect(boundary.invoke).toHaveBeenCalledExactlyOnceWith(game.endpoint, { body: game.label === 'Tennis'
      ? { currentPlayer: starter, guessedPlayer: 'Fixture First Canonical' }
      : { currentDriver: starter, guessedDriver: 'Fixture First Canonical' } });
    expect(names(state)).toEqual([starter, 'Fixture First Canonical']);
    expect(state.chain[0]).toMatchObject(game.label === 'Tennis' ? { slamConnection: 'Synthetic fixture connection' } : { connection: 'Synthetic fixture connection' });
    expect(usedNames(state)).toEqual(new Set([starter.toLowerCase(), 'fixture first canonical']));
    expect(state).toMatchObject({ score: 100, rawScore: 100, gameStatus: 'playing' });
    expect(view.result.current.validating).toBe(false);
    expect(boundary.record).not.toHaveBeenCalled();
    act(() => view.result.current.giveUp());
    expect(boundary.record).toHaveBeenCalledExactlyOnceWith(`/${game.slug}`, 100, 'ChainFixtureGuest', 0);
  });

  it('ordinary long chains retain the five-link and ten-link bonuses and earned badge', async () => {
    const view = start();
    for (let index = 1; index <= 10; index += 1) {
      await addLink(view, `Fixture Link ${index}`);
      if (index === 5) expect(view.result.current.gameState).toMatchObject({ score: 750, rawScore: 500 });
    }
    expect(view.result.current.gameState).toMatchObject({ score: 2000, rawScore: 1000 });
    expect(names(view.result.current.gameState!)).toHaveLength(11);
    act(() => view.result.current.giveUp());
    expect(view.result.current.gameState?.earnedBadge?.threshold).toBe(10);
    expect(boundary.record).toHaveBeenCalledExactlyOnceWith(`/${game.slug}`, 2000, 'ChainFixtureGuest', 0);
  });

  it('ordinary rejection ends the current run with its existing score and one completion', async () => {
    const view = start();
    await addLink(view, 'Fixture Prior Link');
    const chain = view.result.current.gameState!.chain;
    const request = deferred();
    boundary.invoke.mockReturnValueOnce(request.promise);
    const work = begin(view, 'Fixture Rejected Link');
    await settle(request, work, 'rejected');
    expect(view.result.current.gameState).toMatchObject({ gameStatus: 'ended', score: 100, gameOverReason: 'Synthetic delayed rejection', chain });
    expect(boundary.toast).not.toHaveBeenCalled();
    expect(boundary.record).toHaveBeenCalledExactlyOnceWith(`/${game.slug}`, 100, 'ChainFixtureGuest', 0);
  });

  it.each(['unverified', 'transport error'] as const)('ordinary %s remains a retry without ending or paying points', async outcome => {
    const view = start();
    const initial = view.result.current.gameState;
    const request = deferred();
    boundary.invoke.mockReturnValueOnce(request.promise);
    const work = begin(view, 'Fixture Retry Link');
    await settle(request, work, outcome);
    expect(view.result.current.gameState).toEqual(initial);
    expect(view.result.current.validating).toBe(false);
    expect(boundary.toast).toHaveBeenCalledOnce();
    expect(boundary.record).not.toHaveBeenCalled();
    await addLink(view, 'Fixture Retry Canonical');
    expect(view.result.current.gameState).toMatchObject({ score: 100, gameStatus: 'playing' });
  });

  it('an ordinary repeated name ends the run without invoking the validator again', async () => {
    const view = start();
    await addLink(view, 'Fixture Prior Link');
    await act(async () => { await view.result.current.makeGuess('FIXTURE PRIOR LINK'); });
    expect(boundary.invoke).toHaveBeenCalledOnce();
    expect(view.result.current.gameState).toMatchObject({ gameStatus: 'ended', score: 100, gameOverReason: 'You already used FIXTURE PRIOR LINK in this chain!' });
    expect(boundary.record).toHaveBeenCalledExactlyOnceWith(`/${game.slug}`, 100, 'ChainFixtureGuest', 0);
  });

  it('ordinary pending input invokes the validator once even within the same input frame', async () => {
    const view = start();
    const request = deferred();
    boundary.invoke.mockReturnValue(request.promise);
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = view.result.current.makeGuess('Fixture Pending Link');
      second = view.result.current.makeGuess('Fixture Pending Link');
    });
    await act(async () => {
      request.resolve(accepted('Fixture Pending Canonical'));
      await Promise.all([first, second]);
    });
    expect(boundary.invoke).toHaveBeenCalledOnce();
    expect(view.result.current.gameState).toMatchObject({ score: 100, rawScore: 100, gameStatus: 'playing' });
    expect(names(view.result.current.gameState!)).toHaveLength(2);
  });

  for (const exit of ['give up', 'reset', 'new run'] as const) {
    it.each(['accepted', 'rejected', 'unverified', 'transport error'] as const)(`ignores stale %s after ${exit}`, async outcome => {
      const view = start();
      await addLink(view, 'Fixture Prior Link');
      const request = deferred();
      boundary.invoke.mockReturnValueOnce(request.promise);
      const work = begin(view, 'Fixture Late Link');
      expect(view.result.current.validating).toBe(true);
      if (exit !== 'reset') act(() => view.result.current.giveUp());
      if (exit !== 'give up') act(() => view.result.current.resetGame());
      if (exit === 'new run') act(() => view.result.current.startGame('unlimited'));
      const afterExit = view.result.current.gameState;
      const lockAfterExit = view.result.current.validating;
      const bookingsAfterExit = [...boundary.record.mock.calls];
      await settle(request, work, outcome);
      expect(view.result.current.gameState).toEqual(afterExit);
      expect(lockAfterExit).toBe(false);
      expect(view.result.current.validating).toBe(false);
      expect(boundary.toast).not.toHaveBeenCalled();
      expect(boundary.record.mock.calls).toEqual(bookingsAfterExit);
    });
  }

  it.each(['accepted', 'rejected'] as const)('ignores stale %s after directly starting another mode', async outcome => {
    const view = start();
    const request = deferred();
    boundary.invoke.mockReturnValueOnce(request.promise);
    const work = begin(view, 'Fixture Previous Mode Link');
    act(() => view.result.current.startGame('unlimited'));
    const fresh = view.result.current.gameState;
    const lockAfterStart = view.result.current.validating;
    await settle(request, work, outcome);
    expect(view.result.current.gameState).toEqual(fresh);
    expect(lockAfterStart).toBe(false);
    expect(boundary.record).not.toHaveBeenCalled();
  });

  it.each(['unverified', 'transport error'] as const)('ignores stale %s after unmount without a toast or completion', async outcome => {
    const view = start();
    const request = deferred();
    boundary.invoke.mockReturnValueOnce(request.promise);
    const work = begin(view, 'Fixture Unmounted Link');
    view.unmount();
    await settle(request, work, outcome);
    expect(boundary.toast).not.toHaveBeenCalled();
    expect(boundary.record).not.toHaveBeenCalled();
  });

  it.each(['accepted', 'transport error'] as const)('stale %s cannot settle or unlock the next run current request', async outcome => {
    const view = start();
    const old = deferred();
    boundary.invoke.mockReturnValueOnce(old.promise);
    const oldWork = begin(view, 'Fixture Old Link');
    act(() => view.result.current.giveUp());
    act(() => view.result.current.resetGame());
    act(() => view.result.current.startGame('unlimited'));
    const current = deferred();
    boundary.invoke.mockReturnValueOnce(current.promise);
    const newWork = begin(view, 'Fixture Current Link');
    const fresh = view.result.current.gameState;
    await settle(old, oldWork, outcome);
    expect(view.result.current.gameState).toEqual(fresh);
    expect(view.result.current.validating).toBe(true);
    expect(boundary.toast).not.toHaveBeenCalled();
    expect(boundary.invoke).toHaveBeenCalledTimes(2);
    await settle(current, newWork, 'accepted', 'Fixture Current Canonical');
    expect(view.result.current.gameState).toMatchObject({ score: 100, gameStatus: 'playing' });
    expect(names(view.result.current.gameState!)).toEqual([currentName(fresh!), 'Fixture Current Canonical']);
    expect(view.result.current.validating).toBe(false);
    act(() => view.result.current.giveUp());
    expect(boundary.record.mock.calls.map(call => call[1])).toEqual([0, 100]);
  });
});
