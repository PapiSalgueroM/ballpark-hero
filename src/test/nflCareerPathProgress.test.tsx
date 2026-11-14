import './dailyReload/mocks';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNFLCareer } from '@/hooks/useNFLCareer';
import { consumeRestoredFinish } from '@/lib/restoredFinish';
import { recordCompletion, resetMocks } from './dailyReload/mocks';

const key = 'nfl-career-daily';
const day = '2026-11-14';
const names = ['Patrick Mahomes', 'Tom Brady', 'Peyton Manning'];

beforeEach(() => {
  localStorage.clear();
  resetMocks();
  consumeRestoredFinish('nfl-career');
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(day + 'T16:00:00Z'));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const guessesFor = (target: string) => names.filter(name => name !== target).slice(0, 2);

describe('NFL Career Path Daily progress', () => {
  it('retains accepted misses and clue score across Unlimited and remount', () => {
    let view = renderHook(useNFLCareer);
    const target = view.result.current.targetPlayer.name;
    const guesses = guessesFor(target);
    guesses.forEach(name => act(() => view.result.current.makeGuess(name)));
    expect(view.result.current.cluesRevealed).toBe(3);
    act(() => view.result.current.switchMode('unlimited'));
    act(() => view.result.current.makeGuess(view.result.current.targetPlayer.name));
    act(() => view.result.current.switchMode('daily'));
    expect(view.result.current.guessHistory).toEqual(guesses);
    expect(view.result.current.cluesRevealed).toBe(3);
    expect(view.result.current.score).toBe(4);
    const bytes = localStorage.getItem(key);
    expect(bytes).toBeTruthy();
    view.unmount();
    view = renderHook(useNFLCareer);
    expect(view.result.current.targetPlayer.name).toBe(target);
    expect(view.result.current.guessHistory).toEqual(guesses);
    expect(view.result.current.cluesRevealed).toBe(3);
    expect(localStorage.getItem(key)).toBe(bytes);
    expect(recordCompletion).not.toHaveBeenCalled();
    act(() => view.result.current.makeGuess(target));
    expect(view.result.current.gameStatus).toBe('won');
    expect(recordCompletion.mock.calls.map(([path, score]) => [path, score])).toEqual([['/nfl-career', 4]]);
    view.unmount();
    view = renderHook(useNFLCareer);
    expect(view.result.current.gameStatus).toBe('won');
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('adopts the winning tab before a stale tab can finish or replace its score', () => {
    const active = renderHook(useNFLCareer);
    const stale = renderHook(useNFLCareer);
    const target = active.result.current.targetPlayer.name;
    const [miss] = guessesFor(target);
    act(() => active.result.current.makeGuess(miss));
    act(() => {
      stale.result.current.giveUp();
      stale.result.current.makeGuess(target);
    });
    expect(stale.result.current.gameStatus).toBe('playing');
    expect(stale.result.current.guessHistory).toEqual([miss]);
    expect(recordCompletion).not.toHaveBeenCalled();
    act(() => active.result.current.makeGuess(target));
    const held = localStorage.getItem(key);
    act(() => stale.result.current.giveUp());
    expect(stale.result.current.gameStatus).toBe('won');
    expect(localStorage.getItem(key)).toBe(held);
    expect(recordCompletion.mock.calls.map(([path, score]) => [path, score])).toEqual([['/nfl-career', 5]]);
  });

  it('does not write yesterday over actual progress already saved for today', () => {
    const yesterday = renderHook(useNFLCareer);
    vi.setSystemTime(new Date('2026-11-15T05:01:00Z'));
    const today = renderHook(useNFLCareer);
    const miss = guessesFor(today.result.current.targetPlayer.name)[0];
    act(() => today.result.current.makeGuess(miss));
    const held = localStorage.getItem(key);
    act(() => yesterday.result.current.giveUp());
    expect(yesterday.result.current.gameStatus).toBe('playing');
    expect(yesterday.result.current.targetPlayer).toBe(today.result.current.targetPlayer);
    expect(yesterday.result.current.guessHistory).toEqual([miss]);
    expect(localStorage.getItem(key)).toBe(held);
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('keeps live misses and a finish on denied storage and retries without another finish', () => {
    const view = renderHook(useNFLCareer);
    const target = view.result.current.targetPlayer.name;
    const [miss] = guessesFor(target);
    const refuse = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage denied'); });
    act(() => view.result.current.makeGuess(miss));
    expect(view.result.current.saveWarning).toBe(true);
    act(() => view.result.current.switchMode('unlimited'));
    act(() => view.result.current.switchMode('daily'));
    expect(view.result.current.guessHistory).toEqual([miss]);
    act(() => view.result.current.makeGuess(target));
    expect(view.result.current.gameStatus).toBe('won');
    expect(view.result.current.saveWarning).toBe(true);
    expect(localStorage.getItem(key)).toBeNull();
    refuse.mockRestore();
    act(() => view.result.current.retrySave());
    expect(view.result.current.saveWarning).toBe(false);
    expect(JSON.parse(localStorage.getItem(key) ?? '').guesses).toEqual([miss, target]);
    view.unmount();
    expect(renderHook(useNFLCareer).result.current.gameStatus).toBe('won');
    expect(recordCompletion.mock.calls.map(([path, score]) => [path, score])).toEqual([['/nfl-career', 5]]);
  });

  it('keeps a legacy finished result and rejects a wrong-target partial record', () => {
    const bytes = JSON.stringify({ date: day, status: 'lost', cluesRevealed: 2, guesses: ['Tom Brady'] });
    localStorage.setItem(key, bytes);
    const view = renderHook(useNFLCareer);
    expect(view.result.current.gameStatus).toBe('lost');
    expect(localStorage.getItem(key)).toBe(bytes);
    view.unmount();
    const wrongTarget = JSON.stringify({ date: day, status: 'playing', cluesRevealed: 2, guesses: ['Tom Brady'], player: 'Different name' });
    localStorage.setItem(key, wrongTarget);
    const fresh = renderHook(useNFLCareer);
    expect(fresh.result.current.gameStatus).toBe('playing');
    expect(fresh.result.current.cluesRevealed).toBe(1);
    expect(fresh.result.current.guessHistory).toEqual([]);
    expect(localStorage.getItem(key)).toBe(wrongTarget);
    expect(recordCompletion).not.toHaveBeenCalled();
  });
});
