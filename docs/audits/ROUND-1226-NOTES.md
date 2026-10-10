# Round 1226 notes: MLB and NHL My Career play the season the real league plays

Built on 2026-10-10 by the desktop Claude lane (session G), on top of Round 1211's two sourced ledgers
(`src/data/usSeasonLedgerMlb.ts`, `src/data/usSeasonLedgerNhl.ts`). Round 1211 gathered the facts and printed
every place an engine played something else. This round makes the engines read the ledger there.

## The one reader

`src/lib/usSeasonShape.ts` is the only file between the ledgers and the two engines.

| Function | What it hands back |
|---|---|
| `seasonLength(sport, year, club)` | The games that club's season held. Total: it never throws. |
| `seasonLengthRow(...)` | The same number with where it came from: `ledger`, `carried` (a year after the last row reads the last row's schedule) or `engine` (nothing two sourced, so the engine's own season). |
| `US_ENGINE_SEASON` | 162 and 82: the one typed fallback, and the season each engine DRAWS. A year of another length is drawn on it first, judged on that draw, and saved carried to its true length (the fix pass, below). |
| `slateOf(sport, line)` | The length a SAVED season was played on: its own `slate`, or the engine's own season when it has none. |
| `slateField(sport, year, club)` | The `slate` a new line of that year and club is saved with: the length where it is not the engine's own, nothing where it is. A suspended season carries it too. |
| `toSlate`, `fullSeasonOf` | A count drawn on the engine's own season carried to a season of another length, and a SAVED count read back as the full season it stands for (the comeback gate and the full year badges). |
| `postseasonRounds(sport, year)` | The rounds a champion played that year, each with its name and `[wins needed, most games]`, or null where the ledger does not hold it. |
| `postseasonRung`, `playoffRunGames` | The engine's result on that year's ladder, and the games of a run held to the rounds the ledger gives. |

The engines' own typed season lengths are gone: `79 + ...` and `games / 82` in `nhlMyCareer.ts`, `155 + ...` in
`mlbMyCareer.ts`, the 82 and 155 of the two paper bindings (`nhlCareerLoop.ts`, `mlbCareerLoop.ts`), and the one
playoff ladder typed for every MLB year. The ledger harness fails if one comes back (E2, E4, E6).

## What a player sees change

**NHL My Career**
- A season is 84 games from 2026-27 (a healthy skater plays 81 to 84). Every present day career.
- A throwback career plays 48 games in 2012-13, 56 in 2020-21, and in 2019-20 what its club had played when the
  season stopped (68 to 71), for the 28 clubs of the 2006 list the ledger holds under the game's own id.
- A goalie keeps the engine's 58 to 67 starts and gives way only to a season too short to hold them (34 to 39
  starts in the 48 game season). His line records the season's length like everyone's.
- The paper counts missed games from the season the line was played on. The full season mark for the badges
  follows it too (80 of 84, 46 of 48, still 78 of 82).
- A season of another length is drawn in full on the engine's own 82 games first. The awards and the rival's
  year are judged on that draw, and the saved line is that draw carried to the season's length. So a 48 game
  season hands out exactly the awards the same season played in full would have, and the rival's printed line
  is carried to 48 games as well (the fix pass, below; the first build judged a full season equivalent of the
  short line, which handed out about twice the awards).

**MLB My Career**
- 2020 is 60 games (58 for the Cardinals and the Tigers). The fifty club seasons off their schedule play their
  real length where the game holds that club under that name: 161, 163, and the 2026 Orioles and Yankees on 161.
- A starter keeps 32 starts and a reliever 62 to 71 appearances, and both give way only to a short season
  (12 starts in 2020). The injured year's floor and the bench year's floor scale the same way.
- October by year. 2004 to 2011: no wild card round, so a first exit reads "Lost the Division Series".
  2012 to 2019 and 2021: "Lost the Wild Card Game", and it is one game. 2020 and from 2022: the Wild Card series.
  From 2022 every run fits a best of three, five, seven and seven: a Wild Card exit is 2 or 3 games (it was 3 to
  5), a Division Series exit 5 to 8 (it was 7 to 9). Before 2022 a run holds one round fewer where the year had
  no wild card round, and one game for the Wild Card Game. The Wild Card Series of 2020 is a best of three as
  well (2 or 3 games; in the ledger on two sources since the fix pass). A lost World Series before 2022 keeps
  the count the engine always gave it (13 to 19 games): its rounds are thin in the ledger, and one round fewer
  on the old law could print 10 games where the rounds hold 11 at the least.
