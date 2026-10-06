/**
 * Round 924: the two changes MLB Career Path's hook made, fenced where the hook runs.
 *
 * 1. A surname guess skips a trailing Jr. and ignores accents (src/lib/careerGuess.ts), so "griffey" wins
 *    on Ken Griffey Jr. and "jr." alone does not. What's New promises "Griffey is enough", and putting the
 *    old last-word rule back in the hook turns the hook test below red.
 * 2. The daily save carries the row id (getPuzzleId), so a later change to the pool cannot hand today's
 *    clue log to a different player. Dropping getPuzzleId from the hook turns the save test red.
 */
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ SUPABASE_URL: 'https://stub.invalid', SUPABASE_PUBLISHABLE_KEY: 'stub-anon-key', supabase: {} }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));

import { baseballCareerPuzzles } from '@/data/baseballCareerPlayers';
import { useBaseballCareer } from '@/hooks/useBaseballCareer';
import { isCareerGuessMatch, surnameOf } from '@/lib/careerGuess';
import { getTodayET } from '@/lib/dateUtils';

const indexOf = (name: string) => {
  const i = baseballCareerPuzzles.findIndex((p) => p.player.name === name);
  if (i < 0) throw new Error(`${name} is not in the pool`);
  return i;
};

/** mount the hook with the unlimited draw landing on one named player */
async function mountOn(name: string) {
  const spy = vi.spyOn(Math, 'random').mockReturnValue((indexOf(name) + 0.5) / baseballCareerPuzzles.length);
  const view = renderHook(() => useBaseballCareer());
  spy.mockRestore();
  await waitFor(() => expect(view.result.current.isLoading).toBe(false));
  act(() => view.result.current.switchMode('unlimited'));
  expect(view.result.current.player?.name).toBe(name);
  return view;
}

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); localStorage.clear(); });

describe('MLB Career Path guess rule', () => {
  it('takes the surname without the Jr., never the Jr. alone, and ignores accents', () => {
    expect(surnameOf('Ken Griffey Jr.')).toBe('griffey');
    expect(surnameOf('Vladimir Guerrero Jr.')).toBe('guerrero');
    expect(isCareerGuessMatch('Griffey', 'Ken Griffey Jr.')).toBe(true);
    expect(isCareerGuessMatch('ken griffey jr.', 'Ken Griffey Jr.')).toBe(true);
    expect(isCareerGuessMatch('jr.', 'Ken Griffey Jr.')).toBe(false);
    expect(isCareerGuessMatch('acuna', 'Ronald Acuña Jr.')).toBe(true);
    expect(isCareerGuessMatch('Acuña', 'Ronald Acuna Jr.')).toBe(true);
    expect(isCareerGuessMatch('', 'Ken Griffey Jr.')).toBe(false);
  });

  it('gives every player in the pool a surname nobody else in the pool has', () => {
    const seen = new Map<string, string>();
    for (const p of baseballCareerPuzzles) {
      const s = surnameOf(p.player.name);
      expect(seen.get(s), `${p.player.name} shares "${s}"`).toBeUndefined();
      seen.set(s, p.player.name);
    }
    expect(seen.size).toBe(baseballCareerPuzzles.length);
  });

  it('wins on "griffey" in the hook and does not win on "jr."', async () => {
    const { result } = await mountOn('Ken Griffey Jr.');
    act(() => result.current.submitGuess('jr.'));
    expect(result.current.status).toBe('playing');
    act(() => result.current.submitGuess('griffey'));
    expect(result.current.status).toBe('guessed');
  });

  it('wins on an accented spelling of a name the pool stores plain', async () => {
    const { result } = await mountOn('Ronald Acuna Jr.');
    act(() => result.current.submitGuess('Acuña'));
    expect(result.current.status).toBe('guessed');
  });
});

describe('MLB Career Path daily save', () => {
  it("writes today's row id into the save", async () => {
    const { result } = renderHook(() => useBaseballCareer());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const id = result.current.puzzle?.id;
    expect(id).toMatch(/^bc-\d{3}$/);
    act(() => result.current.revealNextClue());
    const raw = localStorage.getItem(`baseball-career-daily-${getTodayET()}`);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string).puzzleId).toBe(id);
  });
});
