# Cloud Breakage Audit

Read-only sweep of every Supabase-backed game table for the same silent-breakage
bug class found locally (`docs/SILENT_BREAKAGE_AUDIT.md`): puzzle/data entries that
are **silently dropped or rendered broken** by duplicates, degenerate structure, or
missing data — anything that makes a puzzle fail to load.

- **Date:** 2026-06-14
- **Method:** structural + uniqueness SQL checks run directly against the live DB via the
  Supabase MCP (read-only). No data was changed.
- **Scope:** content tables the app reads to build puzzles (answer pools + puzzle rows +
  their daily-mapping tables). User-data tables (scores, completions, profiles) are out of
  scope — a bad row there doesn't break a puzzle.

---

## ⚠️ Project-identity caveat (read this first)

The MCP audited project **`flawuiqbvjobmkfkauhw`** (confirmed by the user as the live
project). Two things to be aware of, because they shaped the findings:

- The repo still points elsewhere: `.env` (`VITE_SUPABASE_URL`) and `supabase/config.toml`
  (`project_id`) both reference the **old** project `pzzadswiradjnvvfybol`. If the running
  app uses those env values, it is talking to a *different* database than the one audited
  here. **This is a config drift worth fixing**, independent of the puzzle findings.
- The audited project has **zero rows in its migration history** (`supabase_migrations`),
  yet the repo's `supabase/migrations/` defines tables that are **absent** from it
  (see "Missing tables" below). The repo migrations were never applied to this project.

---

## Summary

| # | Table | Rows | Status | Finding |
|---|---|---:|:---:|---|
| 1 | `connections_puzzles` | 155 | 🔴 **BROKEN** | 25 rows silently dropped (player in two groups) → only 130 load |
| 2 | `player_market_values` | 176,415 | 🟠 **DEGRADED** | Footle pool: 150 rows → only **72 unique players**, repeated up to 8× |
| 3 | `tennis_players` | — | 🔴 **MISSING** | Table absent → Guess Tennis Player shows error screen |
| 4 | `guess_nation_countries` | — | 🔴 **MISSING** | Table absent → Guess The Nation has empty pool, can't start |
| 5 | `fantasy_draft_players` | — | 🔴 **MISSING** | Table absent → Fantasy Draft has empty draft pool |
| 6 | `nascar_drivers` | 83 | 🟢 Clean | No dup/null driver names |
| 7 | `cbb_programs` | 24 | 🟢 Clean | No dups, no empty `common_names`, no null hints |
| 8 | `career_players` | 151 | 🟢 Clean | No dup names; every player has ≥1 season |
| 9 | `career_seasons` | 1,726 | 🟢 Clean | No orphan seasons (all FK to a player) |
| 10 | `shirt_number_puzzles` | 32 | 🟢 Clean | No dup player/club |
| 11 | `soccer_club_puzzles` | 79 | 🟢 Clean | No dup `puzzle_id`/`full_name`, no empty `common_names` |
| 12 | `soccer_grid_puzzles` | 50 | 🟢 Clean | All 3×3, no axis dup, no cross-axis collision, no null labels |
| 13 | `transfer_path_puzzles` | 20 | 🟢 Clean | No dup id, no `player_a=player_b`, no dup pair |
| — | `*_daily` mapping tables | — | 🟡 Missing (non-fatal) | See note |
| — | `*_grid_selections` | — | 🟡 Missing (non-fatal) | See note |

---

## 🔴 Finding 1 — `connections_puzzles`: 25 silently-dropped puzzles

**This is the exact bug class from the local audit, present in the cloud.**
`fetchConnectionsPuzzles` applies `isValidPuzzle` (4 groups × 4 players × **16 unique**
players) and **silently filters out** any row that fails. 25 of the 155 cloud rows have a
player listed in two groups (16 total slots, only 14–15 distinct) → they never reach the
game. Effective playable count: **130, not 155.**

The local data was fixed for this same defect (commit `98e4a6a`, +corrected to 175 puzzles),
but the cloud `connections_puzzles` table was **never re-seeded** — it still holds the
pre-fix rows.

The 25 broken rows and their repeated player(s):

