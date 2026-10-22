# Round 1532 notes: Stadium Tycoon scorelines

Brief: dukb-handoff/2026-10-10/briefs/brief-1532.md (section 0 binds), critic-1532.md beside it. Full step 1 record:
dukb-handoff/2026-10-10/results-g/finish-1532.md.

## Status (2026-10-21)

STEP 1 DONE (measure and hand back). STEP 2 HAS NOT STARTED. No src file changed. The lead rules knob 4 and the
findings below before step 2a.

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

## Rulings owed by the lead before step 2a

1. Which overinvest variant sets SQUAD_POINTS (builder's recommendation: over4, SP 0.85).
2. Knob 4: R0 (recommendation at SP 0.85: 1).
3. Keep Round 586 and 587's fixture at Squad 40 or re-anchor to division 3's par plus 6 points (recommendation: re-anchor).
