# Round 1335 notes: the board reads the season you had, and the job market

Branch r1335-cm-board, cut from origin/main d4f2c6f6 (src equal to Release BG, bd3b6244). BOARD_BASE is a
worktree of d4f2c6f6 (on a runner: `git worktree add .claude/worktrees/r1335-base-a d4f2c6f6`, inside the repo so
node_modules resolves by walk up). Harness: scripts/simCmBoardVerdict.mjs.

## Step 0: the measurement (remote check r1335-s0, head 1b8a13ed, every line on CM_BOARD_BASE)

- falls (34 s): 3200 fresh careers, four clubs a tier in each of era2005, era2010, era2015, era2020 and the
  modern world, 40 seeds each; every opening seen was 60; 990 first competitive matches were lost (all league).
  The board's fall on a lost opener, p95: tier 1 8.5, tier 2 8.5, tier 3 7.2, tier 4 5.5; by era 7.5 to 8.5;
  pooled median 5.5, p90 7.5, p95 8.5. **BOARD_FRESH = 60 + 8.5 rounded up = 69** (under the 72 stop line).
  A tier 1 opener lost at the 95th percentile lands at 60.5 (just Safe), a tier 4 one near 63.5.
- rollover (375 s): the title fleet (12 clubs, seeds 0 to 9, three seasons, two policies) is 240 careers; 145
  were sacked before their third summer (base behaviour of a quick sim fleet that never trades), 461 season
  ends, 408 stays, 53 moves.
  - A or B stays that opened the next season under Safe: **239 of 298**; grade B: **83 of 86**; title seasons:
    **129 of 153** (cm M6 measured).
  - promotions 12, graded C or worse **6** (first: West Ham, 2nd, C, seed 2: cm M8).
  - the promotion sub fleet (every 2026-27 second tier club expected in its top four, five seeds, one season):
    45 promotions, 4 graded C or worse; 8 of 57 A or B stays opened under Safe.
  - the flat allocation over the club's budget, staying rollovers of both fleets: tier 1 median 1.08, p99 1.68
    (n 281); tier 2 median 1.11, p99 1.66 (n 17); tier 3 median 1.2, p99 3.22 (n 56); tier 4 median 1.92,
    p90 6.5, p99 7.0 (n 137). **KITTY_TOP_SHARE = 1.7** (the smallest multiple of 0.05 at or above the tier 1
    and 2 p99 1.68). At 1.7 the band binds 0 of 281 tier 1, 0 of 17 tier 2, 25 of 56 tier 3 (10 with a
    trophy) and 77 of 137 tier 4 rollovers (39 with a trophy).
- offers (202 s, with takeover):
  - title fleet: 118 seasons with offers, 168 offers; **49 seasons and 56 offers two or more tiers up**
    (Celtic, tier 4, offered Aston Villa and Manchester United, tier 2).
  - tier 4 fleet (the weakest club of each of the 27 leagues, seeds 0 to 7, two seasons): 331 season ends, 265
    with offers, 403 offers; **131 seasons and 151 offers two or more tiers up** (Frosinone offered Manchester
    City; cm M13).
  - takeover: 180 startMidSeason handovers (twelve clubs of 2005-06, 2015-16 and 2026-27, autumn, new year
    and run in, seeds 0 to 4): **103 carry a failed objective** (Everton 2005-06: "Reach the FA Cup
    semi-finals"; cm m7).

Measurement note: the first run picked the promotion fleet after earlier careers had registered their
summers, so three clubs a previous career had relegated were picked as second tier clubs (its "relegations 3").
The fleet picks now reset the registry first (promoFleet, tier4Fleet); the figures above are otherwise
unaffected (the kitty and the A or B counts come from the title fleet's own careers).
