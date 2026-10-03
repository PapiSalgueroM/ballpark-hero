# Missing Five sources, Round 949 (read 2026-10-03)

Every sheet in `src/lib/missingFive.ts` (`FIVE_LINEUPS`), 14 existing and 26 new, read from two hosts.
`scripts/simMissingFiveSources.mjs` fails any sheet whose `source` string names fewer than two hosts.

## Method

- **Starting five.** Host A is the basketball-reference.com box score (the Starters block of each team's
  basic box, the five rows above "Reserves"). Host B is the nba.com game box score, whose page carries the
  box as JSON (`__NEXT_DATA__`): the first five rows of each team are the starters block. Both pages were
  fetched raw and parsed by script, never summarised by a model, because a model summary misread one
  rebound total during the first probe (Derek Fisher, 2010 Game 7: the raw pages both say 1, the summary
  said 2). A sheet ships only if its five names are exactly host A's Starters block AND host B's first five.
- **1998 Game 6.** nba.com has no box for any 1990s Finals game (every id redirects to /games). The
  second host for the two 1998 sheets is statmuse.com (its "starters" answers for both teams), which lists
  the same five per side with minutes and points that match bref to the rounded minute.
- **Nationality** (shown as hint 1). Host A is the bref player page's birthPlace; host B is the nba.com
  player page's COUNTRY field. A blank ships only when the birth country and COUNTRY agree. All 68 new
  blanks agree (53 USA, 15 elsewhere). What this measures is the league's listed country confirmed by the
  birth country. A birthplace is not a nationality, so the rule cannot see a dual national (Gabe Vincent,
  Corrections 2) and refuses a player whose birth country and listed country differ (Vladimir Radmanovic,
  Corrections 3). Neither case means the other value was wrong.
- **Reveal facts** on new sheets are only box score numbers (points, rebounds, assists, minutes rounded to
  the nearest minute) that both hosts print identically, filled into a sentence by script; a number the two
  hosts disagree on is refused. 2004 and 2005 minutes on nba.com are whole minutes that do not always match
  bref's rounding, so no 2004 or 2005 fact uses minutes. No fact says why a player started (injuries, coach
  decisions): that is not in a box score.
- **Positions** (PG, SG, SF, PF, C) are the site's court layout, as on the existing sheets, not a sourced
  fact. nba.com's position labels on old boxes are unreliable (it lists Rasheed Wallace as G in 2010), so no
  fact sentence names a position.
- **Names** are shown as billed at the time and without accents, as the existing sheets do:
  - Ron Artest (2010 Lakers): both boxes list him under his later name Metta World Peace (bref artesro01,
    nba.com 1897). bref's player page: "Formerly known as Ronald William Artest. Changed to Metta World
    Peace (2011)". He is on the sheet, never a blank.
  - Slava Medvedenko (2004 Lakers): nba.com prints Slava; bref prints Stanislav and its player page says
    "Slava is a nickname for Stanislav Medvedenko".
  - Jimmy Butler (2020 Heat) and Robert Williams III (2022 Celtics): nba.com prints Jimmy Butler III and
    Robert Williams III, bref prints Jimmy Butler and Robert Williams. Same ids. Williams III is shown as
    the Celtics billed him that season; neither is a blank.
- **Venue** is bref's name at the time plus the city. 2020 Game 6 is the one exception: bref says "The
  Arena, Bay Lake, Florida", nba.com says "AdventHealth Arena, Orlando"; the sheet shows "AdventHealth
  Arena, Florida" (the league's name, the state both agree on).

## Corrections to existing sheets found by this read

1. **finals-2019-g6-gsw, Draymond Green.** The fact said he "fell one assist short of a triple-double".
   Both hosts: 11 points, 19 rebounds, 13 assists, which is a triple-double. Fact now says so.
