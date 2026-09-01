/**
 * Footle's daily answer must come from the pool that actually loaded.
 *
 * Round 384. useDailyPuzzle leaves `puzzles` out of its selection memo on
 * purpose (it gates the saved-board restore) and takes the real selection
 * through `supabasePuzzle`. Round 365 wired that into four hooks and missed
 * useGame.ts, which passed a pool DERIVED FROM STATE as `puzzles`: the memo
 * ran once against the 748 entry fallback file and never again when the
 * 1,507 player live pool arrived. Every daily answer since came from the
 * file, 1,173 of the 1,200 live insane-tier players could never be the
 * daily, and the file itself is stale (four of its names have no live row).
 *
 * This is a hook test rather than a source check because the defect IS the
 * React wiring: two pools that are each internally fine, paired by a
 * dependency array. A test that renders the real hook with the fetch mocked
 * to a pool the file cannot contain is the only thing that sees it.
 *
 * scripts/simFootleDaily.mjs runs this file and carries the negative
 * control: FOOTLE_HOOK points the test at a copy of the hook rewritten to
 * its pre-Round-384 shape, and the first test must then fail.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { Player, Difficulty } from '@/types/game';
import { players as fallbackFile } from '@/data/players';

const tiers: Difficulty[] = ['easy', 'hard', 'insane'];
const fetched: Player[] = tiers.flatMap((difficulty, t) =>
  Array.from({ length: 5 }, (_, i): Player => ({
    name: `Live ${difficulty} ${i + 1}`,
    club: `Live Club ${t}${i}`,
    nationality: 'Testland',
    league: 'Other',
    goals: i,
    assists: t,
    position: 'CM',
    kitNumber: 10 + i,
    age: 20 + i,
    marketValue: 5 + i,
    difficulty,
  })),
);

vi.mock('@/lib/fetchFootlePlayerPool', () => ({
  fetchFootlePlayerPool: () => Promise.resolve(fetched),
}));

// Completion tracking reads the auth context and writes to the database.
// Neither is under test here, and neither exists in a bare hook render.
vi.mock('@/hooks/useGameCompletion', () => ({
  useGameCompletion: () => undefined,
}));

const hookPath = process.env.FOOTLE_HOOK;
const { useGame } = hookPath
  ? await import(/* @vite-ignore */ hookPath)
  : await import('@/hooks/useGame');

async function mounted() {
  const rendered = renderHook(() => useGame());
  await waitFor(() => expect(rendered.result.current.isLoadingPool).toBe(false));
  await waitFor(() => expect(rendered.result.current.isLoading).toBe(false));
  return rendered;
}

describe('Footle daily target', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('is drawn from the fetched pool once it arrives, never from the bundled fallback file', async () => {
    const { result } = await mounted();
    const target = result.current.targetPlayer;
    expect(target).not.toBeNull();
    expect(fetched.map(p => p.name)).toContain(target!.name);
    expect(fallbackFile.some(p => p.name === target!.name)).toBe(false);
  });

  it('keeps a saved board across a reload, with the same target', async () => {
    const first = await mounted();
    const target = first.result.current.targetPlayer!;
    const wrong = fetched.find(p => p.name !== target.name)!;
    act(() => { first.result.current.makeGuess(wrong); });
    expect(first.result.current.guesses).toHaveLength(1);
    first.unmount();

    const second = await mounted();
    expect(second.result.current.targetPlayer!.name).toBe(target.name);
    expect(second.result.current.guesses).toHaveLength(1);
    expect(second.result.current.guesses[0].playerName).toBe(wrong.name);
  });
});
