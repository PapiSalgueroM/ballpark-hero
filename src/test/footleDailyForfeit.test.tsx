import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGame } from '@/hooks/useGame';

const { recordCompletion } = vi.hoisted(() => ({ recordCompletion: vi.fn() }));
vi.mock('@/lib/fetchFootlePlayerPool', async () => {
  const { practicePlayers } = await import('@/test/fixtures/footlePracticePlayers');
  return { fetchFootlePlayerPool: async () => practicePlayers };
});
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion, getCurrentPlayerName: () => 'Footle Fixture Guest' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

const DATE = '2026-10-17';
const SAVE_KEY = 'footle-daily-' + DATE;
const readSave = () => localStorage.getItem(SAVE_KEY);
const deliverSave = () => window.dispatchEvent(new StorageEvent('storage', {
  key: SAVE_KEY, newValue: readSave(), storageArea: localStorage,
}));
async function mounted() {
  const view = renderHook(useGame);
  await waitFor(() => {
    expect(view.result.current.isLoading).toBe(false);
    expect(view.result.current.isLoadingPool).toBe(false);
    expect(view.result.current.mode).toBe('daily');
    expect(view.result.current.targetPlayer).toBeTruthy();
  });
  return view;
}
function wrongPlayer(view: Awaited<ReturnType<typeof mounted>>) {
  const { targetPlayer, availablePlayers } = view.result.current;
  return availablePlayers.find(player => player.name !== targetPlayer!.name)!;
}

beforeEach(() => {
  localStorage.clear();
  recordCompletion.mockClear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(DATE + 'T12:00:00Z'));
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('Footle Daily give up owns the latest saved turn', () => {
  it.each(['before storage delivery', 'in the same batch as storage delivery'] as const)('keeps another tab’s win %s', async boundary => {
    const first = await mounted();
    const stale = await mounted();
    const giveUp = stale.result.current.giveUp;
    const target = first.result.current.targetPlayer!;
    const wrong = wrongPlayer(first);
    act(() => first.result.current.makeGuess(wrong));
    act(() => first.result.current.makeGuess(target));
    const won = readSave();
    expect(first.result.current.gameStatus).toBe('won');
    expect(stale.result.current.gameStatus).toBe('playing');
    expect(stale.result.current.guesses).toHaveLength(0);

    await act(async () => {
      if (boundary === 'in the same batch as storage delivery') deliverSave();
      giveUp();
    });

    expect(readSave()).toBe(won);
    expect(stale.result.current.gameStatus).toBe('won');
    expect(stale.result.current.guessedPlayerNames).toEqual([wrong.name, target.name]);
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/footle', 600, 'Footle Fixture Guest', 0);
    first.unmount();
    stale.unmount();

    const restored = await mounted();
    expect(restored.result.current.gameStatus).toBe('won');
    expect(restored.result.current.guessedPlayerNames).toEqual([wrong.name, target.name]);
    expect(readSave()).toBe(won);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('saves a true loss exactly once with the existing empty log format', async () => {
    const view = await mounted();
    act(() => {
      view.result.current.giveUp();
      view.result.current.giveUp();
    });

    const lost = JSON.stringify({ v: 1, date: DATE, puzzleIndex: 0, guesses: [], gameStatus: 'lost' });
    expect(readSave()).toBe(lost);
    expect(view.result.current.gameStatus).toBe('lost');
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/footle', 0, 'Footle Fixture Guest', 0);
    view.unmount();

    const restored = await mounted();
    expect(restored.result.current.gameStatus).toBe('lost');
    expect(restored.result.current.guesses).toEqual([]);
    expect(readSave()).toBe(lost);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('keeps a guess made just before giving up in the same render turn', async () => {
    const view = await mounted();
    const wrong = wrongPlayer(view);
    act(() => {
      view.result.current.makeGuess(wrong);
      view.result.current.giveUp();
    });

    const guesses = view.result.current.guesses;
    const lost = JSON.stringify({ v: 1, date: DATE, puzzleIndex: 0, guesses, gameStatus: 'lost' });
    expect(view.result.current.gameStatus).toBe('lost');
    expect(view.result.current.guessedPlayerNames).toEqual([wrong.name]);
    expect(readSave()).toBe(lost);
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/footle', 0, 'Footle Fixture Guest', 0);
    view.unmount();

    const restored = await mounted();
    expect(restored.result.current.gameStatus).toBe('lost');
    expect(restored.result.current.guessedPlayerNames).toEqual([wrong.name]);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });
});
