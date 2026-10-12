# Round 1310 notes: the real yardstick for Club Manager's league leaders (league book Round F, a data job)

Branch `r1310-cm-league-facts`, base `origin/main` at b6eb78e7 (Release AX). Written by the builder, 2026-10-12.
Nothing a player sees changes: no file under src, public or the guides moves, and no page, bundle or save
reads what this round adds. It puts the real numbers Round 1311's harness section (facts, in
`scripts/simCmLeagueBook.mjs`) will be held against on file, each figure on two opened pages.

## What shipped (four new files, no edits)

1. `scripts/data/cmLeagueBookFacts.json`: 210 rows from 11 publishers, in the shape of
   `scripts/data/cmVarRates.json` (what, readOn, rules, publishers with name, host and kind, rows, quantities,
   owed, notUsed). A row is one opened page read for one season, or for a format row the span it speaks for.
   Core rows (top scorer and keeper) carry `length`, the matches a club played as the format rows give it, or
   `curtailed`.
2. `scripts/data/cmLeagueBookFacts.receipt.json`: schemaVersion, ledgerKey, dataFile, readOn, readBy, method,
   limits (one line a league, plus the encoding and reader limits), checkedBy, and the sha256 of the data file
   with CRLF turned to LF.
3. `scripts/simCmLeagueBookFacts.mjs`: the fence, modelled on `scripts/simCmVarLedger.mjs`, named sim* so
   `scripts/runAllSims.mjs` finds it. It loads no engine and builds no bundle (about a second). Its eight
   checks and seventeen controls are in its header: the nine the brief named, and eight the reviews asked for
   (see "After review" below).
4. This file.

## The table (what the fence prints, by league and season: goals/length, or the state)

| League | 15-16 | 16-17 | 17-18 | 18-19 | 19-20 | 20-21 | 21-22 | 22-23 | 23-24 | 24-25 | Publishers |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Premier League | 25/38 | 29/38 | 32/38 | 22/38 | 23/38 | 23/38 | 23/38 | 36/38 | 27/38 | 29/38 | premierleague.com, mykhel.com |
| La Liga | 40/38 | 37/38 | 34/38 | 36/38 | 25/38 | 30/38 | DISPUTED | 23/38 | 24/38 | 31/38 | rsssf.org (Marca's count), 90min.com to 21-22, espn.com 21-22 on |
| Serie A | 36/38 | 29/38 | 29/38 | 26/38 | 36/38 | 29/38 | 27/38 | 26/38 | 24/38 | 25/38 | rsssf.org, sport.sky.it to 19-20, 90min.com to 21-22, espn.com 22-23 on |
| Bundesliga | 30/34 | 31/34 | 29/34 | 22/34 | 34/34 | 41/34 | 35/34 | 16/34 | 36/34 | 26/34 | bundesliga.com, rsssf.org |
| Ligue 1 | 38/38 | 35/38 | 28/38 | 33/38 | 18/curtailed | 27/38 | 28/38 | 29/38 | 27/34 | 21/34 | ligue1.com, rsssf.org |

Every cell but one is USED (two publishers on two hosts, every reading on file agreeing exactly).
Lengths stand on format rows: RSSSF's final table of each season plus ESPN's (La Liga, Serie A, Ligue 1),
or plus the league's own words (Premier League: 20 clubs since 1995/96; Bundesliga: 18 teams since 1965/66
but for 1991/92). 2019-20 stands on season rows only, never on a span row, since the pandemic broke that
season everywhere: two final tables each in the four that played it out (RSSSF and ESPN), and in Ligue 1,
which stopped it, RSSSF's final table plus NBC Sports' report of the day.

## The means the fence prints (binding nothing)

- Premier League, 38 matches: 10 USED, mean 26.9. Keepers: 10 USED, mean 17.2.
- La Liga, 38 matches: 9 USED, mean 31.1 (2021-22 out, DISPUTED).
- Serie A, 38 matches: 10 USED, mean 28.7.
- Bundesliga, 34 matches: 10 USED, mean 30.0.
- Ligue 1, 38 matches: 7 USED, mean 31.1; 34 matches: 2 USED, mean 24.0; 2019-20 curtailed, in no mean.

The scout's search summaries had La Liga 30.7 (with Benzema on 27) and Ligue 1 28.4 (three season lengths
mixed). On opened pages the 38 match real range is 26.9 (Premier League) to 31.1 (La Liga and Ligue 1).

