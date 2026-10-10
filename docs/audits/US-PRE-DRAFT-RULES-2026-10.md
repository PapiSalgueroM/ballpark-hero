# US pre draft rules, verified for Round 914 (2026-10)

Every rule, round count, lottery table, eligibility age and era start year that
`src/lib/careerPreDraft.ts` and its four sport bindings use, each with two sources
(URL and read date). Wikipedia is a spot check only and never counts as one of the
two. A fact that would not confirm twice is listed at the bottom under LEFT OUT and
the code does not use it.

All reads: 2026-10-02.

The two eras the careers already ship are the frame: NFL `now` (2026) and `y2005`;
NBA `now` (2026) and `y2004` (start year 2003, so the 2003 draft); MLB `now` and
`y2004`; NHL `now` and `y2006`.

## NFL

| Fact | Value | Era | Source 1 | Source 2 |
|---|---|---|---|---|
| Rounds | 7, one pick per club per round | now | NFL Football Operations, Draft Rules: https://operations.nfl.com/calendar-events/nfl-draft/nfl-draft-rules | NFL and NFLPA CBA Article 6 Section 1 ("The Draft shall consist of seven rounds"), text at https://overthecap.com/collective-bargaining-agreement/article/6 |
| Seven rounds since 1994 | first seven round draft was 1994, so it covers 2005 | y2005 | ESPN, 2024-04-17: https://www.espn.com/nfl/story/_/id/36180094/when-did-nfl-draft-change-seven-rounds | NFL Records: https://nfl-records.com/questions/how-many-rounds-in-the-draft |
| Order | reverse order of finish; no lottery | both | NFL Football Operations, Draft Rules (above) | (order rule is the same page; the CBA has no lottery anywhere in Article 6, read above) |
| Eligibility | three NFL seasons after high school graduation | now | NFL Football Operations, Draft Rules (above) | CBA Article 6 (above) |
| Eligibility in force in 2004 to 2005 | upheld by the Second Circuit on 2004-05-24 | y2005 | Congressional Research Service RS21869: https://www.everycrsreport.com/reports/RS21869.html | Clarett v. NFL, 2d Cir. 2004: https://caselaw.findlaw.com/court/us-2nd-circuit/1111241.html |

The undrafted row was removed in the review fixes (2026-10-03): it had one source, so the
NFL and NBA undrafted lines now state no league rule at all (see LEFT OUT).

## NBA

| Fact | Value | Era | Source 1 | Source 2 |
|---|---|---|---|---|
| Rounds | 2, one pick per team per round | now | NBA.com lottery explainer (updated 2026-06-01): https://www.nba.com/nba-draft-lottery-explainer | Sports Illustrated, 2026-06-19: https://www.si.com/nba/nba-draft-full-history-how-many-rounds ("two rounds since 1989") |
| Two rounds since 1989 | covers the 2003 draft | y2004 | Sports Illustrated (above) | Sleeper: https://sleeper.com/blog/how-many-draft-rounds-in-nba/ ("in 1989, the league settled on the current two-round setup") |
| Lottery teams | 14 non playoff teams (play-in losers included) | now | NBA.com lottery explainer (above) | Hoops Rumors glossary, 2024-04: https://www.hoopsrumors.com/2024/04/hoops-rumors-glossary-nba-draft-lottery-4.html |
| Picks drawn | 4, then the rest of the lottery in inverse record | now (since the 2019 draft) | NBA.com, Board of Governors approves changes: https://www.nba.com/news/nba-board-governors-approves-changes-draft-lottery-system | NBA.com lottery explainer (above); Hoops Rumors (above) |
| No. 1 odds by seed, combinations of 1000 | 140, 140, 140, 125, 105, 90, 75, 60, 45, 30, 20, 15, 10, 5 | now | Hoops Rumors (full table, above) | NBA.com Board of Governors article (seeds 1 to 6: 14, 14, 14, 12.5, 10.5, 9) and the NBA.com 2026 explainer (seeds 9 to 14: 4.5, 3, 2, 1.5, 1, 0.5; seeds 4 and 5 tied at 11.5 and 7 and 8 at 6.8 and 6.7, the averages of the table) |
| Lottery teams then | 13 (29 teams, 16 in the playoffs) | y2004 (2003 draft) | CBS Sports, complete history of the lottery: https://www.cbssports.com/nba/news/complete-history-nba-draft-lottery-tanking/ | The Draft Review, 2003 lottery: https://www.thedraftreview.com/historical-draft-events/nba-draft-lottery-history/2003-nba-draft-lottery |
| No. 1 odds by seed then | 250, 200, 157, 120, 89, 64, 44, 29, 18, 11, 7, 6, 5 | y2004 | CBS Sports (table "1996-2004", above) | The Draft Review 2003 lottery (225 and 225 for the two tied worst teams = 250 + 200 split; 157, 120, 89, 64, 44, 29; 15 and 14 for the tied ninth and tenth = 18 + 11; 7, 6, 5) |
| Picks drawn then | 3 | y2004 | Sports Illustrated, lottery rules explained: https://www.si.com/nba/nba-draft-lottery-rules-explained ("only the three picks were determined by it") | NBA.com Board of Governors article (the old system's worst team "picks no lower than fourth") |
| Age rule | 19 during the draft year and one year past high school graduation, from the 2005 CBA | now | The Draft Review, 2005 age limit: https://www.thedraftreview.com/nba-draft-regulations/nba-draft-rules/2005-nba-age-limit-nba-draft-rules | Greenberg sports law: https://greenberglawoffice.com/age-restrictions-on-entry-into-the-nba/ |
| Prep to pro | high school players could enter the draft directly before the 2005 CBA | y2004 | The Draft Review (above: "will increase from 18 to 19") | Greenberg (above) |