| puzzle_id | sort_order | distinct/total | repeated player(s) |
|---|---:|:---:|---|
| puzzle-4 | 3 | 15/16 | Pelé ×2 |
| puzzle-9 | 8 | 15/16 | Lionel Messi ×2 |
| puzzle-10 | 9 | 15/16 | Lionel Messi ×2 |
| puzzle-12 | 11 | 14/16 | David Beckham ×2, Zlatan Ibrahimović ×2 |
| puzzle-13 | 12 | 14/16 | Thierry Henry ×2, Cristiano Ronaldo ×2 |
| puzzle-14 | 13 | 15/16 | Cristiano Ronaldo ×2 |
| puzzle-15 | 14 | 14/16 | Robert Lewandowski ×2, Lionel Messi ×2 |
| puzzle-16 | 15 | 15/16 | Francesco Totti ×2 |
| puzzle-21 | 20 | 15/16 | Cristiano Ronaldo ×2 |
| puzzle-22 | 21 | 15/16 | Olof Mellberg ×2 |
| puzzle-41 | 40 | 15/16 | Gareth Bale ×2 |
| puzzle-42 | 41 | 15/16 | Juninho Pernambucano ×2 |
| puzzle-52 | 51 | 15/16 | Marcel Sabitzer ×2 |
| puzzle-53 | 52 | 15/16 | Nicolas Anelka ×2 |
| puzzle-64 | 63 | 14/16 | Fabio Cannavaro ×2, Kaká ×2 |
| puzzle-67 | 66 | 15/16 | Sergio Ramos ×2 |
| puzzle-75 | 74 | 15/16 | Mohamed Salah ×2 |
| puzzle-92 | 91 | 15/16 | Antoine Griezmann ×2 |
| puzzle-98 | 97 | 15/16 | Thierry Henry ×2 |
| puzzle-104 | 103 | 15/16 | Bruno Fernandes ×2 |
| puzzle-112 | 111 | 15/16 | Neymar Jr ×2 |
| puzzle-119 | 118 | 15/16 | Carles Puyol ×2 |
| puzzle-120 | 119 | 15/16 | Rivaldo Vítor ×2 |
| puzzle-125 | 124 | 15/16 | David Beckham ×2 |
| puzzle-132 | 131 | 15/16 | Bastian Schweinsteiger ×2 |

**Suggested fix (not applied):** re-seed `connections_puzzles` from the corrected local
`connectionsPuzzles` source (175 valid puzzles), or correct the repeated player in each of
the 25 rows above so the group split is 16-unique.

---

## 🟠 Finding 2 — `player_market_values`: duplicated/skewed Footle pool

`fetchFootlePlayerPool` builds the Footle pool with
`.eq('year', 2026).order('rank').limit(150)` and **does not dedupe** (the only dedupe is for
the GOAT merge). Two data problems in this table corrupt that pool:

1. **The year-2026 rows are heavily duplicated.** 10,241 rows but only **5,393 distinct
   players** (avg 1.9 copies, up to **9 copies** of the same player; 2,055 players duplicated).
   The duplicates are identical (same club, same rank), i.e. the import ran multiple times.
2. **`rank` is per-position, not global.** The lowest ranks (1–8) belong to one player per
   position. So `order by rank limit 150` pulls rank-1…N of each position, each repeated by
   the duplication above — it does **not** return the top-150 most valuable players.

Net effect: the 150-row fetch yields only **72 distinct players**, repeated up to 8× (e.g.
Gianluigi Donnarumma ×8 at rank 1, Bart Verbruggen ×8 at rank 2, Erling Haaland ×3,
Kylian Mbappé ×3). The Footle pool is both **polluted with duplicates** (same player can be
the answer / appear multiple times) and **skewed away from the intended "top 150 by value"**.

Note: the table itself has **no null** `player_name` or `market_value_usd`. The problem is
duplication + the per-position `rank` semantics vs. how the query consumes it.

**Suggested fix (not applied):** de-duplicate year-2026 rows, and either (a) add a true
global value rank, or (b) change the query to `order('market_value_usd', desc)` with a
`DISTINCT ON (player_name)` (or dedupe client-side) so the pool is 150 unique players.

