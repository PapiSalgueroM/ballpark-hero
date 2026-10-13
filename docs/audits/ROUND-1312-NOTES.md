# Round 1312 notes: the NHL season facts read twice

Written by the builder of Round 1312 on 2026-10-12. Branch r1312-nhl-week-data, base origin/main b6eb78e7.

This round changes nothing a player sees. It reads the facts the NHL week by week view (Round 1315) will
print, writes what each page literally says into scripts/data/usSeasonSources1312.json, and only then a block of
src/data/usSeasonLedgerNhl.ts, held by scripts/simUsSeasonLedger.mjs.

## Step 1: the harness reads two receipts files

scripts/simUsSeasonLedger.mjs now reads scripts/data/usSeasonSources1211.json and
scripts/data/usSeasonSources1312.json. Each file carries its own reading day and every receipt in it must carry
that day (R3, control readday). A key lives in exactly one file (R6, control keytwice). Every receipt a ledger
cites must be of a day that ledger names. The dash check (D1) reads both files and these notes.

## Step 2 (A1): the playoffs of 2006-07 to 2012-13

How the pages were read: every page was drawn by script in Chromium on a GitHub runner on 2026-10-12 (the
remote check r1312-read, then r1312-read2 for Hockey Reference's matchup pages), and its own text was written
to a file and read. ESPN answered the runner with an empty page, so its two articles were read in the desktop
app's own browser pane the same day. No search tool summary was used as a reading.

The two sources, season by season, 2006-07 to 2025-26 (twenty seasons; the later steps use the rest):
- the league's records site, "<season> Playoff Results" (receipt nhl-records-playoffs);
- Hockey Reference, each year's playoffs summary (hr-playoffs-1312) and the matchup page of each Final
  (hr-final-matchups).

They agree series for series in all twenty seasons: the same winner, loser and result in every series. Every
season has sixteen clubs in four rounds of 8, 4, 2 and 1 series, every winner on four wins (the league prints
"Best-of-7" on every series), and the winners of each round, and only they, play the next.

The names of 2006-07 to 2012-13. The league prints Conference Quarterfinals, Conference Semifinals, Conference
Finals and Stanley Cup Final. Hockey Reference's summary prints Conference Quarter-Finals, Conference
Semi-Finals, Conference Finals and Final, and its matchup page of each Final is headed "<year> NHL Stanley Cup
Final". So every round of every season is named alike by two sources, hyphen and case aside, and the ledger
holds the league's spelling. Written: NHL_ROUND_NAMES, its 2006 window. The thin row "The playoffs of 2006-07 to
2012-13" is closed (NHL_THIN 9 to 8).

Checks: N9 (the window against the harness's own table; every round of every season named alike by two
groups; the league's spelling held) and N10 (the series of every season: two groups, alike, 8 4 2 1, sixteen
clubs, four wins, the winners go on, every club in that year's alignment, the window's conferences flag).
Controls: roundname (N9), onegroup (N9, N10 and R2), readday (R3, now that the file holds a receipt).

## Step 3 (A2 and A6): the Final, the only round across; the playoffs of 2026-27

A2. The same two sources print every series of every season 2006-07 to 2025-26. Placed by the ledger's own
alignment of each year (NHL_ALIGNMENTS, two sourced by Round 1211), the first three rounds of every season
pair two clubs of one conference and the last round pairs the two conferences' champions, in every season but
2020-21 (no conferences; step 4). Written: `finalOnlyAcross` on every window, true for the windows of 2006 to
2012, 2013 to 2018 and from 2021 (the present day career's carried format stands on 2021-22 to 2025-26, read
season by season). The windows of 2013 to 2018 and from 2021 hold NHL_PLAYOFF_FORMAT's own names by reference.
The thin row "That the Stanley Cup Final is the only round against the other conference" is closed.

A6. The two schedule articles behind nhl-84 and espn-84 were read again on 2026-10-12 (new keys nhl-84-again and
espn-84-again): neither says anything of the playoffs. The league's own "Playoff Format" page, read the same
day (nhl-playoff-format-again), still describes sixteen clubs and four best of sevens and names no season. So
the format did not change in any source read, the window from 2021 is carried into 2026 (`to: null`) as
NHL_FORMULA_84 is, and one new NHL_THIN row says so (NHL_THIN stays at 8: one row closed, one added).

Checks: N10 now also holds `finalOnlyAcross` to this harness's own table and to what the series say. Controls:
acrossflag (the 2006 window said not to keep its rounds inside a conference: N10) and acrossdata (one first
round series of 2022-23 moved across the conferences in both receipts, so they still agree: N10).

## Step 4 (A3 and A4): the tournaments of 2019-20 and 2020-21

A3, 2019-20. The league's records site prints a Western and an Eastern Conference Round Robin and the Stanley
Cup Qualifiers (eight series, "Best-of-5") before 1st Round, 2nd Round, Conference Finals and Stanley Cup Final,
every one "Best-of-7". Hockey Reference prints a Qualifying Round of eight series, each won with three wins,
before First Round, Second Round, Conference Finals and Final, and heads the Final's matchup page "2020 NHL
Stanley Cup Final". NBC Sports (James O'Brien, 24 August 2020) and CBS Sports (Shanna McCarriston, 4 June
2020) describe a 24 team playoff with a round robin and a best of five qualifying round, then four best of
seven rounds they call first round, second round, conference finals and Stanley Cup Final. Every round's name
is given by two groups or more, and the first three rounds were played inside each conference (the series
place every club). Written: the 2019 window, names NHL_PLAYOFF_FORMAT's by reference, with the words that a
qualifying stage came first and this ledger does not lay it out.

