/**
 * A daily save names the puzzle it was made against.
 *
 * Round 718 fix, from the review. useDailyPuzzle validated a save by date and
 * puzzleIndex alone. Career Ladder passes no static pool, so its index is 0
 * for every man on every day, and the hook restored at mount, before the
 * Supabase puzzle had landed, against no puzzle at all. Any change to the
 * day's answer (a live pool that grew the same day, a rotation start that a
 * release slipped past) therefore handed a finished log to a different man,
 * and the restore marked that finish as restored under the wrong answer.
 *
 * Now every save carries getPuzzleId of its puzzle when the game gives one,
 * a save whose id is not today's puzzle's is discarded, the load waits for
 * the puzzle when there is no static pool, and it re-runs when the puzzle's
 * id changes under the same index. Older saves have no id and still load.
 *
 * A hook test rather than a source check because the defect is the wiring:
 * the index, the mount order and the effect's dependency list.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { getTodayET } from '@/lib/dateUtils';
import { consumeRestoredFinish } from '@/lib/restoredFinish';

type Man = { id: string; name: string };
type Guess = string;

const SLUG = 'r718-identity-test';
const KEY = `${SLUG}-daily-${getTodayET()}`;
const NONE: Man[] = [];
const A: Man = { id: 'a-1', name: 'First Man' };
const B: Man = { id: 'b-2', name: 'Second Man' };
const STATIC: Man[] = [A, B, { id: 'c-3', name: 'Third Man' }];

function options(supabasePuzzle: Man | null, puzzles: Man[] = NONE, withId = true) {
  return {
    gameSlug: SLUG,
    puzzles,
    supabasePuzzle,
    ...(withId ? { getPuzzleId: (p: Man) => p.id } : {}),
    maxGuesses: 6,
    isWon: (g: Guess[], p: Man) => g.includes(p.name),
    deserializeGuesses: (raw: unknown) => raw as Guess[],
  };
}

/** Mount with no puzzle yet, then let `man` arrive, the way a Supabase fetch does. */
function mountThenArrive(man: Man) {
  const rendered = renderHook((props: { man: Man | null }) => useDailyPuzzle<Man, Guess>(options(props.man)), {
    initialProps: { man: null },
  });
  const before = { isLoading: rendered.result.current.isLoading, guesses: rendered.result.current.guesses };
  act(() => rendered.rerender({ man }));
  return { rendered, before };
}

function stored() {
  const raw = localStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
}

describe('useDailyPuzzle: the save carries the puzzle id', () => {
  beforeEach(() => {
    localStorage.clear();
    consumeRestoredFinish(SLUG);
  });

  it('waits for the Supabase puzzle when there is no static pool, then writes its id into the save', () => {
    const { rendered, before } = mountThenArrive(A);
    expect(before.isLoading).toBe(true);
    expect(before.guesses).toEqual([]);
    expect(rendered.result.current.isLoading).toBe(false);
    act(() => rendered.result.current.addGuess('wrong one'));
    const save = stored();
    expect(save).not.toBeNull();
    expect(save!.puzzleId).toBe('a-1');
    expect(save!.puzzleIndex).toBe(0);
    expect(save!.date).toBe(getTodayET());
  });

  it('restores a save under the same man', () => {
    const first = mountThenArrive(A);
    act(() => first.rendered.result.current.addGuess('wrong one'));
    first.rendered.unmount();
    const { rendered } = mountThenArrive(A);
    expect(rendered.result.current.guesses).toEqual(['wrong one']);
  });

  it('starts fresh when a different man arrives under the same index, and does not carry his finish across', () => {
    const first = mountThenArrive(A);
    act(() => first.rendered.result.current.addGuess(A.name));
    expect(first.rendered.result.current.gameStatus).toBe('won');
    first.rendered.unmount();
    const { rendered } = mountThenArrive(B);
    expect(rendered.result.current.guesses).toEqual([]);
    expect(rendered.result.current.gameStatus).toBe('playing');
    expect(rendered.result.current.isLoading).toBe(false);
    /* nothing was restored, so nothing may be marked as a restored finish:
       the player's real finish on B later must still be recorded */
    expect(consumeRestoredFinish(SLUG)).toBe(false);
  });

  it('marks a restored finish once, when the man it belongs to arrives', () => {
    const first = mountThenArrive(A);
    act(() => first.rendered.result.current.addGuess(A.name));
    first.rendered.unmount();
    const { rendered, before } = mountThenArrive(A);
    expect(before.guesses).toEqual([]);
    expect(rendered.result.current.gameStatus).toBe('won');
    expect(consumeRestoredFinish(SLUG)).toBe(true);
  });

  it('still reads a save written before the id existed', () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, date: getTodayET(), puzzleIndex: 0, guesses: ['old guess'], gameStatus: 'playing' }));
    const { rendered } = mountThenArrive(A);
    expect(rendered.result.current.guesses).toEqual(['old guess']);
  });

  it('a static pool game without getPuzzleId saves and restores exactly as before, with no id', () => {
    const first = renderHook(() => useDailyPuzzle<Man, Guess>(options(null, STATIC, false)));
    expect(first.result.current.isLoading).toBe(false);
    const shown = first.result.current.puzzle;
    expect(shown).not.toBeNull();
    act(() => first.result.current.addGuess('a guess'));
    const save = stored();
    expect(save).not.toBeNull();
    expect('puzzleId' in save!).toBe(false);
    first.unmount();
    const again = renderHook(() => useDailyPuzzle<Man, Guess>(options(null, STATIC, false)));
    expect(again.result.current.puzzle).toBe(shown);
    expect(again.result.current.guesses).toEqual(['a guess']);
  });
});