## MLB

| Fact | Value | Era | Source 1 | Source 2 |
|---|---|---|---|---|
| Rounds | 20 | now (since 2021) | Sleeper: https://sleeper.com/blog/how-many-rounds-in-mlb-draft/ ("20 rounds ever since" the 2020 draft) | Baseball America: https://www.baseballamerica.com/stories/mlb-opening-day-rosters-included-45-players-from-draft-rounds-that-no-longer-exist/ ("the 2021 draft will be 20 rounds"); Fansided, 2023-05-31: https://fansided.com/2023/05/31/mlb-draft-number-rounds-history/ |
| Rounds then | 50 (1998 to 2011) | y2004 | Sleeper (above: "From 1998-2011, the draft was capped at 50 rounds") | Baseball America (above: "cut from 50 rounds to 40 rounds in 2012") |
| High school route | eligible once he graduates, if he has not gone to college | both | Baseball Connect: https://baseball-connect.com/learn/what-is-the-mlb-draft-rule-4-draft/ | Fox Rothschild, sports law advice for amateurs: https://www.foxrothschild.com/sports-law-advice-for-amateurs |
| Junior college route | eligible after any year | both | Baseball Connect (above) | Fox Rothschild (above) |
| Four year college route | eligible after his junior year, or at 21 within 45 days of the draft | both | Fox Rothschild (above) | Baseball Connect (above: completed third or fourth year and over 21) |
| Slot values, picks 1 to 25 | 11,350,600; 10,507,000; 9,740,100; 8,988,400; 8,336,500; 7,746,100; 7,327,200; 6,982,600; 6,675,300; 6,393,100; 6,133,500; 5,889,300; 5,661,300; 5,444,900; 5,241,000; 5,051,900; 4,868,600; 4,695,500; 4,530,500; 4,373,900; 4,224,700; 4,082,700; 3,947,600; 3,818,700; 3,696,000 dollars | now (the 2026 draft) | Baseball America, 2026 bonus pools and slot values: https://www.baseballamerica.com/stories/2026-mlb-draft-bonus-pools-slot-values-for-each-team/ | Just Baseball: https://www.justbaseball.com/mlb-draft/2026-slot-values-bonus-pools/ (also SportsGrid, same table) |
| After round 10 | a pick can sign for up to 150,000 dollars without touching the pool | now | Baseball America (above) | Just Baseball (above) |
| Bonus pools began | the 2012 draft (the 2012-16 CBA), so the 2004 era has no slot pool | y2004 | Baseball Prospectus, 2012-05-29, read 2026-10-03: https://baseballprospectus.com/news/article/17169/bizball-inside-the-2012-16-cba-the-luxury-tax-meets-the-draft (under the new CBA "Clubs are given a 'pool' of signing money", in the system's first draft) | ABCA Inside Pitch, Summer 2012, read 2026-10-03: https://www.abca.org/magazine/2012-3-Summer/Last_Inning_The_New_CBA_and_College_Baseball.aspx ("each MLB team now has a pre-determined pool of money to sign players"); Baseball Connect (above) agrees. The game shows no bonus figure at all in the 2004 era |
| Full season minor league levels | Triple-A, Double-A and A ball (High-A and Low-A since 2021; Class A leagues before) | both | Sports Illustrated, 2021-02-12: https://www.si.com/mlb/2021/02/12/minor-league-baseball-realignment-regional-divisions (California, Florida State and South Atlantic leagues "had been at Class A") | Ballpark Digest, 2021-02-12: https://ballparkdigest.com/2021/02/12/minor-league-baseball-overhaul-unveiled/ ; SportsLogos.net, 2021-02-15 |

