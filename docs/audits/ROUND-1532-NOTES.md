# Round 1532 notes: Stadium Tycoon scorelines

Brief: dukb-handoff/2026-10-10/briefs/brief-1532.md (section 0 binds), critic-1532.md beside it. Full step 1 record:
dukb-handoff/2026-10-10/results-g/finish-1532.md.

## Status (2026-10-21, step 2a done)

STEP 1 DONE. The lead ruled (brief section 4, S1 to S6): overinvest is the over4 bot and SQUAD_POINTS is 0.85; R0
starts at 1; Round 586 and 587's shared fixture moves to division 3's par plus ceil(6 / SQUAD_POINTS) levels; the slower
badges are printed, not tuned; the predictor stays.

STEP 2a DONE (no src change). scripts/lib/tycoonLaw.mjs lays the law and the bonuses onto the lib as one text patch;
scripts/tuneTycoonScorelines.mjs ran the recipe on a runner (remote check r1532-s2a, exit 0, 58 s) and wrote
scripts/data/tycoonScorelineTuning.json. The table: SQUAD_POINTS 0.85, R0 1, ARRIVAL_EDGE 4, rivalStrength
1 25 40 46 54 58 61 65 67 69. Every target of brief 1.3 met on calibration and holdout:
- knob 4 at R0 1: section 4 promotion 10.5 against Sell up 13.10; season one title share 0.90 (8 of 10, 18 of 20);
  section 3 Squad 30 1.00 against Squad 0 0.20 (gap 0.80, needs 0.476), neutral arm 0.05; section 9 stuck 0 and 0.
- knob 3 grid (pace win share 15 to 120, cal): AE -2 53.9, 0 57.5, 2 59.5, 4 64.6, 6 68.7, 8 73.6; pick 4.
- pace holdout 66.6 (se 1.45, headroom needed 4.36); over4 76.4 cal, 78.7 hold; draws 20.9 and 20.5; goals 2.57 and
  2.60; titles a season 15 to 240 0.733 and 0.727; windows 72 / 68 / 61 (cal), 75 / 68 / 64 (hold); nosquad 18.
- S8: first Sell up 12.77 (base 13.37); a win at two hours pays 20 seconds of income (base 0.13); income at 30 / 60 /
  120 minutes 17.9K / 25.6K / 41.7K (base 21.2K / 34.4K / 81.0K); pace reaches division 5 by 120 (base 6).

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
