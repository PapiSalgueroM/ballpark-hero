# Round 1543 notes: Stadium Tycoon, the goal, win and streak badges and milestones on the new scores

Brief: dukb-handoff/2026-10-10/briefs/brief-1543.md (PART B of brief-1539.md, whose section 0 binds), with
critic-1539.md beside it. Full record: dukb-handoff/2026-10-10/results-g/finish-1543.md (the build) and
results-g/fix-1543.md (the review fixes). This file keeps in the repo what those keep outside it: the identity leg,
the history legs and their attribution, and what the review changed.

## Status

Branch r1543-tycoon-badge-ladder, from origin/r1539-tycoon-after-law 1afe5364c (Round 1539 closed), with origin/main
7f99c27ee merged as bac65fb0b, the round's starting commit and the base of every base against head comparison. Main
3ee0bf629 was merged later (640506ef8). Not on main: it ships with Rounds 1532 and 1539 or after them.

## The ladder

Eleven rows of src/lib/stadiumTycoon.ts moved, ids unchanged, never raised, ACH_BONUS, the badge count and every
milestone pay unchanged (contract section 23 of docs/design/round-580-tycoon-merge.md holds the rule and the table):

| Rung | Old | New |
|---|---|---|
| win10, aw10 | 10 | 8 |
| win50, aw50 | 50 | 35 |
| aw150 | 150 | 125 |
| aw400 | 400 | 300 |
| goals25, ag25 | 25 | 10 |
| ag100 | 100 | 30 |
| ag500 | 500 | 75 |
| ag2000 | 2000 | 250 |
| win1, aw1 | 1 | 1 (on target) |
| streak5, as5 | 5 | 5 (fixed by the lead) |
| as10 | 10 | 10 (fixed: streakMult's cap) |

Picked by scripts/measureTycoonLadder.mjs (remote checks r1543-s1 at the old ladder, r1543-s2a at the new: "0 row(s)
to move"). Two picks follow the rule as written and are flagged for the lead: win10 and aw10 moved to 8 on holdout
(27.3 against a base of 21, arm 5.25), and aw150 picked 125 from calibration rates (holdout rates alone give 100).

## The identity leg (decision 4, critic item 11)

The head lib with the eleven rows and the two "Round 1543" comment lines written back (each row asserted exactly
once, the comment line exactly twice) by oldLadder1543.mjs gives LF sha256
a4e65b1214c95389f29bc0e1e794cd37ea4cc0a49606bec84e0a43b5251583c3, identical to bac65fb0b's
src/lib/stadiumTycoon.ts. So the round's lib change is those thirteen lines and nothing else. The script is kept at
dukb-handoff/2026-10-10/results-g/r1543-extras/oldLadder1543.mjs.

## The history legs (the one re-record)

scripts/data/allPlayersValueBaseline.json: the watchedHash and awayHash of 8 of the 12 histories (14 hash lines and
the casesRetaken note), read by simAllPlayersValue (empty) and simTycoonSetPiece, written by
scripts/retakeTycoonHistories.mjs. Cause: the lowered ladder lands badges (+2 percent income each) and milestone
pay earlier in the played histories. Proof on remote check r1543-s2a (head 6195a597c):
- retake-base, a worktree of bac65fb0b: 12 of 12 committed hashes reproduce, 0 differ, exit 0.
- retake-oldladder, the head with only the eleven rows and two comments written back: 12 of 12, exit 0, so the
  ladder alone moved them.
- retake-head: 4 of 12 reproduce, 8 differ, exit 1.
- retake-write, then 12 of 12, exit 0; committed alone as e8338d0aa.
No other recording moved: tycoonScorelineBaseline.json, tycoonScorelineTuning.json and
src/test/fixtures/tycoonSaves.json are unchanged.
