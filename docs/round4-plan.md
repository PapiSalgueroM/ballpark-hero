# DoUKnowBall — Round 4 Plan: Puzzle Generator Framework
Date: 2026-05-26

## Scope

Round 4 expands the puzzle pools for the 5 games that have curated `{game}_puzzles` tables in Supabase. The goal is to extend daily rotation so users don't cycle through the same puzzles within weeks.

**In scope (5 games):** SoccerGrid, Connections, GuessSoccerClub, Shirt Number, TransferPath

**Explicitly out of scope — see separate-track callouts at the bottom:**
- Footle — needs Transfermarkt data pipeline expansion (paused TM work), not a puzzle-authoring problem
- CareerGame — needs dedicated career-data authoring methodology (15+ `career_seasons` rows per player), not a Round 4 track item

---

## Per-Game Tracking Table

| Game | Current rows | Target rows | Approach | Retrofit needed? | Priority order |
|---|---|---|---|---|---|
| SoccerGrid | 15 | 50 | B ✅ | No | 1st |
| Connections | 155 | 250 | B ✅ | No | 2nd |
| GuessSoccerClub | 79 | 150 | A → B | Yes (Phase 0) | 3rd |
| Shirt Number | 32 | 100 | A → B | Yes (Phase 0) | 4th |
| TransferPath | 20 | 50 | A → B | Yes (Phase 0) | 5th |

---

## Per-Game Analysis

### 1. SoccerGrid (15 rows → 50)

- **Approach:** B ✅ — new rows added to Supabase auto-enter rotation via `dateSeed % puzzlePool.length`. No code deploy needed. No retrofit required.
- **Generation complexity:** HIGH. Each puzzle requires choosing 3 row attributes + 3 col attributes, then pre-verifying that all 9 intersections have at least 1–2 valid answers. The runtime validator is the AI edge function (`soccer-grid-validate`), but creation requires human confirmation that valid answers actually exist. Dead cells (no valid player satisfies both criteria) break the game silently.
- **QC risk:** HIGH.
  - Dead or near-impossible cells — most critical failure mode
  - Attribute ambiguity (e.g., "Won the UCL" — with which club? which year?)
  - Duplicate grids — same 6 attributes in a different arrangement feel repetitive even with unique IDs
- **Generation tier:** Tier 2 (human-proposed structure, LLM-assisted validation). Human proposes the 6 attributes; Claude.ai lists candidate players per cell for human approval before the puzzle is committed.
- **Priority rationale:** 15 puzzles = ~2 weeks before cycling. Most urgent scarcity in the entire game library.

---

### 2. Connections (155 rows → 250)

- **Approach:** B ✅ — same auto-rotation benefit as SoccerGrid. No retrofit required.
- **Generation complexity:** MEDIUM–HIGH. Each puzzle: 4 groups of 4 players, each with a theme and difficulty tier (yellow / green / blue / purple). Key authoring constraint: no player may fit two groups — "the one-away trap." All 16 players must be cross-checked against all 4 themes before the puzzle is finalized. ~30–60 minutes per puzzle authored well.
- **QC risk:** MEDIUM–HIGH.
  - A player fits two groups — most common authoring error
  - Factual inaccuracy in the connection claim (e.g., "won UCL in 2005" — was it 2004?)
  - Purple tier that's genuinely unguessable rather than just hard
  - The existing 155 seeds set a high quality bar; new puzzles must match it
- **Generation tier:** Tier 1 (LLM-assisted via separate Claude.ai chat, structured format, human spot-check before approval).
- **Priority rationale:** Approach B, high engagement, existing 155 is solid but a batch of ~100 buys ~8 months of daily play before any puzzle repeats.

---

### 3. GuessSoccerClub (79 rows → 150)