A4, 2020-21. The league ("Key questions, answers on 2020-21 NHL season", Tom Gulitti, 23 December 2020): 56
games, four new divisions and only games inside the division, the top four of each division, the first two
rounds inside the division (first against fourth, second against third "in the first round"), the four clubs
of the "Semifinal Round" seeded by points, the traditional four round best of seven format. NBC Sports (22
December 2020) agrees and names the second round and the 2021 Stanley Cup Final. The league's records site
prints 1st Round, 2nd Round, Stanley Cup Semifinals and Stanley Cup Final, every one "Best-of-7"; NBC Sports
(Sean Leahy, 13 June 2021) titles its preview "PHT's 2021 NHL Stanley Cup Semifinals predictions"; Hockey
Reference prints First Round, Second Round, Semi-Finals and Final. So: First Round (Hockey Reference and the
league's article), Second Round (Hockey Reference and NBC), Stanley Cup Semifinals (the league and NBC; Hockey
Reference's "Semi-Finals" alone is not the same name), Stanley Cup Final (the league, Hockey Reference's matchup
page and NBC). Written: the 2020 window, conferences false and finalOnlyAcross false (there were none).

A3 and A4 close the thin row "How the 2020 and 2021 playoffs differed" (NHL_THIN 8 to 7). The windows now run
from 2006 with no gap (N9). Every quotation of the article receipts was matched to the page text it came from by
a script (25 of 25 on the runner's files; the three pages read in the browser pane checked in the pane).

Checks: N9 also holds the stage before the four rounds (said exactly where the harness's own table says, and
printed by two groups; no receipt of another window prints one) and the windows' coverage. Controls:
finalacross (the 2020 window said to keep its rounds inside a conference: N10), beforegone (the 2019 stage
forgotten: N9), semisone (NBC's semifinal page taken from the 2020 names: the league alone names that round, N9).

## Step 5 (A5): the shootout era

The league's own site (Nicholas J. Cotsonika, "NHL general managers discuss, endorse OT format at meetings", 18
March 2024, drawn on the runner) dates the shootout to 2005-06. ESPN ("What are NHL overtime rules?", ESPN
staff, 29 January 2024, read in the browser pane) says the league allowed games to end in a draw until 2005,
when the regular season shootout ended the tied game, and that a shootout goes on until one side scores and
the other does not. Sports Illustrated's sentence of the 1211 receipt si-overtime agrees. Written:
NHL_SHOOTOUT_FROM = 2005 (a start year) with NHL_SHOOTOUT_FROM_SRC (the league and ESPN). The thin row "The
first season of the shootout" is closed (NHL_THIN 7 to 6). Round 1315's held file reads it (correction 13 c).

Not written, though read: the same league article gives four skaters a side in overtime from 1999-2000, which
with NBC Chicago (nbc-overtime) would be two sources for NHL_OVERTIME_RULES.skatersBefore2015. The brief keeps
that row (T2) out of this round because nothing prints it; it is left null and thin for a later round.

Check N11: the year is the harness's own; it is no later than the ledger's first season and every era of the
game; the overtime receipts count shootouts in that first season. Control shootoutfrom (2006: N11).

## Step 6 (Part B3): past sixty minutes, season by season

The league's standings feed on the last day of every regular season of 2006-07 to 2025-26 (new key
nhl-feed-1312: the 1211 feed read again) and Hockey Reference's "Expanded Standings" of the same twenty seasons
(new key hr-standings-1312; the table sits in a comment of the page and was read from it) were drawn on the
runner (r1312-read3, 40 of 40). Summed club by club they agree in every club of every season: the losses after
sixty minutes, the shootout wins and the shootout losses (equal to the wins in every season). Written:
NHL_OVERTIME_BY_SEASON (games, past sixty, shootouts), whose 2006-07 and 2025-26 are NHL_OVERTIME's own two
(281 and 164 of 1,230; 326 and 119 of 1,312). Nothing in src reads it.

