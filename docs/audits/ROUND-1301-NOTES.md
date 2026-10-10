# Round 1301: the NHL Hall of Fame marks follow the true seasons, and the marks bands stop being coin tosses

Written 2026-10-10 by the builder (desktop Claude lane, session G). Branch `r1301-hall-marks-true-seasons`, on
top of Round 1226 (`origin/r1226-us-season-truth`, head `2c86ecc7`). Every heavy command ran on a GitHub runner
as a remote check; each result is named so it can be read again with
`git fetch -q origin '+refs/heads/rc-results/<name>:refs/remotes/origin/rc-results/<name>' ; git show origin/rc-results/<name>:summary.txt`.

## Why this round exists

Round 1226 made NHL My Career play the season the league really plays: 84 games from 2026-27, the short seasons
at their true length, awards judged on the season played in full. That moved one tripwire: the share of NHL
careers at or over a Hall of Fame standout mark rose from about one in ten to about one in eight, so
`scripts/simCareerHall.mjs nhl` was red at `marks` and Round 1226 could not ship. The marks are a calibration and
a retired career keeps the calibration it was judged under (Round 1051), so the way back is a new calibration
beside the old one, never an edit in place.

## Step 1. The cause, measured before anything was generated

Runner result `r1301-s1-a`, on head `2c86ecc7`, 2026-10-10 23:40 UTC. Three trees, the same six measuring seeds
the marks were cut on (the default seed and `SIM_SEED` 1 to 5, 2,000 careers a run, the board skipped):
the head (Round 1226's engine), the base (`origin/main`, `f78037dc`, Release AT), and the head with the ONE
number put back (the NHL ledger's 84 games from 2026-27 read 82 again, two strings in
`src/data/usSeasonLedgerNhl.ts`, the edit refused unless each string is there exactly once).

| Share of a position's careers at or over a calibration 2 `from` mark, pooled over the 12 cells, percent | Default | 1 | 2 | 3 | 4 | 5 | Mean |
|---|---|---|---|---|---|---|---|
| base (`origin/main`) | 10.35 | 10.17 | 9.33 | 9.58 | 10.85 | 9.73 | 10.00 |
| head with 84 read as 82 | 10.35 | 10.17 | 9.33 | 9.58 | 10.85 | 9.73 | 10.00 |
| head (84 games) | 12.08 | 13.44 | 12.81 | 11.54 | 12.23 | 12.35 | 12.41 |
| head, the skater marks carried 84 over 82 | 8.90 | 10.60 | 9.83 | 8.92 | 9.23 | 9.58 | 9.51 |

The row files of the head with the one number put back are the base's row files byte for byte on 6 of 6 seeds
(a row is one career: position, seasons, awards, every career total, both legacy scores). So, by cause:

| Cause | Points of the rise |
|---|---|
| 84 game seasons (2026-27 on) | 2.41 |
| the short seasons at their true length (48 in 2012-13, 56 in 2020-21, club by club in 2019-20) | 0.00 |
| awards judged on the season played in full | 0.00 |
| total | 2.41 |

The last two are zero for a plain reason: the Hall's population is the harness's own fleet, and every career in
it starts today, so no season of it is a short one, and a season of the engine's own length is judged exactly as
it always was. They are not zero for a throwback career, but no mark is measured on one.

**No defect was found, so no engine line changed.** What was checked, on the same 12,000 careers a tree:

- Counting stats rise by what two more games imply and no more. Skaters, head over base: games 1.0258, goals
  1.0200, assists 1.0211, points 1.0206, against 84 over 82 = 1.0244. Goalies do not move (their starts are the
  job's, not the schedule's: games 0.9982, wins 0.9978).
- Awards do not rise with the longer season. A career's hardware, base against head: Cups 0.8813 and 0.8800,
  the major trophy 0.2550 and 0.2449, Conn Smythes 0.1845 and 0.1832, All-Star nods 2.1132 and 2.0622. All four
  are a little LOWER on the head, none higher. The two fleets are not the same careers (only 6.3 percent of
  careers match at the same index: the longer season rerolls what follows it), so these are two samples and the
  gaps are of the size two samples give; step 2 reads the same four numbers again on 72 more seeds a tree.
- The Hall itself does not move: on calibration 2 the six runs read 31.0, 31.9, 31.1, 31.5, 33.3 and 30.8 percent
  on the base and 30.8, 31.2, 32.5, 32.3, 32.6 and 31.1 on the head.
- Why a 2.4 percent longer season moves the share by a quarter: a mark sits where the top of the books thins out
  fast, so a small shift of every total carries many careers over it. The proof is the fourth row of the table:
  carry the skater marks the same 84 over 82 and the head reads 9.51, the base's one in ten again (0.49 under).

So the whole rise is what the true season implies, and what remains to do is calibrate.

## The fleets measured on the same head (runner result `r1301-s1-b`)

72 seeds the marks were never cut on (`SIM_SEED` 6 to 77), 2,000 careers a seed, each sport, the pooled share of
careers at or over a mark, percent (mean, and the deviation from seed to seed):

| Sport | Marks | At or over `from` | Deviation | At or over `to` | Deviation |
|---|---|---|---|---|---|
| NHL | calibration 2 (cut on 82 games) | 12.69 | 0.61 | 1.42 | 0.25 |
| NHL | measured again on this engine | 10.39 | 0.55 | 0.98 | 0.21 |
| NFL | calibration 2 | 10.37 | 0.68 | 0.98 | 0.21 |
| NBA | calibration 2 | 9.74 | 0.46 | 0.96 | 0.17 |
| MLB | calibration 2 | 9.92 | 0.65 | 0.96 | 0.20 |

One measuring run of 2,000 careers takes about 3 seconds on a runner (72 runs: NHL 216 s, MLB 210 s, NBA 257 s,
NFL 289 s). Football, basketball and baseball all still read about one in ten on their calibration 2 marks, so
their marks stay (the lead's decision 3); baseball's fleet reads 9.92 against the one seed band it had (8.59 to
12.64), 1.33 points above the low end and 2.72 under the high end.
