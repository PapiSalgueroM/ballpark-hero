import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { getTodayET, dailyIndex } from '@/lib/dateUtils';
import { markRestoredFinish } from '@/lib/restoredFinish';

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
  /**
   * Round 718 fix: getPuzzleId of the puzzle the guesses were made against,
   * when the game gave one. A save whose id is not today's puzzle's is
   * discarded, so a puzzle that changed under a player (a live pool that grew
   * on the same day, a rule that moved the day's answer) starts the day fresh
   * instead of crediting a finished log to a different answer. Older saves
   * have no id and are read as before, so no version bump.
   */
  puzzleId?: string;
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
   * Used as the localStorage key prefix: `{gameSlug}-daily-{date}`, unless
   * storageSlug below overrides the prefix.
   * Must match the slug used in useGameCompletion and daily_completions:
   * the restore marks its finish under this name.
   * e.g. 'footle', 'soccer-connections', 'nfl-career'
   */
  gameSlug: string;

  /**
   * Round 643: the prefix of the storage key, when it has to differ from
   * gameSlug. Default: gameSlug.
   *
   * Twelve hooks keyed their saves under an older name than the one they
   * record under (nfl-hl against nfl-higher-lower, ufc-game against ufc,
   * football-connect4 against football-connect-4, career-path against career).
   * They passed the storage name as gameSlug, so the restore marked a slug
   * the completion hook never asks about, and every reload of a finished
   * daily was recorded again. gameSlug is now the recorder's slug everywhere,
   * which is what the mark needs, and this keeps the key the saves already
   * sit under, so nothing a player has stored stops loading.
   */
  storageSlug?: string;

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

  /**
   * Round 848: the game's own check on a restored guess log, run on what
   * deserializeGuesses returned and only after the shared check has passed
   * (an array of plain objects with nothing null in it, and a known status).
   * Return false and the save is thrown away: today's puzzle starts fresh and
   * the next write replaces the bad bytes. Use it for item fields the page
   * reads without a guard, and for a log that can never be longer than a
   * fixed size (never tie that to maxGuesses: Football Grid lifts it at
   * runtime). Default: no extra check.
   */
  isValidGuesses?: (guesses: G[]) => boolean;
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

  /**
   * Round 848 review: when another tab has saved further on today's daily,
   * take that state now and return true; the caller then gives up the answer
   * it was about to make, before showing anything about it. addGuess makes
   * the same check, but a game that shows a verdict beside the answer (a
   * reveal, a toast, a score) has to ask first, or it shows a verdict for an
   * answer that is never counted. False when this tab is current.
   */
  takeNewerSave: () => boolean;

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

/* Round 848: the shape every restored log must have before a page reads it.
   A save that kept v, date and puzzleIndex but carried guesses as null, an
   object, a string, a number or an array holding null used to sail through
   the checks below, because deserializeGuesses is a type assertion, and the
   page then broke on its first .length or .map, with a retry that read the
   same bytes and broke again. The shared check is the part true of every
   game: an array, nothing null or missing in it, and a status the hook itself
   could have written. A game's own item fields are its isValidGuesses. */
const GAME_STATUSES: ReadonlyArray<unknown> = ['playing', 'won', 'lost'];

function isGuessLog(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.every((g) => g !== null && g !== undefined);
}