| Season | Games | Past sixty | Shootouts |
|---|---|---|---|
| 2006-07 | 1230 | 281 | 164 |
| 2007-08 | 1230 | 272 | 156 |
| 2008-09 | 1230 | 282 | 159 |
| 2009-10 | 1230 | 301 | 184 |
| 2010-11 | 1230 | 297 | 149 |
| 2011-12 | 1230 | 300 | 181 |
| 2012-13 | 720 | 162 | 97 |
| 2013-14 | 1230 | 307 | 178 |
| 2014-15 | 1230 | 306 | 170 |
| 2015-16 | 1230 | 275 | 107 |
| 2016-17 | 1230 | 289 | 99 |
| 2017-18 | 1271 | 296 | 103 |
| 2018-19 | 1271 | 271 | 87 |
| 2019-20 | 1082 | 250 | 86 |
| 2020-21 | 868 | 195 | 65 |
| 2021-22 | 1312 | 288 | 102 |
| 2022-23 | 1312 | 302 | 95 |
| 2023-24 | 1312 | 271 | 82 |
| 2024-25 | 1312 | 271 | 77 |
| 2025-26 | 1312 | 326 | 119 |

Check N12 (every finished season once, typed in the harness's own table; games the season row's own; both
receipts' sums; shootout wins equal losses; no more shootouts than games past sixty). Control otseason (N12).

## B1 and B2: not done in this round

B1 (the 82 game formula of 2006-07 and 2007-08 and which division of the other conference a club hosted and
visited) needs the league's own schedule release of those seasons or a newspaper, and a 2007-08 club counted;
no such release was found on an open page today, and a contributor's post is no source (correction 5). B2 (the
6, 4 and 18 formula of 2009-10 and 2010-11 on a second source) needs the league's "A numerical look at the
2010-11 NHL schedule" read in a browser and a second source for 2009-10. Both stay in NHL_THIN as the row "The
schedule formula of the 82 game seasons (any of them)". Nothing reads them, and no career season is named
before 2026 (the throwback plays unnamed opponents), so leaving them costs no view anything.

## The final proof's catch: two old controls misfired

The first run of every control on the merged head (r1312-final-a) found 70 of 72 firing at their named checks.
The old controls nhlyear (a season row dropped) and nhlalign (Vegas taken out of the Pacific of 2017) also
turned the new checks red: N12 read the ledger's season rows for its years and games, and N10 placed clubs by
the ledger's alignments. Both now read only what is independent of the ledger: N12 takes its years from this
harness's own table and its games from Round 1211's league table receipt; N10 places clubs by OWN_NHL_ALIGN,
the harness's own alignment table, which N3 already holds the ledger's alignments to. The old controls fire at
exactly N1 and N3 again, and no new control lost its target.
