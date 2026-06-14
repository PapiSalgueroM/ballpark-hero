# Anthony TODO — items needing your Supabase / edge-function access

Logged by Claude Code during autonomous sessions. These are the only steps I can't do
myself (they need the Supabase dashboard, SQL editor, or AI-gateway/edge access).

---

## 1. Seed CBB programs (unblocks P0-4 — Guess CBB Program)
**Status:** ready to apply. Table `public.cbb_programs` exists with public-read RLS but 0 rows,
so the game shows the empty/error state. Paste the fact-checked 24-row INSERT from
`docs/staged-migrations/DRAFT_cbb_programs.sql` into the Supabase SQL editor.

Steps: Supabase dashboard → SQL Editor → New query → paste the INSERT → Run → verify
`SELECT count(*) FROM public.cbb_programs;` returns 24 → open /guess-cbb-team to confirm it loads.
(No `cbb_daily` seed needed; the hook falls back to a date-seeded pick.)

After you confirm 24 rows, ping me and I'll save the corrected SQL over the draft and update
`docs/audits/cbb_programs_audit.md`.

---

## 2. Perfect Lineup — era / historical-roster constraints (v2 enhancement)
**Status:** optional. The shipped v1 (`/perfect-lineup`) runs fully client-side on
`src/data/players.ts` (current players, league + nationality constraints). To add 82-0-style
**era constraints** (e.g. "2004 Arsenal", "a 2010s Serie A striker"), the game needs
season-by-season roster data that lives in Supabase, not in the local bundle:
- `career_seasons`, `soccer_careers`, `soccer_career_clubs`.

What I need from you to build v2:
- Confirm those tables are populated and readable (public-read RLS, or an edge function).
- A note on which columns hold (player, club, season/year, league) so I can write the query.

Until then v1 stands on its own and needs nothing.

---

## 3. Perfect Lineup — NBA version (TASK 2) — BLOCKED on Supabase data
**Status:** needs your access. I checked the local data and there is **no NBA player pool in the
bundle**: `src/data/nbaStats.ts` only defines stat-challenge types, `src/data/nbaTeams.ts` is
just the 30 team names. The existing NBA games (Starting 5, etc.) fetch players from the
**edge functions** `nba-validate-player` / `nba-suggest-players` — i.e. NBA player data lives
server-side, not in the client. So the NBA Perfect Lineup variant can't be built client-side
the way the soccer one was.

To unblock, I need one of:
- **(a)** A readable Supabase table of NBA players with at least: `name`, `position`
  (PG/SG/SF/PF/C), a `team`, and a power metric (PER, BPM, or even PPG) — tell me the table
  name + columns and I'll build it. Or
- **(b)** Confirm I may author a curated local pool (~80 notable players with positions +
  approximate ratings) and ship that with no Supabase dependency. Lower fidelity but immediate.

The soccer version is complete and unaffected.

---

## 4. P2 features that need Supabase (logged, not built)
These were in the autonomous P2 batch but genuinely require your Supabase/edge access:

- **P2-1 NBA Connect 4 — multiplayer + category expansion.** Real-time 2-player needs
  Supabase Realtime channels (new tables for game rooms + presence). Expanding to 50+
  categories needs validation against NBA player data, which lives in the
  `nba-connect4-validate` / `nba-suggest-players` edge functions, not in the client.
  Need: confirm I can add Realtime tables + tell me the NBA player source for validation.
- **P2-2 NBA Chain — golf-style year-selection rewrite.** Requires NBA rosters by season
  (which players shared a team in which exact year). That data isn't in the bundle; needs a
  Supabase table (player, team, season) or an edge function. Tell me the source and I'll build
  the year-overlap validation + golf scoring.
- **P2-4 Footle — restrict to top-150 pool + tiers.** Reads `player_market_values` (Supabase,
  176k rows). I can write the pool-build query + tier logic, but I can't run it. Confirm the
  table/columns (rank, year=2026, market value) and whether to regenerate `src/data/` from it.
- **P2-6 Home activity counters.** "X playing now / X plays today" needs a `play_events`
  table (anonymous session id, game, timestamp) + inserts on game start and a count query.
  This is the same infrastructure flagged for P1-1/P1-2. Need the table created (RLS:
  anon insert, public count) — then I'll wire the client.

## 5. P2-3 / rarity for career games (partial)
Share cards (TASK 1) and "did you know" facts (NFL/Baseball/Hockey career) are done client-side.
The remaining parity item — **pick-rate rarity on career games** — needs per-answer guess
logging (a `career_path_guesses` table + edge logging) to compute "X% also guessed this".
Lower priority; only build if you want it. See docs/RARITY_AUDIT.md.