## What is held, and why

- La Liga 2021-22 is DISPUTED: RSSSF's Pichichi list prints 37 for Karim Benzema (asked for twice, digit by
  digit), where 90min and ESPN's season table print 27. Both stay on file, nothing is picked. It is named
  under owed with what would settle it.
- Keepers outside England: THIN, no reading on file. None of the four gives an award for clean sheets, so
  no list by season exists the way the Golden Glove's does; laliga.com's keepers page prints no clean sheets,
  squawka.com and fbref.com answer 403. Serie A's, the Bundesliga's and Ligue 1's were looked for in a bounded
  look by the closing fixer (a search and one or two of the league's own pages each, named under owed): one
  season's article, a career list and a record list, never a list by season. Owed to the match engine round
  of the critic's answer 7.
- Ligue 1 2019-20 is quoted from its second table line and the note only: the first and last lines put a
  club name ending in FC beside its games played, which `scripts/simNoRivalNames.mjs` reads as a product
  title (runner result r1310-e caught it). The same fence caught a sponsor's product name in the title of a
  laliga.com article quoted under owed (r1310-g); it is now described, not quoted, and since the fix it is
  cited by host and date, because its address carries the same name with a hyphen the fence does not read.

## After review (the fix of 2026-10-12)

Two adversarial reviews (results-g review-run-1310.md and review-read-1310.md) found three majors and the fix
closed them on the branch:
- Ligue 1 2019-20 had the champions alone on 27 played. RSSSF's own page and ESPN's table both print Paris
  Saint-Germain and Strasbourg on 27 (their round 28 meeting was never played) and the other eighteen on 28.
  The row and the receipt now say so, and the row quotes Strasbourg's line and the n/p line.
- Two of the fence's rules were held by one line each that no control reached: USED needing two different
  hosts, and span rows never speaking for 2019-20. Controls samehost and pausedrow now hold them; staleowed,
  keeperowed, seasontoken, boundary, wikimirror and badurl hold four more guards and two fixes (any host with
  wiki in it is a wiki host, and a row whose url will not parse no longer throws before the summary). A
  mutation run on the runner killed every mutant the review found surviving, each by its own control.
- Smaller words: seven full Ligue 1 seasons before the cut, not eight; Sky Sport Italia's cards quoted as the
  page prints them; the rules say 2019-20 was paused in four leagues and stopped in Ligue 1, and that a few
  literals are a publisher's own sentence (never a person's words); RSSSF's English top scorers agrees on
  all ten Premier League seasons and is under notUsed.

Residual, by design: a cell's two rows given the same wrong number that both their lines print (a games
column read as goals on both pages) stays USED. One page's column error is caught (DISPUTED); both at once
needs two readers to make the same mistake on two pages that print the columns in a different order. Do not
read "two publishers agree" as "the column is right".

## Closing check (2026-10-12)

- The keepers of Serie A, the Bundesliga and Ligue 1 were looked for (see above); still THIN, still owed.
- Ligue 1 2019-20's matches stay prose and quoted lines, not a figure: the file's figures have no field for a
  season where clubs played different numbers (two on 27, eighteen on 28), a single matchesPerClub would be
  false for two clubs, and a curtailed season binds nothing.
- Left for the lead: `scripts/simNoRivalNames.mjs` does not read the sponsor's name when it is a hyphenated
  slug in a url. That predates this round and sits outside its four files; the round's own files no longer
  carry it, but other data files under scripts do. And the ruling that La Liga enters Round 1311's band on
  nine seasons, 2021-22 DISPUTED (the next section).

## For Round 1311 (the band)

Leagues with enough USED 38 match seasons to enter the band: the Premier League (10), Serie A (10), La Liga
(9) and Ligue 1 (7). The Bundesliga's ten are all 34 match seasons and Ligue 1 has two of those; they are a
34 match yardstick (30.0 and 24.0), never a 38 match one. On these files the band's real edges are the lowest
and highest league mean of 38 match seasons, 26.9 and 31.1.

## Hosts that would not open

fbref.com (403), worldfootball.net (402), britannica.com (403), squawka.com (403); premierleague.com's
beginner's guide under its long slug (404, opened under news/4365156); footballberry.com timed out once and
opened on its slash url.
