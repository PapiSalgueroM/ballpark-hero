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