## NHL

| Fact | Value | Era | Source 1 | Source 2 |
|---|---|---|---|---|
| Rounds | 7 | now | FloHockey: https://www.flohockey.tv/articles/11212645-how-many-rounds-are-in-the-nhl-draft | Hockey Answered: https://hockeyanswered.com/how-the-nhl-entry-draft-works-a-complete-guide/ ; Hockey Prospect: https://hockeyprospect.com/nhl-draft-rules-eligibility-and-how-it-works/ |
| Seven rounds since 2005 | covers the 2006 draft | y2006 | FloHockey (above: "in place since the 2005 NHL Entry Draft") | Sports Illustrated oral history of the 2005 draft, 2015-06-23: https://www.si.com/nhl/2015/06/23/oral-history-2005-nhl-draft-sidney-crosby-carey-price (rounds cut "from nine to seven") |
| Age | 18 on or before September 15 of the draft year | both (since 1980 by FloHockey's history) | FloHockey (above) | Hockey Answered (above) |
| Routes | major junior, US junior (the USHL), NCAA college hockey, European leagues | both | Hockey Answered (above; names the USHL beside the CHL leagues, reread 2026-10-03) | Hockey Prospect (above; "North American prospects from the CHL, NCAA, and USHL", reread 2026-10-03) |
| Combine tests | off ice only, no skating test; today's tests include the Wingate bike test, standing long jump, vertical jump and pro agility, plus interviews with teams | now (pro agility since 2014) | NHL.com, 2022-06-14, read 2026-10-03: https://www.nhl.com/kraken/news/scoping-the-nhl-combine-334607654 (Wingate cycle ergometer, standing long jump, vertical jump, pro agility; teams interview the prospects) | Topend Sports, read 2026-10-03: https://www.topendsports.com/sport/icehockey/nhl-draft.htm (full test list; pro agility added in 2014; an on ice component was only ever "looked into"; the 20 minute team interview) |

The 2006 combine's own test list did not confirm twice, so the 2006 era's showcase names only
"Fitness testing" and "Interview day". Today's era names "Bike test", "Standing long jump",
"Pro agility" and "Interview day".

## How the code uses these

- Draft length is rounds times the era's own team count (the careers' existing era team lists).
- The NBA order: the lottery seeds are the non playoff teams by generated record; the drawn
  picks use the combinations above without replacement; everyone else in inverse record;
  round two repeats the full inverse record. No trades, so the team that holds a pick is the
  team that drafts you.
- The harness checks every drawn pick, not only the first, against the exact chances of the
  combinations drawn without replacement. For the 1996 to 2004 table that enumeration gives
  pick 2 odds of 21.55, 18.91 and 15.84 percent and pick 3 odds of 17.85, 17.22 and 15.70
  percent for the three worst teams, the figures CBS Sports (above) prints, which is a cross
  check of the drawing model rather than a new fact the game shows.
- NFL, MLB and NHL: inverse generated record, the same order every round.
- MLB after the draft: one to three seasons on the last rungs of the ladder (A ball, Double-A,
  Triple-A); an undrafted player always climbs all three, from A ball, as his line says.
- MLB now: the slot value of the pick is shown for picks 1 to 25 only; picks 26 to 300 say
  "a slot deal" with no figure; after round 10 the copy says "up to 150,000 dollars". 2004:
  no figure anywhere.

## Left out (would not confirm twice, or not needed)

- NHL draft lottery, both eras. The modern table (16 seeds, two drawings, a jump of at most
  ten spots) was only confirmed for seeds 1 to 11 from one source, and the 2006 rule not at
  all. The game uses inverse record for the NHL and never claims there is no lottery.