function readPersistedState<G>(
  storageKey: string,
  todayStr: string,
  puzzleIndex: number,
  puzzleId: string | undefined,
  deserializeGuesses: (raw: unknown) => G[],
  isValidGuesses?: (guesses: G[]) => boolean,
): { guesses: G[]; gameStatus: 'playing' | 'won' | 'lost' } | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;

    const saved = JSON.parse(raw) as PersistedDailyState<G>;

    // Validate schema version, date, puzzle index and, when both sides carry
    // one (Round 718 fix), the puzzle id, before trusting the data
    if (
      saved.v === SCHEMA_VERSION &&
      saved.date === todayStr &&
      saved.puzzleIndex === puzzleIndex &&
      (saved.puzzleId === undefined || puzzleId === undefined || saved.puzzleId === puzzleId)
    ) {
      const guesses = deserializeGuesses(saved.guesses);
      // Round 848: a malformed log is no save at all. Today starts fresh and
      // the next write replaces these bytes.
      if (!isGuessLog(guesses) || !GAME_STATUSES.includes(saved.gameStatus)) return null;
      if (isValidGuesses && !isValidGuesses(guesses)) return null;
      return {
        guesses,
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
  puzzleId: string | undefined,
  guesses: G[],
  gameStatus: 'playing' | 'won' | 'lost',
): void {
  try {
    const payload: PersistedDailyState<G> = {
      v: SCHEMA_VERSION,
      date: todayStr,
      puzzleIndex,
      ...(puzzleId !== undefined ? { puzzleId } : {}),
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
    storageSlug = gameSlug,
    puzzles,
    supabasePuzzle = null,
    getPuzzleId,
    maxGuesses,
    isWon,
    isLost,
    deserializeGuesses,
    isValidGuesses,
  } = options;

  // todayStr is computed once on mount and never changes during the session.
  // This is intentional: a user who starts a puzzle before midnight ET and
  // finishes after midnight plays the puzzle they started, not the new day's.
  // See "Known Behavior" in docs/useDailyPuzzle-design.md.
  const todayStr = useRef(getTodayET()).current;
  const storageKey = `${storageSlug}-daily-${todayStr}`;

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

  /* Round 718 fix: the id of today's puzzle, when the game gives one. It goes
     into every save and is checked on every restore, and the load below is
     keyed on it as well as the index, so a Supabase puzzle arriving under the
     same index (Career Ladder passes no static pool, so its index is always 0)
     still re-reads the save against the man it is actually for. Mirrored in a
     ref for addGuess, whose dependency list is anchored by simDailyRecord. */
  const puzzleId = puzzle != null && getPuzzleId ? getPuzzleId(puzzle) : undefined;
  const puzzleIdRef = useRef<string | undefined>(puzzleId);
  puzzleIdRef.current = puzzleId;
  /* '-' while there is no puzzle at all, so the key moves when one lands even
     for a game that gives no id (the load below waits for it and would
     otherwise never run again). */
  const loadKey = `${puzzleIndex}:${puzzle == null ? '-' : puzzleId ?? ''}`;

  // Track which puzzle (index plus id) we have loaded state for.
  // Prevents re-loading on every render, but allows re-loading when
  // supabasePuzzle arrives and the index or the id changes.
  const loadedForKey = useRef<string | null>(null);

  /* Round 503: the guess log and the status are mirrored in refs that move
     synchronously, and addGuess reads those instead of the values its closure
     captured at render time.

     WHY. One handler may add more than one guess in a single tick. Transfer
     Path records the step, then the target's own step when the new name also
     links to the target, then the win, all from one addPlayer call; Career
     Path's hint reveals four cells in a forEach. Every one of those calls used
     to read the SAME render's `guesses` array, so each rebuilt [...guesses,
     guess] from the same base and only the last one survived. The persisted
     record was written from that same stale array on the last call, so a won
     Transfer Path daily dropped the last name the player typed and scored the
     short chain it had kept rather than the one actually played.

     The refs are what makes consecutive calls compose. The write stays
     synchronous, because progress has to survive an immediate close, and the
     saved shape is untouched, so no migration is needed. Every place that sets
     guesses or gameStatus sets its ref in the same breath; there is no other
     writer. */
  const guessesRef = useRef<G[]>(guesses);
  const statusRef = useRef<'playing' | 'won' | 'lost'>(gameStatus);

  useEffect(() => {
    // Already loaded for this puzzle, skip
    if (loadedForKey.current === loadKey) return;
    /* Round 718 fix: a game with no static pool has no puzzle at all until its
       Supabase puzzle lands. Restoring against nothing accepted a save for
       whichever man arrived later, and nothing re-read it when he did; the
       load waits for him, and isLoading says so. */
    if (puzzle == null && puzzles.length === 0) return;
    loadedForKey.current = loadKey;

    // Remove yesterday's (and older) entries for this game slug
    cleanupOldEntries(storageSlug, storageKey);

    // Restore saved progress if the stored entry is valid for today's puzzle
    const saved = readPersistedState(
      storageKey,
      todayStr,
      puzzleIndex,
      puzzleId,
      deserializeGuesses,
      isValidGuesses,
    );

    if (saved) {
      /* Round 643 review: a save is read under today's rule. The status is
         stored beside the guesses, and a save written under an older rule
         can say 'playing' over guesses that end the game now: Transfer Path
         stored a give up as still playing until Round 643 made a give up a
         loss, and its page reads the finish off the guesses, so such a save
         came back finished with no mark and recorded again on every reload.
         The status is decided again from the guesses, through the game's own
         isWon and isLost, before anything below reads it. Deliberately not
         through maxGuesses: a game may change that at runtime (Football
         Grid's Unlimited toggle lifts it to Infinity), so a save made with it
         lifted would come back as a loss the player never had, and no
         record. */
      if (saved.gameStatus === 'playing' && puzzle != null && Array.isArray(saved.guesses)) {
        if (isWon(saved.guesses, puzzle)) saved.gameStatus = 'won';
        else if (isLost && isLost(saved.guesses, puzzle)) saved.gameStatus = 'lost';
      }
      guessesRef.current = saved.guesses;
      setGuesses(saved.guesses);
      /* Round 399: a finished status read back from storage is not a new
         finish. Say so before setting it, or useGameCompletion sees the
         same false to true transition a real finish makes and records the
         game again on every reload. */
      if (saved.gameStatus !== 'playing') markRestoredFinish(gameSlug);
      statusRef.current = saved.gameStatus;
      setGameStatus(saved.gameStatus);
    } else {
      // No valid saved state, start fresh (also covers supabasePuzzle arriving
      // and changing puzzleIndex mid-session: reset to clean state for new puzzle)
      guessesRef.current = [];
      setGuesses([]);
      statusRef.current = 'playing';
      setGameStatus('playing');
    }

    setIsLoading(false);
  // Intentionally narrow dep list: we want this to fire when the puzzle settles
  // (its index, and since Round 718 its id), not on every render. gameSlug,
  // storageKey, todayStr, deserializeGuesses are all stable after mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadKey]);

  /* Round 848: two tabs on one daily share one save, and each used to write
     its own log over it. Open today's daily twice, answer two rounds in the
     first tab and one in the second (still showing round one), and the save
     went from two decided rounds back to one. Now a tab never writes over a
     save that is ahead of it: when the stored log for this same day and
     puzzle is longer than the one in memory, or has finished while this tab
     still plays, this tab takes the stored state and shows it, so it jumps to
     the saved round, and the answer it was about to record (to a round
     another tab already decided) is dropped. A decided round is never
     undecided and never decided twice. A finish taken over this way was
     recorded by the tab that made it, so it is marked like a restore.
     Rebuilt every render and called through a ref, so addGuess keeps the
     dependency list simDailyRecord anchors. Returns true when it took over. */
  const adoptNewerSave = (): boolean => {
    if (puzzle == null || loadedForKey.current !== loadKey) return false;
    const stored = readPersistedState(storageKey, todayStr, puzzleIndex, puzzleId, deserializeGuesses, isValidGuesses);
    if (!stored) return false;
    const ahead = stored.guesses.length > guessesRef.current.length
      || (stored.gameStatus !== 'playing' && statusRef.current === 'playing');
    if (!ahead) return false;
    guessesRef.current = stored.guesses;
    statusRef.current = stored.gameStatus;
    if (stored.gameStatus !== 'playing') markRestoredFinish(gameSlug);
    setGuesses(stored.guesses);
    setGameStatus(stored.gameStatus);
    return true;
  };
  const adoptNewerSaveRef = useRef(adoptNewerSave);
  adoptNewerSaveRef.current = adoptNewerSave;

  /* Round 848 review: and the rest of that turn goes with it. A handler may
     give more than one answer in one turn (Transfer Path's step then its
     closing step and the win, Career Path's four hint cells), every one built
     on the board this tab was showing. Once the first is dropped the rest are
     answers to a board that no longer exists, and appending them to the state
     just taken over recorded a Transfer Path win for a chain that never
     reached the target. The flag lives until the taken over state is
     committed, which is before the player can see it, let alone answer it. */
  const droppingTurn = useRef(false);
  useEffect(() => { droppingTurn.current = false; });

  const takeNewerSave = useCallback((): boolean => {
    if (!adoptNewerSaveRef.current()) return false;
    droppingTurn.current = true;
    return true;
  }, []);

  /* Round 848: and an open tab follows the other one live. The browser fires
     storage in every other tab of this site when one writes, so a second tab
     moves to the saved round before the player can answer the old one. */
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey) adoptNewerSaveRef.current();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [storageKey]);

  const addGuess = useCallback(
    (guess: G) => {
      // Both reads are refs, not the closure: a second call in this same tick
      // has to see what the first one just added, and has to be refused if the
      // first one ended the game.
      if (statusRef.current !== 'playing' || puzzle == null) return;
      // Round 848: another tab is ahead, take its state and drop this answer,
      // and every answer the same turn goes on to give.
      if (droppingTurn.current) return;
      if (adoptNewerSaveRef.current()) {
        droppingTurn.current = true;
        return;
      }

      const newGuesses = [...guessesRef.current, guess];
      let newStatus: 'playing' | 'won' | 'lost' = 'playing';

      if (isWon(newGuesses, puzzle)) {
        newStatus = 'won';
      } else if (
        newGuesses.length >= maxGuesses ||
        (isLost && isLost(newGuesses, puzzle))
      ) {
        newStatus = 'lost';
      }

      guessesRef.current = newGuesses;
      statusRef.current = newStatus;
      setGuesses(newGuesses);
      setGameStatus(newStatus);

      // Write synchronously so progress survives an immediate page close
      writePersistedState(storageKey, todayStr, puzzleIndex, puzzleIdRef.current, newGuesses, newStatus);
    },
    [puzzle, puzzleIndex, isWon, isLost, maxGuesses, storageKey, todayStr],
  );

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    guessesRef.current = [];
    statusRef.current = 'playing';
    setGuesses([]);
    setGameStatus('playing');
  }, [storageKey]);

  return {
    puzzle,
    guesses,
    addGuess,
    takeNewerSave,
    gameStatus,
    isLoading,
    todayStr,
    puzzleIndex,
    reset,
  };
}
