# Public write surface: what the data itself says

Measured 2026-08-30 in Round 361, before any change, direct against the live
database and the source. This file is the evidence half; the verdicts and the
fixes live beside it. Numbers here are measurements, not estimates.

## Has any of it been abused? No.

Every column that should hold a small fixed set holds exactly that set and
nothing else:

| Column | Values actually present |
|---|---|
| `overrated_votes.vote` | `over`, `under` |
| `tier_list_votes.tier` | `S`, `A`, `B`, `C`, `D` |
| `hof_votes.vote` | `bust`, `hof` |
| `poll_votes.choice` | `a`, `b`, `c`, `d` |
| grid `cell_index` (all three) | `0` to `8`, which is a 3x3 board |
| `cbb_scores` | score 0 to 1000, clues 1 to 6 |
| `nascar_scores` | score 0 to 800, clues 2 to 6 |
| `medal_games_scores` | score 0 to 1000, clues 1 to 7 |

Future dated rows: **0** in `rarity_round_guesses`, **0** in `cbb_scores`.

So this is an open door and not a break in, the same finding Round 360 reached
about the leaderboard. That matters for prioritisation, not for whether to fix.

## Which tables are actually read back

Read straight from the call sites, insert versus select:

**Read and shown to other people, so a forged row changes what someone sees:**
the three `*_grid_selections` tables (they drive the "how many players picked
this" rarity figures), `rarity_round_guesses`, and the three `*_chain_scores`
tables (each board selects from its own table to draw a leaderboard).

**Write only, never selected anywhere in src:** `cbb_scores`, `nascar_scores`,
`medal_games_scores`. A forged row into these changes nothing any visitor sees.
They are logging. Bounds are cheap hygiene here, not a fix.

## The one that is worse than a forged number

`cbb_daily` and `nascar_daily` do not hold scores. They hold **the answer to
the daily puzzle**: `(puzzle_date, program_id)` and `(puzzle_date, driver_id)`.

- The client reads them (`useCbbProgram.ts:53`, `useNascarDriver.ts:50`) and
  plays whatever row it finds, falling back to a deterministic seeded pick only
  when the date has no row.
- Both carry `UNIQUE (puzzle_date)`.
- Both accept anonymous INSERT with `WITH CHECK (true)`.
- Both are currently **empty**, so every date is unclaimed.
- The edge function that is supposed to fill them returns early if a row already
  exists for the date, so it will not overwrite one.
- Nothing in the browser ever writes them. The client only inserts into
  `cbb_scores` and `nascar_scores`.

Put together: anyone can insert a row for any date and permanently choose the
daily puzzle that every visitor gets, including for dates far in the future,
and the legitimate writer will decline to correct it. That is an integrity
attack on the daily game rather than a vanity one on a scoreboard, and no part
of it needs the openness the guest first design actually relies on.

## Not a finding, recorded so nobody re-audits it

`question_reports` takes anonymous free text and `AdminReports.tsx` renders it,
which would be stored XSS against the owner if it were rendered as markup. It is
not: there is no `dangerouslySetInnerHTML` on that path and React escapes by
default. The single `dangerouslySetInnerHTML` in the codebase draws club crests
from `crestSvg`, whose only user controlled input passes through
`sanitizeCrestInitials`, which strips everything outside letters and digits and
caps the result at three characters. Checked in the code rather than taken from
the comment above it, which happens to be accurate.


---

# What was done, Round 361

Nineteen tables were audited by six parallel agents, then every finding was put
to an adversarial verifier told to refute it. The verifier changed three attack
cost estimates by an order of magnitude in both directions and killed one
proposed fence outright, so its corrections are taken over the auditors'
throughout and named where they mattered.

Twelve tables feed something a human reads. Seven feed nothing.

## Bounded, because the site shows their data back as a fact

| Table | What a forged row changed | Bound, and where it comes from |
|---|---|---|
| `ufc_chain_scores` | Rank 1 on a top ten shown to every finisher, plus attacker chosen nickname text | `score <= chain_length * 300`: a link adds 100 raw plus a 50 championship bonus, and the multiplier caps at 2.0 |
| `tennis_chain_scores` | Same, and the table is empty, so a forged row would be the game's whole visible history | `score <= chain_length * 200` |
| `nascar_chain_scores` | Same | `score <= chain_length * 200` |
| `soccer_grid_selections` | The "N% picked this" line, the tier badge, the Rarity Score headline and the share text | `cell_index` 0 to 8, which is `rowIdx * 3 + colIdx` over a nine cell board |
| `college_grid_selections` | Same | Same |
| `football_grid_selections` | Same, and `FootballGrid.tsx:140` sells the rarity system to crawlers as "based on real player selections" | Same |
| `hof_votes` | The Community Vote donut, where the busiest player holds 27 votes | `vote in ('hof','bust')`, id shape from `src/data/hofPlayers.ts` |
| `poll_votes` | The percentage and total on the home page | `choice in ('a','b','c','d')` from `CHOICE_KEYS` |

Nickname length, mode sets and the 200 chain ceiling are all from source too.
Pre flight before applying: **0 existing rows violate any predicate.**

## The write removed rather than bounded

`cbb_daily` and `nascar_daily` hold the daily puzzle answer, so there is no
bound that makes an anonymous write safe. Both anonymous INSERT policies are
dropped; the SELECT policies stay, because the games read them. Neither policy
appeared in any committed migration, so nothing in version control ever
explained why they existed.

Severity honestly stated: a malformed forgery degrades into the date seeded
fallback, knowing the answer is already free from that same fallback, and no
score or rank moves. It is ranked here for the pairing of a permanent shared
answer with a zero cost fix, not for the size of the harm.

## The bug with no attacker in it

`useMostPlayed` selected the day's completions and tallied them in the browser,
on the assumption written into its own comment that a day's table stays small.
PostgREST truncates every select at 1,000 rows. The day had grown to 3,550.

| | Truncated read, what the site computed | Reality |
|---|---|---|
| 1 | club-manager (990) | club-manager (2638) |
| 2 | budget-builder (7) | soccer-career (547) |
| 3 | ball-iq (1) | nba-my-career (132) |

Only two games cleared the five play threshold in that slice, which is fewer
than the three needed, so the home page silently served the curated fallback
trio and looked entirely normal doing it. It now calls `most_played_today`,
which aggregates in the database, cannot be truncated, stops shipping a day of
completions to a phone in order to count them, and joins Round 360's allowlist
so an invented key cannot trend either.

This is the third instance of the PostgREST 1,000 row cap in three rounds, after
`fetchAllRows` in 359 and this round's own harness draft. It is the single most
repeated defect in this codebase.

## The systemic finding: live had drifted looser than the repo

Comparing `pg_policies` against `supabase/migrations`, always in the permissive
direction:

| Table | Committed | Live before Round 361 |
|---|---|---|
| `question_reports` | INSERT bounded, description 1 to 2000, game_type 1 to 50 | `WITH CHECK (true)` |
| `cbb_scores` | SELECT admin only, INSERT bounded | both public and unbounded |
| `medal_games_scores` | SELECT admin only | public |
| `hof_votes` | a bounded INSERT policy | `WITH CHECK (true)` |
| `nascar_scores`, `nascar_daily` | no committed migration at all | defined only in the live database |

One missing bound is a bug. Four, all in the same direction, is a process with
no feedback. The read policies and the `question_reports` bound are restored.
The three write only score tables keep their open inserts on purpose, with the
reasoning recorded in the migration.

**`simPublicWrites` cannot catch this class**, because the anonymous key cannot
read `pg_constraint` or `pg_policies`. It probes behaviour instead, which is
what an attacker meets. The catalog comparison stays a manual step of any future
audit, and this table is where it gets written down.

## Needs nothing. Do not re-audit these.

| Table | Why |
|---|---|
| `overrated_votes` | Its game was deleted; no select, RPC, function or view anywhere. |
| `tier_list_votes` | Same shape; `/tier-list` redirects home. |
| `transfer_grade_votes` | Its only reader sits behind a redirect, and the table is empty. |
| `cbb_scores` | Write only telemetry, zero reads anywhere. |
| `nascar_scores` | Same. Note the bound would be score to 1000 and clues from 1, not the 800 and 2 the current 19 rows happen to show. |
| `medal_games_scores` | Same. |
| `question_reports` | SELECT is admin gated, so a forged row is inbox noise, never shown to a visitor as a fact. Its write is bounded now regardless. |

## Filed, not fixed

- **Nothing schedules either daily edge function.** `cron.job` holds only the two
  `scores-poll` entries, so Daily mode on the CBB and NASCAR guessing games has
  been served by the client side fallback since it shipped. That is a product
  bug, not a security one, and it wants its own round.
- **The rarity percentages are thin before any attacker appears.** Honest
  denominators average between 2.5 and 5.1 picks per cell, so "N% picked this"
  is mostly noise. A product honesty question for its own round.
- **`game_completions` backdating is still unbounded above.** Round 360 killed
  the invented key and the rescaling attacks; what remains is that
  `completed_on` is client supplied, so roughly 69 inserts across distinct
  allowlisted game and past day pairs would top the board. Neither RLS nor a
  CHECK can express the rate limit that actually fixes it, and no single numeric
  bound is both safe for real play and useful, because the legitimate range runs
  to 56,000,000 for `sign-the-player`. It belongs to the edge function or WAF
  item already on the record.
- **The chain leaderboard headings said "Today's Top 10" over an all time
  query.** Relabelled to "All Time Top 10" rather than date filtering, because
  two of the three tables are empty and a date filter would show an empty board
  almost always. The label now matches what the query returns.


## Round 360's own fence caught Round 360

Running the suite at the end of this round turned `simLeaderboardCaps` red, and
it was right. `nba-stat-line` had recorded scores and no cap row, so every point
earned in it counted for nothing.

The allowlist has two halves: keys with recorded scores, taken from the data,
and keys the source can send, taken from the source. The source scan matched
`useGameCompletion('literal'` and `recordCompletion('/literal'` only. This
codebase does not always write it that way: five pages pass a `const SLUG`,
three perfect lineup variants pass `config.gameId`, two calls are split across
lines, and one uses double quotes. Every one of those was invisible to it.

It stayed harmless for games that already had scores, because the data half
covered them. `nba-stat-line` shipped in Round 352 with none, so it fell through
both halves at once. `world-cup-bracket` is the same shape.

Two things worth keeping from this:

- **The check that caught it reads the completions table, not the source.**
  Section 1 was blind here for exactly the reason the migration was: it shared
  the source scan's blind spot. A check whose two sides come from the same place
  cannot see an error in that place.
- **A silent zero is the failure mode to design against.** Nothing errored,
  nothing logged, and the only symptom was points quietly not counting on a
  board nobody cross checks.

The extractor now resolves file local constants, `gameId` fields, both quote
styles and multi line calls, and sees 126 keys where it saw 115. Both missing
games are allowlisted.