- MLB draft lottery (since 2023) and competitive balance and compensation picks: not
  modelled; MLB order is inverse record and the copy never claims otherwise.
- MLB rookie and short season levels: rookie complex leagues confirmed only by Wikipedia
  and a fan wiki, so the minor league ladder starts at A ball.
- NFL undrafted contract terms, and the rule that an undrafted rookie may sign with any club:
  one source only (CBA Article 6), so the NFL line says only that a club gives you a camp
  invite. The NBA undrafted rule was never sourced twice either, so its line says only that a
  team gives you a summer league invite.
- Minor league, junior, US junior, European and college season lengths: not confirmed twice,
  so the MLB and NHL stat lines are rates only (AVG, OBP, SLG; ERA, WHIP, K/9; goals,
  assists and points per game; SV%, GAA) and never print a games or innings count.
- The 2027 NBA lottery (sixteen teams, recorded in src/lib/nbaPlayoffFormatHistory.ts): not
  used. The `now` era drafts in 2026, so the fourteen team table above is the right one; a
  career that drafts in 2027 or later needs the new table verified twice first.
- Real prospects, real draft classes and real 2026 draft order: never used. Every other
  prospect is unnamed; teams come from the careers' existing era lists.

## Round 1220 (2026-10-10): what draft night prints, and the row behind each statement

Draft night (`src/lib/careerDraftNight.ts`, `src/components/career/DraftNightSequence.tsx`) adds
no real world fact of its own. Each statement it prints about the real leagues is already a row
above with its two sources. Nothing was read again for this round and nothing new is claimed.

| What the night prints | Where | The rows above that carry it |
|---|---|---|
| "Round N" on a pick row, and "round A into round B" on a gap | every sport and era | Rounds: NFL 7 in both eras, NBA 2 in both, MLB 20 now and 50 in 2004, NHL 7 in both |
| "14 clubs are in the lottery and the top 4 picks are drawn. The 3 worst records share the best chance at the first pick, 14% each." | NBA now | Lottery teams; Picks drawn; No. 1 odds by seed |
| "13 clubs are in the lottery and the top 3 picks are drawn. The worst record has the best chance at the first pick, 25%." | NBA y2004 | Lottery teams then; Picks drawn then; No. 1 odds by seed then |
| The picks after the drawn ones in inverse record (the order of the board, not a sentence) | NBA, both eras | Picks drawn ("then the rest of the lottery in inverse record") |

### The same statements as rows of their own, each with its two sources

The round's brief asked for every real world statement the night prints to stand as a row with
two independent sources that are not a wiki, so here they are one by one. The sources are the
ones the rows above already carry, copied and not read again: every read is the one dated at the
top of this file (2026-10-02, for Round 914). No fact below is new.