2. **finals-2023-g5-mia, Gabe Vincent.** The hint said Nigeria and now says USA. This is a change of basis,
   not the fix of an error: Vincent is a dual national who plays for Nigeria (the round's review read
   olympedia.org listing him on Nigeria's Tokyo 2020 team), so Nigeria was true. The hint now follows the
   rule above: nba.com COUNTRY USA, bref birthplace Modesto, California, United States.
3. **finals-2008-g6-lal, Vladimir Radmanovic.** nba.com COUNTRY Serbia; bref gives only a birthplace,
   Trebinje, Bosnia and Herzegovina, which is not a nationality source. With one host for the nationality
   he is held out as a blank (he stays on the sheet as the starter he was; both hosts confirm that). A
   second host naming his nationality puts him back (basketball.realgm.com answered 403 on 2026-10-03).
4. **1998 blanks other than Kukoc** (Harper, Longley, Keefe, Hornacek, Russell): nba.com has no reachable
   player id for them, so their nationality rests on bref's birthplace alone. Marked here as one host, not
   changed. Kukoc: bref Split, Croatia; nba.com/player/389 COUNTRY Croatia.
5. **Review corrections, same day.** Two adversarial reviews of the round found reveal facts on the
   existing sheets that the box scores do not support. Each was replaced by box score numbers both hosts
   print, read from the tables below:
   - finals-2019-g6-gsw, Andre Iguodala. Was "Started in place of Kevin Durant, who had torn his Achilles
     in Game 5": false, the review read the Game 5 box on bref (201906100TOR) and statmuse with Iguodala
     starting beside Durant. Now: 22 points in 32 minutes (32:01 on both).
   - finals-2019-g6-gsw, Kevon Looney. Was "left in the second half with a chest injury": in the bref
     play-by-play the review read, he is back on in the fourth quarter. Now: 27 minutes (26:50 bref, 26:51 nba.com), 6, 3, 4.
   - finals-2011-g6-dal, J.J. Barea. Was "The 6-foot backup": bref lists him at 5-10. Now: 15 points and
     5 assists (both hosts).
   - finals-2008-g6-bos, Kendrick Perkins. Was "with a shoulder injury, P.J. Brown soaked up the
     frontcourt minutes": no box names an injury, and James Posey (26:07) played more than Brown (16:11).
     Now: 13 minutes (13:25 on both), 2 points, 4 rebounds.
   - finals-2013-g7-sas, Danny Green. Was "had broken the record (27) earlier in the same series": not
     supported. Now: 36 minutes (36:27 on both), 5 points, 5 rebounds.
   - finals-2023-g5-mia, Kevin Love. Was "the documented Spoelstra adjustment": nothing documents it. Now:
     14 minutes (14:10 on both), 3 points.

The other narrative facts on the 14 existing sheets (trades, "the famous final defensive stand" and the
like) were not re-read. Box score numbers in them were checked and hold: Love 14 rebounds and Green
32/15/9 (2016), Kukoc 15 and Jordan 45, Hornacek 17 and Malone 31 (1998), Porter Jr. 13 rebounds (2023),
Joel Anthony 10:55 (2011), Splitter, Allen and Battier in the reserves block on both hosts (2013).

## Existing sheets

### finals-2016-g7-cle: Cleveland Cavaliers, 2016 NBA Finals Game 7 (existing sheet, second host added)

- Source A: https://www.basketball-reference.com/boxscores/201606190GSW.html (Starters block, 2026-10-03). 8:00 PM, June 19, 2016, Oracle Arena, Oakland, California. First man off the bench: Richard Jefferson.
- Source B: https://www.nba.com/game/0041500407/box-score (starters block, first five rows, 2026-10-03). Cleveland Cavaliers 93 at Golden State Warriors 89.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | Second host |
|---|---|---|---|---|
| PG | Kyrie Irving | irvinky01 | 43:00, 26, 6, 1 | nba.com 202681: 43:00, 26, 6, 1 |
| SG | J.R. Smith | smithjr01 | 38:55, 12, 4, 2 | nba.com 2747: 38:55, 12, 4, 2 |
| SF | LeBron James | jamesle01 | 46:49, 27, 11, 11 | nba.com 2544: 46:49, 27, 11, 11 |
| PF | Kevin Love | loveke01 | 30:02, 9, 14, 3 | nba.com 201567: 30:02, 9, 14, 3 |
| C | Tristan Thompson | thomptr01 | 31:49, 9, 3, 0 | nba.com 202684: 31:49, 9, 3, 0 |

| Blank | Nationality in file | bref birthplace | nba.com COUNTRY |
|---|---|---|---|
| J.R. Smith | USA | Freehold, New Jersey, United States | USA |
| Kevin Love | USA | Santa Monica, California, United States | USA |
| Tristan Thompson | Canada | Toronto, Ontario, Canada | Canada |

### finals-2016-g7-gsw: Golden State Warriors, 2016 NBA Finals Game 7 (existing sheet, second host added)

- Source A: https://www.basketball-reference.com/boxscores/201606190GSW.html (Starters block, 2026-10-03). 8:00 PM, June 19, 2016, Oracle Arena, Oakland, California. First man off the bench: Andre Iguodala.
- Source B: https://www.nba.com/game/0041500407/box-score (starters block, first five rows, 2026-10-03). Cleveland Cavaliers 93 at Golden State Warriors 89.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | Second host |
|---|---|---|---|---|
| PG | Stephen Curry | curryst01 | 39:16, 17, 5, 2 | nba.com 201939: 39:16, 17, 5, 2 |
| SG | Klay Thompson | thompkl01 | 42:17, 14, 2, 2 | nba.com 202691: 42:17, 14, 2, 2 |
| SF | Harrison Barnes | barneha02 | 29:24, 10, 2, 1 | nba.com 203084: 29:24, 10, 2, 1 |
| PF | Draymond Green | greendr01 | 46:54, 32, 15, 9 | nba.com 203110: 46:54, 32, 15, 9 |
| C | Festus Ezeli | ezelife01 | 10:45, 0, 1, 1 | nba.com 203105: 10:45, 0, 1, 1 |

| Blank | Nationality in file | bref birthplace | nba.com COUNTRY |
|---|---|---|---|
| Festus Ezeli | Nigeria | Benin City, Nigeria | Nigeria |
| Harrison Barnes | USA | Ames, Iowa, United States | USA |
| Draymond Green | USA | Saginaw, Michigan, United States | USA |

### finals-1998-g6-chi: Chicago Bulls, 1998 NBA Finals Game 6 (existing sheet, second host added)

- Source A: https://www.basketball-reference.com/boxscores/199806140UTA.html (Starters block, 2026-10-03). June 14, 1998, Delta Center, Salt Lake City, Utah. First man off the bench: Dennis Rodman.
- Source B: nba.com has no box for this game (https://www.nba.com/game/0049700406/box-score redirects to /games, 2026-10-03). Second host: https://www.statmuse.com/nba/ask/bulls-starters-june-14-1998 (lists Harper 29 min 8 pts, Jordan 44/45, Kukoc 42/15, Longley 14/0, Pippen 26/8), read 2026-10-03.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | Second host |
|---|---|---|---|---|
| PG | Ron Harper | harpero01 | 28:34, 8, 3, 3 | statmuse starters list |
| SG | Michael Jordan | jordami01 | 43:41, 45, 1, 1 | statmuse starters list |
| SF | Scottie Pippen | pippesc01 | 25:43, 8, 3, 4 | statmuse starters list |
| PF | Toni Kukoc | kukocto01 | 42:06, 15, 3, 4 | statmuse starters list |
| C | Luc Longley | longllu01 | 14:34, 0, 2, 0 | statmuse starters list |

| Blank | Nationality in file | bref birthplace | nba.com COUNTRY |
|---|---|---|---|
| Toni Kukoc | Croatia | Split, Croatia | Croatia |
| Ron Harper | USA | Dayton, Ohio, United States | no nba.com id reachable |
| Luc Longley | Australia | Melbourne, Australia | no nba.com id reachable |

### finals-1998-g6-uta: Utah Jazz, 1998 NBA Finals Game 6 (existing sheet, second host added)

- Source A: https://www.basketball-reference.com/boxscores/199806140UTA.html (Starters block, 2026-10-03). June 14, 1998, Delta Center, Salt Lake City, Utah. First man off the bench: Antoine Carr.
- Source B: nba.com has no box for this game (https://www.nba.com/game/0049700406/box-score redirects to /games, 2026-10-03). Second host: https://www.statmuse.com/nba/ask/jazz-starters-june-14-1998 (lists Hornacek 37 min 17 pts, Keefe 14/2, Malone 43/31, Russell 37/7, Stockton 33/10), read 2026-10-03.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | Second host |
|---|---|---|---|---|
| PG | John Stockton | stockjo01 | 32:44, 10, 3, 5 | statmuse starters list |
| SG | Jeff Hornacek | hornaje01 | 36:53, 17, 6, 0 | statmuse starters list |
| SF | Bryon Russell | russebr01 | 37:28, 7, 4, 2 | statmuse starters list |
| PF | Karl Malone | malonka01 | 42:56, 31, 11, 7 | statmuse starters list |
| C | Adam Keefe | keefead01 | 14:12, 2, 1, 0 | statmuse starters list |

| Blank | Nationality in file | bref birthplace | nba.com COUNTRY |
|---|---|---|---|
| Adam Keefe | USA | Irvine, California, United States | no nba.com id reachable |
| Jeff Hornacek | USA | Elmhurst, Illinois, United States | no nba.com id reachable |
| Bryon Russell | USA | San Bernardino, California, United States | no nba.com id reachable |

### finals-2023-g5-den: Denver Nuggets, 2023 NBA Finals Game 5 (existing sheet, second host added)

- Source A: https://www.basketball-reference.com/boxscores/202306120DEN.html (Starters block, 2026-10-03). 8:30 PM, June 12, 2023, Ball Arena, Denver, Colorado. First man off the bench: Bruce Brown.
- Source B: https://www.nba.com/game/0042200405/box-score (starters block, first five rows, 2026-10-03). Miami Heat 89 at Denver Nuggets 94.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | Second host |
|---|---|---|---|---|
| PG | Jamal Murray | murraja01 | 41:15, 14, 8, 8 | nba.com 1627750: 41:15, 14, 8, 8 |
| SG | Kentavious Caldwell-Pope | caldwke01 | 34:00, 11, 4, 2 | nba.com 203484: 34:00, 11, 4, 2 |
| SF | Michael Porter Jr. | portemi01 | 33:37, 16, 13, 3 | nba.com 1629008: 33:36, 16, 13, 3 |
| PF | Aaron Gordon | gordoaa01 | 28:39, 4, 7, 1 | nba.com 203932: 28:40, 4, 7, 1 |
| C | Nikola Jokic | jokicni01 | 42:18, 28, 16, 4 | nba.com 203999: 42:18, 28, 16, 4 |

| Blank | Nationality in file | bref birthplace | nba.com COUNTRY |
|---|---|---|---|
| Kentavious Caldwell-Pope | USA | Thomaston, Georgia, United States | USA |
| Aaron Gordon | USA | San Jose, California, United States | USA |
| Michael Porter Jr. | USA | Indianapolis, Indiana, United States | USA |

### finals-2023-g5-mia: Miami Heat, 2023 NBA Finals Game 5 (existing sheet, second host added)

- Source A: https://www.basketball-reference.com/boxscores/202306120DEN.html (Starters block, 2026-10-03). 8:30 PM, June 12, 2023, Ball Arena, Denver, Colorado. First man off the bench: Kyle Lowry.
- Source B: https://www.nba.com/game/0042200405/box-score (starters block, first five rows, 2026-10-03). Miami Heat 89 at Denver Nuggets 94.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | Second host |
|---|---|---|---|---|
| PG | Gabe Vincent | vincega01 | 21:43, 6, 0, 3 | nba.com 1629216: 21:42, 6, 0, 3 |
| SG | Max Strus | strusma01 | 31:36, 12, 8, 1 | nba.com 1629622: 31:36, 12, 8, 1 |
| SF | Jimmy Butler | butleji01 | 41:18, 21, 3, 5 | nba.com 202710: 41:19, 21, 3, 5 |
| PF | Kevin Love | loveke01 | 14:10, 3, 2, 0 | nba.com 201567: 14:10, 3, 2, 0 |
| C | Bam Adebayo | adebaba01 | 44:08, 20, 12, 1 | nba.com 1628389: 44:08, 20, 12, 1 |

| Blank | Nationality in file | bref birthplace | nba.com COUNTRY |
|---|---|---|---|
| Gabe Vincent | USA (was Nigeria, see Corrections 2) | Modesto, California, United States | USA |
| Max Strus | USA | Hickory Hills, Illinois, United States | USA |
| Kevin Love | USA | Santa Monica, California, United States | USA |

### finals-2013-g7-sas: San Antonio Spurs, 2013 NBA Finals Game 7 (existing sheet, second host added)

- Source A: https://www.basketball-reference.com/boxscores/201306200MIA.html (Starters block, 2026-10-03). 9:00 PM, June 20, 2013, AmericanAirlines Arena, Miami, Florida. First man off the bench: Gary Neal.
- Source B: https://www.nba.com/game/0041200407/box-score (starters block, first five rows, 2026-10-03). San Antonio Spurs 88 at Miami Heat 95.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | Second host |
|---|---|---|---|---|
| PG | Tony Parker | parketo01 | 36:33, 10, 0, 4 | nba.com 2225: 36:33, 10, 0, 4 |
| SG | Manu Ginobili | ginobma01 | 35:05, 18, 3, 5 | nba.com 1938: 35:05, 18, 3, 5 |
| SF | Danny Green | greenda02 | 36:27, 5, 5, 0 | nba.com 201980: 36:27, 5, 5, 0 |
| PF | Kawhi Leonard | leonaka01 | 45:00, 19, 16, 0 | nba.com 202695: 45:00, 19, 16, 0 |
| C | Tim Duncan | duncati01 | 43:10, 24, 12, 2 | nba.com 1495: 43:10, 24, 12, 2 |

| Blank | Nationality in file | bref birthplace | nba.com COUNTRY |
|---|---|---|---|
| Manu Ginobili | Argentina | Bahia Blanca, Argentina | Argentina |
| Kawhi Leonard | USA | Los Angeles, California, United States | USA |
| Danny Green | USA | North Babylon, New York, United States | USA |

### finals-2013-g7-mia: Miami Heat, 2013 NBA Finals Game 7 (existing sheet, second host added)

- Source A: https://www.basketball-reference.com/boxscores/201306200MIA.html (Starters block, 2026-10-03). 9:00 PM, June 20, 2013, AmericanAirlines Arena, Miami, Florida. First man off the bench: Shane Battier.
- Source B: https://www.nba.com/game/0041200407/box-score (starters block, first five rows, 2026-10-03). San Antonio Spurs 88 at Miami Heat 95.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | Second host |
|---|---|---|---|---|
| PG | Mario Chalmers | chalmma01 | 40:18, 14, 0, 2 | nba.com 201596: 40:18, 14, 0, 2 |
| SG | Dwyane Wade | wadedw01 | 38:48, 23, 10, 1 | nba.com 2548: 38:48, 23, 10, 1 |
| SF | Mike Miller | millemi01 | 19:18, 0, 2, 0 | nba.com 2034: 19:18, 0, 2, 0 |
| PF | LeBron James | jamesle01 | 45:00, 37, 12, 4 | nba.com 2544: 45:00, 37, 12, 4 |
| C | Chris Bosh | boshch01 | 27:46, 0, 7, 2 | nba.com 2547: 27:46, 0, 7, 2 |

| Blank | Nationality in file | bref birthplace | nba.com COUNTRY |
|---|---|---|---|
| Mike Miller | USA | Mitchell, South Dakota, United States | USA |
| Mario Chalmers | USA | Anchorage, Alaska, United States | USA |
| Chris Bosh | USA | Dallas, Texas, United States | USA |

### finals-2008-g6-lal: Los Angeles Lakers, 2008 NBA Finals Game 6 (existing sheet, second host added)

- Source A: https://www.basketball-reference.com/boxscores/200806170BOS.html (Starters block, 2026-10-03). 9:00 PM, June 17, 2008, TD Banknorth Garden, Boston, Massachusetts. First man off the bench: Jordan Farmar.
- Source B: https://www.nba.com/game/0040700406/box-score (starters block, first five rows, 2026-10-03). Los Angeles Lakers 92 at Boston Celtics 131.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | Second host |
|---|---|---|---|---|
| PG | Derek Fisher | fishede01 | 28:06, 7, 0, 4 | nba.com 965: 28:06, 7, 0, 4 |
| SG | Kobe Bryant | bryanko01 | 42:46, 22, 3, 1 | nba.com 977: 42:46, 22, 3, 1 |
| SF | Vladimir Radmanovic | radmavl01 | 21:30, 6, 3, 0 | nba.com 2209: 21:30, 6, 3, 0 |
| PF | Lamar Odom | odomla01 | 40:25, 14, 10, 5 | nba.com 1885: 40:25, 14, 10, 5 |
| C | Pau Gasol | gasolpa01 | 32:23, 11, 8, 2 | nba.com 2200: 32:23, 11, 8, 2 |

| Blank | Nationality in file | bref birthplace | nba.com COUNTRY |
|---|---|---|---|
| Lamar Odom | USA | Jamaica, New York, United States | USA |
| Pau Gasol | Spain | Barcelona, Spain | Spain |

Vladimir Radmanovic is no longer a blank (Corrections 3): bref birthplace Trebinje, Bosnia and
Herzegovina; nba.com COUNTRY Serbia. He stays on the court as the starter both hosts confirm.

### finals-2008-g6-bos: Boston Celtics, 2008 NBA Finals Game 6 (existing sheet, second host added)

- Source A: https://www.basketball-reference.com/boxscores/200806170BOS.html (Starters block, 2026-10-03). 9:00 PM, June 17, 2008, TD Banknorth Garden, Boston, Massachusetts. First man off the bench: James Posey.
- Source B: https://www.nba.com/game/0040700406/box-score (starters block, first five rows, 2026-10-03). Los Angeles Lakers 92 at Boston Celtics 131.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | Second host |
|---|---|---|---|---|
| PG | Rajon Rondo | rondora01 | 31:52, 21, 7, 8 | nba.com 200765: 31:52, 21, 7, 8 |
| SG | Ray Allen | allenra02 | 32:23, 26, 4, 2 | nba.com 951: 32:23, 26, 4, 2 |
| SF | Paul Pierce | piercpa01 | 38:35, 17, 3, 10 | nba.com 1718: 38:35, 17, 3, 10 |
| PF | Kevin Garnett | garneke01 | 35:39, 26, 14, 4 | nba.com 708: 35:39, 26, 14, 4 |
| C | Kendrick Perkins | perkike01 | 13:25, 2, 4, 0 | nba.com 2570: 13:25, 2, 4, 0 |

| Blank | Nationality in file | bref birthplace | nba.com COUNTRY |
|---|---|---|---|
| Kendrick Perkins | USA | Nederland, Texas, United States | USA |
| Rajon Rondo | USA | Louisville, Kentucky, United States | USA |
| Ray Allen | USA | Merced, California, United States | USA |

### finals-2011-g6-dal: Dallas Mavericks, 2011 NBA Finals Game 6 (existing sheet, second host added)

- Source A: https://www.basketball-reference.com/boxscores/201106120MIA.html (Starters block, 2026-10-03). 8:00 PM, June 12, 2011, AmericanAirlines Arena, Miami, Florida. First man off the bench: Jason Terry.
- Source B: https://www.nba.com/game/0041000406/box-score (starters block, first five rows, 2026-10-03). Dallas Mavericks 105 at Miami Heat 95.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | Second host |
|---|---|---|---|---|
| PG | Jason Kidd | kiddja01 | 36:17, 9, 4, 8 | nba.com 467: 36:17, 9, 4, 8 |
| SG | J.J. Barea | bareajo01 | 29:37, 15, 3, 5 | nba.com 200826: 29:37, 15, 3, 5 |
| SF | Shawn Marion | mariosh01 | 35:22, 12, 8, 1 | nba.com 1890: 35:22, 12, 8, 1 |
| PF | Dirk Nowitzki | nowitdi01 | 38:54, 21, 11, 1 | nba.com 1717: 38:54, 21, 11, 1 |
| C | Tyson Chandler | chandty01 | 30:03, 5, 8, 1 | nba.com 2199: 30:03, 5, 8, 1 |

| Blank | Nationality in file | bref birthplace | nba.com COUNTRY |
|---|---|---|---|
| J.J. Barea | Puerto Rico | Mayaguez, Puerto Rico | Puerto Rico |
| Shawn Marion | USA | Waukegan, Illinois, United States | USA |
| Tyson Chandler | USA | Hanford, California, United States | USA |

### finals-2011-g6-mia: Miami Heat, 2011 NBA Finals Game 6 (existing sheet, second host added)

- Source A: https://www.basketball-reference.com/boxscores/201106120MIA.html (Starters block, 2026-10-03). 8:00 PM, June 12, 2011, AmericanAirlines Arena, Miami, Florida. First man off the bench: Udonis Haslem.
- Source B: https://www.nba.com/game/0041000406/box-score (starters block, first five rows, 2026-10-03). Dallas Mavericks 105 at Miami Heat 95.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | Second host |
|---|---|---|---|---|
| PG | Mario Chalmers | chalmma01 | 38:31, 18, 3, 7 | nba.com 201596: 38:31, 18, 3, 7 |
| SG | Dwyane Wade | wadedw01 | 41:07, 17, 8, 6 | nba.com 2548: 41:07, 17, 8, 6 |
| SF | LeBron James | jamesle01 | 40:21, 21, 4, 6 | nba.com 2544: 40:21, 21, 4, 6 |
| PF | Chris Bosh | boshch01 | 38:52, 19, 8, 0 | nba.com 2547: 38:52, 19, 8, 0 |
| C | Joel Anthony | anthojo01 | 10:55, 0, 3, 0 | nba.com 201202: 10:55, 0, 3, 0 |

| Blank | Nationality in file | bref birthplace | nba.com COUNTRY |
|---|---|---|---|
| Joel Anthony | Canada | Montreal, Quebec, Canada | Canada |
| Mario Chalmers | USA | Anchorage, Alaska, United States | USA |
| Chris Bosh | USA | Dallas, Texas, United States | USA |

### finals-2019-g6-tor: Toronto Raptors, 2019 NBA Finals Game 6 (existing sheet, second host added)

- Source A: https://www.basketball-reference.com/boxscores/201906130GSW.html (Starters block, 2026-10-03). 9:00 PM, June 13, 2019, Oracle Arena, Oakland, California. First man off the bench: Fred VanVleet.
- Source B: https://www.nba.com/game/0041800406/box-score (starters block, first five rows, 2026-10-03). Toronto Raptors 114 at Golden State Warriors 110.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | Second host |
|---|---|---|---|---|
| PG | Kyle Lowry | lowryky01 | 41:42, 26, 7, 10 | nba.com 200768: 41:42, 26, 7, 10 |
| SG | Danny Green | greenda02 | 17:44, 0, 1, 3 | nba.com 201980: 17:44, 0, 1, 3 |
| SF | Kawhi Leonard | leonaka01 | 41:05, 22, 6, 3 | nba.com 202695: 41:05, 22, 6, 3 |
| PF | Pascal Siakam | siakapa01 | 46:10, 26, 10, 3 | nba.com 1627783: 46:10, 26, 10, 3 |
| C | Marc Gasol | gasolma01 | 26:34, 3, 9, 4 | nba.com 201188: 26:34, 3, 9, 4 |

| Blank | Nationality in file | bref birthplace | nba.com COUNTRY |
|---|---|---|---|
| Marc Gasol | Spain | Barcelona, Spain | Spain |
| Danny Green | USA | North Babylon, New York, United States | USA |
| Pascal Siakam | Cameroon | Douala, Cameroon | Cameroon |

### finals-2019-g6-gsw: Golden State Warriors, 2019 NBA Finals Game 6 (existing sheet, second host added)

- Source A: https://www.basketball-reference.com/boxscores/201906130GSW.html (Starters block, 2026-10-03). 9:00 PM, June 13, 2019, Oracle Arena, Oakland, California. First man off the bench: DeMarcus Cousins.
- Source B: https://www.nba.com/game/0041800406/box-score (starters block, first five rows, 2026-10-03). Toronto Raptors 114 at Golden State Warriors 110.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | Second host |
|---|---|---|---|---|
| PG | Stephen Curry | curryst01 | 41:53, 21, 3, 7 | nba.com 201939: 41:53, 21, 3, 7 |
| SG | Klay Thompson | thompkl01 | 31:59, 30, 5, 0 | nba.com 202691: 31:60, 30, 5, 0 |
| SF | Andre Iguodala | iguodan01 | 32:01, 22, 2, 2 | nba.com 2738: 32:01, 22, 2, 2 |
| PF | Draymond Green | greendr01 | 44:12, 11, 19, 13 | nba.com 203110: 44:12, 11, 19, 13 |
| C | Kevon Looney | looneke01 | 26:50, 6, 3, 4 | nba.com 1626172: 26:51, 6, 3, 4 |

| Blank | Nationality in file | bref birthplace | nba.com COUNTRY |
|---|---|---|---|
| Andre Iguodala | USA | Springfield, Illinois, United States | USA |
| Kevon Looney | USA | Milwaukee, Wisconsin, United States | USA |
| Draymond Green | USA | Saginaw, Michigan, United States | USA |

## New sheets

### finals-2010-g7-bos: Boston Celtics, 2010 NBA Finals Game 7

- Game: 2010 NBA Finals Game 7: Celtics vs Lakers, June 17, 2010. bref: 9:00 PM, June 17, 2010, STAPLES Center, Los Angeles, California, score 79-83 (away-home). nba.com: game 0040900407, 2010-06-17, STAPLES Center, Los Angeles, Boston Celtics 79, Los Angeles Lakers 83.
- Source A: https://www.basketball-reference.com/boxscores/201006170LAL.html (Starters block of the basic box, 2026-10-03)
- Source B: https://www.nba.com/game/0040900407/box-score (starters block, the first five rows of the team box, 2026-10-03)
- Shown as: Lakers 83-79 Celtics, STAPLES Center, Los Angeles, 2010-06-17. First man off the bench on bref: Glen Davis.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | nba.com id | nba.com MIN, PTS, REB, AST |
|---|---|---|---|---|---|
| PG | Rajon Rondo | rondora01 | 44:53, 14, 8, 10 | 200765 | 44:53, 14, 8, 10 |
| SG | Ray Allen | allenra02 | 45:16, 13, 2, 2 | 951 | 45:16, 13, 2, 2 |
| SF | Paul Pierce | piercpa01 | 45:35, 18, 10, 2 | 1718 | 45:35, 18, 10, 2 |
| PF | Kevin Garnett | garneke01 | 38:07, 17, 3, 2 | 708 | 38:07, 17, 3, 2 |
| C | Rasheed Wallace | wallara01 | 35:36, 11, 8, 2 | 739 | 35:36, 11, 8, 2 |

| Blank | Nationality shown | bref birthplace | nba.com COUNTRY | Fact shown |
|---|---|---|---|---|
| Rasheed Wallace | USA | Philadelphia, Pennsylvania, United States | USA | Started in Game 7 and put up 11 points and 8 rebounds. |
| Rajon Rondo | USA | Louisville, Kentucky, United States | USA | Finished Game 7 with 14 points, 8 rebounds and 10 assists. |
| Ray Allen | USA | Merced, California, United States | USA | Played 45 minutes of Game 7 and scored 13. |

### finals-2010-g7-lal: Los Angeles Lakers, 2010 NBA Finals Game 7

- Game: 2010 NBA Finals Game 7: Celtics vs Lakers, June 17, 2010. bref: 9:00 PM, June 17, 2010, STAPLES Center, Los Angeles, California, score 79-83 (away-home). nba.com: game 0040900407, 2010-06-17, STAPLES Center, Los Angeles, Los Angeles Lakers 83, Boston Celtics 79.
- Source A: https://www.basketball-reference.com/boxscores/201006170LAL.html (Starters block of the basic box, 2026-10-03)
- Source B: https://www.nba.com/game/0040900407/box-score (starters block, the first five rows of the team box, 2026-10-03)
- Shown as: Lakers 83-79 Celtics, STAPLES Center, Los Angeles, 2010-06-17. First man off the bench on bref: Lamar Odom.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | nba.com id | nba.com MIN, PTS, REB, AST |
|---|---|---|---|---|---|
| PG | Derek Fisher | fishede01 | 30:27, 10, 1, 2 | 965 | 30:27, 10, 1, 2 |
| SG | Kobe Bryant | bryanko01 | 44:51, 23, 15, 2 | 977 | 44:51, 23, 15, 2 |
| SF | Ron Artest (bref: Metta World Peace) | artesro01 | 46:01, 20, 5, 1 | 1897 | 46:01, 20, 5, 1 |
| PF | Pau Gasol | gasolpa01 | 42:12, 19, 18, 4 | 2200 | 42:12, 19, 18, 4 |
| C | Andrew Bynum | bynuman01 | 18:33, 2, 6, 0 | 101115 | 18:33, 2, 6, 0 |

| Blank | Nationality shown | bref birthplace | nba.com COUNTRY | Fact shown |
|---|---|---|---|---|
| Andrew Bynum | USA | Plainsboro, New Jersey, United States | USA | Started Game 7 but played just 19 minutes, scoring 2. |
| Derek Fisher | USA | Little Rock, Arkansas, United States | USA | Scored 10 in the Game 7 win. |
| Pau Gasol | Spain | Barcelona, Spain | Spain | Pulled down 18 rebounds, plus 19 points, in the Game 7 win. |

### finals-2005-g7-det: Detroit Pistons, 2005 NBA Finals Game 7

- Game: 2005 NBA Finals Game 7: Pistons vs Spurs, June 23, 2005. bref: 9:00 PM, June 23, 2005, SBC Center, San Antonio, Texas, score 74-81 (away-home). nba.com: game 0040400407, 2005-06-23, AT&T Center, San Antonio, Detroit Pistons 74, San Antonio Spurs 81.
- Source A: https://www.basketball-reference.com/boxscores/200506230SAS.html (Starters block of the basic box, 2026-10-03)
- Source B: https://www.nba.com/game/0040400407/box-score (starters block, the first five rows of the team box, 2026-10-03)
- Shown as: Spurs 81-74 Pistons, SBC Center, San Antonio, 2005-06-23. First man off the bench on bref: Antonio McDyess.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | nba.com id | nba.com MIN, PTS, REB, AST |
|---|---|---|---|---|---|
| PG | Chauncey Billups | billuch01 | 39:24, 13, 4, 8 | 1497 | 40:00, 13, 4, 8 |
| SG | Richard Hamilton | hamilri01 | 46:38, 15, 8, 1 | 1888 | 46:00, 15, 8, 1 |
| SF | Tayshaun Prince | princta01 | 41:19, 9, 2, 1 | 2419 | 41:00, 9, 2, 1 |
| PF | Rasheed Wallace | wallara01 | 27:22, 11, 1, 1 | 739 | 28:00, 11, 1, 1 |
| C | Ben Wallace | wallabe01 | 37:54, 12, 11, 1 | 1112 | 38:00, 12, 11, 1 |

| Blank | Nationality shown | bref birthplace | nba.com COUNTRY | Fact shown |
|---|---|---|---|---|
| Tayshaun Prince | USA | Compton, California, United States | USA | Started and scored 9 in Game 7. |
| Richard Hamilton | USA | Coatesville, Pennsylvania, United States | USA | Scored 15 with 8 rebounds in Game 7. |
| Chauncey Billups | USA | Denver, Colorado, United States | USA | Had 13 points and 8 assists in Game 7. |

### finals-2005-g7-sas: San Antonio Spurs, 2005 NBA Finals Game 7

- Game: 2005 NBA Finals Game 7: Pistons vs Spurs, June 23, 2005. bref: 9:00 PM, June 23, 2005, SBC Center, San Antonio, Texas, score 74-81 (away-home). nba.com: game 0040400407, 2005-06-23, AT&T Center, San Antonio, San Antonio Spurs 81, Detroit Pistons 74.
- Source A: https://www.basketball-reference.com/boxscores/200506230SAS.html (Starters block of the basic box, 2026-10-03)
- Source B: https://www.nba.com/game/0040400407/box-score (starters block, the first five rows of the team box, 2026-10-03)
- Shown as: Spurs 81-74 Pistons, SBC Center, San Antonio, 2005-06-23. First man off the bench on bref: Robert Horry.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | nba.com id | nba.com MIN, PTS, REB, AST |
|---|---|---|---|---|---|
| PG | Tony Parker | parketo01 | 38:04, 8, 2, 3 | 2225 | 38:00, 8, 2, 3 |
| SG | Manu Ginobili (bref: Manu Ginóbili) | ginobma01 | 35:30, 23, 5, 4 | 1938 | 35:00, 23, 5, 4 |
| SF | Bruce Bowen | bowenbr01 | 40:19, 5, 4, 1 | 1477 | 41:00, 5, 4, 1 |
| PF | Tim Duncan | duncati01 | 41:43, 25, 11, 3 | 1495 | 42:00, 25, 11, 3 |
| C | Nazr Mohammed | mohamna01 | 21:17, 0, 7, 0 | 1737 | 22:00, 0, 7, 0 |

| Blank | Nationality shown | bref birthplace | nba.com COUNTRY | Fact shown |
|---|---|---|---|---|
| Nazr Mohammed | USA | Chicago, Illinois, United States | USA | Started in Game 7 and finished with 0 points and 7 rebounds. |
| Bruce Bowen | USA | Merced, California, United States | USA | Started in Game 7 and scored 5. |
| Manu Ginobili | Argentina | Bahia Blanca, Argentina | Argentina | Scored 23 as a starter in Game 7. |

### finals-2014-g5-mia: Miami Heat, 2014 NBA Finals Game 5

- Game: 2014 NBA Finals Game 5: Heat vs Spurs, June 15, 2014. bref: 8:00 PM, June 15, 2014, AT&T Center, San Antonio, Texas, score 87-104 (away-home). nba.com: game 0041300405, 2014-06-15, AT&T Center, San Antonio, Miami Heat 87, San Antonio Spurs 104.
- Source A: https://www.basketball-reference.com/boxscores/201406150SAS.html (Starters block of the basic box, 2026-10-03)
- Source B: https://www.nba.com/game/0041300405/box-score (starters block, the first five rows of the team box, 2026-10-03)
- Shown as: Spurs 104-87 Heat, AT&T Center, San Antonio, 2014-06-15. First man off the bench on bref: Chris Andersen.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | nba.com id | nba.com MIN, PTS, REB, AST |
|---|---|---|---|---|---|
| PG | Dwyane Wade | wadedw01 | 36:00, 11, 3, 1 | 2548 | 36:00, 11, 3, 1 |
| SG | Ray Allen | allenra02 | 31:20, 5, 5, 2 | 951 | 31:20, 5, 5, 2 |
| SF | LeBron James | jamesle01 | 41:16, 31, 10, 5 | 2544 | 41:16, 31, 10, 5 |
| PF | Rashard Lewis | lewisra02 | 9:00, 3, 2, 1 | 1740 | 9:00, 3, 2, 1 |
| C | Chris Bosh | boshch01 | 38:37, 13, 7, 2 | 2547 | 38:37, 13, 7, 2 |

| Blank | Nationality shown | bref birthplace | nba.com COUNTRY | Fact shown |
|---|---|---|---|---|
| Rashard Lewis | USA | Pineville, Louisiana, United States | USA | Started Game 5 but played only 9 minutes. |
| Ray Allen | USA | Merced, California, United States | USA | Started Game 5 and scored 5. |
| Chris Bosh | USA | Dallas, Texas, United States | USA | Had 13 points and 7 rebounds in Game 5. |

### finals-2014-g5-sas: San Antonio Spurs, 2014 NBA Finals Game 5

- Game: 2014 NBA Finals Game 5: Heat vs Spurs, June 15, 2014. bref: 8:00 PM, June 15, 2014, AT&T Center, San Antonio, Texas, score 87-104 (away-home). nba.com: game 0041300405, 2014-06-15, AT&T Center, San Antonio, San Antonio Spurs 104, Miami Heat 87.
- Source A: https://www.basketball-reference.com/boxscores/201406150SAS.html (Starters block of the basic box, 2026-10-03)
- Source B: https://www.nba.com/game/0041300405/box-score (starters block, the first five rows of the team box, 2026-10-03)
- Shown as: Spurs 104-87 Heat, AT&T Center, San Antonio, 2014-06-15. First man off the bench on bref: Manu Ginóbili.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | nba.com id | nba.com MIN, PTS, REB, AST |
|---|---|---|---|---|---|
| PG | Tony Parker | parketo01 | 36:06, 16, 1, 2 | 2225 | 36:06, 16, 1, 2 |
| SG | Danny Green | greenda02 | 19:07, 0, 2, 2 | 201980 | 19:07, 0, 2, 2 |
| SF | Kawhi Leonard | leonaka01 | 33:59, 22, 10, 2 | 202695 | 33:59, 22, 10, 2 |
| PF | Boris Diaw | diawbo01 | 38:03, 5, 9, 6 | 2564 | 38:03, 5, 9, 6 |
| C | Tim Duncan | duncati01 | 33:24, 14, 8, 2 | 1495 | 33:24, 14, 8, 2 |

| Blank | Nationality shown | bref birthplace | nba.com COUNTRY | Fact shown |
|---|---|---|---|---|
| Boris Diaw | France | Cormeilles-en-Parisis, France | France | Started in Game 5 with 9 rebounds and 6 assists. |
| Danny Green | USA | North Babylon, New York, United States | USA | Started Game 5 and finished with 0 points. |
| Kawhi Leonard | USA | Los Angeles, California, United States | USA | Scored 22 with 10 rebounds in Game 5. |

### finals-2015-g6-gsw: Golden State Warriors, 2015 NBA Finals Game 6

- Game: 2015 NBA Finals Game 6: Warriors vs Cavaliers, June 16, 2015. bref: 9:00 PM, June 16, 2015, Quicken Loans Arena, Cleveland, Ohio, score 105-97 (away-home). nba.com: game 0041400406, 2015-06-16, Quicken Loans Arena, Cleveland, Golden State Warriors 105, Cleveland Cavaliers 97.
- Source A: https://www.basketball-reference.com/boxscores/201506160CLE.html (Starters block of the basic box, 2026-10-03)
- Source B: https://www.nba.com/game/0041400406/box-score (starters block, the first five rows of the team box, 2026-10-03)
- Shown as: Warriors 105-97 Cavaliers, Quicken Loans Arena, Cleveland, 2015-06-16. First man off the bench on bref: Shaun Livingston.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | nba.com id | nba.com MIN, PTS, REB, AST |
|---|---|---|---|---|---|
| PG | Stephen Curry | curryst01 | 43:06, 25, 6, 8 | 201939 | 43:06, 25, 6, 8 |
| SG | Klay Thompson | thompkl01 | 24:40, 5, 5, 2 | 202691 | 24:40, 5, 5, 2 |
| SF | Andre Iguodala | iguodan01 | 36:21, 25, 5, 5 | 2738 | 36:21, 25, 5, 5 |
| PF | Harrison Barnes | barneha02 | 35:27, 9, 2, 2 | 203084 | 35:27, 9, 2, 2 |
| C | Draymond Green | greendr01 | 41:28, 16, 11, 10 | 203110 | 41:28, 16, 11, 10 |

| Blank | Nationality shown | bref birthplace | nba.com COUNTRY | Fact shown |
|---|---|---|---|---|
| Andre Iguodala | USA | Springfield, Illinois, United States | USA | Started Game 6 and scored 25. |
| Harrison Barnes | USA | Ames, Iowa, United States | USA | Started and scored 9 in Game 6. |
| Draymond Green | USA | Saginaw, Michigan, United States | USA | Had a triple-double in Game 6: 16 points, 11 rebounds, 10 assists. |

### finals-2015-g6-cle: Cleveland Cavaliers, 2015 NBA Finals Game 6

- Game: 2015 NBA Finals Game 6: Warriors vs Cavaliers, June 16, 2015. bref: 9:00 PM, June 16, 2015, Quicken Loans Arena, Cleveland, Ohio, score 105-97 (away-home). nba.com: game 0041400406, 2015-06-16, Quicken Loans Arena, Cleveland, Cleveland Cavaliers 97, Golden State Warriors 105.
- Source A: https://www.basketball-reference.com/boxscores/201506160CLE.html (Starters block of the basic box, 2026-10-03)
- Source B: https://www.nba.com/game/0041400406/box-score (starters block, the first five rows of the team box, 2026-10-03)
- Shown as: Warriors 105-97 Cavaliers, Quicken Loans Arena, Cleveland, 2015-06-16. First man off the bench on bref: J.R. Smith.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | nba.com id | nba.com MIN, PTS, REB, AST |
|---|---|---|---|---|---|
| PG | Matthew Dellavedova | dellama01 | 25:20, 1, 4, 2 | 203521 | 25:21, 1, 4, 2 |
| SG | Iman Shumpert | shumpim01 | 35:58, 8, 3, 0 | 202697 | 35:58, 8, 3, 0 |
| SF | LeBron James | jamesle01 | 46:42, 32, 18, 9 | 2544 | 46:42, 32, 18, 9 |
| PF | Tristan Thompson | thomptr01 | 37:27, 15, 13, 0 | 202684 | 37:27, 15, 13, 0 |
| C | Timofey Mozgov | mozgoti01 | 32:31, 17, 12, 2 | 202389 | 32:31, 17, 12, 2 |

| Blank | Nationality shown | bref birthplace | nba.com COUNTRY | Fact shown |
|---|---|---|---|---|
| Matthew Dellavedova | Australia | Maryborough, Australia | Australia | Started in Game 6 and played 25 minutes. |
| Timofey Mozgov | Russia | St. Petersburg, Russia | Russia | Put up 17 points and 12 rebounds as a starter in Game 6. |
| Iman Shumpert | USA | Oak Park, Illinois, United States | USA | Started and scored 8 in Game 6. |

### finals-2020-g6-lal: Los Angeles Lakers, 2020 NBA Finals Game 6

- Game: 2020 NBA Finals Game 6: Lakers vs Heat, October 11, 2020. bref: 7:30 PM, October 11, 2020, The Arena, Bay Lake, Florida, score 106-93 (away-home). nba.com: game 0041900406, 2020-10-11, AdventHealth Arena, Orlando, Los Angeles Lakers 106, Miami Heat 93.
- Source A: https://www.basketball-reference.com/boxscores/202010110MIA.html (Starters block of the basic box, 2026-10-03)
- Source B: https://www.nba.com/game/0041900406/box-score (starters block, the first five rows of the team box, 2026-10-03)
- Shown as: Lakers 106-93 Heat, AdventHealth Arena, Florida, 2020-10-11. First man off the bench on bref: Rajon Rondo.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | nba.com id | nba.com MIN, PTS, REB, AST |
|---|---|---|---|---|---|
| PG | Alex Caruso | carusal01 | 32:42, 4, 3, 5 | 1627936 | 32:42, 4, 3, 5 |
| SG | Kentavious Caldwell-Pope | caldwke01 | 33:26, 17, 2, 0 | 203484 | 33:26, 17, 2, 0 |
| SF | Danny Green | greenda02 | 24:34, 11, 5, 1 | 201980 | 24:34, 11, 5, 1 |
| PF | LeBron James | jamesle01 | 41:13, 28, 14, 10 | 2544 | 41:13, 28, 14, 10 |
| C | Anthony Davis | davisan02 | 35:06, 19, 15, 3 | 203076 | 35:06, 19, 15, 3 |

| Blank | Nationality shown | bref birthplace | nba.com COUNTRY | Fact shown |
|---|---|---|---|---|
| Alex Caruso | USA | College Station, Texas, United States | USA | Started Game 6 and played 33 minutes. |
| Danny Green | USA | North Babylon, New York, United States | USA | Started Game 6 and scored 11. |
| Kentavious Caldwell-Pope | USA | Thomaston, Georgia, United States | USA | Scored 17 as a starter in Game 6. |

### finals-2020-g6-mia: Miami Heat, 2020 NBA Finals Game 6

- Game: 2020 NBA Finals Game 6: Lakers vs Heat, October 11, 2020. bref: 7:30 PM, October 11, 2020, The Arena, Bay Lake, Florida, score 106-93 (away-home). nba.com: game 0041900406, 2020-10-11, AdventHealth Arena, Orlando, Miami Heat 93, Los Angeles Lakers 106.
- Source A: https://www.basketball-reference.com/boxscores/202010110MIA.html (Starters block of the basic box, 2026-10-03)
- Source B: https://www.nba.com/game/0041900406/box-score (starters block, the first five rows of the team box, 2026-10-03)
- Shown as: Lakers 106-93 Heat, AdventHealth Arena, Florida, 2020-10-11. First man off the bench on bref: Goran Dragić.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | nba.com id | nba.com MIN, PTS, REB, AST |
|---|---|---|---|---|---|
| PG | Tyler Herro | herroty01 | 30:22, 7, 3, 4 | 1629639 | 30:22, 7, 3, 4 |
| SG | Duncan Robinson | robindu01 | 34:11, 10, 1, 3 | 1629130 | 34:10, 10, 1, 3 |
| SF | Jimmy Butler (nba.com: Jimmy Butler III) | butleji01 | 44:32, 12, 7, 8 | 202710 | 44:32, 12, 7, 8 |
| PF | Jae Crowder | crowdja01 | 27:40, 12, 4, 1 | 203109 | 27:40, 12, 4, 1 |
| C | Bam Adebayo | adebaba01 | 42:13, 25, 10, 5 | 1628389 | 42:13, 25, 10, 5 |

| Blank | Nationality shown | bref birthplace | nba.com COUNTRY | Fact shown |
|---|---|---|---|---|
| Tyler Herro | USA | Milwaukee, Wisconsin, United States | USA | Started Game 6 and scored 7. |
| Duncan Robinson | USA | York, Maine, United States | USA | Started Game 6 and scored 10. |
| Jae Crowder | USA | Villa Rica, Georgia, United States | USA | Scored 12 as a starter in Game 6. |

### finals-2021-g6-phx: Phoenix Suns, 2021 NBA Finals Game 6

- Game: 2021 NBA Finals Game 6: Suns vs Bucks, July 20, 2021. bref: 9:00 PM, July 20, 2021, Fiserv Forum, Milwaukee, Wisconsin, score 98-105 (away-home). nba.com: game 0042000406, 2021-07-20, Fiserv Forum, Milwaukee, Phoenix Suns 98, Milwaukee Bucks 105.
- Source A: https://www.basketball-reference.com/boxscores/202107200MIL.html (Starters block of the basic box, 2026-10-03)
- Source B: https://www.nba.com/game/0042000406/box-score (starters block, the first five rows of the team box, 2026-10-03)
- Shown as: Bucks 105-98 Suns, Fiserv Forum, Milwaukee, 2021-07-20. First man off the bench on bref: Cameron Johnson.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | nba.com id | nba.com MIN, PTS, REB, AST |
|---|---|---|---|---|---|
| PG | Chris Paul | paulch01 | 39:13, 26, 2, 5 | 101108 | 39:13, 26, 2, 5 |
| SG | Devin Booker | bookede01 | 46:15, 19, 3, 5 | 1626164 | 46:15, 19, 3, 5 |
| SF | Mikal Bridges | bridgmi01 | 39:28, 7, 6, 2 | 1628969 | 39:28, 7, 6, 2 |
| PF | Jae Crowder | crowdja01 | 40:33, 15, 13, 0 | 203109 | 40:33, 15, 13, 0 |
| C | Deandre Ayton | aytonde01 | 36:12, 12, 6, 1 | 1629028 | 36:12, 12, 6, 1 |

| Blank | Nationality shown | bref birthplace | nba.com COUNTRY | Fact shown |
|---|---|---|---|---|
| Jae Crowder | USA | Villa Rica, Georgia, United States | USA | Had 15 points and 13 rebounds in Game 6. |
| Mikal Bridges | USA | Philadelphia, Pennsylvania, United States | USA | Started and scored 7 in Game 6. |
| Deandre Ayton | Bahamas | Nassau, Bahamas | Bahamas | Started and scored 12 in Game 6. |

### finals-2021-g6-mil: Milwaukee Bucks, 2021 NBA Finals Game 6

- Game: 2021 NBA Finals Game 6: Suns vs Bucks, July 20, 2021. bref: 9:00 PM, July 20, 2021, Fiserv Forum, Milwaukee, Wisconsin, score 98-105 (away-home). nba.com: game 0042000406, 2021-07-20, Fiserv Forum, Milwaukee, Milwaukee Bucks 105, Phoenix Suns 98.
- Source A: https://www.basketball-reference.com/boxscores/202107200MIL.html (Starters block of the basic box, 2026-10-03)
- Source B: https://www.nba.com/game/0042000406/box-score (starters block, the first five rows of the team box, 2026-10-03)
- Shown as: Bucks 105-98 Suns, Fiserv Forum, Milwaukee, 2021-07-20. First man off the bench on bref: Pat Connaughton.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | nba.com id | nba.com MIN, PTS, REB, AST |
|---|---|---|---|---|---|
| PG | Jrue Holiday | holidjr01 | 46:17, 12, 9, 11 | 201950 | 46:17, 12, 9, 11 |
| SG | Khris Middleton | middlkh01 | 40:38, 17, 5, 5 | 203114 | 40:38, 17, 5, 5 |
| SF | P.J. Tucker | tuckepj01 | 36:27, 0, 6, 1 | 200782 | 36:27, 0, 6, 1 |
| PF | Giannis Antetokounmpo | antetgi01 | 42:27, 50, 14, 2 | 203507 | 42:27, 50, 14, 2 |
| C | Brook Lopez | lopezbr01 | 26:45, 10, 8, 0 | 201572 | 26:45, 10, 8, 0 |

| Blank | Nationality shown | bref birthplace | nba.com COUNTRY | Fact shown |
|---|---|---|---|---|
| P.J. Tucker | USA | Raleigh, North Carolina, United States | USA | Played 36 minutes in Game 6 and finished with 0 points. |
| Brook Lopez | USA | North Hollywood, California, United States | USA | Started and scored 10 in Game 6. |
| Khris Middleton | USA | Charleston, South Carolina, United States | USA | Scored 17 in Game 6. |

### finals-2022-g6-gsw: Golden State Warriors, 2022 NBA Finals Game 6

- Game: 2022 NBA Finals Game 6: Warriors vs Celtics, June 16, 2022. bref: 9:00 PM, June 16, 2022, TD Garden, Boston, Massachusetts, score 103-90 (away-home). nba.com: game 0042100406, 2022-06-16, TD Garden, Boston, Golden State Warriors 103, Boston Celtics 90.
- Source A: https://www.basketball-reference.com/boxscores/202206160BOS.html (Starters block of the basic box, 2026-10-03)
- Source B: https://www.nba.com/game/0042100406/box-score (starters block, the first five rows of the team box, 2026-10-03)
- Shown as: Warriors 103-90 Celtics, TD Garden, Boston, 2022-06-16. First man off the bench on bref: Kevon Looney.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | nba.com id | nba.com MIN, PTS, REB, AST |
|---|---|---|---|---|---|
| PG | Stephen Curry | curryst01 | 39:56, 34, 7, 7 | 201939 | 39:55, 34, 7, 7 |
| SG | Klay Thompson | thompkl01 | 41:19, 12, 5, 2 | 202691 | 41:18, 12, 5, 2 |
| SF | Andrew Wiggins | wiggian01 | 43:41, 18, 6, 5 | 203952 | 43:41, 18, 6, 5 |
| PF | Otto Porter Jr. | porteot01 | 13:02, 6, 1, 0 | 203490 | 13:03, 6, 1, 0 |
| C | Draymond Green | greendr01 | 41:49, 12, 12, 8 | 203110 | 41:49, 12, 12, 8 |

| Blank | Nationality shown | bref birthplace | nba.com COUNTRY | Fact shown |
|---|---|---|---|---|
| Andrew Wiggins | Canada | Toronto, Ontario, Canada | Canada | Played 44 minutes in Game 6 and scored 18. |
| Klay Thompson | USA | Los Angeles, California, United States | USA | Scored 12 in Game 6. |
| Draymond Green | USA | Saginaw, Michigan, United States | USA | Had 12 points, 12 rebounds and 8 assists in Game 6. |

### finals-2022-g6-bos: Boston Celtics, 2022 NBA Finals Game 6

- Game: 2022 NBA Finals Game 6: Warriors vs Celtics, June 16, 2022. bref: 9:00 PM, June 16, 2022, TD Garden, Boston, Massachusetts, score 103-90 (away-home). nba.com: game 0042100406, 2022-06-16, TD Garden, Boston, Boston Celtics 90, Golden State Warriors 103.
- Source A: https://www.basketball-reference.com/boxscores/202206160BOS.html (Starters block of the basic box, 2026-10-03)
- Source B: https://www.nba.com/game/0042100406/box-score (starters block, the first five rows of the team box, 2026-10-03)
- Shown as: Warriors 103-90 Celtics, TD Garden, Boston, 2022-06-16. First man off the bench on bref: Derrick White.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | nba.com id | nba.com MIN, PTS, REB, AST |
|---|---|---|---|---|---|
| PG | Marcus Smart | smartma01 | 38:29, 9, 6, 9 | 203935 | 38:29, 9, 6, 9 |
| SG | Jaylen Brown | brownja02 | 44:00, 34, 7, 3 | 1627759 | 44:00, 34, 7, 3 |
| SF | Jayson Tatum | tatumja01 | 40:13, 13, 3, 7 | 1628369 | 40:13, 13, 3, 7 |
| PF | Al Horford | horfoal01 | 39:13, 19, 14, 2 | 201143 | 39:13, 19, 14, 2 |
| C | Robert Williams III (bref: Robert Williams) | williro04 | 32:37, 10, 7, 2 | 1629057 | 32:37, 10, 7, 2 |

| Blank | Nationality shown | bref birthplace | nba.com COUNTRY | Fact shown |
|---|---|---|---|---|
| Al Horford | Dominican Republic | Puerto Plata, Dominican Republic | Dominican Republic | Had 19 points and 14 rebounds in Game 6. |
| Marcus Smart | USA | Flower Mound, Texas, United States | USA | Had 9 points and 9 assists in Game 6. |
| Jaylen Brown | USA | Marietta, Georgia, United States | USA | Scored 34 in Game 6. |

### finals-2024-g5-dal: Dallas Mavericks, 2024 NBA Finals Game 5

- Game: 2024 NBA Finals Game 5: Mavericks vs Celtics, June 17, 2024. bref: 8:30 PM, June 17, 2024, TD Garden, Boston, Massachusetts, score 88-106 (away-home). nba.com: game 0042300405, 2024-06-17, TD Garden, Boston, Dallas Mavericks 88, Boston Celtics 106.
- Source A: https://www.basketball-reference.com/boxscores/202406170BOS.html (Starters block of the basic box, 2026-10-03)
- Source B: https://www.nba.com/game/0042300405/box-score (starters block, the first five rows of the team box, 2026-10-03)
- Shown as: Celtics 106-88 Mavericks, TD Garden, Boston, 2024-06-17. First man off the bench on bref: Dereck Lively II.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | nba.com id | nba.com MIN, PTS, REB, AST |
|---|---|---|---|---|---|
| PG | Luka Doncic (bref: Luka Dončić) | doncilu01 | 43:23, 28, 12, 5 | 1629029 | 43:23, 28, 12, 5 |
| SG | Kyrie Irving | irvinky01 | 41:07, 15, 3, 9 | 202681 | 41:07, 15, 3, 9 |
| SF | Derrick Jones Jr. | jonesde02 | 22:20, 10, 0, 0 | 1627884 | 22:20, 10, 0, 0 |
| PF | P.J. Washington | washipj01 | 34:29, 4, 6, 3 | 1629023 | 34:29, 4, 6, 3 |
| C | Daniel Gafford | gaffoda01 | 10:54, 6, 3, 0 | 1629655 | 10:54, 6, 3, 0 |

| Blank | Nationality shown | bref birthplace | nba.com COUNTRY | Fact shown |
|---|---|---|---|---|
| Daniel Gafford | USA | El Dorado, Arkansas, United States | USA | Started in Game 5 but played only 11 minutes. |
| P.J. Washington | USA | Louisville, Kentucky, United States | USA | Started in Game 5 and scored 4. |
| Luka Doncic | Slovenia | Ljubljana, Slovenia | Slovenia | Had 28 points and 12 rebounds in Game 5. |

### finals-2024-g5-bos: Boston Celtics, 2024 NBA Finals Game 5

- Game: 2024 NBA Finals Game 5: Mavericks vs Celtics, June 17, 2024. bref: 8:30 PM, June 17, 2024, TD Garden, Boston, Massachusetts, score 88-106 (away-home). nba.com: game 0042300405, 2024-06-17, TD Garden, Boston, Boston Celtics 106, Dallas Mavericks 88.
- Source A: https://www.basketball-reference.com/boxscores/202406170BOS.html (Starters block of the basic box, 2026-10-03)
- Source B: https://www.nba.com/game/0042300405/box-score (starters block, the first five rows of the team box, 2026-10-03)
- Shown as: Celtics 106-88 Mavericks, TD Garden, Boston, 2024-06-17. First man off the bench on bref: Sam Hauser.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | nba.com id | nba.com MIN, PTS, REB, AST |
|---|---|---|---|---|---|
| PG | Jrue Holiday | holidjr01 | 43:09, 15, 11, 4 | 201950 | 43:08, 15, 11, 4 |
| SG | Derrick White | whitede01 | 38:09, 14, 8, 1 | 1628401 | 38:08, 14, 8, 1 |
| SF | Jaylen Brown | brownja02 | 44:15, 21, 8, 6 | 1627759 | 44:15, 21, 8, 6 |
| PF | Jayson Tatum | tatumja01 | 44:57, 31, 8, 11 | 1628369 | 44:57, 31, 8, 11 |
| C | Al Horford | horfoal01 | 31:35, 9, 9, 2 | 201143 | 31:35, 9, 9, 2 |

| Blank | Nationality shown | bref birthplace | nba.com COUNTRY | Fact shown |
|---|---|---|---|---|
| Al Horford | Dominican Republic | Puerto Plata, Dominican Republic | Dominican Republic | Started Game 5 and grabbed 9 rebounds. |
| Derrick White | USA | Parker, Colorado, United States | USA | Scored 14 in Game 5. |
| Jrue Holiday | USA | Chatsworth, California, United States | USA | Had 15 points and 11 rebounds in Game 5. |

### finals-2025-g7-ind: Indiana Pacers, 2025 NBA Finals Game 7

- Game: 2025 NBA Finals Game 7: Pacers vs Thunder, June 22, 2025. bref: 8:00 PM, June 22, 2025, Paycom Center, Oklahoma City, Oklahoma, score 91-103 (away-home). nba.com: game 0042400407, 2025-06-22, Paycom Center, Oklahoma City, Indiana Pacers 91, Oklahoma City Thunder 103.
- Source A: https://www.basketball-reference.com/boxscores/202506220OKC.html (Starters block of the basic box, 2026-10-03)
- Source B: https://www.nba.com/game/0042400407/box-score (starters block, the first five rows of the team box, 2026-10-03)
- Shown as: Thunder 103-91 Pacers, Paycom Center, Oklahoma City, 2025-06-22. First man off the bench on bref: Bennedict Mathurin.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | nba.com id | nba.com MIN, PTS, REB, AST |
|---|---|---|---|---|---|
| PG | Tyrese Haliburton | halibty01 | 7:05, 9, 0, 0 | 1630169 | 7:05, 9, 0, 0 |
| SG | Andrew Nembhard | nembhan01 | 36:41, 15, 5, 6 | 1629614 | 36:41, 15, 5, 6 |
| SF | Aaron Nesmith | nesmiaa01 | 30:27, 3, 6, 1 | 1630174 | 30:28, 3, 6, 1 |
| PF | Pascal Siakam | siakapa01 | 36:55, 16, 4, 2 | 1627783 | 36:55, 16, 4, 2 |
| C | Myles Turner | turnemy01 | 23:49, 6, 4, 1 | 1626167 | 23:49, 6, 4, 1 |

| Blank | Nationality shown | bref birthplace | nba.com COUNTRY | Fact shown |
|---|---|---|---|---|
| Andrew Nembhard | Canada | Aurora, Ontario, Canada | Canada | Scored 15 as a starter in Game 7. |
| Aaron Nesmith | USA | Charleston, South Carolina, United States | USA | Started Game 7 and pulled down 6 rebounds. |
| Myles Turner | USA | Bedford, Texas, United States | USA | Started in Game 7 and scored 6. |

### finals-2025-g7-okc: Oklahoma City Thunder, 2025 NBA Finals Game 7

- Game: 2025 NBA Finals Game 7: Pacers vs Thunder, June 22, 2025. bref: 8:00 PM, June 22, 2025, Paycom Center, Oklahoma City, Oklahoma, score 91-103 (away-home). nba.com: game 0042400407, 2025-06-22, Paycom Center, Oklahoma City, Oklahoma City Thunder 103, Indiana Pacers 91.
- Source A: https://www.basketball-reference.com/boxscores/202506220OKC.html (Starters block of the basic box, 2026-10-03)
- Source B: https://www.nba.com/game/0042400407/box-score (starters block, the first five rows of the team box, 2026-10-03)
- Shown as: Thunder 103-91 Pacers, Paycom Center, Oklahoma City, 2025-06-22. First man off the bench on bref: Alex Caruso.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | nba.com id | nba.com MIN, PTS, REB, AST |
|---|---|---|---|---|---|
| PG | Shai Gilgeous-Alexander | gilgesh01 | 40:11, 29, 5, 12 | 1628983 | 40:11, 29, 5, 12 |
| SG | Luguentz Dort | dortlu01 | 35:13, 9, 7, 0 | 1629652 | 35:13, 9, 7, 0 |
| SF | Jalen Williams | willija06 | 38:13, 20, 4, 4 | 1631114 | 38:12, 20, 4, 4 |
| PF | Chet Holmgren | holmgch01 | 31:17, 18, 8, 0 | 1631096 | 31:17, 18, 8, 0 |
| C | Isaiah Hartenstein | harteis01 | 18:13, 7, 9, 4 | 1628392 | 18:13, 7, 9, 4 |

| Blank | Nationality shown | bref birthplace | nba.com COUNTRY | Fact shown |
|---|---|---|---|---|
| Luguentz Dort | Canada | Montreal, Quebec, Canada | Canada | Started Game 7 and grabbed 7 rebounds. |
| Jalen Williams | USA | Denver, Colorado, United States | USA | Scored 20 in Game 7. |
| Chet Holmgren | USA | Minneapolis, Minnesota, United States | USA | Had 18 points and 8 rebounds in Game 7. |

### finals-2009-g5-lal: Los Angeles Lakers, 2009 NBA Finals Game 5

- Game: 2009 NBA Finals Game 5: Lakers vs Magic, June 14, 2009. bref: 8:00 PM, June 14, 2009, Amway Arena, Orlando, Florida, score 99-86 (away-home). nba.com: game 0040800405, 2009-06-14, Amway Arena, Orlando, Los Angeles Lakers 99, Orlando Magic 86.
- Source A: https://www.basketball-reference.com/boxscores/200906140ORL.html (Starters block of the basic box, 2026-10-03)
- Source B: https://www.nba.com/game/0040800405/box-score (starters block, the first five rows of the team box, 2026-10-03)
- Shown as: Lakers 99-86 Magic, Amway Arena, Orlando, 2009-06-14. First man off the bench on bref: Lamar Odom.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | nba.com id | nba.com MIN, PTS, REB, AST |
|---|---|---|---|---|---|
| PG | Derek Fisher | fishede01 | 31:59, 13, 4, 2 | 965 | 31:59, 13, 4, 2 |
| SG | Kobe Bryant | bryanko01 | 43:18, 30, 6, 5 | 977 | 43:18, 30, 6, 5 |
| SF | Trevor Ariza | arizatr01 | 41:29, 15, 5, 1 | 2772 | 41:29, 15, 5, 1 |
| PF | Pau Gasol | gasolpa01 | 42:09, 14, 15, 3 | 2200 | 42:09, 14, 15, 3 |
| C | Andrew Bynum | bynuman01 | 16:54, 6, 5, 0 | 101115 | 16:54, 6, 5, 0 |

| Blank | Nationality shown | bref birthplace | nba.com COUNTRY | Fact shown |
|---|---|---|---|---|
| Trevor Ariza | USA | Miami, Florida, United States | USA | Started in Game 5 and scored 15. |
| Andrew Bynum | USA | Plainsboro, New Jersey, United States | USA | Started but played only 17 minutes in Game 5. |
| Derek Fisher | USA | Little Rock, Arkansas, United States | USA | Scored 13 in Game 5. |

### finals-2009-g5-orl: Orlando Magic, 2009 NBA Finals Game 5

- Game: 2009 NBA Finals Game 5: Lakers vs Magic, June 14, 2009. bref: 8:00 PM, June 14, 2009, Amway Arena, Orlando, Florida, score 99-86 (away-home). nba.com: game 0040800405, 2009-06-14, Amway Arena, Orlando, Orlando Magic 86, Los Angeles Lakers 99.
- Source A: https://www.basketball-reference.com/boxscores/200906140ORL.html (Starters block of the basic box, 2026-10-03)
- Source B: https://www.nba.com/game/0040800405/box-score (starters block, the first five rows of the team box, 2026-10-03)
- Shown as: Lakers 99-86 Magic, Amway Arena, Orlando, 2009-06-14. First man off the bench on bref: Mickaël Piétrus.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | nba.com id | nba.com MIN, PTS, REB, AST |
|---|---|---|---|---|---|
| PG | Rafer Alston | alstora01 | 33:00, 12, 5, 3 | 1747 | 33:00, 12, 5, 3 |
| SG | Courtney Lee | leeco01 | 26:19, 12, 4, 1 | 201584 | 26:19, 12, 4, 1 |
| SF | Hedo Turkoglu (bref: Hedo Türkoğlu) | turkohe01 | 42:05, 12, 2, 3 | 2045 | 42:05, 12, 2, 3 |
| PF | Rashard Lewis | lewisra02 | 44:32, 18, 10, 4 | 1740 | 44:32, 18, 10, 4 |
| C | Dwight Howard | howardw01 | 39:12, 11, 10, 1 | 2730 | 39:12, 11, 10, 1 |

| Blank | Nationality shown | bref birthplace | nba.com COUNTRY | Fact shown |
|---|---|---|---|---|
| Rafer Alston | USA | New York, New York, United States | USA | Started in Game 5 and scored 12. |
| Courtney Lee | USA | Indianapolis, Indiana, United States | USA | Started Game 5 and scored 12. |
| Hedo Turkoglu | Turkey | Istanbul, Turkey | Turkey | Scored 12 in Game 5. |

### finals-2004-g5-lal: Los Angeles Lakers, 2004 NBA Finals Game 5

- Game: 2004 NBA Finals Game 5: Lakers vs Pistons, June 15, 2004. bref: 9:00 PM, June 15, 2004, The Palace of Auburn Hills, Auburn Hills, Michigan, score 87-100 (away-home). nba.com: game 0040300405, 2004-06-15, Palace of Auburn Hills, Detroit, Los Angeles Lakers 87, Detroit Pistons 100.
- Source A: https://www.basketball-reference.com/boxscores/200406150DET.html (Starters block of the basic box, 2026-10-03)
- Source B: https://www.nba.com/game/0040300405/box-score (starters block, the first five rows of the team box, 2026-10-03)
- Shown as: Pistons 100-87 Lakers, The Palace of Auburn Hills, Auburn Hills, 2004-06-15. First man off the bench on bref: Kareem Rush.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | nba.com id | nba.com MIN, PTS, REB, AST |
|---|---|---|---|---|---|
| PG | Gary Payton | paytoga01 | 30:47, 2, 4, 4 | 56 | 31:00, 2, 4, 4 |
| SG | Kobe Bryant | bryanko01 | 45:34, 24, 3, 4 | 977 | 45:00, 24, 3, 4 |
| SF | Devean George | georgde01 | 20:22, 4, 3, 2 | 1904 | 20:00, 4, 3, 2 |
| PF | Slava Medvedenko (bref: Stanislav Medvedenko) | medvest01 | 23:25, 10, 5, 1 | 2098 | 23:00, 10, 5, 1 |
| C | Shaquille O'Neal | onealsh01 | 35:33, 20, 8, 1 | 406 | 35:00, 20, 8, 1 |

| Blank | Nationality shown | bref birthplace | nba.com COUNTRY | Fact shown |
|---|---|---|---|---|
| Slava Medvedenko | Ukraine | Karapyshi, Ukraine | Ukraine | Started in Game 5 and scored 10. |
| Devean George | USA | Minneapolis, Minnesota, United States | USA | Started in Game 5 and scored 4. |
| Gary Payton | USA | Oakland, California, United States | USA | Started in Game 5 and scored 2. |

### finals-2006-g6-mia: Miami Heat, 2006 NBA Finals Game 6

- Game: 2006 NBA Finals Game 6: Heat vs Mavericks, June 20, 2006. bref: 9:00 PM, June 20, 2006, American Airlines Center, Dallas, Texas, score 95-92 (away-home). nba.com: game 0040500406, 2006-06-20, American Airlines Center, Dallas, Miami Heat 95, Dallas Mavericks 92.
- Source A: https://www.basketball-reference.com/boxscores/200606200DAL.html (Starters block of the basic box, 2026-10-03)
- Source B: https://www.nba.com/game/0040500406/box-score (starters block, the first five rows of the team box, 2026-10-03)
- Shown as: Heat 95-92 Mavericks, American Airlines Center, Dallas, 2006-06-20. First man off the bench on bref: James Posey.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | nba.com id | nba.com MIN, PTS, REB, AST |
|---|---|---|---|---|---|
| PG | Jason Williams | willija02 | 30:27, 3, 1, 7 | 1715 | 30:27, 3, 1, 7 |
| SG | Dwyane Wade | wadedw01 | 45:24, 36, 10, 5 | 2548 | 45:24, 36, 10, 5 |
| SF | Antoine Walker | walkean02 | 33:30, 14, 11, 2 | 952 | 33:30, 14, 11, 2 |
| PF | Udonis Haslem | hasleud01 | 40:30, 17, 10, 1 | 2617 | 40:30, 17, 10, 1 |
| C | Shaquille O'Neal | onealsh01 | 30:19, 9, 12, 1 | 406 | 30:19, 9, 12, 1 |

| Blank | Nationality shown | bref birthplace | nba.com COUNTRY | Fact shown |
|---|---|---|---|---|
| Jason Williams | USA | Belle, West Virginia, United States | USA | Started in Game 6 with 7 assists. |
| Antoine Walker | USA | Chicago, Illinois, United States | USA | Had 14 points and 11 rebounds in Game 6. |
| Udonis Haslem | USA | Miami, Florida, United States | USA | Had 17 points and 10 rebounds in Game 6. |

### finals-2006-g6-dal: Dallas Mavericks, 2006 NBA Finals Game 6

- Game: 2006 NBA Finals Game 6: Heat vs Mavericks, June 20, 2006. bref: 9:00 PM, June 20, 2006, American Airlines Center, Dallas, Texas, score 95-92 (away-home). nba.com: game 0040500406, 2006-06-20, American Airlines Center, Dallas, Dallas Mavericks 92, Miami Heat 95.
- Source A: https://www.basketball-reference.com/boxscores/200606200DAL.html (Starters block of the basic box, 2026-10-03)
- Source B: https://www.nba.com/game/0040500406/box-score (starters block, the first five rows of the team box, 2026-10-03)
- Shown as: Heat 95-92 Mavericks, American Airlines Center, Dallas, 2006-06-20. First man off the bench on bref: Jerry Stackhouse.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | nba.com id | nba.com MIN, PTS, REB, AST |
|---|---|---|---|---|---|
| PG | Devin Harris | harride01 | 25:53, 6, 3, 4 | 2734 | 25:53, 6, 3, 4 |
| SG | Jason Terry | terryja01 | 43:00, 16, 1, 5 | 1891 | 43:00, 16, 1, 5 |
| SF | Josh Howard | howarjo01 | 30:16, 14, 12, 0 | 2572 | 30:16, 14, 12, 0 |
| PF | Dirk Nowitzki | nowitdi01 | 47:02, 29, 15, 2 | 1717 | 47:02, 29, 15, 2 |
| C | DeSagana Diop | diopde01 | 16:05, 2, 4, 1 | 2205 | 16:05, 2, 4, 1 |

| Blank | Nationality shown | bref birthplace | nba.com COUNTRY | Fact shown |
|---|---|---|---|---|
| DeSagana Diop | Senegal | Dakar, Senegal | Senegal | Started in Game 6 and played 16 minutes. |
| Devin Harris | USA | Milwaukee, Wisconsin, United States | USA | Started Game 6 and scored 6. |
| Josh Howard | USA | Winston-Salem, North Carolina, United States | USA | Had 14 points and 12 rebounds in Game 6. |

### finals-2012-g5-okc: Oklahoma City Thunder, 2012 NBA Finals Game 5

- Game: 2012 NBA Finals Game 5: Thunder vs Heat, June 21, 2012. bref: 9:00 PM, June 21, 2012, AmericanAirlines Arena, Miami, Florida, score 106-121 (away-home). nba.com: game 0041100405, 2012-06-21, AmericanAirlines Arena, Miami, Oklahoma City Thunder 106, Miami Heat 121.
- Source A: https://www.basketball-reference.com/boxscores/201206210MIA.html (Starters block of the basic box, 2026-10-03)
- Source B: https://www.nba.com/game/0041100405/box-score (starters block, the first five rows of the team box, 2026-10-03)
- Shown as: Heat 121-106 Thunder, AmericanAirlines Arena, Miami, 2012-06-21. First man off the bench on bref: James Harden.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | nba.com id | nba.com MIN, PTS, REB, AST |
|---|---|---|---|---|---|
| PG | Russell Westbrook | westbru01 | 43:16, 19, 4, 6 | 201566 | 43:16, 19, 4, 6 |
| SG | Thabo Sefolosha | sefolth01 | 9:19, 0, 0, 0 | 200757 | 9:19, 0, 0, 0 |
| SF | Kevin Durant | duranke01 | 43:16, 32, 11, 3 | 201142 | 43:16, 32, 11, 3 |
| PF | Serge Ibaka | ibakase01 | 25:47, 9, 4, 0 | 201586 | 25:47, 9, 4, 0 |
| C | Kendrick Perkins | perkike01 | 19:45, 2, 4, 0 | 2570 | 19:45, 2, 4, 0 |

| Blank | Nationality shown | bref birthplace | nba.com COUNTRY | Fact shown |
|---|---|---|---|---|
| Thabo Sefolosha | Switzerland | Vevey, Switzerland | Switzerland | Started Game 5 but played only 9 minutes. |
| Kendrick Perkins | USA | Nederland, Texas, United States | USA | Started in Game 5 and scored 2. |
| Russell Westbrook | USA | Long Beach, California, United States | USA | Scored 19 in Game 5. |

### finals-2012-g5-mia: Miami Heat, 2012 NBA Finals Game 5

- Game: 2012 NBA Finals Game 5: Thunder vs Heat, June 21, 2012. bref: 9:00 PM, June 21, 2012, AmericanAirlines Arena, Miami, Florida, score 106-121 (away-home). nba.com: game 0041100405, 2012-06-21, AmericanAirlines Arena, Miami, Miami Heat 121, Oklahoma City Thunder 106.
- Source A: https://www.basketball-reference.com/boxscores/201206210MIA.html (Starters block of the basic box, 2026-10-03)
- Source B: https://www.nba.com/game/0041100405/box-score (starters block, the first five rows of the team box, 2026-10-03)
- Shown as: Heat 121-106 Thunder, AmericanAirlines Arena, Miami, 2012-06-21. First man off the bench on bref: Mike Miller.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | nba.com id | nba.com MIN, PTS, REB, AST |
|---|---|---|---|---|---|
| PG | Mario Chalmers | chalmma01 | 33:56, 10, 2, 7 | 201596 | 33:56, 10, 2, 7 |
| SG | Dwyane Wade | wadedw01 | 34:40, 20, 8, 3 | 2548 | 34:40, 20, 8, 3 |
| SF | Shane Battier | battish01 | 28:42, 11, 4, 1 | 2203 | 28:42, 11, 4, 1 |
| PF | LeBron James | jamesle01 | 44:09, 26, 11, 13 | 2544 | 44:09, 26, 11, 13 |
| C | Chris Bosh | boshch01 | 34:25, 24, 7, 0 | 2547 | 34:25, 24, 7, 0 |

| Blank | Nationality shown | bref birthplace | nba.com COUNTRY | Fact shown |
|---|---|---|---|---|
| Shane Battier | USA | Birmingham, Michigan, United States | USA | Started in Game 5 and scored 11. |
| Mario Chalmers | USA | Anchorage, Alaska, United States | USA | Had 10 points and 7 assists in Game 5. |
| Chris Bosh | USA | Dallas, Texas, United States | USA | Scored 24 in Game 5. |

### finals-2018-g4-gsw: Golden State Warriors, 2018 NBA Finals Game 4

- Game: 2018 NBA Finals Game 4: Warriors vs Cavaliers, June 8, 2018. bref: 9:00 PM, June 8, 2018, Quicken Loans Arena, Cleveland, Ohio, score 108-85 (away-home). nba.com: game 0041700404, 2018-06-08, Quicken Loans Arena, Cleveland, Golden State Warriors 108, Cleveland Cavaliers 85.
- Source A: https://www.basketball-reference.com/boxscores/201806080CLE.html (Starters block of the basic box, 2026-10-03)
- Source B: https://www.nba.com/game/0041700404/box-score (starters block, the first five rows of the team box, 2026-10-03)
- Shown as: Warriors 108-85 Cavaliers, Quicken Loans Arena, Cleveland, 2018-06-08. First man off the bench on bref: Andre Iguodala.

| Slot | Starter | bref id | bref MP, PTS, TRB, AST | nba.com id | nba.com MIN, PTS, REB, AST |
|---|---|---|---|---|---|
| PG | Stephen Curry | curryst01 | 38:44, 37, 6, 4 | 201939 | 38:45, 37, 6, 4 |
| SG | Klay Thompson | thompkl01 | 28:29, 10, 6, 0 | 202691 | 28:30, 10, 6, 0 |
| SF | Kevin Durant | duranke01 | 37:38, 20, 12, 10 | 201142 | 37:38, 20, 12, 10 |
| PF | Draymond Green | greendr01 | 38:37, 9, 3, 9 | 203110 | 38:37, 9, 3, 9 |
| C | JaVale McGee | mcgeeja01 | 16:28, 6, 3, 0 | 201580 | 16:28, 6, 3, 0 |

| Blank | Nationality shown | bref birthplace | nba.com COUNTRY | Fact shown |
|---|---|---|---|---|
| JaVale McGee | USA | Flint, Michigan, United States | USA | Started in Game 4 and played 16 minutes. |
| Klay Thompson | USA | Los Angeles, California, United States | USA | Scored 10 in Game 4. |
| Draymond Green | USA | Saginaw, Michigan, United States | USA | Had 9 points and 9 assists in Game 4. |
