# The NFL grid on a shared, data backed engine

Status: DESIGN, written in Round 401 (2026-09-02) from a five reader recon of the
repo and the live database; the plan at the end is the synthesis of that recon,
and an agent's own synthesis pass, still running when this was committed, is
folded in by the round that starts phase 1 if it adds anything. Milestone 0 of the operating
contract, Task 2 ("Ship a proper NFL grid as a configuration of the shared grid
engine, not a fork. If the engine is not currently extractable, extracting it is
the task") and the road to Task 3 (archive and answer pages as a shared system).
Every number below was measured on 2026-09-02 unless it says otherwise; re-measure
before betting a phase on one.

## Why this, why now

`/football-grid` is the money page: position 21 for "nfl grid" (49,500 monthly
searches), the NFL season days away. It runs on 72 hand authored boards walked
on a 72 day cycle and validated by a free tier AI that Round 378 measured running
out of daily quota, after which every new guess in every AI validated grid is
refused until the quota resets. Round 401 also found and fixed three defects on
the page that the recon surfaced (rarity double counting, a college check that
matched by substring, a refusal string with a dash), which is a reminder of how
little of the page is held by a test today.

The NBA, MLB, NHL and CBB grids are already data backed: the whole table in
memory, every guess judged locally, no AI, an answer key for every board and a
shared archive page. That is the shape the contract asks the NFL grid to take.

## What exists: two families that share only presentation

**Family A, AI validated, static pool, community rarity:** `/soccer-grid`,
`/football-grid`, `/college-grid`. Each is a page plus a hook plus a static
puzzle array plus a Deno edge validator (cache lookup, a deterministic pass over
a stints table, a Gemini fallback, fail closed) plus a `*_grid_selections` table
that feeds rarity. `useFootballGrid` and `useCollegeGrid` differ by 50 lines;
`useSoccerGrid` is the same core plus 200 lines of difficulty, timer and
overtime. `src/types/footballGrid.ts` and `src/types/soccerGrid.ts` declare the
same three shapes with a different attribute union. `GridBoard.tsx` and
`SoccerGridBoard.tsx` differ by 34 lines and duplicate the rarity badge verbatim.
No archive: the pools recycle, so publishing answers publishes an answer key for
a live board (Round 350 measured this and deferred the archive behind pool depth).

**Family B, data backed, in memory, seed built boards:** `/nba-grid`,
`/mlb-grid`, `/hockey-grid`, `/cbb-grid`. Each is a self contained page (no hook,
423 to 445 lines) over a lib that fetches one table into memory and exposes the
same export list (categories, cell and puzzle types, a franchise pool, an
achievement pool, `playerMatchesCell`, a minimum pool size, the paged fetch, a
difficulty setting, `buildGridPuzzle(seed)`, an emoji share). `nbaGrid.ts`,
`mlbGrid.ts` and `hockeyGrid.ts` are textual clones: every differing hunk is a
docstring, a pool constant, a stat field, a table or column name or a storage key,
and `mulberry32`, `pickN`, `normalize`, the paged retry fetch, the difficulty
persistence, all of `buildGridPuzzle` and the emoji share are byte identical.
`cbbGrid.ts` is the first real departure and the better shape: the pool is
derived from the data and passed into `buildCbbGridPuzzle(seed, pool)`. All four
have one archive page (`GridArchive.tsx`, sport prop) over one baked JSON
(`src/data/gridArchive.json`, 14 boards per sport) written by
`scripts/genGridArchive.mjs`, which already treats each lib as one interface:
`{ build, fetchData, matches, pool? }`. That interface plus the shared
components (GameShell, GridBoardSkeleton, ResultScreen, HowToPlayPopover,
PlayerAutocomplete, playerSearch, dateUtils, useGameCompletion, shareGrids) is
everything genuinely shared today.

**Smallest extractable engine:** lift the module scope helpers and
`buildGridPuzzle` out of `nbaGrid.ts` into one `src/lib/gridEngine.ts` taking a
per sport config (table, select, pools, matchers, storage key, minimum pool
size), lift the state, persistence and submitGuess of `NbaGrid.tsx` into one
`useFranchiseGrid(config)` hook, and the board JSX into one `FranchiseGridBoard`.
NBA is the variant closest to that shape and the one the other two were cloned
from; CBB already has the pool as argument signature the engine should adopt.
Two traps recorded by the readers: `cbbGrid.ts` carries a different `mulberry32`
than the franchise libs, so unifying the sequence silently changes every future
daily board for whichever sport adopts the other one, and `simGridArchive`
section 1 goes red on any published board that no longer rebuilds from its seed.

## The NFL grid today, in numbers

- Pool: 72 boards, ids grid-001 to grid-072, 8 criterion types, 92 distinct
  labels. Across all 432 criteria: team 198, position 87, draft 40, award 28,
  misc 22, college 21, probowl 20, superbowl 16. 55 boards have three team rows.
- What the validator can decide from data today: only `Played for X` (via
  `nfl_team_codes`), 12 mapped position labels, and college labels. 130 of the
  432 criteria (every award, Pro Bowl, Super Bowl, draft and stat season label,
  plus Edge rusher, Defensive Back and Fullback) always go to the cache or the
  AI. 263 of 648 cells have both axes decidable; 4 of 72 boards are fully
  decidable.
- The cache: 203 football-grid rows (157 true, 46 false). A cached false never
  expires, and the key keeps punctuation and axis order, so a transposed board
  is a second AI spend.
- Rarity: `football_grid_selections` has 334 rows over 24 of the 72 puzzles, 46
  distinct days. Most boards have no picks at all, which is why an archive of
  community picks would be nearly empty.
- The search box searches `nflfastr_rosters` (2002 to 2025) with validateOnly,
  so before Round 401 a name outside that table could not be typed at all: 194
  of the 687 players the Round 350 evidence names. Round 401 hands the ledger's
  names to the autocomplete as localNames (derived, fenced).
- Daily selection: `useDailyPuzzle.selectDailyPuzzle` walks a shuffled cycle of
  the whole pool, so the pool length is the repeat interval (72 days). Changing
  the pool length or order changes today's board for every player at once and
  invalidates saved daily progress, which Round 350 accepted once.

## The NFL data the site already holds

| Table | Rows | What it answers | What it cannot |
|---|---|---|---|
| `nfl_player_team_stints` | 30,272 stints, 14,555 distinct names | team and team by team crossings (all 496 franchise pairs share at least 19 players, median 51), position per stint, college | anything before 2002 (one 1999 row; Joe Montana absent, Brady and Favre start in 2002, so `debut_season` means first season in this table); identity is name only (`person_key` on 17 rows, 61 known merged careers); position is per stint and unnormalised (27 codes, 3,571 generic DB rows, T.J. Watt stored as LB); college 34 percent null, mixed spellings, 461 semicolon multi school rows |
| `nfl_team_codes` | 39 | the split franchise codes (ARI and ARZ, BAL and BLT, CLE and CLV, HOU and HST, LA and SL, LAC and SD, LV and OAK) | |
| `nfl_draft_picks` | 28,015, 1936 to 2025 | draft round, overall pick, first round, first overall, round 6 or later, undrafted by absence (careful: absence is not proof for pre 1936 or annotated rows); team as a full club name with 62 annotated rows | |
| `nflfastr_rosters` | 60,350 weekly rows, 2002 to 2025 | season by season team membership with `gsis_id`, the identity the stints table lacks | pre 2002 |
| `nflfastr_player_stats` | 134,470 weekly rows, 1999 to 2024 | per season sums for passing, rushing and receiving yards (a 1,000 yard season, a 4,000 yard season) once summed offline | 2025 has no rows; offense only; `sacks` means sacks suffered by the passer, so a 15 sack season cannot come from it |
| `super_bowls` | 60 | winner, loser, MVP per game with full club names | player level Super Bowl wins need a roster by season join |
| career total tables (`nfl_qb_passing_leaders` 845, `nfl_rb_stats` 999, `nfl_wr_te_stats` 1,286, `nfl_defense_stats` 2,963) | | career sums | nothing per season |
| `nfl_team_seasons` | 2,225 | nothing: wins null on every row, scraped tooltip text in `playoff_result`, footnote markers in `head_coach` | do not build on it |

**What no table holds:** Pro Bowls, All Pro, MVP, DPOY, OPOY, OROY. The
nflverse `draft_picks` release (documented, Pro Football Reference sourced,
1980 onward) carries `probowls`, `allpro` and `hof` flags for drafted players
only, which misses undrafted stars (Warner, Romo, Gates, Vinatieri, Harrison).
No documented dataset in the nflverse catalogue carries the season awards.

**Two platform facts that shape the design:** PostgREST aggregates are disabled
(PGRST123), so any crossing count or per season sum is precomputed offline and
shipped as data, never queried live; and the OpenAPI root is service role only,
so the table list comes from `src/integrations/supabase/types.ts`.

## Constraints every phase respects

- The URL, the copy (`src/data/gameContent/football.ts`, 633 words, whose worked
  example is literally grid-001), the daily rhythm and the rankings signals stay.
  The shipped snapshot names no board and must stay clock free; the day's
  criteria stay out of the saved page or under `data-no-prerender`.
- Data rules in full: two source verify anything real, never invent a player or a
  stat, production data from stable documented sources and the canonical
  pipeline, never rapid Wikipedia scraping. A criterion no table can answer is
  not authored into a data backed board.
- Identity before crossings: a name based crossing fabricates players who satisfy
  both cells through a namesake. The generator either keys on `gsis_id` (from
  `nflfastr_rosters`) or drops every name that maps to more than one identity.
- Fences that must stay green, by name: simGridPuzzlePool (pool floor 60, twins,
  vocabulary, and since Round 401 the local names derivation), simGridArchive,
  simGridRarity, simDailyPuzzleContract, simDaily, simPublicWrites (cell_index 99
  refused), simSitemap, simIndexNow (SITEMAP_FLOOR rises with any new page),
  simSchema, simInternalLinks, simHubs, simPrerender, simFaqSchema,
  playGridCls and playBootShift (both list `/football-grid`), simNoRivalNames.
- Any new page: App.tsx route, genSitemap STATIC_PAGES, pageSchema STATIC_TYPES,
  an inbound link in shipped HTML, a snapshot produced in the documented order
  (genSitemap --routes-only, build, prerender), and the floor in simIndexNow.
- The archive for the NFL grid is keyed on the puzzle, never the date
  (`docs/designs/GRID-ARCHIVE-DESIGN.md`), and it publishes an answer key only
  for boards that will not be served again.

## Open questions the first engine phase resolves

1. Does the data backed grid restrict its answer key to 2002 onward careers
   (the stints table) and keep the AI only for players absent from the table, or
   is the nflverse season level rosters release (back to 1920, documented) loaded
   first so pre 2002 tenures become deterministic too? Phase 2 (Round 403) built
   the key from the tables the site holds and wrote the coverage on the file:
   Tom Brady carries six titles, Jerry Rice two teams. A "played for" cell that
   rejects Rice at the 49ers is not a money page, so phase 3 does not ship on
   this key alone: either the nflverse season rosters are loaded back to the
   1970s first (a documented dataset, the same feed the roster table came
   from), or the page keeps the validator as the path for a name the key does
   not carry and says which era the key covers on the card. Round 404 took the
   first path: the key covers 1970 to 2025 on the nflverse season files, keyed
   on gsis_id or name plus birth date, with a season aware franchise code map.
2. Which identity fix comes first: backfilling `person_key` from `gsis_id`, or
   dropping ambiguous names from the generator? Measured 2026-09-02: 14,547 of
   the 14,555 stint names have a `gsis_id` in `nflfastr_rosters`, 303 of those
   names map to two or more ids (the namesake set), and 8 have none. So keying
   the answer key on `gsis_id` is feasible for the whole table, and the 303
   ambiguous names are the ones a season overlap join has to split or the
   generator has to drop.
3. Is a small, two source verified awards table (MVP, DPOY, OROY, roughly 70, 55
   and 60 rows) acceptable under the data rules, since no documented dataset
   carries them, or do award criteria stay AI validated and out of the data
   backed pool?
4. Does the nflverse `stats_player` release publish regular season only files, or
   only regular plus post season, which changes what "a 1,000 yard season" means?
5. Does nflverse `draft_picks` load as a new table (RLS, the CREATE TABLE AS rule)
   or stay a generator only input under `scripts/data`?

## The plan

Each phase is one shippable round with its own gates. Nothing in a later phase
is started before the earlier one is live and its fences are green, because
every phase changes what the money page serves.

**Phase 1 (next round): lift the engine, change nothing a player can see.**
`src/lib/gridEngine.ts` takes a per sport config (table, select, franchise pool,
achievement pool, matchers, storage key, minimum pool size, and the PRNG) and
owns the helpers that are byte identical across `nbaGrid.ts`, `mlbGrid.ts` and
`hockeyGrid.ts` today. The three libs keep every export they have as thin
re-exports over the engine, so the pages, `genGridArchive.mjs` and
`simGridArchive` do not move. The PRNG is part of the config on purpose: each
sport keeps its exact sequence, so every published archive board still rebuilds
from its seed and `simGridArchive` section 1 stays green (the CBB `mulberry32`
differs from the franchise one and is not unified). Gate: a new fence,
`simGridEngine`, that bundles the four libs and the engine, rebuilds every board
in `gridArchive.json` through the engine path and compares, and reads the three
libs as code to assert none carries a local copy of a lifted helper, with a
control that plants one back.

**Phase 2: the NFL answer key, computed offline, keyed on identity.**
`scripts/genNflGridData.mjs` builds one row per player keyed on `gsis_id` from
the documented tables the site already holds: seasons and teams from
`nflfastr_rosters` (2002 onward, the 39 codes merged through `nfl_team_codes`),
positions normalised to the pool's buckets, college where the row carries it,
draft round and pick from `nfl_draft_picks` (joined on name plus year plus
college, ambiguous joins dropped, never guessed), stat seasons summed from
`nflfastr_player_stats` (1,000 yard rushing and receiving, 4,000 yard passing;
no sack criterion, because the loaded column is sacks suffered), Super Bowl wins
from the winner's roster in `super_bowls` matched to the season roster. The 303
namesake names are split by season overlap or dropped. Output: a committed
`src/data/nflGridPlayers.json` first (the archive precedent), a table later if
the file outgrows the bundle budget. Every criterion kind the key cannot answer
(Pro Bowls, All Pro, MVP and the other awards) is excluded from data backed
boards rather than approximated; the open question on a verified awards table is
decided by Anthony's data rules, not here. Gate: `simNflGridData` recomputes a
sample of rows from the source tables live, spot checks a fixed list of famous
careers against a second source recorded in the round, proves the namesake set
is split, and refuses to run when the database is unreachable.

**Phase 3: `/football-grid` becomes a configuration of the engine.** The page
keeps its URL, copy, daily rhythm, rarity badges and the selections table. The
daily board is seed built from the answer key over the data backed criterion
kinds (team by team, team by position, team by draft, team by stat season, team
by Super Bowl), so it never repeats and never needs the AI; every guess is judged
in memory the way the NBA grid judges it, and `football-grid-validate` stays
deployed only for the unlimited mode's older authored boards until phase 4
retires them. The 72 authored boards leave the daily rotation the day the engine
serves the page; the change of board for every player is announced on the page
for a week, the way Round 350's pool change should have been. Gates: the phase 1
and 2 fences, simGridPuzzlePool retargeted at the engine's vocabulary,
playGridCls and playBootShift, and a playGames walk that types a real answer.

**Phase 4: the NFL archive, keyed on the board, shipping answer keys.** With
boards that never return, `/football-grid/archive` publishes each past board,
its full answer key from the data, its community rarity, and a replay button,
through the same `GridArchive` page and generator as the four sports that have
one. Every page adding step applies (route, STATIC_PAGES, STATIC_TYPES, an
inbound link, the snapshot in the documented order, the simIndexNow floor).

**Phase 5: the same engine, new data.** Contract Task 5: after NFL holds,
soccer and college move onto the engine by search volume, same phases, same
fences. No new game types until the grid category is won.
