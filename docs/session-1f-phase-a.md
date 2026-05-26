# Session 1f Phase A — useSoccerGrid Investigation
Date: 2026-05-26

---

## 1. Hook Analysis (`useSoccerGrid.ts` — 141 lines)

**Gameplay:**
- Daily 3×3 grid. Each of 9 cells requires the player to name a real footballer who satisfies **both** the cell's row attribute and column attribute simultaneously.
- Attribute types: `club`, `nationality`, `league`, `position`, `champions_league`, `world_cup`, `award`, `misc`
- Player guesses are **open-ended text** — validated by an AI edge function (not a hardcoded answer list)
- 15 total guesses allowed. Correct = cell locked with player name + rarity %. Wrong = flash red, guess consumed.
- Win condition: 9/9 cells filled. Game "complete" at 9/9 OR when guesses run out.
- Score = average rarity across all correct cells (lower % = more impressive = better score)

**Supabase calls already present (3 table calls + 1 edge function):**
1. **Rarity total count:** `supabase.from('soccer_grid_selections').select('*', { count: 'exact', head: true }).eq('puzzle_id').eq('cell_index')`
2. **Rarity player count:** same table, additionally `.eq('player_name', playerName.toLowerCase())`
3. **Insert selection on correct answer:** `supabase.from('soccer_grid_selections').insert({ puzzle_id, cell_index, player_name: displayName.toLowerCase() })`
4. **Edge function invocation:** `supabase.functions.invoke('soccer-grid-validate', { body: { playerName, rowAttribute, colAttribute } })` — AI validation call (not a table read)

**Hardcoded data imports:**
- `soccerGridPuzzles` from `@/data/soccerGridPuzzles` — the puzzle grid definitions (15 puzzles, rows/cols labels). This is the **only** hardcoded data import.

**Date-seeding:** `useDailyPuzzle` **already present** ✅ — no custom date-seeding, no UTC bug. The hook passes `puzzles: soccerGridPuzzles` and `maxGuesses: 15` to `useDailyPuzzle`. Gets back `puzzle`, `guesses` (as `dailyActions`), `addGuess`, `rawDailyStatus`, `isLoading`.

**Loading guard:** `isLoading` from `useDailyPuzzle` is returned and used in `SoccerGrid.tsx` to gate all game UI behind a spinner. Already present, correct pattern.

---

## 2. Supabase Tables Already Used

**`soccer_grid_selections`** — already live, confirmed in `types.ts`:
```
Row: {
  id:           string
  puzzle_id:    string   ← matches puzzle.id (e.g. 'sg-001')
  cell_index:   number   ← 0–8
  player_name:  string   ← stored lowercase
  created_at:   string
}
```
No foreign key to a `soccer_grid_puzzles` table. `puzzle_id` is just a plain text slug. This is the rarity tracking table — every correct answer from every user is logged here.

**`soccer-grid-validate` Edge Function** — already deployed and live. Deno function that calls `google/gemini-2.5-flash` via a Lovable AI gateway. Takes `{ playerName, rowAttribute, colAttribute }`, returns `{ valid: boolean, fullName?: string }`. Has rate limiting (20 req/min per IP), sanitizes inputs. Covers current-season transfers through 2025-26. **This is entirely separate from puzzle wiring — it handles answer validation, not puzzle selection.**

**No `soccer_grid_puzzles` table exists anywhere in `types.ts`.** There is no `fetchSoccerGrid*` file in `src/lib/`. The puzzle definitions are 100% hardcoded.

---

## 3. Puzzle Data File (`soccerGridPuzzles.ts` — 199 lines)

**Puzzle count:** 15 puzzles (`sg-001` through `sg-015`)

**Exact structure of each entry:**
```ts
{
  id: string;                  // e.g. 'sg-001'
  rows: SoccerGridAttribute[]; // always 3 items
  cols: SoccerGridAttribute[]; // always 3 items
}

interface SoccerGridAttribute {
  label: string;  // e.g. 'Played for Barcelona', 'Brazilian', 'Forward (FWD)'
  type: 'club' | 'nationality' | 'league' | 'award' | 'position' |
        'champions_league' | 'world_cup' | 'misc';
}
```

