# Round 531 design contract: correct info on all basis, part one

Written 2026-09-11 by the desktop lane. His words today: "correct info on all basis". The
inventory behind this is `docs/audits/data-provenance-inventory-2026-09-11.md`, which ranks
every hand typed fact file by exposure over verification. This round takes the top of that
list where the fix is structural (derived, never typed) plus the one live table that was
generated from memory. Part two (Round 532) takes the hand typed clue files.

## The law (dukb-data-guardian)

Two source verify anything real before it enters a player facing table or file; when the two
disagree a third settles it or the value does not ship; record the sources in the change log.
Mark thin data (the CM_PARTIAL shape) rather than filling it. Anything a rule can compute is
derived, never typed. Every data fix ships with a fence that would have caught it, and the fence
ships with a negative control proven to fire. The smell list: age 0 or a future age, value at or
below zero, no current team and not retired, an impossible position, duplicate names in one
pool, club to league mismatches (short versus long spellings), a player in the wrong era.

## The four pieces

1. **`src/data/players.ts` becomes generated.** 748 hand typed rows, nine fact fields each, the
   Footle fallback and read by five other libs, with one dating comment and no harness. A new
   `scripts/bakePlayers.mjs` regenerates it from `player_market_values_dedup` (the same source
   the Club Manager rosters are baked from) plus the verified summer 2026 transfer overlay
   (`scripts/transferOverlay2026.mjs`): club, league, nationality, position (normalised the way
   `fetchFootlePlayerPool.ts` already does), age and market value come from the table; the kit
   number comes from `src/data/footleEnrichment.ts` where it has one and is otherwise absent
   (the Round 443 render path already says so). Goals and assists: if the table carries them
   they are baked; if it does not, the bake keeps the existing hand typed pair ONLY for a row
   whose name and club still match the table and marks the file header with exactly what those
   two fields are (unverified season counts as of February 2026) and the rows that carry them,
   so the next round can replace them rather than trust them. The easy and hard tiers are kept
   by the rule the file already implies (the top of the value ranking plus the GOAT list the
   pool fetch names). Every consumer keeps its shape (`Player` in `src/types/game.ts`). Fence:
   `scripts/simPlayersPool.mjs`: every row agrees with the live table on club, league,
   nationality, position and age (a sample of at least 200 rows fetched fresh), the smell list
   over every row, the header names the bake and its date, and the file is byte identical to a
   fresh bake run (so nobody hand edits it again). Controls: `PLAYERS_CONTROL=handedit` (one
   club rewritten in the file, the freshness and the table checks must go red),
   `PLAYERS_CONTROL=agezero` (one age set to 0, the smell list must go red).

2. **`src/data/careerPlayers.ts` becomes generated.** 151 players and 1,648 season rows, the
   fallback for Career Ladder and Transfer Path, and Transfer Path validates guesses off the
   graph built from it, so a wrong club season refuses a right answer. No header at all.
   `scripts/bakeCareerPlayers.mjs` regenerates it from `career_players` and `career_seasons`
   exactly as `fetchCareerPlayers.ts` reads them (same paging, same null assists rule), keeping
   the `CareerPlayer` shape. The generated file carries the bake date and the row counts. Fence:
   `scripts/simCareerFallback.mjs`: the file equals a fresh bake, a sample of 30 players matches
   the live rows season for season, no player has two clubs in one season key, seasons are in
   sort order, stats are non negative, and every club string in it appears in the table's own
   club list. Controls: `CAREER_CONTROL=split` (one season duplicated under a second club),
   `CAREER_CONTROL=stale` (one goals figure changed).

3. **`cbb_programs`, the live table generated from memory.** Its own audit
   (`docs/audits/cbb_programs_audit.md`) says every field came from memory with a January 2026
   cutoff and flags championship counts and 2024-25 realignment as highest risk; it was applied
   2026-06-14 and never verified. Two source verify all 24 rows: championship count and years,
   current conference (2025-26), the tournament and mascot hints, against Wikipedia's program
   page and a second independent publisher (NCAA.com's championship history, the school's own
   athletics site, or Sports Reference). Write the corrections as
   `supabase/migrations/20260911_cbb_programs_verified.sql` with one UPDATE per corrected row and
   a comment naming both sources, NOT applied by the builder (the desktop lane applies it through
   the Supabase MCP after reading it), and the evidence table as
   `docs/audits/cbb-programs-verification-2026-09-11.md`. Fence: `scripts/simCbbPrograms.mjs`
   pins the verified championship counts and conferences against the live table (the
   `simSilverwareSort` shape: the truth typed into the harness from the evidence file, the table
   must agree), refuses to pass when the table is unreachable, control `CBB_CONTROL=count` (one
   pinned count off by one).

4. **The four front office cap constants and a dead file.** `SALARY_CAP_BASE` (NFL),
   `NBA_CAP_BASE`, `NHL_CAP_BASE`, `MLB_TAX_BASE` price every contract in four sims with no
   publisher, no read date and invented escalators. Copy `src/lib/soccerCurrency.ts`: a new
   `src/lib/leagueCaps.ts` holding the four current figures, a `CAPS_AS_OF` date, two named
   sources per figure (the league's own announcement or CBA page and an independent outlet), the
   documented per season change where a league has published one and the in game escalator
   otherwise, labelled as the game's own assumption. The four libs import their figure from it,
   and each cap screen prints "cap figures as of <month year>". Fence: `scripts/simLeagueCaps.mjs`
   pins the four values and the date, checks the four libs import rather than retype, and renders
   each cap screen through react-dom/server to find the date line. Control: `CAPS_CONTROL=retype`
   (one lib's constant put back as a literal). Also delete `src/lib/clubData.ts`: it has no
   importer and its league map contradicts the verified 2026-27 memberships.

## What does not change

No game rule, no scoring, no save shape. The era pools and era rosters (Round 312's separate
truths) are not touched. The Footle pool's GOAT list and tiering rule are not touched.
