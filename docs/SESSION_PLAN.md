# Autonomous DB + Code Session — Running Log

**Started:** 2026-06-14
**Operator authorization:** Full read-write Supabase, auto mode, work end-to-end. UPSERT for re-seeds; never DELETE/TRUNCATE a populated table unless re-insert is in the same transaction. Log write failures and continue.

**DB target:** Supabase project `flawuiqbvjobmkfkauhw` (confirmed live; operator reseeded `connections_puzzles` here via dashboard → 250 rows).

## ⚠️ Standing caveat — project/config drift
Repo `.env` (`VITE_SUPABASE_URL`) and `supabase/config.toml` (`project_id`) point at the **old** project `pzzadswiradjnvvfybol`, but all MCP writes target `flawuiqbvjobmkfkauhw`. If the deployed app reads env from the repo's old project, DB fixes here won't surface in the running app. Treated as out-of-scope config drift per operator's prior confirmation that `flawuiqbvjobmkfkauhw` is live; flagged here for follow-up.

---

## Order & status

1. **Baseball Connections — cloud reseed** — ✅ DONE
   - No cloud table existed; `useBaseballConnections` read local-only. Created `baseball_connections_puzzles` (RLS public-read), UPSERT-seeded 60 puzzles from local (verified 60/60, all 4×5×20-unique, sort_order 0–59). Added `src/lib/fetchBaseballConnectionsPuzzles.ts` + wired `useBaseballConnections` to read cloud with local fallback (mirrors locked soccer pattern). `tsc --noEmit` clean.
2. **Footle pool — dedupe `player_market_values` 2026 + fix to 150 unique by value** — ✅ DONE
   - Deduped year-2026 rows in a transaction (kept highest `market_value_usd` per `player_name`, tie-break `ctid`): 10,241 → 5,393 rows = 5,393 distinct (4,848 dup rows removed; every distinct player kept).
   - Fixed `fetchFootlePlayerPool.ts` to `.order('market_value_usd', desc)` instead of per-position `rank`. Verified top-150 = 150 distinct players, 0 null value/position. `tsc` clean.
3. **Create + seed missing tables** — ✅ DONE (tennis) / ⚠️ PARTIAL (nation, fantasy)
   - `tennis_players` created + seeded 40 players (+ `tennis_daily`, `tennis_scores`, RLS). Verified 40 rows → Guess Tennis Player now loads.
   - `guess_nation_countries` (+ daily/scores) and `fantasy_draft_players` schemas created (RLS public-read) so queries no longer error. **Seed gap:** no row data exists anywhere in the repo (13 NOT-NULL factual Olympic-hint columns; fantasy `dominant_foot` NOT-NULL CHECK). Not fabricating factual datasets — see Blockers.
4. **Re-sync games where local fix never reached cloud** — ✅ DONE (no further action)
   - Per CLOUD_BREAKAGE_AUDIT, every other content table already matches local post-fix state (career_players/seasons, soccer grids/clubs/transfer, shirt_number base, nascar, cbb). The only out-of-sync items were the four already handled above (connections [operator], baseball-connections, footle, tennis).
   - `20260527_shirt_number_batch_autopilot.sql` (+65 rows) is **unverified autopilot content expansion** (backlog P3-1, still TODO) — NOT a verified fix, and its sibling connections autopilot batch was quarantined as `_DO_NOT_APPLY`. Left unapplied pending verification. Cloud `shirt_number_puzzles` stays at 32.
5. **Remaining client-side TODOs in docs/BUG_AND_FEATURE_BACKLOG.md** — ⚠️ ASSESSED; nothing cleanly auto-executable without fabrication or design
   - Most P0/P1 items are already DONE or OBSOLETE per the backlog's own status notes.
   - **P2-4 Footle pool restrict/tiers** — partially satisfied by step 2 (pool is now true top-150 by value, tiered per position group).
   - **Not auto-executable (reasons):**
     - P2-1 (NBA Connect4 categories+multiplayer), P2-2 (NBA Chain golf rewrite), P2-5 (college hub), P2-6 (active-player counts): XL features needing design/brainstorming + new data/tables/realtime.
     - P3-3/P3-7 (soccer-club / NFL-team content), P3-8 (nation 80): factual content authoring — would require fabrication or sourcing.
     - **P3-5 (Higher or Lower → 500):** backlog says pull from `player_market_values`, but `higherLowerPlayers.ts` uses career totals (appearances/trophies/caps) that table does not have. Regeneration would require fabricated career stats. Skipped.
     - P3-1 (shirt 32→100): unverified autopilot batch — see step 4.
     - P3-4 (transfer path): candidates need human verification.

## Blockers (need operator/data)
- **`guess_nation_countries` seed** — schema live, 0 rows. Data (country Olympic-hint columns) was never committed to repo (only `UPDATE`s exist in migration `20260309185614`). Needs export from old project `pzzadswiradjnvvfybol` or authored dataset. Game loads but cannot start until seeded.
- **`fantasy_draft_players` seed** — schema live, 0 rows. `dominant_foot` is NOT-NULL CHECK('Left','Right','Both'); foot data isn't in repo. name/position/nationality/value are derivable from `player_market_values`, but foot would be fabricated. Needs old-project export or a foot dataset.

---

## Event log
- Recon complete: read CLOUD_BREAKAGE_AUDIT, useBaseballConnections, useConnections (locked pattern), fetchFootlePlayerPool, backlog. Cloud `connections_puzzles` confirmed at 155 before operator's dashboard reseed to 250.
