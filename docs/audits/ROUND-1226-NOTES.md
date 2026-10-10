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