Each puzzle is **extremely flat** — only `id`, `rows[3]`, `cols[3]`. No answer lists, no valid player names, no images. The AI edge function handles all validation open-endedly.

**Attribute types seen across all 15 puzzles:**
- `club`: "Played for Barcelona/Real Madrid/Chelsea/etc."
- `nationality`: "Brazilian/French/Argentine/German/Spanish/Italian/Portuguese/Dutch/English"
- `league`: "Played in Premier League/La Liga/Serie A/Bundesliga/Ligue 1/MLS"
- `position`: "Forward (FWD)/Midfielder (MID)/Defender (DEF)/Goalkeeper (GK)"
- `champions_league`: "Champions League Winner"
- `world_cup`: "World Cup Winner"
- `award`: "Golden Boot Winner"
- `misc`: "Over 100 International Caps", "Played in MLS"

**IP issues:** None. All data is plain text labels. No logos, photos, or images.

---

## 4. Page + Board + Search Components

**`SoccerGrid.tsx` (163 lines):**
- Clean page component. Destructures the hook. Loading gate on line 64: `{isLoading ? <spinner> : <game content>}`. Renders `SoccerGridBoard` + conditionally `SoccerGridSearch` (only when a cell is active and game is playing). Complete game state on finish.

**`SoccerGridBoard.tsx` (98 lines):**
- Renders the 4×4 CSS grid (1 empty corner + 3 col headers + 3 row headers + 9 cells). Displays `RarityBadge` in filled cells (Unicorn/Phoenix/Diamond/Emerald/Ruby/Gold/Silver/Bronze tiers). No IP issues — only text.

**`SoccerGridSearch.tsx` (113 lines) — key finding:**
```ts
import { careerPlayers } from '@/data/careerPlayers';
```
**This is a direct hardcoded import.** Uses `careerPlayers` to power the autocomplete dropdown (filter by `p.name.toLowerCase().includes(query)`). Shows player name + nationality + position in each suggestion row. The search is for UX only — the actual validation is the AI edge function. A user can type any name and submit without selecting from the dropdown.

**Does it use `fetchCareerPlayers()`?** No. Uses hardcoded data file directly. Could be migrated but requires async handling (component is fully synchronous today).

**Loading state handling:** `isLoading` passed as `disabled` prop to `SoccerGridSearch`. No additional loading state needed in the search component itself.

---

## 5. Pattern Fit + Gap Analysis

### ✅ ALREADY WIRED TO SUPABASE

| Component | What | Status |
|---|---|---|
| `soccer_grid_selections` table | All user answer records (rarity tracking) | Live, in production |
| `soccer-grid-validate` edge function | AI-based answer validation | Live, deployed |
| `useDailyPuzzle` | Daily puzzle selection + localStorage persistence | Already integrated |
| `useGameCompletion` | Score submission on game end | Already integrated |

### ❌ STILL HARDCODED

| Component | What | Notes |
|---|---|---|
| `soccerGridPuzzles.ts` | 15 puzzle grid definitions (rows/cols) | Needs `soccer_grid_puzzles` table |
| `SoccerGridSearch.tsx` | Player autocomplete via `careerPlayers` | Separate concern — see below |

---

## Critical Constraint: `useDailyPuzzle` dep array

Reading `useDailyPuzzle.ts` reveals a design constraint that matters here:

```ts
const { puzzle, index: puzzleIndex } = useMemo(
  () => selectDailyPuzzle(puzzles, supabasePuzzle, getPuzzleId, todayStr),
  // puzzles and getPuzzleId are expected to be stable references
  // (module-level arrays / functions defined outside the render cycle).
  [supabasePuzzle, todayStr],   // ← puzzles NOT in dep array
);
```

The `puzzles` parameter is **intentionally excluded from the dep array**. The hook was designed to receive a module-level static array, not a state variable. If we pass `puzzlePool` (state) instead, the puzzle selection `useMemo` will **not re-run** when `puzzlePool` updates from Supabase — it always returns the puzzle selected from the initial hardcoded fallback.