| What the night prints | Era | Value | Source 1 | Source 2 |
|---|---|---|---|---|
| "Round N" and "round A into round B", NFL | now | 7 rounds | NFL Football Operations, Draft Rules: https://operations.nfl.com/calendar-events/nfl-draft/nfl-draft-rules | NFL and NFLPA CBA Article 6 Section 1 ("The Draft shall consist of seven rounds"), text at https://overthecap.com/collective-bargaining-agreement/article/6 |
| the same, NFL | y2005 | 7 rounds (seven since 1994) | ESPN, 2024-04-17: https://www.espn.com/nfl/story/_/id/36180094/when-did-nfl-draft-change-seven-rounds | NFL Records: https://nfl-records.com/questions/how-many-rounds-in-the-draft |
| the same, NBA | now | 2 rounds | NBA.com lottery explainer (updated 2026-06-01): https://www.nba.com/nba-draft-lottery-explainer | Sports Illustrated, 2026-06-19: https://www.si.com/nba/nba-draft-full-history-how-many-rounds ("two rounds since 1989") |
| the same, NBA | y2004 | 2 rounds (two since 1989) | Sports Illustrated, 2026-06-19 (the same page) | Sleeper: https://sleeper.com/blog/how-many-draft-rounds-in-nba/ ("in 1989, the league settled on the current two-round setup") |
| the same, MLB | now | 20 rounds | Sleeper: https://sleeper.com/blog/how-many-rounds-in-mlb-draft/ ("20 rounds ever since" the 2020 draft) | Baseball America: https://www.baseballamerica.com/stories/mlb-opening-day-rosters-included-45-players-from-draft-rounds-that-no-longer-exist/ ("the 2021 draft will be 20 rounds") |
| the same, MLB | y2004 | 50 rounds | Sleeper (the same page: "From 1998-2011, the draft was capped at 50 rounds") | Baseball America (the same page: "cut from 50 rounds to 40 rounds in 2012") |
| the same, NHL | now | 7 rounds | FloHockey: https://www.flohockey.tv/articles/11212645-how-many-rounds-are-in-the-nhl-draft | Hockey Answered: https://hockeyanswered.com/how-the-nhl-entry-draft-works-a-complete-guide/ |
| the same, NHL | y2006 | 7 rounds (seven since 2005) | FloHockey (the same page: "in place since the 2005 NHL Entry Draft") | Sports Illustrated oral history of the 2005 draft, 2015-06-23: https://www.si.com/nhl/2015/06/23/oral-history-2005-nhl-draft-sidney-crosby-carey-price (rounds cut "from nine to seven") |
| "14 clubs are in the lottery" | NBA now | 14 teams that missed the playoffs | NBA.com lottery explainer: https://www.nba.com/nba-draft-lottery-explainer | Hoops Rumors glossary, 2024-04: https://www.hoopsrumors.com/2024/04/hoops-rumors-glossary-nba-draft-lottery-4.html |
| "the top 4 picks are drawn" | NBA now | 4 | NBA.com, Board of Governors approves changes: https://www.nba.com/news/nba-board-governors-approves-changes-draft-lottery-system | Hoops Rumors glossary (the same page) |
| "The 3 worst records share the best chance at the first pick, 14% each." | NBA now | 140 combinations of 1000 for each of seeds 1, 2 and 3 | Hoops Rumors glossary (the full table) | NBA.com, Board of Governors article (seeds 1 to 3: 14, 14, 14) |
| "13 clubs are in the lottery" | NBA y2004 | 13 (29 teams, 16 in the playoffs) | CBS Sports, complete history of the lottery: https://www.cbssports.com/nba/news/complete-history-nba-draft-lottery-tanking/ | The Draft Review, 2003 lottery: https://www.thedraftreview.com/historical-draft-events/nba-draft-lottery-history/2003-nba-draft-lottery |
| "the top 3 picks are drawn" | NBA y2004 | 3 | Sports Illustrated, lottery rules explained: https://www.si.com/nba/nba-draft-lottery-rules-explained ("only the three picks were determined by it") | NBA.com, Board of Governors article (the old system's worst team "picks no lower than fourth") |
| "The worst record has the best chance at the first pick, 25%." | NBA y2004 | 250 combinations of 1000 for seed 1 | CBS Sports (the table "1996-2004") | The Draft Review, 2003 lottery (225 and 225 for the two tied worst teams, which is 250 and 200 split) |
| The picks after the drawn ones run in inverse record (the order of the board, not a sentence) | NBA now | the rest of the lottery in inverse record | NBA.com, Board of Governors article | Hoops Rumors glossary |
| the same | NBA y2004 | only the first three picks come from the draw | Sports Illustrated, lottery rules explained ("only the three picks were determined by it") | NBA.com, Board of Governors article (the old system's worst team "picks no lower than fourth") |

The lottery line is built from the descriptor's own table by
`lotteryRuleLine(lotteryFactsFromWeights(...))` (`src/lib/lotteryReveal.ts`, Round 1222) and is
never typed. `src/test/careerDraftNight.test.tsx` holds the career's NBA table equal to the
front office's table in `src/lib/gmPicks.ts`, so the two cannot drift apart.

Not facts about the world, and the screen says so ("A simulated lottery. The order is generated
for your career." on the tile; "All prospects and results are fictional" and "a simplified order
without traded or extra picks" in the help): the generated standings, which club holds which
pick, the number of picks in a draft of this game (rounds times clubs, so 224 for the NFL, where
a real draft has compensatory picks on top), the range the scouts quote, and the pick itself.

Still left out, as above: the NHL and MLB lotteries are real and are not modelled by the career
engines. The night shows no lottery tile for them and prints no sentence that says there is
none. For a later round: `src/lib/gmPicks.ts` now carries the modern NHL lottery with two non
wiki sources for the front offices, but binding it to the career road would change which club
holds the first picks, so no NHL road would stay byte equal, and it would have to say out loud
that it re-deals them. The 2006 NHL era and MLB are still unsourced.
