# Anthony TODO — items needing your Supabase / edge-function access

Logged by Claude Code during autonomous sessions. These are the only steps I can't do
myself (they need the Supabase dashboard, SQL editor, or AI-gateway/edge access).

---

## ⭐ P0 GAMES — exact steps to make the 3 known-broken games work
All three are **code-solid** (re-verified in docs/GAME_HEALTH_AUDIT.md). Each needs one
Supabase/edge action:

### P0-4 — Guess CBB Program → seed the table (see section 1 below for the full steps)
Run the 24-row INSERT from `docs/staged-migrations/DRAFT_cbb_programs.sql`. Verify
`SELECT count(*) FROM public.cbb_programs;` = 24. Done.

### P0-5 — NBA Build Your Starting 5 → fix the eval edge function model id
Symptom: lineup evaluation fails (now caught — the lineup is preserved and an error shows,
but it still can't score). Cause: the `nba-evaluate-lineup` edge function calls model
**`google/gemini-3-flash-preview`**, while the working `football-grid-validate` uses
**`google/gemini-2.5-flash`**.
Steps:
1. Supabase dashboard → Edge Functions → `nba-evaluate-lineup` → open the source.
2. Find the model string `google/gemini-3-flash-preview` and change it to a valid model
   the gateway serves (match `football-grid-validate`: `google/gemini-2.5-flash`).
3. Redeploy the function. Confirm `LOVABLE_API_KEY` is set in the function's secrets.
4. Play /nba-starting-5, submit a 5-player lineup → it should score without the error card.

### P0-2 — Football Grid → verify the validate edge function + deploy
Symptom: guesses may not register on the live site (frontend is functional and now toasts on
failure). Cause is server-side, not the React code.
Steps:
1. Supabase dashboard → Edge Functions → `football-grid-validate` → check it's deployed and
   `LOVABLE_API_KEY` is present in secrets.
2. Open /football-grid, submit a known-correct cell answer, and watch the Network tab: the
   `football-grid-validate` call should return 200 with a match result (not 401/500).
3. If it 401s → the API key/secret is missing or wrong. If it 500s → check the function logs.

### Also: NASCAR Driver & Tennis Player tables (same pattern as CBB)
I made both games degrade gracefully this session (no more infinite "Loading…"), but if they
show **"No drivers/players available yet"**, their tables are unseeded like CBB was:
- `SELECT count(*) FROM nascar_drivers;` and `SELECT count(*) FROM tennis_players;`
- If 0, they need seeding. There's no staged INSERT for these yet — tell me and I'll draft
  fact-checked candidates (notes exist at docs/candidates/nascar-driver-notes.md /
  tennis-player-notes.md) for your fact-check, same flow as CBB.

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
