# The World Leaderboard can be forged by anyone

Found 2026-08-26 while auditing the database after Anthony said "make sure to
protect douknowball". **Not exploited. APPLIED 2026-08-30 in Round 360. See the resolution at the bottom.**

## What is wrong

`global_leaderboard()` and `global_rank()` score every player as:

```
100 * (their best score that day) / (the maximum score anyone has ever posted for that game)
```

and they compute that denominator **from `public.game_completions`**, which
accepts anonymous INSERT with `WITH CHECK (true)`.

The openness of that table is not the defect. It is a deliberate guest-first
design: the handle is generated in the browser, no PII is sent, and "Most Played
Today" needs every visitor rather than only signed-in ones. `src/lib/completions.ts`
says exactly that. The defect is that the **ranking treats forgeable data as
authoritative**.

Every input to the formula is client controlled:

| Column | Constraint | Reality |
|---|---|---|
| `game` | none | free text, any string |
| `score` | none | unbounded integer |
| `completed_on` | defaults to today | can be supplied, past or future |
| `player_name` | none | free text, any handle |

### The cheap attack

Post one row for a game name that does not exist, score 1. That invented game's
maximum becomes 1, your day best **is** the maximum, and the formula awards the
full 100 points. Repeat with distinct (game, date) pairs and **every row is
another 100 points**. A few hundred rows puts anyone permanently top of a board
that Round 270 linked from every page on the site.

### The loud attack

Post one enormous score for a real game and you silently rescale the denominator
for every other player of that game.

### The third

`player_name` is a string, so anyone can post under anyone's handle.

## Has it happened

**No.** Measured 2026-08-26 across 105,726 rows: zero games have a maximum more
than five times their own 99th percentile. An open door, not a break-in. There is
one leftover test row (`qa-test` / `QA-Harness-Test`, 2026-07-15).

## The fix

`supabase/migrations/20260826_leaderboard_score_caps.sql`.

A `game_score_caps` table doing two separable jobs:

- **The allowlist.** A game absent from it scores nothing. This kills the cheap
  attack, because an invented key cannot be in the list. It is the same
  fail-closed rule the AI validators already use.
- **The frozen denominator**, where one is known. This kills the loud attack,
  because `max(score)` no longer decides anything.

`max_score` is nullable on purpose: a real game with no scores yet is
allowlisted with no frozen number and falls back to the **99th percentile** of
its own scores rather than the maximum, so one outlier cannot move it and a
newly shipped game works the day it ships with no maintenance step.

### The mistake the first draft made, worth keeping

The first draft froze every denominator from existing data. That would have
**silently broken thirteen live games**: thirteen keys the client can send have
never recorded a score, so they would have earned zero forever on a board nobody
would think to check. **Three of them shipped in the last four days**
(`face-off`, `hall-of-champions`, `idle-arena`), which is the whole argument for
deriving the list from the source and not only from the data.

Caught by diffing the keys the **source** can send (108, from
`useGameCompletion('<key>'` and `recordCompletion('/<key>'`) against the keys the
**data** holds. Neither is a subset of the other: the data also holds sixteen
keys the client can no longer produce (retired games and renamed slugs) whose
caps must survive or real historical points vanish.

### Verified read-only against live data before applying

Old formula against new, over all 3,581 players:

- players whose points change: **0**
- largest change to any total: **0**
- players dropped: **1**, and it is `QA-Harness-Test`

## What this does NOT fix

Each needs its own round, and none is fixable in row level security:

1. **The INSERT policy is untouched.** Blocking unknown keys at write time is
   the obvious next step, but the key space is hand-maintained across about a
   hundred call sites and a constraint written from the route table would stop
   real games recording.
2. **Nothing rate limits writes.** Someone could still post a million rows and
   grow the database until the spend cap trips. Needs an edge function in front
   of the insert, or a WAF rule.
3. **Ballot stuffing on the crowd-vote games** (`overrated_votes` 4,746 rows,
   `poll_votes` 3,134, `tier_list_votes` 2,456, `hof_votes` 526, all
   `WITH CHECK (true)`). Same shape, same answer.

## The rest of the audit came back healthy

525 Supabase advisor lints, **zero at error level**. RLS on every public table
(`tables_without_rls` = 0). `anon`, `authenticated` and `public` all denied
CREATE on the public schema. Every user-owned table gates correctly on
`auth.uid() = user_id`. No UPDATE or DELETE open to anonymous users anywhere.
`has_role` being SECURITY DEFINER and anon-executable is the recommended
Supabase pattern and already pins its `search_path`.

**Two things only Anthony can do, both one click:**

- Supabase, Authentication settings: **turn on leaked password protection**
  (currently off). It blocks signups using passwords from known breaches.
- Confirm the **spend cap** is still on.


---

# RESOLUTION, Round 360, 2026-08-30

