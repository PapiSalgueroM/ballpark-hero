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

## 3. Perfect Lineup — NBA version (TASK 2, next)
**Status:** investigating. Planning a starting-5 NBA variant with team/era constraints.
If `src/data/nbaStats.ts` lacks a per-player position or a usable power metric, I'll either
derive a proxy from available stats (no Supabase) or, if the local data is too thin, log the
exact missing fields here for you to add. No action needed from you yet.