- **Approach:** A → B (retrofit in Phase 0 of first Round 4 session). Currently, rotation is locked to the hardcoded fallback pool length — adding Supabase rows will not extend rotation until the hook is retrofitted with the `supabasePuzzle` + `getPuzzleId` override pattern (same as SoccerGrid/Connections). The retrofit is the first step of the first content session.
- **Locked file status:** `src/hooks/useGuessSoccerClub.ts` is currently LOCKED. It must be unlocked for Phase 0 retrofit, then re-locked after.
- **Generation complexity:** MEDIUM. Each puzzle: pick a club, write 4 clues (`vibe`, `leagueHint`, `leagueTitles`, `kitColors`), list `common_names` aliases. ~5–10 minutes per club with fact-checking.
- **QC risk:** MEDIUM.
  - Wrong league title count (these change every season; historical counts vary by source)
  - Kit color descriptions that don't match current or classic kit
  - `common_names` coverage — clubs with many aliases need broad coverage or autocomplete fails for valid guesses
  - Vibe text that's either too revealing or too vague
- **Generation tier:** Tier 1 (LLM-assisted via separate Claude.ai chat, human spot-check).

---

### 4. Shirt Number (32 rows → 100)

- **Approach:** A → B (retrofit in Phase 0 of first Round 4 session). Same caveat as GuessSoccerClub — rotation locked to hardcoded pool length until retrofitted.
- **Locked file status:** `src/hooks/useShirtNumber.ts` is currently LOCKED. Must be unlocked for Phase 0, then re-locked.
- **Generation complexity:** LOW. Each puzzle: player name + iconic shirt number + optional clue text. ~1 minute per puzzle.
- **QC risk:** LOW–MEDIUM.
  - Player wore multiple numbers across clubs (e.g., #7 at one club, #10 at another). Rule to apply: use the number most associated with their peak fame / the one fans most identify them by.
  - Numbering that is debated or region-specific
- **Generation tier:** Tier 1 (LLM-assisted via separate Claude.ai chat, human spot-check). Lowest-risk Tier 1 game.

---

### 5. TransferPath (20 rows → 50)

- **Approach:** A → B (retrofit in Phase 0 of first Round 4 session).
- **Locked file status:** `src/hooks/useTransferPath.ts` is currently LOCKED. Must be unlocked for Phase 0, then re-locked.
- **Generation complexity:** HIGH. Each puzzle requires: (1) identify two players with a plausible path, (2) manually trace the shortest club-overlap chain through `career_players` / `career_seasons` Supabase data, (3) confirm `minSteps` is accurate, (4) write a hint. Cannot be delegated to LLM without independent path verification — wrong career data = unsolvable puzzle with no visible error to the user.
- **QC risk:** HIGH.
  - Puzzles are validated at runtime against `career_players` / `career_seasons`. If career data has an error (wrong club, wrong year), the puzzle silently becomes unsolvable.
  - Near-impossible to catch without playing through the puzzle manually.
  - TransferPath puzzles must be validated against live Supabase data, not just the hardcoded `transferPathPuzzles.ts` fallback.
- **Generation tier:** Tier 2 (human-proposed structure, LLM-assisted path tracing, human verifies `minSteps`). Last game in priority order because of validation burden.

---

## Execution Framework

### A. Generation Pipeline

**Two tiers based on generation risk:**

**Tier 1 — LLM-assisted (separate Claude.ai chat → human review → approved candidates pasted into Claude Code for SQL formatting):**
- Games: Connections, GuessSoccerClub, Shirt Number
- Workflow:
  1. Open a separate Claude.ai chat (NOT this Claude Code session)
  2. Paste the game's prompt template (defined in Phase B)
  3. Claude.ai generates N candidates in structured JSON
  4. Human reviews for factual errors, near-duplicates, and QC checklist items
  5. Approved candidates pasted back into Claude Code
  6. Claude Code formats into SQL `INSERT` rows for the migration file
- Why separate chat: Round 3 hit auto-compact and 20-minute API timeouts when mixing large candidate lists with Claude Code tool use. Keeping generation in Claude.ai and formatting in Claude Code avoids this entirely.
- Batch size: 20–30 candidates per generation run. Keep spot-check workload manageable per session.

**Tier 2 — Human-proposed structure, LLM-assisted validation:**
- Games: SoccerGrid, TransferPath
- Pure LLM generation is too risky (dead grid cells, invalid transfer paths).
- SoccerGrid workflow: human proposes the 6 attributes (3 rows + 3 cols) → Claude.ai lists candidate players per cell → human approves → Claude Code writes migration row
- TransferPath workflow: human proposes `(playerA, playerB)` pair → Claude.ai traces path against career data → human verifies `minSteps` → Claude Code writes migration row

---

### B. Quality Control

Three-level verification applied to every batch before migration:

1. **Structural validation** — every puzzle row matches the schema. All required fields present, no nulls where disallowed, `puzzle_id` format consistent with existing rows, no malformed JSONB.

2. **Factual spot-check** — 20–30% sample verified against an external source (Wikipedia, Transfermarkt, official club sites). Not every puzzle, but enough to catch systematic LLM errors. If the sample reveals systemic problems, apply the **stop-on-failure rule** (see below) before proceeding.

3. **Gameplay validation** — game-specific:
   - SoccerGrid: manually confirm ≥1 valid player per cell before committing
   - TransferPath: play the path manually, confirm `minSteps` is correct
   - Connections: check all 16 players against all 4 themes — no player fits two groups
   - GuessSoccerClub: confirm `leagueTitles` count matches a reliable source; check `common_names` coverage
   - Shirt Number: confirm the shirt number is the one actually associated with the player's peak fame

#### Stop-on-First-Batch-Failure Rule

If batch 1 of any game's Round 4 reveals a quality problem the framework didn't catch — specifically, if >30% of generated candidates require rework — **STOP that game and do not generate batch 2 until the prompt template is revised and re-approved.** Do not rationalize poor batches with "we'll catch it in QC." A >30% rework rate means the template is wrong, not that QC is working. Fix the source, not the output.

---

### C. Duplicate Detection

Before generating each batch, dump the identifying fields from Supabase and include them in the Claude.ai generation prompt as "already exists — do not reuse."

| Game | Dedup field(s) |
|---|---|
| Connections | All `category` strings from `groups_json` — check for semantic overlap, not just exact match ("Won the Ballon d'Or" vs "Ballon d'Or winners" is a duplicate) |
| GuessSoccerClub | Club name / `puzzle_id` / `common_names` array |
| SoccerGrid | Full `(rows_json, cols_json)` attribute set — flag if same 6 attributes appear in any arrangement |
| Shirt Number | `player_name` — check against all 32 existing rows |
| TransferPath | `(player_a, player_b)` pair in both orderings |

---

### D. Seeding Workflow

**New migration file per batch. Never modify already-applied migrations.**

Rules:
- Do NOT modify any migration file that has already been applied in Supabase — this creates schema drift
- Do NOT add `ON CONFLICT DO NOTHING` (established in Session 1g: silently swallows re-run fixes)
- Small batch files (10–20 puzzles per file) to avoid the socket timeout issue hit in Session 1g

**Naming convention:**
```
supabase/migrations/YYYYMMDDHHMMSS_{game}_puzzles_batch{N}.sql
```

Examples:
```
supabase/migrations/20260526000005_soccer_grid_puzzles_batch2.sql
supabase/migrations/20260526000006_connections_puzzles_batch2.sql
supabase/migrations/20260526000007_soccer_club_puzzles_batch2.sql
```

**Apply workflow:** identical to Round 3 — manually via Supabase SQL Editor, verify row count before committing the migration file to git.

---

### E. Order of Games

| Order | Game | Reason |
|---|---|---|
| 1st | SoccerGrid | Most urgent scarcity (15 puzzles ≈ 2 weeks of cycling). Approach B = immediate rotation payoff. No retrofit needed. |
| 2nd | Connections | Approach B, high engagement, batch of ~100 buys 8 months. No retrofit needed. |
| 3rd | GuessSoccerClub | Medium complexity, Tier 1 generation. Needs Phase 0 retrofit. 79 → 150 is achievable in 2–3 batches. |
| 4th | Shirt Number | Simplest generation. Needs Phase 0 retrofit. |
| 5th | TransferPath | Highest validation burden. Tackled last when other games are in good shape. |

---

### F. Session Structure

Round 3 used Phase A→B→C→D for code migration. Round 4 sessions are data generation, not code — but the phase structure adapts:

**For Approach B games (SoccerGrid, Connections) — no retrofit needed:**

- **Phase A (Audit):** Confirm current row count in Supabase. Scan existing puzzles for patterns, gaps, and coverage. Establish uniqueness baseline for dedup step. Output: summary of what exists and what's missing.
- **Phase B (Design):** Define batch size, generation tier, prompt template for this game, QC checklist, migration file name. STOP and get approval before generating.
- **Phase C (Generate + Review):** Generate candidates in separate Claude.ai chat. Human spot-checks against QC checklist. Iterate on failures. Apply stop-on-failure rule if >30% need rework. Output: approved INSERT rows.
- **Phase D (Migrate + Commit):** Claude Code writes migration SQL. Apply in Supabase dashboard. Verify row count. Commit + push.

**For Approach A games (GuessSoccerClub, Shirt Number, TransferPath) — retrofit first:**

- **Phase 0 (Retrofit):** Unlock the hook. Apply `supabasePuzzle` + `getPuzzleId` override pattern (same as SoccerGrid Session 1f). TSC. Re-lock the hook. Commit retrofit separately from content.
- **Phase A–D:** Same as above.

**Session scope rule:** One game, one batch per session. Do not mix games in a single session. Do not generate more puzzles than can be spot-checked in the same session.

---

## Locked Files Reference (updated after Round 3)

These hooks must NOT be touched except for their designated Phase 0 retrofit sessions:

```
src/hooks/useDailyPuzzle.ts          — permanent lock, do not touch
src/lib/dateUtils.ts                 — permanent lock, do not touch
src/hooks/useShirtNumber.ts          — locked; unlock for Phase 0 retrofit only
src/hooks/useGuessSoccerClub.ts      — locked; unlock for Phase 0 retrofit only
src/hooks/useTransferPath.ts         — locked; unlock for Phase 0 retrofit only
src/hooks/useSoccerGrid.ts           — permanent lock (already Approach B, no retrofit needed)
src/hooks/useConnections.ts          — permanent lock (already Approach B, no retrofit needed)
src/hooks/useCareerGame.ts           — permanent lock
[the 17 Phase B migrated hooks]      — permanent lock
```

---

## Out-of-Scope Callouts (separate tracks)

### Footle — Transfermarkt data pipeline track
Footle has no `footle_puzzles` table. It draws from `player_market_values` (176,415 rows, top 150 by rank for year=2026). "Expansion" for Footle means refreshing or extending the `player_market_values` data — this is a Transfermarkt scraping / data pipeline problem, not a puzzle-authoring problem. This work was paused during Round 2 and belongs to its own dedicated track. Do not bundle into Round 4 or Round 5.

### CareerGame — career data authoring track
CareerGame picks a random player from `career_players` (151 players, 1,877 `career_seasons` rows). Adding a new player requires authoring their complete career history: every season, club, goals, assists, appearances, and market value. A single player with 15 seasons = 15 new `career_seasons` rows, all requiring fact-checking against Transfermarkt or Wikipedia. Additionally, `career_seasons` data is shared by `useTransferPath` and `SoccerGridSearch` — errors affect multiple games simultaneously. This is full data-pipeline authoring work, not puzzle generation. Defer to Round 5 or a dedicated career-authoring track. Do not bundle into Round 4.

---

## Sport → Supabase Table Reference

| Sport | Table | Rows |
|---|---|---|
| Soccer players | `player_market_values` | 176,415 |
| Soccer career | `career_players` / `career_seasons` | 151 / 1,877 |
| NFL | `nflfastr_player_stats` | 134,470 |
| College | `ncaa_player_stats` | 43,800 |
| NHL | `nhl_draft` | 26,138 |
| NBA | `nba_players_extended_v2` | 5,135 |
| MLB | Lahman: batting, pitching, fielding, allstar, appearances | ~422K |
| UFC/MMA | `ufc_fights_v2` | 3,917 |
| F1, Tennis, NASCAR, Olympic, Golf | — | pending design |
