# Design Spec: `src/hooks/useDailyPuzzle.ts`

> Status: APPROVED — pending implementation  
> Last updated: 2026-05-25

---

## Background: What the Four Working Games Share

Reading `useHofOrBust`, `useScorePredictor`, `useShirtNumber`, and `useTransferPath`, the pattern is:

```
1. getDateSeed() → derive integer from today's date string
2. seed % puzzles.length → pick index
3. localStorage.getItem(`{slug}-daily-{date}`) → restore saved state if it exists
4. on game end → localStorage.setItem(...) to persist
5. useGameCompletion → fire once to record to Supabase (logged-in only)
```

Each game reimplements all five steps independently with slight variations. `useDailyPuzzle` generalizes all five.

---

## New Shared Utility: `src/lib/dateUtils.ts`

Before the hook itself, two functions must live in a shared utility (fixing the audit's inconsistent date handling):

```typescript
// src/lib/dateUtils.ts

// America/New_York timezone — product is US-focused; all users share the same
// puzzle rollover at midnight ET regardless of their local clock.
// en-CA locale produces YYYY-MM-DD format natively via Intl.DateTimeFormat.
export function getTodayET(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
  }).format(new Date()); // "2026-05-25"
}

// Converts "2026-05-25" → 20260525 (integer seed for modulo selection)
export function dateSeed(dateStr: string): number {
  return parseInt(dateStr.replace(/-/g, ''), 10);
}
```

All 47 game hooks, migrations, and utility functions currently computing "today" should call `getTodayET()` instead of their own variants. This is the single canonical date source.

---

## Full TypeScript Signature

```typescript
// Two type parameters:
//   T = the puzzle type (soccer Player, CareerPuzzle, NationPuzzle, etc.)
//   G = the guess type (GuessResult, string, SolvedGroup, etc.)

function useDailyPuzzle<T, G>(
  options: DailyPuzzleOptions<T, G>
): DailyPuzzleReturn<T, G>
```

---

## Parameter Shape: `DailyPuzzleOptions<T, G>`

```typescript
interface DailyPuzzleOptions<T, G> {
  /**
   * Unique identifier for this game. Used as the localStorage key prefix.
   * Must match the slug used in useGameCompletion and daily_completions.
   * e.g. 'footle', 'soccer-connections', 'nfl-career'
   */
  gameSlug: string;

  /**
   * The full static puzzle pool. The hook selects from this array
   * using the date seed. Required even when supabasePuzzle is provided,
   * because the fallback seed selection needs it.
   */
  puzzles: T[];

  /**
   * If the game fetches a curated puzzle from a Supabase daily table,
   * pass it here. When non-null, this overrides date-seed selection entirely.
   * The hook still manages localStorage persistence.
   * Default: null (use date-seed selection).
   */
  supabasePuzzle?: T | null;

  /**
   * Extract a stable string ID from a puzzle object. Used in the Supabase
   * override branch to locate the puzzle's index in the puzzles array without
   * relying on object reference equality (which is unsafe for objects
   * deserialized from Supabase responses).
   *
   * When provided: index = puzzles.findIndex(p => getPuzzleId(p) === getPuzzleId(supabasePuzzle))
   * When omitted:  index = puzzles.indexOf(supabasePuzzle)  ← reference equality, fine for static arrays
   *
   * The three Supabase-backed games MUST provide this.
   * The 20 date-seeded games can omit it.
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
   * The hook sets gameStatus to 'won' and stops accepting guesses.
   */
  isWon: (guesses: G[], puzzle: T) => boolean;

  /**
   * Called after each addGuess(). Return true when the player has lost
   * (use this for custom loss conditions beyond maxGuesses).
   * The hook also auto-triggers loss at maxGuesses regardless.
   * Default: () => false
   */
  isLost?: (guesses: G[], puzzle: T) => boolean;

  /**
   * Deserialize a raw localStorage value back into type G[].
   * Needed because JSON.parse returns `any`. Keep this simple —
   * typically just a type assertion.
   * e.g. (raw) => raw as GuessResult[]
   */
  deserializeGuesses: (raw: unknown) => G[];
}
```

### Design notes on parameter choices

- `gameSlug` as an explicit string (not derived from anything) ensures the localStorage key is stable even if the component or hook is renamed.
- `supabasePuzzle` is optional so games that already use Supabase daily tables (`useCbbProgram`, `useTennisPlayer`, `useNascarDriver`) can pass the pre-fetched puzzle in and still get localStorage persistence for free.
- `getPuzzleId` is optional to keep the API simple for the 20 date-seeded games that never need it. It is required (by convention, not enforced by the type) for any game passing `supabasePuzzle`, since Supabase deserializes objects fresh from the network and `indexOf` would always return -1.
- `isWon` / `isLost` are callbacks rather than fixed rules because games vary wildly — Connections wins when all four groups are solved, Footle wins when the exact player is guessed, HofOrBust wins on any vote.
- `deserializeGuesses` is a lightweight escape hatch for TypeScript safety without requiring a full validation library.

---

## Return Shape: `DailyPuzzleReturn<T, G>`

```typescript
interface DailyPuzzleReturn<T, G> {
  /** The selected puzzle for today. Null during initialization. */
  puzzle: T | null;

  /** All guesses made so far, restored from localStorage on mount. */
  guesses: G[];

  /**
   * Submit a guess. No-ops if gameStatus !== 'playing'.
   * Persists to localStorage after each call.
   * Triggers win/loss check via isWon / isLost callbacks.
   */
  addGuess: (guess: G) => void;

  /** 'playing' | 'won' | 'lost'. Persisted to localStorage. */
  gameStatus: 'playing' | 'won' | 'lost';

  /**
   * True for exactly one render tick while the hook reads localStorage
   * and selects the puzzle. Prevents UI flash of an empty/stale state.
   */
  isLoading: boolean;

  /**
   * Today's date string in YYYY-MM-DD (America/New_York). Exposed so the
   * game hook doesn't recompute it. Pass this to useGameCompletion as
   * puzzle_date. Computed once on mount — see Known Behavior section.
   */
  todayStr: string;

  /**
   * The index in puzzles[] of today's puzzle. Exposed for:
   * - sharing ("Puzzle #142")
   * - score calculation that depends on puzzle number
   */
  puzzleIndex: number;

  /**
   * Resets guesses and gameStatus to initial state WITHOUT changing
   * the puzzle. Intended for dev/testing only — in production, the
   * daily puzzle cannot be refreshed by the user.
   * Clears the localStorage entry for today.
   */
  reset: () => void;
}
```

**Why `reset` is included but scoped:** Games in unlimited mode use their own separate logic (existing `Math.random()` flows). `reset` here only resets today's daily attempt — it does not pick a new puzzle. The consuming game hook decides whether to expose a reset button to users.

---

## Pseudocode: Date-Seed Selection Logic

```
FUNCTION selectDailyPuzzle(puzzles, supabasePuzzle, getPuzzleId, todayStr):

  // Supabase override takes absolute priority
  IF supabasePuzzle IS NOT null:
    IF getPuzzleId IS provided:
      // Safe ID-based lookup — avoids object reference inequality for
      // Supabase-returned objects that are deserialized fresh from the network
      targetId = getPuzzleId(supabasePuzzle)
      index    = puzzles.findIndex(p => getPuzzleId(p) === targetId)
    ELSE:
      // Reference equality — safe for static in-memory arrays only
      index = puzzles.indexOf(supabasePuzzle)
    IF index === -1: index = 0          // safe fallback
    RETURN { puzzle: supabasePuzzle, index }

  // Guard against empty array (shouldn't happen, but be safe)
  IF puzzles.length === 0:
    RETURN { puzzle: null, index: 0 }

  // Core date-seed logic
  seed  = dateSeed(todayStr)          // e.g. 20260525
  index = seed % puzzles.length       // deterministic, same for all users
  RETURN { puzzle: puzzles[index], index }
```

### Caveat documented in code

Adding puzzles to the array retroactively changes what puzzle appeared on past dates. If historical accuracy matters (e.g. for leaderboards tied to puzzle number), the Supabase daily table pattern remains the right choice. `useDailyPuzzle` is for games where the static modulo approach is acceptable.

---

## Pseudocode: localStorage Save / Load Logic

**Key format:** `{gameSlug}-daily-{YYYY-MM-DD}`  
**Example:** `footle-daily-2026-05-25`

### Stored schema

```typescript
interface PersistedDailyState<G> {
  v: 1;                 // schema version — if missing or mismatched, discard and start fresh
  date: string;         // YYYY-MM-DD — redundant with key but validates on load
  puzzleIndex: number;  // which puzzle was served today
  guesses: G[];         // full guess history
  gameStatus: 'playing' | 'won' | 'lost';
}
```

The `v` field is a cheap migration safety net. If the stored schema ever needs to change structurally (e.g. guesses shape changes, new required field added), bump the constant to `2`. On load, any entry with a missing or non-matching `v` is treated as no saved state and the user starts fresh that day. No migration code required — stale entries are cleaned up by the daily rollover anyway.

### On mount (load)

```
todayStr   = getTodayET()
storageKey = `${gameSlug}-daily-${todayStr}`

// Step 1: Cleanup old entries for this game (scoped — never touches other games)
FOR each key IN localStorage:
  IF key starts with `${gameSlug}-daily-`
  AND key !== storageKey:
    localStorage.removeItem(key)

// Step 2: Select today's puzzle (needed whether or not we restore state)
{ puzzle, index } = selectDailyPuzzle(puzzles, supabasePuzzle, getPuzzleId, todayStr)

// Step 3: Try to restore saved state
raw = localStorage.getItem(storageKey)
IF raw exists AND is valid JSON:
  saved = JSON.parse(raw)
  IF saved.v === 1 AND saved.date === todayStr AND saved.puzzleIndex === index:
    // Full restore — user already played today
    INIT state with saved.guesses, saved.gameStatus
  ELSE:
    // Schema version mismatch, wrong date, or puzzle index changed — start fresh
    INIT state with guesses=[], gameStatus='playing'
ELSE:
  // No saved state — first visit today
  INIT state with guesses=[], gameStatus='playing'
```

### On each `addGuess(guess)` call

```
IF gameStatus !== 'playing': RETURN   // guard

newGuesses = [...guesses, guess]
newStatus  = 'playing'

IF isWon(newGuesses, puzzle):
  newStatus = 'won'
ELSE IF newGuesses.length >= maxGuesses OR isLost(newGuesses, puzzle):
  newStatus = 'lost'

// Update React state
setGuesses(newGuesses)
setGameStatus(newStatus)

// Persist immediately — don't wait for re-render
payload = { v: 1, date: todayStr, puzzleIndex, guesses: newGuesses, gameStatus: newStatus }
localStorage.setItem(storageKey, JSON.stringify(payload))
```

---

## Integration with `useGameCompletion`

`useDailyPuzzle` has **no dependency on `useGameCompletion`**. They remain separate hooks. The consuming game hook wires them together:

```typescript
// Inside e.g. useConnections.ts (after migration)

const {
  puzzle,
  guesses,
  addGuess,
  gameStatus,
  isLoading,
  todayStr,
} = useDailyPuzzle<ConnectionsPuzzle, SolvedGroup>({
  gameSlug: 'soccer-connections',
  puzzles: fallbackPuzzles,
  maxGuesses: Infinity,
  isWon: (guesses, puzzle) => guesses.length === puzzle.groups.length,
  deserializeGuesses: (raw) => raw as SolvedGroup[],
});

// useGameCompletion watches gameStatus independently —
// no change needed to how it currently works
useGameCompletion({
  gameSlug: 'soccer-connections',
  isComplete: gameStatus !== 'playing',
  didWin: gameStatus === 'won',
  score: calcConnectionsScore(guesses),
  puzzleDate: todayStr,      // ← use todayStr from useDailyPuzzle, not recomputed
});
```

### Why this separation

`useGameCompletion` already handles the anonymous-vs-logged-in branching (it no-ops for anonymous users without an auth session). `useDailyPuzzle` doesn't need to replicate that. The game hook is the thin glue layer between the two.

**Requirement: anonymous users get full experience** — Satisfied by `useDailyPuzzle` alone. localStorage persistence requires no auth. Anonymous users get the daily puzzle and their progress saves across refreshes. `useGameCompletion` simply won't fire for them (no session → no insert → no problem).

**Requirement: logged-in users get completion recorded** — Satisfied by the existing `useGameCompletion` hook, called alongside `useDailyPuzzle` as shown above. No changes to `useGameCompletion` needed.

---

## Migration Checklist: Adopting `useDailyPuzzle` in a Game Hook

For each of the 20 Pattern B hooks, the migration is mechanical.

### Remove

- [ ] The `Math.random() * puzzles.length` line
- [ ] Any `useState` or `useMemo` that initializes the puzzle/player selection
- [ ] Any `localStorage.getItem` / `localStorage.setItem` calls for puzzle selection or game progress
- [ ] Any inline `getDateSeed()` or date string computation

### Add

- [ ] Import `useDailyPuzzle` from `@/hooks/useDailyPuzzle`
- [ ] Import `getTodayET` from `@/lib/dateUtils` (only if the hook needs today's date for display; otherwise let `useDailyPuzzle` own it via `todayStr`)
- [ ] Call `useDailyPuzzle` with the appropriate generics and options
- [ ] Destructure `{ puzzle, guesses, addGuess, gameStatus, isLoading, todayStr }` from the return value
- [ ] Pass `puzzleDate: todayStr` to `useGameCompletion` instead of recomputing the date

### Verify

- [ ] `gameSlug` matches exactly what's used in `daily_completions` and `useGameCompletion` for that game
- [ ] `isWon` callback accurately reflects the game's win condition
- [ ] `deserializeGuesses` correctly types the restored guess array (test with a stored value)
- [ ] The old localStorage key (if any) differs from the new `{gameSlug}-daily-{date}` key — if a game already has localStorage state under a different key name, the first deploy will start fresh for all users (acceptable for a single migration day)

### For the three Supabase-backed games (`useCbbProgram`, `useTennisPlayer`, `useNascarDriver`)

- [ ] Keep the existing Supabase daily table fetch
- [ ] Pass the fetched puzzle as `supabasePuzzle` to `useDailyPuzzle`
- [ ] Pass `puzzles` (the full static array) as the fallback pool
- [ ] Pass `getPuzzleId` — required for these games to correctly locate the Supabase puzzle in the static array
- [ ] Remove the inline fallback seed logic from those hooks (now handled by `useDailyPuzzle`)

---

## Known Behavior

### Midnight rollover during an active session

`todayStr` is computed **once on mount** via `getTodayET()` and never re-evaluated during the session. If a user starts a puzzle at 11:58 PM ET and finishes at 12:03 AM ET, they play and submit the old day's puzzle. The new day's puzzle appears on their next page load.

This is **intentional**, not a bug:

- Interrupting an in-progress game at midnight would be a worse user experience than letting them finish.
- The `daily_completions` insert will use the old `todayStr`, which is correct — they earned that completion on the day they started.
- The new day's puzzle is consistently available to anyone who loads or refreshes after midnight ET.

If this ever needs to change (e.g. auto-refresh at midnight), it should be handled at the page level with a visibility/focus event listener, not inside this hook.

---

## What This Spec Does Not Cover

- **Unlimited mode** — games that have a non-daily mode keep their own `Math.random()` selection logic. `useDailyPuzzle` only manages the daily slot.
- **Puzzle curation** — if you want to manually control which puzzle appears on a given date (e.g. avoid repeating puzzle #47 too soon), that requires a Supabase daily table. This hook is for games where the static modulo approach is acceptable.
- **Multi-puzzle days** — this hook assumes one puzzle per game per calendar day.