---

## 🔴 Findings 3–5 — Missing tables (games unplayable)

These tables are queried by the app but **do not exist** in the audited project (confirmed
absent from every schema). Because the user confirmed this is the live project, these are
real breakage:

| Table | Game | Behavior when table is absent |
|---|---|---|
| `tennis_players` | Guess Tennis Player | `loadPlayers()` query errors → `status='error'` → **error screen** (`useTennisPlayer.ts:31-34`) |
| `guess_nation_countries` | Guess The Nation | query returns no data → `countries=[]`; `startGame` early-returns on empty pool → **loads but can't start** (`useGuessTheNation.ts:35,43`) |
| `fantasy_draft_players` | Fantasy Draft | query returns no data → `players=[]` → **empty draft, nothing to pick** (`FantasyDraft.tsx:88-92`) |

---

## 🟡 Non-fatal missing tables

These are also absent but **do not break gameplay** — the code degrades gracefully. Flagged
for completeness:

- **`nascar_daily`, `tennis_daily`, `cbb_daily`, `guess_nation_daily`, `fantasy_draft_daily`**
  — the daily-puzzle mapping tables. Where the answer **pool** still exists (NASCAR, CBB),
  the daily query error is ignored and the game falls back to a deterministic
  `pool[dateSeed % len]` pick (`useNascarDriver.ts:49-69`, `useCbbProgram.ts:52-70`). So the
  "daily" puzzle is computed client-side rather than curated, but the game works. (For Tennis
  the pool is also missing, so the game is broken regardless — see Finding 3.)
- **`soccer_grid_selections`, `college_grid_selections`, `football_grid_selections`** — the
  rarity-tally tables. Reads default gracefully (`fetchRarity` returns 101/50 on a missing
  count, `useSoccerGrid.ts:98-121`), so grids stay playable, but **rarity scores are
  meaningless** and the per-guess INSERTs that record selections will error.

---

## 🟢 Clean tables (checks run, no issues)

| Table | Rows | Checks that passed |
|---|---:|---|
| `nascar_drivers` | 83 | no null/empty `driver_name`; no duplicate name |
| `cbb_programs` | 24 | no dup `school_name`; no empty `common_names`; no null hint fields |
| `career_players` | 151 | no dup `player_name`; every player has ≥1 season |
| `career_seasons` | 1,726 | no orphan seasons (all reference an existing player) |
| `shirt_number_puzzles` | 32 | no dup `player_name`; no dup player+club |
| `soccer_club_puzzles` | 79 | no dup `puzzle_id`; no dup `full_name`; no empty `common_names` |
| `soccer_grid_puzzles` | 50 | all exactly 3×3; no dup label within an axis; no label on both axes; no null labels |
| `transfer_path_puzzles` | 20 | no dup `puzzle_id`; no `player_a=player_b`; no dup A/B pair |

(Soccer Career = `career_players` + `career_seasons` matches the post-fix local state of 151
players, so the local dedupe fix is reflected in the cloud.)

---

## Security note (out of band, but required to surface)

The Supabase advisor flags **81 tables with Row-Level Security disabled** — fully readable/
writable by anyone with the anon key. Most are reference tables (`lahman_*`, `nascar_*`,
`f1_*`, etc.). This is a security issue, not a puzzle-breakage one, and is listed here only
because the audit surfaced it. Enabling RLS without policies would block all reads, so it
needs deliberate policy design — not auto-remediated here.

---

## Bottom line

- **One true silent-drop instance in the cloud:** `connections_puzzles` carries the same
  25 player-in-two-groups rows that were already fixed locally but never re-seeded — 130 of
  155 actually play.
- **One degraded pool:** `player_market_values` duplication + per-position `rank` shrink the
  Footle pool to 72 unique players and skew it off "top 150 by value."
- **Three games are dead on this project because their tables don't exist**
  (`tennis_players`, `guess_nation_countries`, `fantasy_draft_players`) — most likely a
  side effect of the project-identity / un-applied-migrations issue noted at the top.
- Every other audited content table passed the structural and uniqueness checks.

Nothing was modified. All fixes above are recommendations only.