**Why this matters for SoccerGrid (but not CareerGame):** In CareerGame, the `puzzles` array is the player pool — the puzzle content (career data) is enriched from Supabase, but the player selection index comes from the hardcoded array. Since both arrays have the same players in the same order, the daily player is identical either way.

For SoccerGrid, the puzzle IS the grid definition. If new puzzles are added to Supabase beyond the initial 15, the `dateSeed % 15` calculation is locked forever — the rotation would never see puzzles 16+.

---

## Two Approaches for Phase B

### Approach A — Simple pool pass (same as other migrations)
- Pass `puzzlePool` state to `useDailyPuzzle({ puzzles: puzzlePool })`
- Puzzle selection is always `dateSeed % 15` (hardcoded fallback), permanently
- Supabase table is "source of truth" for content but not for daily selection
- Works fine if pool size never changes; breaks rotation if new puzzles are added later

### Approach B — `supabasePuzzle` override (proper dynamic approach)
- Keep `puzzles: soccerGridPuzzles` as the stable hardcoded ref (satisfies `useDailyPuzzle`'s design)
- Compute `todaysPuzzle = puzzlePool[dateSeed(getTodayET()) % puzzlePool.length]` in a `useMemo` over `puzzlePool`
- Pass `supabasePuzzle: todaysPuzzle` (null until Supabase loads, then the correct puzzle)
- Pass `getPuzzleId: (p) => p.id` for value-based lookup (required for Supabase-deserialized objects)
- When Supabase loads, `todaysPuzzle` becomes non-null, `useDailyPuzzle` re-runs `selectDailyPuzzle`
- New puzzles added to Supabase are immediately reflected in the rotation

Approach B is what `useDailyPuzzle`'s `supabasePuzzle` + `getPuzzleId` fields were designed for. For the initial 15-puzzle migration, Approaches A and B produce identical daily puzzles. Approach B future-proofs rotation as puzzles are added.

**Recommendation: Approach B.** It's the correct use of the API, adds minimal complexity (one extra `useMemo`), and avoids a silent bug if new puzzles are added later.

---

## `SoccerGridSearch` autocomplete — separate concern

The `careerPlayers` import in `SoccerGridSearch.tsx` is separate from wiring the puzzle grid. Options for Phase B decision:
1. **Wire this session** — pass `careerPlayerNames` from hook (via `fetchCareerPlayers()`), same prop-passing pattern as `allClubNames` in GuessSoccerClub. Requires hook to call `fetchCareerPlayers()`, return a name list, and pass it down through `SoccerGrid.tsx` to `SoccerGridSearch`.
2. **Defer** — leave hardcoded, note as a follow-up. The autocomplete works fine with the hardcoded data; it's UX-only and doesn't affect validation correctness.

---

## Summary Table

| Dimension | Finding |
|---|---|
| Hook size | 141 lines (already well-structured) |
| Data file size | 199 lines, 15 puzzles |
| Existing Supabase calls | 3 table calls (rarity + insert) + 1 edge function |
| Edge function | Live, handles validation — not in scope for this migration |
| `useDailyPuzzle` | Already integrated ✅ no migration needed |
| UTC bug | None ✅ |
| New table needed | Yes — `soccer_grid_puzzles` |
| Reuse existing tables | `career_players`/`career_seasons` available for search autocomplete (optional) |
| Puzzle shape | Extremely flat: `id` + `rows[3]` + `cols[3]`, no IP issues |
| Pattern | Puzzle-list style but with `useDailyPuzzle` constraint (Approach B recommended) |
| Unique complexity | `useDailyPuzzle` dep array issue; `SoccerGridSearch` static import (separate concern) |
| Files to change | migration SQL, `types.ts`, `fetchSoccerGridPuzzles.ts`, `useSoccerGrid.ts`, optionally `SoccerGridSearch.tsx` + `SoccerGrid.tsx` |
