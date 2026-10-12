# Round 1311 notes: Club Manager's league leaders and awards on screen (league book B2)

Branch r1311-cm-league-boards, base origin/main b6eb78e7 (Release AX). Brief:
C:/Users/antho/dukb-handoff/2026-10-10/briefs/brief-1311.md. Every heavy check ran on a GitHub runner as a
remote check; the result of a check is read with `git show origin/rc-results/<name>:summary.txt`.

## What the round is, step by step

1. THE DOOR AND THE TILES (commits 339188d6, the Round 1081 pin b6135d8e). `leagueBoardsOf` in
   src/lib/clubManager.ts beside `leagueBookOf`: the one door every screen and award reads the league book
   through. It builds the reader's input once from the active save (each rival roster asked for once) and
   answers null for no book, a book the careful reader refuses, or one that does not add up to the table.
   `leagueBookRules` hands the card the rule a rival's goals are dealt by. `dealShares` in
   src/lib/clubManagerLeagueBook.ts says what `dealGoals` gives each man on average (the worked example is
   computed from it, never typed; a unit line holds it against 20,000 dealt goals and shows it tells the
   taker rule on from off). `BOOK_FULL_SHARE = 95` and `AWARD_FLOOR = 73` in
   src/lib/clubManagerLeagueBoards.ts, each held by a unit line. NEW
   src/components/club-manager/LeagueLeadersCard.tsx: no book (two wordings), a book with nothing on it yet,
   the three tiles, one board drawn alone with a back button, the honest thin data line, the late line, the
   keepers line, and a "?" with the rules and the worked example. StatsScreen.tsx mounts it above the award
   races on the All comps and League views; a board open is the whole screen and Back puts the page where
   it stood. The golden boot lines say what they are. The help sentence (ClubManagerHelp.tsx, the stats
   centre paragraph). The engine's awards still read the old race in this step.
2. THE AWARDS, ONE PUSH (commits 1b3958c1, the pin 977c3eca, the digest after it). `goldenBootTable` reads
   the book's Goals board on a season the book decides (a whole book with at least 73 in 100 rival goals on
   record) and its old body to the letter otherwise; the player of the season and the world award follow
   it. `finishSeason` asks the door once and writes `awards` (the top scorer, most assists, most clean
   sheets and the share on record) into the summary and the season's record, only on a season the book
   decides. The award races card drops its golden boot lines on such a season; the season review names the
   two new awards, or says in plain words why they are withheld; the help sentence and the card's "?" say
   so. scripts/simCmOwnGoals.mjs reads history without awards (its one line). scripts/simAwardRaces.mjs and
   scripts/simCmLeagueBook.mjs gain the sections and controls the brief names.

## What must not move, and how it is held

- Steps 1, 3 and 4 change no engine behaviour: simCmLeagueBook default and full fleets, seed sets 0 to 4,
  with BOOK_BASE at the base commit: every face (the whole save but the book, and the count of draws) equal.
- Step 2 moves only the honours: the stream face leaves out the four moved fields of the summary and each
  record's awards and nothing else; section awards holds the WHOLE summary and record to the base commit on
  every season the book does not decide.

## Numbers

(filled in as the runner results are read)
