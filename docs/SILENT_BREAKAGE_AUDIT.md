# Silent-Breakage Audit

Site-wide sweep for the bug class found in both Connections games: puzzle/data
entries that are **silently dropped or rendered broken** due to duplicates,
degenerate structure, or failed validation. Every local puzzle/data file was
checked programmatically (parse the array, run structural + uniqueness checks).

## Method
A script loads each data file's array and checks, per game type:
- **Connections-style** (grouped): 4 groups, correct players-per-group, all players unique within a puzzle (the game's own `isValidPuzzle` / `isValidBBPuzzle` filters drop any puzzle failing this).
- **Grid games**: exactly 3 rows + 3 cols, no duplicate label within an axis, no label on both axes (a cross-axis collision makes a degenerate cell).
- **Connect 4**: consistent board dimensions, no duplicate attribute within an axis, no attribute on both axes.
- **Clue games**: unique ids, no empty clues, consistent clue counts.
- **Player pools**: no duplicate player names (a dup can pair a player against himself or surface conflicting data).

## Results: existing vs. passing

| Game | Entries | Passing | Finding |
|---|---|---|---|
| **Connections** | 155 | 130 → **155** | 25 had a player in two groups (dropped by `isValidPuzzle`). **Fixed** (commit 98e4a6a), +20 new = 175. |
| **Baseball Connections** | 16 | 7 → **32** | 9 had a player in two groups (dropped by `isValidBBPuzzle`). **Fixed** (commit 46263ad), +16 new = 32. |
| **Higher or Lower** | 205 | 204 valid | Sergio Busquets listed **twice** (identical) → could pair him vs himself. **Fixed** (commit 2de27f1) → 204. |
| **Career (soccer)** | 158 | 151 valid | 7 players duplicated with **conflicting** career data (Bellingham, Pedri, Yamal, Gavi, Palmer, Enzo Fernández, Garnacho). **Fixed** (commit 7139dd2) → 151. |
| Football Grid | 15 | 15 | Clean — all 3×3, no dup/cross-axis labels. |
| Soccer Grid | 15 | 15 | Clean. |
| College Grid | 15 | 15 | Clean. |
| NBA Connect 4 | 8 | 8 | Clean — all boards 7×6, no axis dup, no cross-axis attr. |
| Guess NFL Team | 32 | 32 | Clean (unique ids, consistent clues). |
| Guess The Club | 79 | 79 | Clean. |
| Score Predictor | 35 | 35 | Clean. |
| Transfer Path | 20 | 20 | Clean. |
| World Cup | 60 | 60 | Clean. (Repeated *answers* like Zidane/Messi are the same legend across **different years** — distinct puzzles, unique ids — by design, not a bug.) |
| Guess The Year | 50 | 50 | Clean. |
| F1 Driver | 20 | 20 | Clean. |
| F1 Constructor | 31 | 31 | Clean. |
| Shirt Number | 32 | 32 | Clean. |
| HoF or Bust | 25 | 25 | Clean. |
| Olympics | 48 | 48 | Clean. |
| Teammates | 50 | 50 | Clean. |
| UFC Guesser | 112 | 112 | Clean (no dup fighter names). |
| UFC Chain | 64 | 64 | Clean. |
| NFL Career | 78 | 78 | Clean. |
| Baseball Career | 35 | 35 | Clean. |
| Hockey Career | 38 | 38 | Clean. |
| Hockey Higher/Lower | 45 | 45 | Clean. |
| Draft Guesser | 15 | 15 | Clean. |
| Timeline | 15 | 15 | Clean. |

## Fixes applied this session (one commit per game)
- **Higher or Lower** — removed duplicate Sergio Busquets (`2de27f1`).
- **Career (soccer)** — removed 7 duplicate players with conflicting data; kept the more complete career (ties kept first); kept clubs verified (`7139dd2`).

(The two Connections games were fixed in the prior two sessions: 25 + 9 silently-dropped puzzles restored.)

## One flag for review
- **Garnacho** (Career soccer): the two duplicate entries disagreed — one had Manchester United only, the other added a **Napoli** move. The dedup kept the more detailed (Napoli) entry, but I could not verify that transfer against my knowledge cutoff. If Garnacho did not actually move to Napoli, that one entry's later club should be removed.

## Not checkable locally (data lives in Supabase)
These games load their puzzles/answers from Supabase tables, so their content can't
be validated from the repo — they need the same query-based check run against the DB:
- **Guess CBB Program** (`cbb_programs`), **Guess NASCAR Driver** (`nascar_drivers`),
  **Guess Tennis Player** (`tennis_players`), **Guess The Nation** (`guess_nation_countries`),
  **Guess The Club** daily / **Shirt Number** / **Transfer Path** (their `*_puzzles` tables),
  **Soccer Career**, and the grid games' rarity (`*_grid_selections`).
- Loading resilience for CBB / NASCAR Driver / Tennis Player (infinite "Loading…" on an
  empty table) was already hardened in an earlier session; see `docs/GAME_HEALTH_AUDIT.md`.

## Bottom line
The silent-drop bug class was concentrated in the two **Connections** games (which have
explicit drop-validators) and a handful of **duplicate player entries** in two pools. All
found instances are fixed and verified; every other local puzzle/data file passed the
structural and uniqueness checks.
