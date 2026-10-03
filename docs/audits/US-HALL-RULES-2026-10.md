# US Hall of Fame rules, as the career Halls model them (Round 915)

Read date for every source below: 2026-10-02, unless the line says otherwise. Wikipedia was not
used as a source.

This file is the evidence behind the four data files `src/lib/nflCareerHall.ts`,
`src/lib/nbaCareerHall.ts`, `src/lib/mlbCareerHall.ts` and `src/lib/nhlCareerHall.ts`.
A value is marked `verified` in code only when two sources below agree on it. Anything with
one source, or with sources that disagree, is `believed` and the game prints no number for it.
`scripts/simCareerHall.mjs` reads the table in the next section and fails if a data file's
number differs from it.

## The table the harness reads

Columns: sport, waiting period in seasons, ballot length in years (none = no limit claimed),
vote share needed in percent, minimum share to stay on the ballot (none = no such rule claimed),
first class after the last season (years added to the last season's label). Each sport's
section below holds that offset to real players' first eligible classes, with dated sources;
the data files mark it `firstClass: "verified"` and only then does the card print
"Eligible from the Class of ...".

<!-- hall-table:start -->
| sport | wait | ballot | threshold | stayFloor | firstClassOffset |
|---|---|---|---|---|---|
| nfl | 5 | none | 80 | none | 6 |
| nba | 2 | none | 75 | none | 4 |
| mlb | 5 | 10 | 75 | 5 | 6 |
| nhl | 3 | none | 75 | none | 4 |
<!-- hall-table:end -->

## Pro Football Hall of Fame (NFL career). Rule year: Class of 2027 onward

- Wait, five seasons retired. verified.
  1. https://www.profootballhof.com/hall-of-famers/selection-process : "A Player must have been
     retired for at least five seasons before he can be considered".
  2. https://www.espn.com/nfl/story/_/id/49823476/pro-football-hof-makes-sweeping-changes-selection-process
     (Sep 4, 2026): players are still eligible five years after retirement.
- Vote share, 80 percent. verified. Same two pages ("at least 80% of the full Committee"; ESPN:
  80% approval). Also https://www.profootballhof.com/news/pro-football-hall-of-fame-revises-bylaws-governing-annual-selection-process
  (Aug 23, 2024).
- Ballot length. believed, so no number is printed. ESPN says modern era and seniors become one
  pool from the Class of 2027 and a player simply stays on the list of eligible players. The
  official page does not state it either way, so the game claims no limit and no fall off.
- Class size three to seven. verified (official page and ESPN). Not modelled: the game has one
  candidate, the player.
- First class, the last season plus six (`firstClassOffset` 6). verified, read 2026-10-03. An NFL
  season is labelled by the year it kicks off.
  1. The rule's own worked example, https://www.profootballhof.com/hall-of-famers/selection-process :
     "A candidate for the 2027 class must have concluded his career not later than the 2021 season."
  2. Peyton Manning, last season 2015 (https://www.espn.com/nfl/player/stats/_/id/1428/peyton-manning ,
     last row 2015 DEN; https://www.profootballhof.com/players/peyton-manning/ , career 1998-2015),
     Class of 2021 (the same PFHOF page). 2015 + 6 = 2021, the first class the rule allows.
  3. Drew Brees, career 2001-2020, Class of 2026 (https://www.profootballhof.com/players/drew-brees/ ;
     ESPN's Sep 4, 2026 piece above carries his Hall of Fame speech). 2020 + 6 = 2026.

## Naismith Memorial Basketball Hall of Fame (NBA career). Rule year: Class of 2025 onward

- Wait, two full seasons retired. verified, with a conflict recorded.
  1. https://www.nba.com/news/naismith-memorial-basketball-hall-of-fame-eligible-candidates-class-of-2025
     (Dec 19, 2024): the waiting period for players went from three full seasons out of the game
     to two.
  2. https://www.cbssports.com/nba/news/naismith-basketball-hall-of-fame-carmelo-anthony-sue-bird-dwight-howard-headline-class-of-2025-candidates/
     (Dec 19, 2024): the old three full seasons "effectively equated to a four-year wait due to
     our internal process"; the new rule is two.
  Conflict: https://www.espn.com/nba/story/_/id/49584780/the-11-nba-players-basketball-hall-fame-waiting-list
  (Aug 14, 2026) still quotes "three full seasons". Two dated rule announcements beat a later
  restatement, so the game models two. Recheck at the next audit.
- Vote share, 18 of 24 Honors Committee votes (75 percent). verified.
  1. https://pr.nba.com/naismith-memorial-basketball-hall-of-fame-announces-13-finalists-for-class-of-2019-election/
     (Feb 15, 2019): "A finalist needs 18 of 24 votes from the Honors Committee".
  2. https://www.nba.com/news/thirteen-finalists-basketball-hall-fame-class-2018 (Feb 17, 2018):
     "A finalist must receive 18 votes from the 24-member Honor Committee".
- Ballot length. No source states one. believed, no number printed, no fall off.
- First class, the last season plus four (`firstClassOffset` 4). verified, read 2026-10-03, from
  real first eligible classes rather than worked out from the waiting rule (no source spells out
  the arithmetic). An NBA season is labelled by its start year.
  1. Carmelo Anthony, last NBA season 2021-22 (https://www.espn.com/nba/player/stats/_/id/1975/carmelo-anthony ,
     last row 2021-22 LAL), a first-time nominee for the Class of 2025 (the nba.com and CBS
     pieces of Dec 19, 2024 above; CBS marks him with the first-time nominee asterisk).
     2021 + 4 = 2025.
  2. Kyle Lowry, "retiring this summer" after 2025-26, and Chris Paul, both "Eligible: 2029" in
     ESPN's Aug 14, 2026 piece above. 2025 + 4 = 2029. The same piece still quotes the old "three
     full seasons" wording (the conflict above); the year it prints matches this offset.

## National Baseball Hall of Fame, BBWAA ballot (MLB career). Rule year: 2014 onward

- Wait, five calendar years retired. verified.
  1. https://baseballhall.org/hall-of-famers/rules/bbwaa-rules-for-election : "ceased to be an
     active player in the major leagues at least five (5) calendar years preceding the election".
  2. https://www.baseball-reference.com/about/hof_voting.shtml : retired at least 5 years
     (1967 to present). Also https://bbwaa.com/hof-elec-req/ with the same sentence.
- Ballot length, ten years. verified.
  1. baseballhall.org (above): the candidate must have been active during a period beginning
     fifteen years and ending five years before the election, which is ten ballots.
  2. baseball-reference.com (above): "if a player has been on the ballot 10 times without being
     elected, he is dropped" (2014 to present).
  Conflict: bbwaa.com/hof-elec-req still prints the twenty year window (fifteen ballots), the
  rule before 2014. Stale.
- Vote share, 75 percent. verified on all three pages.
- Stay on the ballot, 5 percent. verified on all three pages.
- Every candidate's vote share is published. verified (read 2026-10-03).
  1. https://bbwaa.com/25-hof/ : the 2025 table prints each candidate's votes and percentage
     ("Ichiro Suzuki | 393 | 99.7 | 1st").
  2. https://www.baseball-reference.com/awards/hof_2025.shtml : the same row, 393 votes of 394
     ballots, 99.7 percent.
  So the MLB card prints the share for every ballot year. The other three Halls are `believed`
  on this point and their cards print no share.
- Ten big league seasons to be eligible. verified, read 2026-10-03 (an earlier pass of this file
  wrongly called it one source).
  1. baseballhall.org (above), rule 3(B): "Player must have played in each of ten (10) major
     league championship seasons".
  2. baseball-reference.com (above): "players who played in MLB for at least 10 seasons".
  Not modelled, and the departure is deliberate: the brief fixes induction to the engine's own
  verdict (mlbLegacyOf(c).hof), so a career under ten seasons that the engine calls a Hall of
  Famer still goes in, and one outside the Hall can still sit on the ballot. No card prints
  this rule, so nothing printed is contradicted. Modelling it means a balance round on the
  engine's verdict, not this one.
- First class, the last season plus six (`firstClassOffset` 6). verified, read 2026-10-03.
  Calendar years: last season Y, five calendar years away, first election Y+6.
  1. CC Sabathia, career 2001-2019 (https://baseballhall.org/hall-of-famers/sabathia-cc), and
     Ichiro Suzuki, career 2001-2019 (https://baseballhall.org/hall-of-famers/suzuki-ichiro).
  2. Both "1st" in the "Year on ballot" column of the 2025 vote (https://bbwaa.com/25-hof/), and
     "1st" in the YoB column of https://www.baseball-reference.com/awards/hof_2025.shtml .
     2019 + 6 = 2025.

## Hockey Hall of Fame (NHL career). Rule year: current bylaws (Class of 2026)

- Wait, three playing seasons without a pro or international game. verified.
  1. https://www.hhof.com/induction/electionprocedures.html : "Must have not played in a
     professional or international hockey game during any of the three (3) playing seasons prior
     to his or her election".
  2. https://www.nhl.com/news/class-of-2026-hockey-hall-of-fame-candidates (Jun 21, 2026): "they
     can't have played in a professional or international hockey game in any of the three
     previous seasons".
- Vote share, 75 percent of the Selection Committee members present. verified.
  1. hhof.com (above): "Any candidate receiving 75% or greater votes from members of the
     Selection Committee present shall be declared elected".
  2. https://www.nhl.com/news/hockey-hall-of-fame-announces-2024-class (Jun 25, 2024): "at least
     75 percent of the vote from the selection committee".
- Four male players a year at most. verified (hhof.com and the 2026 NHL.com piece). Not modelled.
- Committee of eighteen: one source in this pass. believed, not printed.
- Ballot length: no source states one. believed, no number printed, no fall off.
- First class, the last season plus four (`firstClassOffset` 4). verified, read 2026-10-03. A
  season is labelled by its start year: last season Y ends in Y+1, three seasons away (Y+1 to
  Y+3), elected in the summer of Y+4.
  1. https://www.nhl.com/news/class-of-2025-hockey-hall-of-fame-candidates (Jun 23, 2025), under
     "Here are the top first-year eligible candidates": Zdeno Chara (last with the Islanders,
     2021-22) and Duncan Keith (Edmonton Oilers 2021-22). 2021 + 4 = 2025.
  2. https://www.nhl.com/news/class-of-2026-hockey-hall-of-fame-candidates (Jun 21, 2026), under
     "Here are the top first-year candidates who are eligible for induction": Patrice Bergeron,
     "his entire 20-year career with the Boston Bruins from 2003-23". 2022 + 4 = 2026.
