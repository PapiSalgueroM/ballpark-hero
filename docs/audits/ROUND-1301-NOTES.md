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

The awards read again on 72 more seeds a tree, as step 1 promised (runner result `r1301-s2-fleet`, 144,000 careers
a tree, the gap in errors of the difference of the two means): Cups 0.8862 on the base and 0.8912 on the head
(1.28 errors), the major trophy 0.2602 and 0.2623 (0.81), Conn Smythes 0.1826 and 0.1821 (0.25 under), All-Star
nods 2.1160 and 2.1211 (0.66), the Hall share on calibration 1 30.21 and 30.36 percent (1.00). Nothing moved: the
small gaps of the first six seeds were two samples differing, as said.

## Step 2. Calibration 3, beside calibration 2

**What a calibration is here** (Round 1051, unchanged): one number for the whole Hall. The save that retires a
career stamps today's number on it (`hallCal`), a retired save with no stamp is calibration 1, a career still
being played reads the number it will retire on. `HALL_CALIBRATION` is now 3.

- **The NHL** has a new table, `NHL_LEGACY_V3` in `src/lib/nhlMyCareer.ts`: calibration 2 with every standout
  mark measured again on the 84 game season, nothing else different (the awards, the season weight and every
  term are calibration 2's). The marks, `from` and `to`:

  | Position | Family | Calibration 2 | Calibration 3 |
  |---|---|---|---|
  | C | goals | 923, 1110 | 954, 1130 |
  | C | assists | 991, 1130 | 1010, 1160 |
  | C | points | 1810, 2110 | 1860, 2130 |
  | LW | goals | 872, 1040 | 891, 1080 |
  | LW | assists | 940, 1100 | 959, 1120 |
  | LW | points | 1730, 1970 | 1770, 2040 |
  | RW | goals | 840, 979 | 858, 991 |
  | RW | assists | 935, 1060 | 956, 1070 |
  | RW | points | 1760, 2020 | 1800, 2040 |
  | D | assists | 1100, 1240 | 1120, 1260 |
  | D | points | 1450, 1640 | 1460, 1640 |
  | G | wins | 721, 794 | 720, 792 |

  They are the generator's own output: `MARKS_CALIBRATION=3 node scripts/genCareerHallMarks.mjs <dir>` from six
  measuring runs on this round's engine (the default seed and `SIM_SEED` 1 to 5, 2,000 careers a run, 2,400
  pooled careers a position), by the rules calibration 2 was cut with (the pooled 90th percentile, the larger of
  the 99th and `from` times 1.10, three significant digits, the half rule). The goalie's marks moved by a win
  or two though nothing about his season changed: the engine has been rerolled since Round 1051 and the rule
  is mechanical.
- **Football, basketball and baseball** read calibration 3 on their calibration 2 table, the same object
  (`3: NFL_LEGACY_V2` and its two siblings). No mark of theirs moved and nothing of theirs was generated again.
  Basketball's one branch on the number (`cal === 2`, the marks that follow the stat line a career was played
  on) reads `cal >= 2`, so its calibration 3 is its calibration 2 in every respect.
- **The ledger** (`scripts/data/careerHallMarks.json`) gained a block, `calibrations.3`, holding the NHL alone
  with its seeds, sizes, marks, half rule list and measured outcome. The first block (calibration 2, the four
  sports) is untouched: 414 lines in, none out, and the generator refuses to write into a ledger that is not
  its own output byte for byte. Run with no `MARKS_CALIBRATION` it now refuses to write the ledger at all
  (calibration 2 is live). Runner result `r1301-s2-gate`, line `gencheck`: the committed ledger is what the
  generator writes again from fresh runs, byte for byte.
- **The recording** `scripts/data/careerHallV3.json` (section 15 (e) of the harness, check `v3replay`, control
  `v3drift`): each sport's calibration 3 table whole and what each of the version 1 fixture's saves is told
  when stamped 3. For football, basketball and baseball it equals the calibration 2 recording line for line;
  the NHL's is its own. Calibration 2's recording and its check are untouched and green.
- **The measured outcome on calibration 3** (the six runs): the NHL Hall share 29.8, 30.7, 31.6, 31.6, 32.1 and
  30.5 percent (calibration 1 on the same careers: 28.5 to 31.1), 20 to 31 careers of 2,000 in the Hall by the
  standout alone. On the old marks the same six runs read 30.8 to 32.6 percent with 29 to 45 by the standout.

One trap met on the way: 720 times 1.10 is 792.0000000000001 in a double, so the harness read the goalie's `to`
mark (792, the ramp floor the generator itself rounded to) as under the floor. The check now carries the
generator's own allowance (1e-9); nothing else about it changed.

### The proofs on saves the old code made (the lead's decision 1)

`scripts/recordCareerHallSaves1301.mjs` was run from the root of two old checkouts on a runner (result
`r1301-s2-rec2`): `origin/main` as of Release AT (`f78037dc`, 82 game NHL seasons) and Round 1226's head
(`2c86ecc7`, 84 game NHL seasons), both on calibration 2. Per tree it kept, by rule and in play order from 600
careers a sport: for the NHL 8 Hall of Famers who are in only because of the standout push, 3 with no push, 3
near misses with a push, 2 plain misses, and 4 careers NOT retired (as they stood before their last season);
for each other sport one of each kind that exists. The two outputs joined are
`src/test/fixtures/careerHallSaves1301.json`, never recorded again, and `src/test/careerHallSaves1301.test.ts`
holds every later tree to it:

- every retired save reads today exactly what the old code told it, the legacy whole and the Hall record whole
  (the card's sentence set apart as copy): a Hall of Famer stays one, a miss stays a miss;
- that is the stamp's doing and not luck: read on calibration 3 instead, of the 16 retired NHL saves of
  `origin/main` 11 would score lower and 2 Hall of Famers would fall out (540 to 485, and 500 to 472); of Round
  1226's 16, 10 would score lower, 1 higher (a goalie) and 3 would fall out;
- a career still being played carries no stamp, and the save that retires it is stamped 3 and scored on the
  calibration 3 table: 4 of 4 of `origin/main`'s open NHL careers and 3 of 4 of Round 1226's then score lower
  than the old code would have told them that day (26 to 49 points), and that is the score they are told;
- in the other three sports reading a save on 3 or on 2 is the same answer, whole objects.

The digest of the four engines and the board fixture did not move (`src/test/usCareerTruthDigest.test.ts` and
`src/test/usBoardFixture.test.tsx` are green untouched): they do not carry the stamp, and no engine line changed.
