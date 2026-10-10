# Round 1211 notes: the real season shapes of MLB and the NHL, as two sourced ledgers

Read on 2026-10-10 by the desktop Claude lane (session G). This round is data only. Nothing a player sees
changes, nothing imports the new files yet, and no engine, sport file, board or screen was touched.

## What the round added

| File | What it is |
|---|---|
| `src/data/usSeasonLedgerMlb.ts` | MLB, 2004 to 2026: every club's games played season by season, the six name spans of the 2004 list, the 2026 divisions, the schedule formulas of 2023 to 2026, the fifteen interleague rival pairs, the postseason format, league scoring for both eras, and `MLB_THIN`. |
| `src/data/usSeasonLedgerNhl.ts` | The NHL, 2006-07 to 2026-27: every season's length, every club's division in all 21 seasons, the two name spans of the 2006 list, the 84 game formula, the playoff format, league scoring, the games past sixty minutes, the overtime rules, the clock, and `NHL_THIN`. |
| `scripts/data/usSeasonSources1211.json` | The receipts: 42 of them, each with its publisher, title, address, the date read and what the source literally says. A ledger row names its receipts by key. |
| `scripts/simUsSeasonLedger.mjs` | The harness: 1,185 checks, 24 negative controls, and a block of notes for the binding rounds that never fails. |

The rule the ledgers follow: two independent sources that are not a wiki for every fact, a number only one
source gave is `null` and named in the THIN list, and where two sources print different things both are
written down and the ledger follows the two that agree.

## How it was read

- MLB club games: Retrosheet's season pages (games, wins, losses and ties for all 30 clubs) for 2004 to 2025,
  ESPN's standings (wins and losses) for 2004 to 2026, Baseball Reference's games column for eleven of the
  seasons and its league table for all 23. Baseball Reference builds on Retrosheet's game files, so the two
  count as ONE source. The league's own site refuses the reader (HTTP 406 on every address tried, the stats
  feed included), so MLB.com is a source for nothing here except two press releases a newspaper printed.
- NHL: the league's own standings feed, read on the last day of each regular season (a later date answers
  with no clubs), and Hockey Reference's season pages, for all 21 seasons; ESPN's standings for eight of them.
