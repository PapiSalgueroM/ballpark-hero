import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { getTodayET, dailyIndex } from '@/lib/dateUtils';

// ---------------------------------------------------------------------------
// Schema version
// ---------------------------------------------------------------------------

/**
 * Increment this constant whenever the shape of PersistedDailyState changes
 * in a way that is not backward-compatible. Any stored entry with a different
 * version is discarded and the user starts the day fresh.
 */
const SCHEMA_VERSION = 1 as const;

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface PersistedDailyState<G> {
  /** Schema version, see SCHEMA_VERSION above. */
  v: typeof SCHEMA_VERSION;
  /** YYYY-MM-DD (ET), redundant with storage key but used for validation. */
  date: string;
  /** Index in the puzzles array that was served today. */
  puzzleIndex: number;
  /** Full guess history. */
  guesses: G[];
  /** Game outcome at the time of last save. */
  gameStatus: 'playing' | 'won' | 'lost';
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface DailyPuzzleOptions<T, G> {
  /**
   * Unique slug for this game.
   * Used as the localStorage key prefix: `{gameSlug}-daily-{date}`.
   * Must match the slug used in useGameCompletion and daily_completions.
   * e.g. 'footle', 'soccer-connections', 'nfl-career'
   */
  gameSlug: string;

  /**
   * The full static puzzle pool.
   * The hook selects from this array using the date seed.
   * Required even when supabasePuzzle is provided, used as fallback.
   */
  puzzles: T[];

  /**
   * Pre-fetched puzzle from a Supabase daily table.
   * When non-null, overrides date-seed selection entirely.
   * The hook still manages localStorage persistence.
   * Default: null (use date-seed selection).
   */
  supabasePuzzle?: T | null;

  /**
   * Extract a stable string ID from a puzzle object.
   * Required for games that pass supabasePuzzle, Supabase deserializes
   * fresh objects whose reference identity differs from the static array,
   * so indexOf() always returns -1. getPuzzleId uses value equality instead.
   *
   * Games using only date-seed selection can omit this.
   *
   * e.g. (puzzle) => String(puzzle.id)
   */
  getPuzzleId?: (puzzle: T) => string;

  /**
   * Maximum number of guesses before gameStatus becomes 'lost'.
   * Pass Infinity for games with no guess limit (e.g. Connections).
   */
  maxGuesses: number;

  /**
   * Called after each addGuess(). Return true when the player has won.
   * The hook sets gameStatus to 'won' and stops accepting further guesses.
   */
  isWon: (guesses: G[], puzzle: T) => boolean;

  /**
   * Optional custom loss condition beyond maxGuesses.
   * The hook also auto-triggers loss when guesses.length >= maxGuesses.
   * Default: () => false
   */
  isLost?: (guesses: G[], puzzle: T) => boolean;

  /**
   * Deserialize the raw guess array from JSON.parse back into type G[].
   * JSON.parse returns `any`; this callback restores the correct type.
   * Keep it simple, typically just a type assertion:
   *   e.g. (raw) => raw as GuessResult[]
   */
  deserializeGuesses: (raw: unknown) => G[];
}

export interface DailyPuzzleReturn<T, G> {
  /** The selected puzzle for today. Null only if puzzles array is empty. */
  puzzle: T | null;

  /** All guesses made so far, restored from localStorage on mount. */
  guesses: G[];

  /**
   * Submit a guess. No-ops if gameStatus !== 'playing' or puzzle is null.
   * Persists to localStorage immediately after each call.
   * Triggers win/loss evaluation via isWon / isLost callbacks.
   */
  addGuess: (guess: G) => void;

  /** Current game outcome. Persisted to localStorage. */
  gameStatus: 'playing' | 'won' | 'lost';

  /**
   * True until the hook has read localStorage and resolved the puzzle.
   * For date-seeded games this resolves after one effect tick.
   * For Supabase-backed games this resolves after supabasePuzzle arrives.
   * Consumers should defer rendering game UI until isLoading is false.
   */
  isLoading: boolean;

  /**
   * Today's date string in YYYY-MM-DD (ET), computed once on mount.
   * Pass this to useGameCompletion as puzzle_date, do not recompute it.
   * See Known Behavior note in design spec regarding midnight rollover.
   */
  todayStr: string;

  /**
   * Index in puzzles[] of today's puzzle.
   * Useful for "Puzzle #N" display and score calculations.
   */
  puzzleIndex: number;

  /**
   * Reset guesses and gameStatus to initial state without changing the puzzle.
   * Clears the localStorage entry for today.
   * Intended for dev/testing; the consuming hook decides whether to surface
   * a reset button to users.
   */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function selectDailyPuzzle<T>(
  puzzles: T[],
  supabasePuzzle: T | null | undefined,
  getPuzzleId: ((puzzle: T) => string) | undefined,
  todayStr: string,
): { puzzle: T | null; index: number } {
  // Supabase override takes absolute priority over date-seed selection
  if (supabasePuzzle != null) {
    let index: number;
    if (getPuzzleId) {
      // Value-based lookup, safe for Supabase-deserialized objects
      const targetId = getPuzzleId(supabasePuzzle);
      index = puzzles.findIndex((p) => getPuzzleId(p) === targetId);
    } else {
      // Reference equality, only safe for static in-memory arrays
      index = puzzles.indexOf(supabasePuzzle);
    }
    if (index === -1) index = 0; // safe fallback if puzzle not found in array
    return { puzzle: supabasePuzzle, index };
  }

  if (puzzles.length === 0) {
    return { puzzle: null, index: 0 };
  }

  /* Deterministic, same result for every user on the same ET date.
     Round 213: the walk through the pool is shuffled per cycle rather than
     +1 a day. Every puzzle still comes up exactly once before any comes up
     twice, which is what a small pool needs, but tomorrow is no longer
     today plus one on every game on the site at once. */
  const index = dailyIndex(todayStr, puzzles.length);
  return { puzzle: puzzles[index], index };
}

function readPersistedState<G>(
  storageKey: string,
  todayStr: string,
  puzzleIndex: number,
  deserializeGuesses: (raw: unknown) => G[],
): { guesses: G[]; gameStatus: 'playing' | 'won' | 'lost' } | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;

    const saved = JSON.parse(raw) as PersistedDailyState<G>;

    // Validate schema version, date, and puzzle index before trusting the data
    if (
      saved.v === SCHEMA_VERSION &&
      saved.date === todayStr &&
      saved.puzzleIndex === puzzleIndex
    ) {
      return {
        guesses: deserializeGuesses(saved.guesses),
        gameStatus: saved.gameStatus,
      };
    }
  } catch {
    // Corrupt JSON or unexpected structure, treat as no saved state
  }
  return null;
}

