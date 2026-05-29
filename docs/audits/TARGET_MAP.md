# Overnight Run — Target Map (all games)

Resolves the brief's ❓ counts and the critical **table-vs-static** question for every game.
Determined by reading each game's hook (what it actually imports / queries), not assumed.

**Why this matters:** several games have BOTH a static `src/data/*.ts` file AND a Supabase table
of a similar name. The live game reads whichever the hook uses. Producing SQL for a table the
game doesn't read (or a static merge for a table-backed game) would be wrong. So:
- **TABLE-backed** → stage `DRAFT_*.sql` against the real schema.
- **STATIC-backed** → the merge target is the `.ts` array; audit + curated list, **no SQL**.

| § | Game | Candidates (confirmed count) | Data source (how confirmed) | Staging form | Run status |
|---|---|---|---|---|---|
| 3.1 | Guess The Year | guess-year (28) | STATIC `guessTheYearPuzzles.ts` (hook import) | TS merge | ✅ audited |
| 3.2 | Guess The College | guess-college (20) | STATIC `colleges.ts` — but candidate schema mismatches; target undecided | — | ✅ audited |
| 3.3 | Score Predictor | score-predictor (10) | STATIC `scorePredictorPuzzles.ts` | TS merge | pending |
| 3.4 | Guess The Nation | guess-nation (33) | **TABLE** `guess_nation_countries` (hook `.from()`) | DRAFT SQL | pending |
| 3.5 | Soccer Club | soccer-club (20) + extra (10) = 30 | STATIC `soccerClubPuzzles.ts` (hook import; `soccer_club_puzzles` table appears UNUSED by the game) | TS merge | pending |
| 3.6 | Guess NFL Team | guess-nfl-team (8) + extra (22) = 30 | STATIC `nflTeamPuzzles.ts` | TS merge | pending |
| 3.7 | F1 Driver | f1-driver (12) + extra (14) = 26 | STATIC `f1Drivers.ts` | TS merge | pending |
| 3.8 | Teammates | teammates (17) | STATIC `teammatesPairs.ts` | TS merge | pending |
| 3.9 | World Cup | world-cup (10) | STATIC `worldCupPuzzles.ts` | TS merge | pending |
| 3.10 | Baseball Career | baseball-career (15) | `career_players`/`career_seasons` table OR static — VERIFY | pending | pending |
| 3.11 | Baseball Connections | baseball-connections (3) | VERIFY (separate from soccer connections); ⚠️ category-label risk | pending | pending |
| 3.12 | Hockey Career | hockey-career (15) | career tables OR static — VERIFY | pending | pending |
| 3.13 | UFC Fighter | ufc-fighter (10) | STATIC `ufcFighters.ts` | TS merge | pending |
| 3.14 | Higher / Lower | higher-lower-pool.ts (50) | STATIC `higherLowerPlayers.ts` | TS merge | pending |
| 3.15 | Hockey Higher/Lower | hockey-hl-pool.json (25) | STATIC | TS merge | pending |
| 3.16 | CBB Programs (seed) | new seed | **TABLE** `cbb_programs` (confirmed: `useCbbProgram` queries it) | DRAFT SQL | pending (unblocks P0-4) |
| 4.1 | Shirt Number | rewrite (65) | **TABLE** `shirt_number_puzzles` (hybrid: static + `fetchShirtNumberPuzzles`) | DRAFT SQL | pending |
| 4.2 | Connections fix | autopilot script | **TABLE** `connections_puzzles` (live max puzzle-155) | analysis only | pending |
| 4.3 | Connections 30 "good" | locate | — | findstr report | pending |
| 4.4 | NFL Team facts (P1-10) | new | new table or static `nflTeamPuzzles.ts` | audit | pending |

**Net:** only 4 games are genuinely TABLE-backed and warrant DRAFT SQL — Guess The Nation, CBB,
Shirt Number, (Connections is analysis-only). Everything else is a STATIC `.ts` merge, so the
audit + curated list is the deliverable. This is the single biggest de-risking finding of the run.