- A hitter's October line is his own arithmetic: "4 for 16 (.250), 1 HR". It printed the number the hits were
  rounded from, with a leading zero ("4 for 16 (0.225)"). A home run now counts as a hit.
- Three shop sentences stop naming a count of games ("built for 82 games", "all 41 home games", "all 81 home
  games"): they read "the whole season" and "every home game".

## What does NOT change (decision 3), and how it is proven

- **The odds.** The MLB engine makes the same draws in the same order. `stage` still counts 0 for a first exit
  and 4 for the title, so rings come at the rate they always did; only what the run is called and how many
  games it holds follow the year. `playoffRunGames` takes exactly one draw, as the old law did.
- **A count the rounds can hold is the engine's own.** From 2022 the three later results always fit, and a Wild
  Card exit of 3 games or a Division Series exit of 7 or 8 stays exactly what it was.
- **A season the ledger agrees with is byte equal.** The saved line carries `slate` only when the season's
  length is not the engine's own, so an 82 game NHL season and a 162 game MLB season are the lines they were.

Proof, on GitHub runners:

1. **Per season, against the base** (`origin/release-at-gate` 980654fa, runner result `r1226-probe`). A fleet of
   careers is driven by this round's engine. Before every season the save and the random stream are copied, and
   that one season is played from the same copy by the base engine and by this one. "Moved" is any difference in
   the line, the notes, the save after it or the place in the stream. "By rule" is the probe's own typed reading
   of what the round changes. 15,063 seasons:

   | Cell | Seasons | Changed by rule | Moved | By rule, not moved | Moved, not by rule |
   |---|---|---|---|---|---|
   | MLB, present day | 5,004 | 2,045 | 2,045 | 0 | 0 |
   | MLB, 2004 throwback | 4,990 | 2,648 | 2,648 | 0 | 0 |
   | NHL, present day | 2,524 | 2,524 | 2,524 | 0 | 0 |
   | NHL, 2006 throwback | 2,545 | 501 | 501 | 0 | 0 |

   The causes, by the first that applies. MLB present day: 143 a length (the 2026 Orioles and Yankees), 1,725 a
   hitter in October (the average line), 177 an October count the rounds cannot hold. MLB throwback: 666 a
   length, 1,590 a hitter in October, 356 an October before 2022, 5 an October count, 31 the comeback gate.
   NHL present day: all 2,524 the length. NHL throwback: 485 the length, 16 the comeback gate. The control
   (the average line put back) turns it red: 279 seasons by rule that did not move.
2. **The digest** (`src/test/usCareerTruthDigest.test.ts`, 58 keys, runner result `r1226-dig`). With this
   round's engine lines put back the OLD recording replays green. With only the NHL line put back only the 22
   MLB keys differ; with only the MLB lines put back only the 10 NHL keys differ. The record gate was run with
   `DIGEST_ALLOW='nhl|*,mlb|*'` and names any other key that moved: it named none, so no NBA and no NFL key moved.

The comeback gate is the one cause that reaches a season the ledger agrees with: the award asks whether the
season BEFORE was a lost one, and that season is now read as its full season equivalent. A man who played 57 of
60 games in 2020 is no longer a comeback candidate in 2021.

## Old saves (decision 4)

A line saved before this round has no `slate`. `slateOf` reads it as the 82 or 162 game season it was played
on, and the paper, the full season mark, the badges and the comeback gate all read a saved line through it. A
saved line is never rewritten: the engine only pushes a new one. There is no half played season in these two
careers (a season is one call, and that call writes the length it played on its own line), so a season cannot
start on one length and finish on another. `src/test/usSeasonSlate.test.ts` holds all of it: an old 2026-27 line
of 82, 79 and 60 games in a year the ledger now reads as 84, the Yankees' old 162 in a year the ledger reads as
161, forty next seasons played without one saved byte moving.

## Recordings taken again (decision 5), each with its attribution first

| Recording | Attribution (this round's lines put back, the OLD recording replayed) | Taken again |
|---|---|---|
| `src/test/fixtures/usCareerTruthDigest.json` | green (`r1226-dig`, digest-reverted-all exit 0); NHL line alone put back: only the 22 MLB keys differ; MLB lines alone: only the 10 NHL keys | from 435da300, `DIGEST_ALLOW='nhl|*,mlb|*'`, then replayed green in a second process |
| `scripts/data/usBoardFixture.json` | green (`r1226-board`, parity-reverted exit 0: the engine lines and the three shop sentences put back) | from the tree of 435da300, replayed green (parity-recorded exit 0). The header names 435da300: the runner records from a throwaway request commit and that sha was written out of the header by hand. |

No other recording moved: the whole vitest suite on the head held exactly one red, the digest, before it was
taken again (5,777 tests, runner result `r1226-h1v`).

Both were taken a second time after the fix pass (below), again with the attribution first, each alone in
its commit, both the runner's file byte for byte (runner result `r1226-y-rec`, one serial run on 1ed3806d):

| Recording | Attribution | Taken again |
|---|---|---|
| `src/test/fixtures/usCareerTruthDigest.json` | On the head the recording of ab761206 is red in 25 keys, MLB and NHL only. With the nine files the fix pass changed under `src/lib` and `src/data` checked out from 350c2121 it replays green. With the six engine files and the recording checked out from the base 980654fa the BASE's recording replays green (with `careerRival.ts` at the head and at the base). | commit 4bcfa116, `DIGEST_ALLOW='nhl|*,mlb|*'`: 15 of 22 MLB keys and 10 of 10 NHL keys moved, 0 of 16 NFL, 0 of 10 NBA; replayed green in a second process |
| `scripts/data/usBoardFixture.json` | The same three steps: red on the head (the NFL and the NBA pass, MLB and the NHL fail), green with the nine files at 350c2121, and the base's fixture green with the six engine files at 980654fa. | commit 1e63f5e3: MLB and the NHL moved, the NFL and the NBA are byte equal, the coverage counts of all four are the same; replayed green. The header's `recordedFrom` is the recorder's own stamp this time (the runner's HEAD was set to the pushed head before recording). |

## The rates, before and after (decision 5)

`scripts/simCareerHall.mjs`, the board skipped, 2,000 careers, SIM_SEED 1 to 5, base 980654fa against head
435da300 (runner results `r1226-rba`, `r1226-rbb`, `r1226-rh`):

| NHL, share of careers at or over a standout mark | Seed 1 | 2 | 3 | 4 | 5 | The band |
|---|---|---|---|---|---|---|
| at or over `from`, pooled, BASE | 10.17 | 9.33 | 9.58 | 10.85 | 9.73 | 8.59 to 11.89 |
| at or over `from`, pooled, HEAD | 13.77 | 12.50 | 12.71 | 12.21 | 12.58 | 8.59 to 11.89 |
| at or over `to`, pooled, BASE | 0.96 | 0.69 | 0.79 | 0.90 | 0.94 | 0.27 to 1.69 |
| at or over `to`, pooled, HEAD | 1.67 | 1.27 | 1.31 | 1.52 | 1.38 | 0.27 to 1.69 |

**The NHL marks band is moved by the true season, and it is RED on this branch on purpose.** Section 17 (a) of
that harness is "the tripwire for a round that moves an engine's stats", and this round does: every present day
skater plays 81 to 84 games where he played 79 to 82, so his career totals are about 2.4 percent higher and the
share of careers over a mark frozen on the 82 game engine goes from about 10 percent to about 12.8. The band
was not widened and `scripts/data/careerHallMarks.json` was not regenerated: that changes who the Hall calls a
standout, which is the lead's call. The recipe is in the header of `scripts/genCareerHallMarks.mjs`.
Two more things the lead should know about that band. The base is itself red on seed 4 (one cell, RW points at
14.5 percent against a cell band of 6.1 to 14.4), so the cell band is a coin toss on the base today. And the
full harness on the head is green for the NFL, the NBA and MLB (33 checks each) and red for the NHL at
`marks` only (`r1226-h1hall`).

MLB, the same share on the head: 10.22, 11.63, 10.72, 9.68, 10.05 percent (band 8.59 to 12.64), green on all
five seeds, as on the base.

`scripts/simAwards.mjs` passes on base and head. `scripts/simNbaAwardsSense.mjs` (five seeds a fleet, 171
checks) passes on both. `scripts/simNhlCareer.mjs` and `scripts/simMlbCareer.mjs` pass on the head.

After the fix pass the same NHL share, five seeds on f8b994b9 (runner result `r1226-x2h`; the three commits
after it change no skater's line): 13.44, 12.81, 11.54, 12.23, 12.35 percent at or over `from` (red on four
seeds of five; 1.27, 1.21, 1.06, 1.46, 1.48 at or over `to`, inside), and 12.08 on the default seed of the
final engine tree (`r1226-y-g1`, red at `marks` and nowhere else, Hall share 28.6 to 30.8 percent against a
ceiling of 35.9). MLB is green on all five seeds and on the default one. **Still the lead's ruling.** The Hall
file forbids editing calibration 2 in place (`src/lib/careerHallOfFame.ts`, "Never edit a calibration that has
shipped: add calibration 3 beside it"), so the two honest ways are a calibration 3 for careers that retire
from now on (the recipe in the header of `scripts/genCareerHallMarks.mjs`; it moves the NHL keys of the
digest and the retired states of the board fixture again) or the band moved to the measured share with its
headroom written beside it.

**The awards of the seasons the round changes** (the review's finding: the first build handed a short season
about twice the awards). The reviewer's own instrument, a natural fleet of 2,000 careers a position played
to a target year, that one season then played from the same copy and stream by the base (82 or 162 games)
and by the head. Seasons with any award, base against head, after the fix pass (on 1ed3806d):

| Season | The review, on 350c2121: base to head | Now, on 1ed3806d: base to head |
|---|---|---|
| NHL 2012-13, 48 games (10,000 seasons) | 220 to 414 | 220 to 220 |
| NHL 2019-20, 68 to 71 games (10,000) | 835 to 910 | 859 to 859 |
| NHL 2020-21, 56 games (10,000) | 754 to 976 | 757 to 737 (the comeback award alone: 28 to 0) |
| MLB 2020, 60 games (about 21,700) | 172 to 358 | 170 to 170 |
| NHL 2011-12, 82 games (the instrument's control) | 123 to 123 | 123 to 123 |
| MLB 2019 (control) | 323 to 322 | 321 to 321 |
| NHL 2026-27, 84 games | 37 to 35 | 37 to 37 |

(The base columns differ a little between the two runs because the fleet is played up to the target year by
the head of the day.)

Award for award the short season is the full one now. The one award that differs by rule is the comeback
award of the season AFTER a short one (NHL 2013-14: 90 on the base's reading, 0 here; MLB 2021: 159 and 2):
the base reads the 48 or 60 games before as a lost year, and all of a short season is not a lost year.

## The fix pass (after two adversarial reviews of 350c2121)

The reviews are `review-run-1226.md` and `review-read-1226.md` in the lead's handoff folder. What they found
and what was done, each its own pushed commit:

1. **A short season handed out about twice the awards, and the rival's year was judged on two scales**
   (be03384e). The first build drew the short season short and judged its full season equivalent: the noise
   terms of the scoring formulas do not scale with games, so the equivalent ran hot, and the rival was still
   a full season. Now both engines draw EVERY season on their own length (82 and 162), judge the awards, the
   award score and the head to head on that draw, and save the draw carried to the season's length (`cut`
   in both engines, `toSlate` in the reader). The rival's score stays on the full season and his PRINTED
   counts are carried to the same length (`RivalLineCut` in `src/lib/careerRival.ts`, an optional last
   argument only these two engines pass, and only in a season of another length). The same change ends a
   2020 starter with more wins than starts and a 2020 hitter's RBI running low against his home runs: both
   are the full line carried now.
2. **The award rule had no check** (40a83b4e). E8 of the ledger harness, exact and not a band: for one saved
   state and one stream, a season of another length holds the awards, the head to head and the rival's score
   of the same season played on the engine's own length (E8a), every saved count is the full count carried
   and a first choice starter never has more wins than starts (E8b), and nobody wins the comeback award off
   a short season that was no lost year while a hitter whose 2020 really was lost still can (E8c). Ten
   controls.
3. **A lost World Series before 2022 could print 10 or 11 games** where its rounds hold 11 or 12 at the
   least (f8b994b9). Where a year's later rounds are thin, a lost final keeps the count the engine always
   gave it (13 to 19, the base's). E4 now holds the games of every October before 2022 to the engine's own
   law for the rounds that year had (controls `mlbfold`, `mlbpartial`, `mlblostfinal`), and E6 reads the
   share of whole schedules with one band for a full season and one for a short one.
4. **The Wild Card Series of 2020** is in the ledger as a best of three on two sources (5fecad18: an ESPN
   report and a CBS Sports report of 23 July 2020, receipt `cbs-2020-playoffs`), so the reader binds it: a
   2020 Wild Card exit is 2 or 3 games. The Division Series, the Championship Series and the World Series
   before 2022 stay thin: a year by year second source was not found.
5. **A suspended season is saved with the season's length** (c5bd38f0, `slateField`).
6. **The three badges that ask for a full year** (a .330 season, a sub 2.00 season, a .930 season) can be
   earned in a short season (1a93d704): the two sport loops hand the badge case the saved games read back
   as the full season they stand for. `src/lib/careerBadges.ts` itself is unchanged. E9 holds it and the
   suspended line, three controls.
7. **What's New says what the code does** (896de1c8): the two clubs of 2019-20 that play 82, a club that
   went by another name, the best of three of 2020, and "judged at a full season's pace".

Not done, and why: the Hall marks (the lead's ruling, above); the six MLB club seasons under an older name
are NOT bound (the ledger harness forbids it: a club season carries the game's id only where the game's
list holds the club under that name that year, check M3 and its control `mlbid`); the Thrashers and Phoenix
Coyotes of 2019-20 are NOT bound either (following `NHL_NAME_SPANS` onto the Jets' 71 and Arizona's 70 would
map a club across a move or a rename, which the round does nowhere, and is the lead's call); the words
carry both exceptions instead; the rest is under "Owed to others".

Proof on the fixed head. The reviewer's own probes, run again: a lost World Series reads 13 to 19 games in
2005, 2008, 2015 and 2021 (12,000 seasons a year); the awards table above; and its old save probe is green
(174 saves made by the base read the same by 14 readers, 696 saved lines stay byte for byte when played on,
no NBA or NFL season moves, no MLB or NHL season of the engine's own length outside an October and outside
the year after a changed season moves; a season whose random stream ends somewhere else than on the base:
13 of 3,327, all in the year after a changed season, where the first build had 21).

**The summer harness** (`scripts/simUsCareerSummer.mjs`, section 6, the MLB Hall share with the summer loop
on minus off, bound 3 points). The round moved MLB to 8,000 careers a seed there (350c2121; the header of
the harness has the measurements on the base and on the first build). The review asked for three more seeds
at 8,000. On the fixed engine tree 1ed3806d (runner result `r1226-y-s6`): SIM_SEED=7 reads +1.95 points
(1.11 to 2.78), SIM_SEED=11 +1.42 (0.59 to 2.25), SIM_SEED=13 +2.03 (1.20 to 2.86). All three inside, by
0.22, 0.75 and 0.14. The margin is thin: the lift is about 1.4 to 2.0 points on every tree measured and the
interval at 8,000 is 0.83 either way, so a seed whose estimate passes 2.17 would be red. The cure for that is
more careers again, never the bound. The whole harness takes about 68 minutes on a runner at this size.

## What the round did NOT bind, and why (each stays a note of the ledger harness or is owed)

1. **A club the ledger does not hold in 2019-20 under the game's id** (the Thrashers and the Phoenix Coyotes of
   the 2006 list) still plays the engine's 82 games that season. The season has no single length, and no club
   is mapped across a move or a rename. A lead who would rather not see 82 there could give such a club the
   league's mean length (twice the league's games over its clubs, 70); it was not done because no row says it.
2. **Six MLB club seasons the ledger names that no list of the game holds under that name** (2008, 2011, 2013,
   2016, 2018, 2024: for example the 2008 Nationals) play the schedule's length.
3. **The rounds after the first before 2022.** Their lengths are thin in the ledger (`MLB_THIN`), so the
   engine's own law plays them. (The Wild Card Series of 2020 was thin too when the round was built; the fix
   pass put it into the ledger on two sources and it is bound now.)
4. **The first round bye** (`MLB_PLAYOFF_FORMAT.byesPerLeague`). A career's club always plays the first round.
   A bye needs a club's seed, and the engine has no standings to read one from.
5. **The Yomiuri Giants seasons** (`src/lib/mlbCareerLifeB.ts`, not this round's file). The reader says such a
   club has no MLB season (`from: 'engine'`), but the engine still plays an MLB season and an MLB October for
   it. What league it is in and how long its season is are thin.
6. **The Athletics' name.** The game prints "Sacramento Athletics" (`src/data/conquestDataMlb.ts`, a file every
   MLB game shares and not this round's). Both 2026 standings print "Athletics".
7. **The NHL playoff path before 2013-14 and in the two modified tournaments** is thin; the engine's results
   and games always fit four best of sevens, so nothing was changed there.
8. **Goalies and pitchers in a longer season.** Their workload is not scaled up to 84 or 163 games.

## Owed to others

- **The other lane's guide** (`src/data/gameContent/hockey.ts`): any sentence about NHL My Career that says a
  season is 82 games is now false for a present day career (84). Not written here.
- **Life cards that type a length** (not this round's files): `mlbCareerLifeA.ts` ("162 games in 187 days",
  "Play all 162", "81 home dates"), `mlbCareerLifeB.ts` ("you played all 162"), `nhlCareerLifeB.ts` (a fine of
  `salary / 82` a game). In 2020, or in an 84 game season, those numbers are not the season's.
- **PR216** (`src/lib/usCareerProgramme.ts`, the other lane): `gamesCeiling` types 82 for the NHL. A present day
  skater can play 84 now, so the ceiling should read `seasonLength('nhl', year, club)`.
- **Rounds 1212 and 1217** (week by week): a saved line carries `slate` when its season was not the engine's
  own; `slateOf` is the one way to read the length of a saved line (a suspended season carries it too, since
  the fix pass). The new result word "Lost the Wild Card Game" has to be added to the `results` of the MLB
  number file when it is written, or `usBandOf` and `usPlayoffDepth` of `src/lib/season/us.ts` answer null
  for those seasons. And from 2012 to 2019 and in 2021 most Octobers of a throwback career are that single
  game: no bye is modelled, and a first exit is the engine's most common result.
- **One more life card that types a length** (found by the review, not this round's file):
  `src/lib/nhlCareerCorruption.ts`, "You played 82 games on a body built for 55".
- **The coaching chapter of the same two games** (`src/lib/usCoachCareer.ts`, not this round's file) still
  plays 82 and 162 game seasons and one MLB ladder ("lost the Wild Card round") in every year. A present day
  skater plays 84 game seasons and then coaches 82 game ones in one save. The cure is the same reader
  (`seasonLength`, `postseasonRung`).
- **The rival's batting average prints a leading zero** ("went 0.293, 28 HR", `src/lib/careerRival.ts`), the
  shape this round removed from the October line. Not changed: it is the line of EVERY MLB season, so the
  change moves every MLB key of the digest and every MLB save of the fixture, which decision 3 forbids here.
- **The paper's floor for an injury story** (`src/lib/careerSocial.ts`, 30 missed games for a hitter, 15 for
  a skater) is not scaled to the season, so in the 60 game season a hitter who missed 20 games gets no
  injury line. Nothing false is printed; the floor is one function of a paper all four sports share.
- **Nothing in the game says WHY a season is 48 or 60 games.** The ledger's `why` strings were written for
  it and the "?" help of these two careers has no line on season lengths (the NFL career's has one). A help
  line is a component and a guide matter, both outside this round.

## The ledger harness after this round

`node scripts/simUsSeasonLedger.mjs`: 2,967 checks, 43 controls (38 of Round 1211 and five of this round), 7
notes. New labels: E1 (the reader's NHL lengths), E2 (the NHL engine played), E3 (the reader's rounds), E4 (the
MLB October played), E5 (the reader's MLB lengths), E6 (the MLB engine played), E7 (the hitter's October line).
New controls, each a typed constant put back into the bundled engine: `nhltyped` (E2), `mlbrounds` and
`mlbladder` (E4), `mlbtyped` (E6), `mlbavg` (E7). The reverse checks compare the reader and the engines with the
harness's OWN typed table, never with the ledger's own rows, so the 38 older controls still fire exactly.
`US_LEDGER_MEASURE=1` prints the shares the bands were set from.

After the fix pass: 3,023 checks, 59 controls (the 43 above and sixteen more), 7 notes. New labels: E8a, E8b
and E8c (a season of another length is the full season, carried: awards, head to head, counts, the comeback
gate) and E9a and E9b (the full year badges, the suspended line). E4 also holds the games of every October
before 2022, and E6 has two bands. New controls: `nhlawards`, `mlbawards`, `nhlgates`, `mlbgates`,
`nhlhead`, `mlbhead` (E8a), `nhlcarry`, `mlbcarry` (E8b), `nhlcomeback`, `mlbcomeback` (E8c), `mlbfold`,
`mlbpartial`, `mlblostfinal` (E4), `mlbbadge`, `nhlbadge` (E9a), `suspslate` (E9b). The two typed length
controls (`nhltyped`, `mlbtyped`) turn E8 red as well, since a typed length leaves no season of another
length to compare. The whole harness takes about six seconds; all 59 controls fired on a runner on the
final engine tree (`r1226-y-g1`, "controls fired: 59 of 59").