**Applied.** The hole above was live for four more days after this document was
written, because the document and its migration were never committed: both sat
untracked in Anthony's folder, so no session that pulled the repo could see
them. Verified against the live database on 2026-08-30 before doing anything:
no caps table existed and neither `global_leaderboard()` nor `global_rank()`
mentioned a cap, so the ranking was still reading forgeable numbers as
authoritative.

## The draft could not be applied as written

Its half two named the thirteen keys that had no scores **on 2026-08-26**. Four
games shipped between then and 2026-08-30 can send a completion and still have
no scores: `clue-auction`, `perfect-season-nhl`, `stat-detective` and
`who-am-i`. All four are live registered routes. Applying the draft unchanged
would have allowlisted none of them, so each would have earned zero forever on
a board nobody would think to check.

That is precisely the failure this document already describes its own first
draft making, four days earlier. Writing the lesson down did not prevent the
repeat, which is the argument for a check instead of a note.

## What was applied

`supabase/migrations/20260830_leaderboard_score_caps.sql`, which supersedes the
2026-08-26 draft. Same design, one change: **half two now carries every key the
source can send, derived from source rather than typed**, so the table is
complete by construction instead of complete by somebody remembering. 137 rows
resulted: 122 frozen from live data, 15 allowlisted with a null denominator.

Re-verified read only against live data immediately before applying, on 174,183
rows and 3,982 players: top 100 players whose points change **0**, largest
change to any total **0**, players dropped from the top 100 **0**. The only row
that stops counting is `qa-test`.

Re-measured for exploitation at the same time: still none. No game has a maximum
more than 1.2 times its own 99th percentile.

## The fence, which is the part that lasts

`scripts/simLeaderboardCaps.mjs`. The inner join that kills the attack also
turns a missing row into silent zero scoring, which is a quieter bug than the
one it replaces, so the allowlist needs a guard rather than good intentions. It
derives the keys from source and holds five things: every source key is
allowlisted, an unlisted key has no denominator, every denominator is at least
1, every key that already has scores is covered, and the table refuses an
anonymous write (it answers 401). `CAPS_CONTROL=stalelist` adds a fabricated key
and section 1 goes red, which is the exact shape of the real failure.

It is the complement to `simScoringCoverage`: that one proves every registry
game records a completion, this one proves everything that records is allowed to
score.

**A bug in the fence itself, worth recording.** Section 4's first draft read
`game_completions` with `limit=100000` and reported green having seen 1,000 of
174,183 rows and 40 of the 122 games that really carry scores. PostgREST
truncates every select at 1,000 rows, which is the entire reason
`src/lib/fetchAllRows.ts` exists and which Round 359 had just finished hardening.
It now keyset paginates on the game column and fails outright if it enumerates
fewer than 100 games, so a truncated read can never again read as "nothing
orphaned".

## One thing found while applying it

`get_advisors`, run straight after the DDL as this repo's database rules
require, raised one ERROR: the new `game_denominators` view defaulted to
SECURITY DEFINER. It exposed nothing, because both tables it reads already carry
public read policies, but it is now `security_invoker = true` so that a future
restriction on `game_completions` cannot be silently bypassed. Checked at the
same time: `app_secret` is executable only by `postgres` and `service_role`, so
the scores poll secret is not reachable with the anonymous key.

## Still open, unchanged from above

Items 1 to 3 under "What this does NOT fix" are all still true and still need
their own rounds. And the two one-click items for Anthony are still outstanding:
**leaked password protection is still off** (the 2026-08-30 advisor run confirms
it), and the spend cap wants confirming.


---

# Round 361 revisited these open items

**Item 1, the INSERT policy, is sharper than it was written.** What Round 360
left is not just "unknown keys can be written". It is that `completed_on` is
client supplied and bounded only above, so the backdating window is unbounded:
roughly **69 anonymous inserts** across distinct (allowlisted game, past day)
pairs puts a stranger at the top of the board, measured against the current
number one's 6,877 points from 103 scored rows. Because `least(score, cap)`
clamps, a forger never has to learn any cap value; any absurd score pays exactly
100. Still not fixable in RLS or a CHECK: the legitimate score range runs to
56,000,000, so no single numeric bound is both safe for real play and useful.
This stays with the edge function or WAF item.

**Item 3 was too broad and is now narrowed to what still exists.** Of the crowd
vote tables named there, `overrated_votes` and `tier_list_votes` belong to games
that were deleted and are read by nothing anywhere, and `transfer_grade_votes`
sits behind a redirect and is empty. Only `hof_votes` and `poll_votes` were ever
reachable, and both are bounded as of Round 361. Add `rarity_round_guesses` to
the same family: it was never in this list, its `answer` column is free text,
and the panel headed "What everyone else picked" rendered whatever was stored.
Fixed client side rather than with a constraint, because the pool is generated
and a database allowlist over generated data is the stale allowlist failure this
repo has already paid for twice.

**Both one click items are still outstanding**, and the 2026-08-30 advisor run
confirms the first: leaked password protection is off, and the spend cap wants
confirming.
