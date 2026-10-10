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
| `US_ENGINE_SEASON` | 162 and 82: the one typed fallback, and the season the engines' workloads and award gates are written per. |
| `slateOf(sport, line)` | The length a SAVED season was played on: its own `slate`, or the engine's own season when it has none. |
| `toSlate`, `fullSeasonOf` | A workload carried to a season of another length, and a count read as its full season equivalent. |
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
- Awards are judged on the full season equivalent, so a 48 game season can still hold a scoring title.

**MLB My Career**
- 2020 is 60 games (58 for the Cardinals and the Tigers). The fifty club seasons off their schedule play their
  real length where the game holds that club under that name: 161, 163, and the 2026 Orioles and Yankees on 161.
- A starter keeps 32 starts and a reliever 62 to 71 appearances, and both give way only to a short season
  (12 starts in 2020). The injured year's floor and the bench year's floor scale the same way.
- October by year. 2004 to 2011: no wild card round, so a first exit reads "Lost the Division Series".
  2012 to 2019 and 2021: "Lost the Wild Card Game", and it is one game. 2020 and from 2022: the Wild Card series.
  From 2022 every run fits a best of three, five, seven and seven: a Wild Card exit is 2 or 3 games (it was 3 to
  5), a Division Series exit 5 to 8 (it was 7 to 9). Before 2022 a run holds one round fewer where the year had
  no wild card round, and one game for the Wild Card Game.
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

## What the round did NOT bind, and why (each stays a note of the ledger harness or is owed)

1. **A club the ledger does not hold in 2019-20 under the game's id** (the Thrashers and the Phoenix Coyotes of
   the 2006 list) still plays the engine's 82 games that season. The season has no single length, and no club
   is mapped across a move or a rename. A lead who would rather not see 82 there could give such a club the
   league's mean length (twice the league's games over its clubs, 70); it was not done because no row says it.
2. **Six MLB club seasons the ledger names that no list of the game holds under that name** (2008, 2011, 2013,
   2016, 2018, 2024: for example the 2008 Nationals) play the schedule's length.
3. **The rounds after the first before 2022, and the Wild Card Series of 2020.** Their lengths are thin in the
   ledger (`MLB_THIN`), so the engine's own law plays them.
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
  own; `slateOf` is the one way to read the length of a saved line.

## The ledger harness after this round

`node scripts/simUsSeasonLedger.mjs`: 2,967 checks, 43 controls (38 of Round 1211 and five of this round), 7
notes. New labels: E1 (the reader's NHL lengths), E2 (the NHL engine played), E3 (the reader's rounds), E4 (the
MLB October played), E5 (the reader's MLB lengths), E6 (the MLB engine played), E7 (the hitter's October line).
New controls, each a typed constant put back into the bundled engine: `nhltyped` (E2), `mlbrounds` and
`mlbladder` (E4), `mlbtyped` (E6), `mlbavg` (E7). The reverse checks compare the reader and the engines with the
harness's OWN typed table, never with the ledger's own rows, so the 38 older controls still fire exactly.
`US_LEDGER_MEASURE=1` prints the shares the bands were set from.