function writePersistedState<G>(
  storageKey: string,
  todayStr: string,
  puzzleIndex: number,
  guesses: G[],
  gameStatus: 'playing' | 'won' | 'lost',
): void {
  try {
    const payload: PersistedDailyState<G> = {
      v: SCHEMA_VERSION,
      date: todayStr,
      puzzleIndex,
      guesses,
      gameStatus,
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    // Quota exceeded or private browsing, silently skip persistence
  }
}

function cleanupOldEntries(gameSlug: string, currentKey: string): void {
  try {
    const prefix = `${gameSlug}-daily-`;
    const toRemove: string[] = [];
    // Collect first, modifying localStorage while iterating is unsafe
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix) && key !== currentKey) {
        toRemove.push(key);
      }
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // localStorage unavailable (e.g. storage disabled), skip
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDailyPuzzle<T, G>(
  options: DailyPuzzleOptions<T, G>,
): DailyPuzzleReturn<T, G> {
  const {
    gameSlug,
    puzzles,
    supabasePuzzle = null,
    getPuzzleId,
    maxGuesses,
    isWon,
    isLost,
    deserializeGuesses,
  } = options;

  // todayStr is computed once on mount and never changes during the session.
  // This is intentional: a user who starts a puzzle before midnight ET and
  // finishes after midnight plays the puzzle they started, not the new day's.
  // See "Known Behavior" in docs/useDailyPuzzle-design.md.
  const todayStr = useRef(getTodayET()).current;
  const storageKey = `${gameSlug}-daily-${todayStr}`;

  // Puzzle selection. Re-evaluates when supabasePuzzle transitions null → value.
  // For date-seeded games (supabasePuzzle always null) this is stable.
  const { puzzle, index: puzzleIndex } = useMemo(
    () => selectDailyPuzzle(puzzles, supabasePuzzle, getPuzzleId, todayStr),
    // puzzles and getPuzzleId are expected to be stable references
    // (module-level arrays / functions defined outside the render cycle).
    // supabasePuzzle is the only value that changes after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [supabasePuzzle, todayStr],
  );

  const [guesses, setGuesses] = useState<G[]>([]);
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [isLoading, setIsLoading] = useState(true);

  // Track which puzzleIndex we have loaded state for.
  // Prevents re-loading on every render, but allows re-loading when
  // supabasePuzzle arrives and puzzleIndex changes.
  const loadedForIndex = useRef<number | null>(null);

  useEffect(() => {
    // Already loaded for this puzzle, skip
    if (loadedForIndex.current === puzzleIndex) return;
    loadedForIndex.current = puzzleIndex;

    // Remove yesterday's (and older) entries for this game slug
    cleanupOldEntries(gameSlug, storageKey);

    // Restore saved progress if the stored entry is valid for today's puzzle
    const saved = readPersistedState(
      storageKey,
      todayStr,
      puzzleIndex,
      deserializeGuesses,
    );

    if (saved) {
      setGuesses(saved.guesses);
      setGameStatus(saved.gameStatus);
    } else {
      // No valid saved state, start fresh (also covers supabasePuzzle arriving
      // and changing puzzleIndex mid-session: reset to clean state for new puzzle)
      setGuesses([]);
      setGameStatus('playing');
    }

    setIsLoading(false);
  // Intentionally narrow dep list: we want this to fire when puzzleIndex settles,
  // not on every render. gameSlug, storageKey, todayStr, deserializeGuesses are
  // all stable after mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzleIndex]);

  const addGuess = useCallback(
    (guess: G) => {
      if (gameStatus !== 'playing' || puzzle == null) return;

      const newGuesses = [...guesses, guess];
      let newStatus: 'playing' | 'won' | 'lost' = 'playing';

      if (isWon(newGuesses, puzzle)) {
        newStatus = 'won';
      } else if (
        newGuesses.length >= maxGuesses ||
        (isLost && isLost(newGuesses, puzzle))
      ) {
        newStatus = 'lost';
      }

      setGuesses(newGuesses);
      setGameStatus(newStatus);

      // Write synchronously so progress survives an immediate page close
      writePersistedState(storageKey, todayStr, puzzleIndex, newGuesses, newStatus);
    },
    [guesses, gameStatus, puzzle, puzzleIndex, isWon, isLost, maxGuesses, storageKey, todayStr],
  );

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    setGuesses([]);
    setGameStatus('playing');
  }, [storageKey]);

  return {
    puzzle,
    guesses,
    addGuess,
    gameStatus,
    isLoading,
    todayStr,
    puzzleIndex,
    reset,
  };
}
