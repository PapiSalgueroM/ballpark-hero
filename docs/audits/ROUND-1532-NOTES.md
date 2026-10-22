# Round 1532 notes: Stadium Tycoon scorelines

Brief: dukb-handoff/2026-10-10/briefs/brief-1532.md (section 0 binds), critic-1532.md beside it. Full step 1 record:
dukb-handoff/2026-10-10/results-g/finish-1532.md.

## Status (2026-10-21, the round built to its end)

STEP 1 DONE (the base record and the predictor; the lead ruled S1 to S6). STEP 2a DONE: the tuning run
(scripts/tuneTycoonScorelines.mjs on a copy patched by scripts/lib/tycoonLaw.mjs, remote check r1532-s2a) chose
SQUAD_POINTS 0.85, R0 1, ARRIVAL_EDGE 4, rivalStrength 1 25 40 46 54 58 61 65 67 69, every target of brief 1.3 met.
STEP 2b ONWARD DONE: the law and the bonuses in seconds landed in src/lib/stadiumTycoon.ts (the measured text, applied
by --apply), every harness that pinned the old curve repointed, NEW simTycoonScorelines (r1532-b4: 15 checks, 0 failed,
every control on exactly its sections), the twelve histories retaken by their legs (r1532-b2), the two fences
re-derived as the lead ruled (R2 wins floor 0.53125, was 1.828125; R3 band 11.6125 to 34.8375, was 5.8125 to 17.4375)
at the moved fixture (S3, Squad 62), the pack price rule (Scout 21, Club 71, Elite 178), the rules paragraph and
helpFacts, six guide sentences (R4), What's New, contract section 21, NEW playTycoonScorelines (green), the weight
(/stadium-tycoon 302.6K on base, 303.1K on the final head). Merged origin/r1531-tycoon-held-fixes 00bffb93 and origin/main
6d2d7a7d (head 041f3f0a, proved on r1532-f5a2, f5b, f5c, f6, f7). The full record: dukb-handoff/2026-10-10/results-g/finish-1532.md (step 1's: finish-1532-step1.md).

Owed to the lead: the /stadium-tycoon weight row (+0.6K, over the +0.3K allowance); simTycoonPacks' dear control is
dead on S15 (titles now bound the dry spell, measured) and its S2 sample moved with the price seed; the /whats-new and
/stadium-tycoon saved pages (build:seo); the six guide sentences posted for the other lane; a badge ladder round
(ruling S4); away play's pace as the next round.

## Step 1: what was added

- scripts/lib/tycoonBots.mjs: the bots pace, overinvest, nosquad, paceSell (design 3.6) and the measured variants
  over1, over2, over4, over8 (Squad priced at 1, 1/2, 1/4, 1/8 in a queue that waits for its next track).
- scripts/genTycoonScorelineBaseline.mjs and scripts/data/tycoonScorelineBaseline.json: the base record on 77c00798,
  taken on a GitHub runner (remote checks r1532-s1 and r1532-s1b, exit 0). Pace seeds 1 to 10 are simTycoonLeague
  section 4's own runs (median first Sell up 13.37 in both).
- scripts/predictTycoonScorelines.mjs: the predicted table by exact binomial from that record (r1532-s1c, exit 0). Its
  replays of Round 587's batches and simTycoonAwayMatchdays S5 reproduce the base exactly (0.1225, 0.11, 0.1065; 94.8
  and 8.8 percent); Round 586's policy within 0.1 win.

## Step 1: the numbers (calibration seeds 1 to 20)

- G (overinvest minus pace Squad) at 30 / 60 / 120: 0 / 0 / 0 as specified; over2 3 / 4 / 4, over4 6 / 7 / 7, over8
  8 / 9 / 9, so SQUAD_POINTS 1.5, 0.85 or 0.65. Knob 1 is undefined as written.
- A_1 to A_9: 34, 52, 59, 68, 73, 77, 81, 83, 86. S5 18. Base pace reaches The Summit at 233.1 minutes.
- R0 feasible interval: SP 1.5 [-5, 6] (recipe start 13 outside), SP 0.85 [-5, 4] (start 1 inside), SP 0.65 [-4, 1].
- Knob 3 on the base trajectories picks AE 2 (SP 1.5), 4 (SP 0.85), 4 (SP 0.65); pace about 64 percent wins 15 to 120,
  titles 0.67 to 0.71 a season.
- Round 586 and 587's shared fixture (Squad 40, division 3) sits 19 levels under the base arrival Squad (A_3 = 59): gap
  -12 at SP 0.85 AE 4. Re-anchored to par plus 6 points it clears the re-derived floor and the 2 SE test everywhere.
- simTycoonAwayMatchdays S5 re-anchored (Q6): green at every candidate (about 0.87 against 0.5); unanchored red.
- tycoonPacks.test 205 plants Squad 200: holds at every candidate.
- The law slows the goal badges: ag100 27 to 111 minutes, ag500 96 to beyond 300, as10 23 to 48 (SP 0.85 AE 4).
  First Sell up, first order: 13.37 to about 13.1 to 13.3 minutes.