- Every count of 30 or 32 clubs came back from a reader model, so no single reading was trusted: a number is
  in a ledger only where a second source gave the same one, and the league totals (Baseball Reference's team
  games, Hockey Reference's league games) were checked against the sum of the clubs for every season.

## What the sources say that the scout's recollection did not

The brief's draft offered a list of MLB clubs "to be checked". The sources win:

| Season | The draft | The two sources |
|---|---|---|
| 2004, 2006, 2015, 2024 | not checked, or thought clean | 2004: Pirates, Brewers, Devil Rays, Blue Jays on 161. 2006: Cardinals, Giants on 161. 2015: Cleveland, Tigers on 161. 2024: Guardians, Astros on 161. |
| 2005 | not checked | Reds and Astros played 163: 162 decisions each and the tie of 30 June 2005, which counts as a game played. |
| 2008 | Orioles and Nationals on 161 | SIX clubs on 161 (Nationals, Marlins, Cubs, Astros, Orioles, Athletics), and the White Sox and Twins on 163. |
| 2009 | Twins and Tigers on 163 | Also the Cubs and Pirates on 161. |
| 2016 | Cubs and Pirates "161 decisions" | They PLAYED 162 (one a tie that was never finished). Marlins, Braves, Cleveland, Tigers on 161. |
| 2020 | 60 for everyone | The Cardinals and Tigers finished on 58. |
| 2026 | Orioles and Yankees on 161, records disagree | Both on 161. Both copies of the Associated Press report read today print 93-68 for the Yankees; the 93-67 copy was not found. |

16 of the 23 seasons hold a club that did not play its schedule's length: 50 club lines in all.

## Where two sources disagree (for the lead)

1. **Cleveland, 2004.** ESPN prints 80-81 (161 games), read twice on two addresses; its own table then holds
   2,428 wins against 2,427 losses, which cannot be. Retrosheet (80-82, 162), Baseball Almanac (80-82) and
   Baseball Reference (162) agree. The ledger has Cleveland on 162 and says so in the row's `disputed` line.
2. **Pittsburgh and Arizona, 2018.** ESPN prints Pittsburgh 83-79 (162) and Arizona 82-81 (163), read twice;
   that table balances, so it is not a slip of the reader. Retrosheet, Baseball Almanac and Baseball Reference
   agree on Pittsburgh 82-79 (161) and Arizona 82-80 (162). The ledger follows the three, with a `disputed` line.
3. **One goal, the 2006-07 Islanders.** ESPN prints 247 goals for; the league feed and Hockey Reference 248.
   Named in `NHL_THIN`; it moves the league mean by nothing at two decimals.
4. **Baseball Almanac's ties column** is 0 for the two tie games of 2005 and 2016, so it is no source for
   them. The ties rest on Retrosheet, Baseball Reference, the Associated Press and NBC Sports.

If the lead would rather hold a disputed club than follow two of three, the two rows to change are MLB 2004
(Cleveland) and MLB 2018 (Pittsburgh, Arizona). Nothing reads them yet.

## What is THIN (not filled, value `null`)

MLB (`MLB_THIN`, ten entries): the shares of one run games and extra inning games (ESPN only: 27.5 and 8.6
percent in 2026, 26.3 and 11.8 in 2004) and of shutouts (nothing read); that a division rival is met in four
series with 26 of 52 at home (Ticketmaster only); home and away inside the 62 league games and the 81 home
games (no source); the first year of the extra inning runner and the plain nine innings rule; the 2020 Wild
Card Series as a best of three and the Division Series as a best of five before 2022; the league and season
length of the Yomiuri Giants (NPB's own standings only: Central League, 143 games); why each club fell short
(only 2026 and the two ties were read); that the World Series is the only round against the other league
(CBS Sports only); the schedule formula before 2023.

NHL (`NHL_THIN`, seven entries): 84 is a published schedule, no club has finished a season on it; the schedule
formula of any 82 game season; four skaters a side in overtime before 2015-16 (NBC only); how the 2020 and
2021 playoffs differed; why 2012-13, 2019-20 and 2020-21 were short; the shootout's first season; the one goal.

## Where the ledgers disagree with what an engine plays today (notes, never a red)

The harness prints these on every run under "NOTES FOR THE BINDING ROUNDS". None was fixed here.

1. **MLB season length.** A healthy hitter plays 155 to 162 games in every year and the engine reads no length
   ledger. The real schedule was 60 in 2020, and 16 seasons hold a club off its schedule's length.
2. **NHL season length.** A healthy skater plays 79 to 82 in every year. The real season was 48 in 2012-13,
   68 to 71 by club in 2019-20, 56 in 2020-21 and is 84 from 2026-27. So the engine plays MORE than the real
   season in three throwback years and at most 82 of 84 in every present day season. Production is scaled by
   `games / 82` and the season paper counts missed games from 82 (`src/lib/nhlCareerLoop.ts`).
3. **MLB playoff games against the real rounds** (`careerVariance.playoffGames` against the ledger's best of
   three, five, seven and seven, measured over 20,000 evenly spaced draws a stage): a Wild Card exit saves 3 to
   5 games where the round holds 2 to 3, so 84.7 percent cannot fit; a Division Series exit saves 7 to 9 where
   the two rounds hold 5 to 8, so 32.6 percent cannot fit; the three later results always fit. These are the
   critic's numbers, reproduced.
4. **NHL playoff games** always fit four best of sevens (0.0 percent misfit at every stage).
5. **The Wild Card result in every year.** The engine writes 'Lost the Wild Card series' in any season. The
   ledger: no wild card round from 2004 to 2011, one game in 2012 to 2019 and 2021, a series only in 2020 and
   from 2022. The engine also models no first round bye (two clubs a league skip the round).
6. **The club outside the league.** `src/lib/mlbCareerLifeB.ts` writes `cc.team = 'Yomiuri Giants'` and the
   engine then plays MLB seasons for it. That club is in no MLB standings of any season read. A binding round
   must hold such a row (the critic's correction 1); `MLB_OUTSIDE_CLUBS` carries the fact.
7. **A name.** The game prints "Sacramento Athletics" for `ATH`; both 2026 standings print "Athletics".
8. **Ids that are not a real club that year.** A 2004 throwback career can sit at `MON` (the Expos) from 2005,
   `ANA` from 2005, `TBD` from 2008, `FLA` from 2012, `CLV` from 2022 or `OAK` from 2025; a 2006 NHL throwback
   at `ATL` from 2011-12 or `PHX` from 2014-15. `MLB_NAME_SPANS` and `NHL_NAME_SPANS` give the last real year
   of each. The NHL's 2006 list is the real league only for 2006-07 to 2010-11.

## For the binding rounds

- The shapes match what `src/data/usSeasonLengths.ts` and `src/data/usLeagueShape.ts` hold for the NBA and the
  NFL: a season row with `games` (or `null` and a `why`), a `clubs` group with `ids`, `games` and `why`,
  divisions with `conf`, `name` and `teams`, a playoff format with `rounds` and `series`, scoring by era id.
- `ids` in an MLB club group are already filtered by the same club, same name rule (critic 6 a), and the
  harness recomputes them from the game's own lists on every run. A club with no id that year (the 2008
  Nationals) is named in `clubs` and absent from `ids`.
- Every MLB season was read for all 30 clubs in both sources, so under the fail closed rule (critic 6 c) no
  throwback year needs to be held whole for being unread.
- From 2022 there is no tiebreaker game (`MLB_NO_TIEBREAKER_GAME_FROM`), so a 163 can no longer happen that way.
- NHL scoring has two numbers on purpose: `inPlay` (2.88 and 3.08) and `onTheBoard` (2.95 and 3.13). The
  difference is the one goal a shootout winner is given on the final score. A score law that puts that goal
  on the board wants `onTheBoard`.
- `NHL_OVERTIME`: 281 of 1,230 games went past sixty minutes in 2006-07 (22.8 percent) and 164 of those to a
  shootout (58.4 percent); 326 of 1,312 in 2025-26 (24.8 percent) and 119 to a shootout (36.5 percent).
- PR216 (`src/lib/usCareerProgramme.ts`, the other lane) types 82 for the NHL in `gamesCeiling`. If that is
  ever tidied to read a length ledger for all four sports, 84 becomes a target no skater can reach until the
  engine plays 84 (critic 16).

## Checks

`node scripts/simUsSeasonLedger.mjs` is green on its closing line with 1,185 checks. `US_LEDGER_CONTROL=list`
prints the 24 controls; each one changes a single fact in the loaded data, refuses to run when that fact is
not there, and must turn exactly its named labels red (exit 1 and a last line that says FIRED). The runner
result names are in the closing report of the round.
