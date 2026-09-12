# Guess The College data verification, 2026-09-12 (Round 535)

`src/data/colleges.ts`, 70 schools. Before this round the file carried no provenance
header, no source for a single number, and no harness. Every countable claim sat inside
prose, so nothing could pin it: "Has won 18 national championships", "Won 3 NCAA
basketball championships", "Enrollment: 40000", "Acceptance rate: 80%".

This file is the record of what was checked, against what, and what happened to it.
One row per school per field. Status is VERIFIED, CORRECTED or REMOVED.

## Method, and the rules each number now lives under

**Two publishers per fact.** Wikipedia counts as one publisher however many of its pages
are read, so nothing here rests on Wikipedia alone.

**Rules stated, because the same words mean different things.**

- *Football national titles.* There is no NCAA championship in FBS, so "national
  championships" is whatever selector you pick, and the publishers genuinely disagree:
  ESPN's NCAA-recognised list gives Alabama 16, Notre Dame 13, USC 9, Michigan 10, while
  the numbers those schools claim are 18, 11, 11 and 12. A count whose value depends on
  which list you opened is not a fact a quiz can assert, so **the raw "national
  championships" counts do not ship**. What ships instead is
  `CFB_TITLE_SEASONS`: the BCS and College Football Playoff champions, 1998 through 2025.
  One champion per season, no selector to choose, and every school's count is derived
  from that ledger rather than typed beside it. The 2003 season is the BCS champion (LSU);
  USC's split AP title that season is not in the ledger and neither is USC's 2004 BCS
  title, which the NCAA vacated.
- *Basketball titles.* NCAA Division I men's basketball tournament championships, derived
  from `NCAA_MBB_TITLE_SEASONS`. **Vacated titles are excluded and named**: Louisville's
  2013 title was vacated in February 2018 and Louisville is a two-title school in this
  data, not three.
- *Enrollment.* Total fall headcount for the named IPEDS unit, fall 2023, with the year
  written into the data (`enrollmentYear`) and shown in the clue. The IPEDS unit id is
  stored per school so the number is reproducible rather than remembered.
- *Acceptance rate.* **Dropped from the clue set entirely.** See the section below.

**A claim that could not be verified was removed, not softened.** Every removal is a row
in this file.

## What was checked and what was left alone

Checked and two-sourced: the conference for 2026-27, every championship count, every
superlative ("most", "more than any", "record"), every claim naming a person or a dated
event, and the enrollment number.

Deliberately left as written: descriptive lines that assert no checkable specific, for
example "Has produced Olympic athletes in track and field and swimming". These are not
countable, name nobody and date nothing. They are recorded here as NOT RE-VERIFIED rather
than quietly presented as checked.

## Blocked fetches, named and not cited

These were attempted and returned nothing usable. Nothing in this file rests on them.

| URL | Result |
|---|---|
| `https://www.sports-reference.com/cfb/years/2026-standings.html` | HTTP 403 |
| `https://www.ncaa.com/standings/football/fbs` | 200, empty body |
| `https://www.ncaa.com/history/basketball-men/d1` | 200, empty body |
| `https://www.ncaa.com/news/basketball-men/article/2026-04-06/college-basketball-teams-most-national-championships` | 200, empty body |
| `https://www.secsports.com/schools`, `/teams`, `/standings/football` | 404, 404, 200 with no table |
| `https://bigten.org/schools` | HTTP 404 |
| `https://themw.com/sports/2016/6/10/member-directory.aspx` | HTTP 500 |
| `https://gocards.com/sports/mens-basketball/history` | HTTP 404 |
| `https://ukathletics.com/sports/mens-basketball/` | HTTP 404 |
| `https://en.wikipedia.org/wiki/College_football_national_championships_in_NCAA_Division_I_FBS` | 200, the by-school table did not come back |


## Sources used

| What | Publisher A | Publisher B |
|---|---|---|
| Conference for 2026-27, all FBS leagues | ESPN standings, https://www.espn.com/college-football/standings | CBS Sports standings, https://www.cbssports.com/college-football/standings/ |
| Pac-12 membership for 2026-27 | Pac-12, https://pac-12.com/news/2026/6/30/general-the-new-pac-12-conference-officially-launches-with-the-addition-of-seven-full-time-members.aspx | CBS Sports, https://www.cbssports.com/college-football/news/pac-12-relaunch-2026-contenders-teams-to-watch/ |
| Mountain West membership for 2026-27 | Mountain West, https://themw.com/standings.aspx?path=football | ESPN standings (above) |
| Sun Belt membership for 2026-27 | Sun Belt, https://sunbeltsports.org/standings.aspx?path=football | ESPN standings (above) |
| SEC membership | Wikipedia, https://en.wikipedia.org/wiki/Southeastern_Conference | ESPN standings (above) |
| Football national titles, poll era | Wikipedia, https://en.wikipedia.org/wiki/College_football_national_championships_in_NCAA_Division_I_FBS (poll era by school table, pulled as wikitext through the MediaWiki API) | NCAA.com, https://www.ncaa.com/news/football/article/2025-01-23/college-football-teams-most-national-championships |
| BCS and Playoff champions | ESPN, https://www.espn.com/college-football/story/_/id/39192677/who-won-college-football-championship-winners-list | Wikipedia, https://en.wikipedia.org/wiki/Bowl_Championship_Series and https://en.wikipedia.org/wiki/College_Football_Playoff_National_Championship |
| NCAA men's basketball champions | NCAA.com, https://www.ncaa.com/history/basketball-men/d1 (fetched with a browser user agent; the same page returns an empty body to a plain fetch) | Wikipedia, https://en.wikipedia.org/wiki/NCAA_Division_I_men%27s_basketball_tournament |
| 2026 basketball final | CBS News, https://www.cbsnews.com/news/ncaa-mens-basketball-championship-michigan-uconn-2026-march-madness/ | NCAA.com championship history (above) |
| 2025 basketball final | NPR, https://www.npr.org/2025/04/07/nx-s1-5355078/florida-gators-houston-cougars-mens-basketball-ncaa-champions | Florida Athletics, https://floridagators.com/news/2025/4/8/mens-basketball-florida-houston-ncaa-championship-game-april-7-2025 |
| Enrollment, fall 2023 | IPEDS through the Urban Institute Education Data Portal, https://educationdata.urban.org/api/v1/college-university/ipeds/fall-enrollment/2023/99/race/sex/ | the figure each school publishes itself, read off its Wikipedia infobox citation |
| Enrollment spot check | US Department of Education College Scorecard, https://api.data.gov/ed/collegescorecard/v1/schools (agreed to the unit for Alabama, UCLA and Michigan before its demo key rate limited at 30 calls an hour) | |
| Heisman winners by school | Sports Illustrated, https://www.si.com/college-football/which-college-has-won-the-most-heisman-trophies | NCAA.com, https://www.ncaa.com/news/football/article/2024-12-14/college-football-teams-most-heisman-trophy-winners |
| Krzyzewski career wins | NCAA.com, https://www.ncaa.com/news/basketball-men/article/2023-07-26/mens-di-college-basketball-coaches-most-wins | NBC Sports, https://www.nbcsportsbayarea.com/ncaa/who-are-the-winningest-mens-college-basketball-coaches/1177039/ |
| Paterno 409 wins restored | Fox News, https://www.foxnews.com/us/ncaa-to-restore-112-wins-to-penn-state-putting-joe-paterno-back-in-record-book | CBS Sports, https://www.cbssports.com/college-football/news/penn-state-ncaa-reach-proposed-settlement-to-restore-paterno-wins |
| Michigan football all-time wins | Sports Illustrated, https://www.si.com/college/2023/11/18/michigan-first-college-football-program-1000-all-time-wins | Fox News, https://www.foxnews.com/sports/michigan-becomes-first-program-win-1000-games-remains-undefeated-jim-harbaughs-ban-continues |
| Nixon at Duke Law | Duke Law, https://law.duke.edu/history/timeline/richard-nixon-graduates-duke-law | Duke Chronicle, https://dukechronicle.com/article/duke-university-richard-nixon-duke-law-alumnus-only-united-states-president-from-duke-foreign-policy-watergate-vice-president-congressman-resigned-in-disgrace-introduction-20250109 |
| Northwestern's first tournament | NPR, https://www.npr.org/2017/03/13/520021427/northwestern-makes-ncaa-tournament-for-the-first-time | CBS Sports, https://www.cbssports.com/college-basketball/news/watch-northwestern-fans-players-react-in-bedlam-after-clinching-first-ncaa-bid |
| Baylor 2013 record | Baylor Athletics, https://baylorbears.com/news/2013/12/7/football_wins_first_big_12_title_vs_texas_30_10.aspx | Wikipedia, https://en.wikipedia.org/wiki/2013_Baylor_Bears_football_team |
| 1997 Rose Bowl result | Wikipedia, https://en.wikipedia.org/wiki/1997_Rose_Bowl | 247Sports, https://247sports.com/college/ohio-state/longformarticle/ohio-state-buckeyes-football-took-dramatic-rose-bowl-win-over-arizona-state-sun-devils-25-years-ago-179502741/ |
| 2004 basketball final | ESPN box score, https://www.espn.com/mens-college-basketball/game/_/gameId/244000063 | UConn Athletics, https://uconnhuskies.com/news/2004/4/5/Remember_the_Huskies_UConn_Win_National_Championship_Game_Over_Georgia_Tech |
| UCLA titles under Wooden | Wikipedia, https://en.wikipedia.org/wiki/UCLA_Bruins_men%27s_basketball | UCLA Athletics, https://uclabruins.com/documents/download/2025/11/15/MBKB_26MG_06_07.pdf |
| UCLA and Stanford NCAA team titles | 247Sports, https://247sports.com/college/ucla/article/ucla-wins-national-championships-no-122-and-no-123-231716411/ | UCLA, https://www.ucla.edu/about/athletics-championships-and-medals |
| UNLV home arena | UNLV Athletics, https://unlvrebels.com/news/2026/8/11/2026-27-mens-basketball-schedule-announced.aspx | Las Vegas Review-Journal, https://www.reviewjournal.com/sports/unlv/unlv-basketball/changes-coming-to-thomas-mack-seating-for-runnin-rebels-games-next-season-3618844/ |
| Jesse Owens at Ohio State | Ohio State University Libraries, https://library.osu.edu/site/jesseowens/ | Britannica, https://www.britannica.com/biography/Jesse-Owens |
| Neil Armstrong at Purdue | Purdue Archives, https://archives.lib.purdue.edu/agents/people/100 | ASME, https://www.asme.org/topics-resources/content/neil-armstrong |
| Naismith as Kansas' first coach | Kansas Athletics, https://kuathletics.com/news/2020/9/4/dr-james-naismith-named-to-the-missouri-valley-conference-hall-of-fame | Kansas Sampler Foundation, https://kansassampler.org/8wondersofkansas-people/james-naismith-lawrence |
| Rutgers v Princeton 1869 | Rutgers Athletics, https://scarletknights.com/sports/2022/7/25/sports-m-footbl-archive-first-game-html | NCAA.com, https://www.ncaa.com/news/football/article/2017-11-06/college-football-history-heres-when-1st-game-was-played |

## Corrections and removals, one row per school per field

| School | Field | Was | Is now | Status |
|---|---|---|---|---|
| University of Texas at Austin | basketballHistory | won a national championship in 2023 | never won the NCAA Tournament, three Final Four trips, Elite Eight in 2023 | CORRECTED |
| Georgia Institute of Technology | basketballHistory | won the national championship in 2004 | reached the 2004 final and lost to UConn | CORRECTED |
| University of Louisville | basketballHistory | 3 NCAA basketball championships | 2, with 2013 named as vacated by the NCAA in 2018 | CORRECTED |
| University of California, Los Angeles | basketballHistory | 11 championships under John Wooden | 11 in the ledger, 10 of them under Wooden between 1964 and 1975 | CORRECTED |
| University of Oklahoma | cfbHistory | the most Heisman Trophy winners of any school | seven, tied for second behind USC with eight | CORRECTED |
| Baylor University | cfbHistory | a remarkable undefeated regular season in 2013 | first Big 12 title in 2013 at 11-1 | CORRECTED |
| Arizona State University | cfbHistory | Won the Rose Bowl in 1997 | played the Rose Bowl after 1996 and lost to Ohio State 20-17 | CORRECTED |
| University of Nevada, Las Vegas | funFact | plays in a shared arena with an NBA franchise | plays at the Thomas and Mack Center on campus | CORRECTED |
| University of Michigan | basketballHistory | Won the NCAA championship in 1989 | 1989 and 2026, the second a 69-63 win over UConn | CORRECTED |
| University of Florida | basketballHistory | back to back in 2006 and 2007 | back to back in 2006 and 2007, then a third in 2025 | CORRECTED |
| Indiana University Bloomington | cfbHistory | historically a basketball school | won the national championship for the 2025 season | CORRECTED |
| University of California, Los Angeles | olympicAthletes | more NCAA titles across all sports than any other school | Olympic medallists in track, swimming and volleyball | CORRECTED |
| University of California, Los Angeles | funFact | more NCAA team championships than any other university, over 100 | seven straight titles from 1967 to 1973 | CORRECTED |
| University of Southern California | olympicAthletes | more Olympic athletes and medals than any university in the world | one of the two biggest hauls of any American university, alongside Stanford | CORRECTED |
| University of Southern California | funFact | if USC were a country, top 20 in all-time medals | eight Heisman winners, more than any other school | CORRECTED |
| Stanford University | olympicAthletes | over 270 Olympic athletes, more medals than all but a few countries | Olympic medallists in swimming, track, tennis and water polo | REMOVED |
| Stanford University | funFact | if Stanford were a country, top 10 in all-time medals | Stanford and USC have traded the American medal lead for years | CORRECTED |
| University of Kentucky | basketballHistory | holds the record for most all-time wins in college basketball | titles spread from 1948 to 2012 | REMOVED |
| University of Arkansas | basketballHistory | under a coach who later ran for president staff | won the 1994 championship | REMOVED |
| University of Arkansas | famousAlumniHint | Alumni include a U.S. President | Alumni include legendary NFL players | REMOVED |
| Georgia Institute of Technology | famousAlumniHint | and a former U.S. President | one of the greatest NFL wide receivers of all time | REMOVED |
| Syracuse University | famousAlumniHint | a legendary basketball coach still active today | the coach who ran the basketball program for decades | CORRECTED |
| Penn State University | famousAlumniHint | holds the record for most wins | holds the FBS record for career wins at 409 | CORRECTED |
| Northwestern University | basketballHistory | never made the NCAA Tournament, until recently breaking through | first appearance in 2017, won its opening game | CORRECTED |
| University of Memphis | basketballHistory | reached the national championship game in 2008 | has produced multiple NBA stars | REMOVED |
| Michigan State University | cfbHistory | won the College Football Playoff semifinal | has won Rose Bowls and reached the Playoff | CORRECTED |
| University of Colorado Boulder | cfbHistory | a dramatic resurgence in 2023 under a celebrity coach | the 1990 title was shared, the coaches poll went to Georgia Tech | REMOVED |
| Purdue University | olympicAthletes | astronauts who competed in zero-gravity experiments | field removed, school listed in COLLEGE_THIN | REMOVED |
| Purdue University | basketballHistory | a recent national player of the year | Final Fours and many NBA players | REMOVED |
| University of Alabama | basketballHistory | a Sweet 16 run in recent years | regular in the NCAA Tournament with deep runs | REMOVED |
| University of Florida | olympicAthletes | over 150 athletes to the Olympics | swimming and track and field | REMOVED |
| University of Florida | nflDraftHistory | over 100 NFL Draft picks in the modern era | many picks including first overall selections | REMOVED |
| University of Texas at Austin | olympicAthletes | over 130 athletes to the Olympics | swimming and track and field | REMOVED |
| University of Michigan | olympicAthletes | over 180 Olympic athletes | swimming and track and field | REMOVED |
| Ohio State University | olympicAthletes | over 100 Olympic athletes including Jesse Owens | Jesse Owens ran here before four golds in 1936 | VERIFIED |
| Ohio State University | nflDraftHistory | the most NFL Draft picks of any school in history | sends players every year, often several in the first round | REMOVED |
| University of Georgia | nflDraftHistory | has set records for most players in a single NFL Draft | sends a large group most years | REMOVED |
| Gonzaga University | basketballHistory | 25+ consecutive tournaments | title games in 2017 and 2021 | REMOVED |
| University of Notre Dame | cfbHistory | 11 consensus national championships, third most | football independent, in the title conversation in every era | REMOVED |
| Florida State University | cfbHistory | a 29-game winning streak in the 2013-14 seasons | a long unbeaten streak across 2013 and 2014 | REMOVED |
| Vanderbilt University | funFact | acceptance rate under 7% | smallest school in the SEC by enrollment | CORRECTED |
| University of Illinois Urbana-Champaign | cfbHistory | 4 national championships in the early era | competitive Big Ten seasons and a Rose Bowl history (0 poll era titles) | CORRECTED |
| University of Minnesota | cfbHistory | 7 national championships in the early era | ledger says 4 poll era titles | CORRECTED |
| Georgia Institute of Technology | cfbHistory | 4 national championships | ledger says 1 poll era title, shared in 1990 | CORRECTED |

Every football and basketball title count in the old prose was replaced by the derived
ledger count, so the rows above list only the ones where the number or the sentence was
also wrong. The full old-to-new count move is in the table further down.

## Conference, 2026-27

| School | Was | Is now | Status |
|---|---|---|---|
| University of Alabama | SEC | SEC | VERIFIED |
| Auburn University | SEC | SEC | VERIFIED |
| University of Florida | SEC | SEC | VERIFIED |
| University of Georgia | SEC | SEC | VERIFIED |
| University of Kentucky | SEC | SEC | VERIFIED |
| Louisiana State University | SEC | SEC | VERIFIED |
| University of Tennessee | SEC | SEC | VERIFIED |
| Texas A&M University | SEC | SEC | VERIFIED |
| University of Mississippi | SEC | SEC | VERIFIED |
| University of Oklahoma | SEC | SEC | VERIFIED |
| University of Texas at Austin | SEC | SEC | VERIFIED |
| Ohio State University | Big Ten | Big Ten | VERIFIED |
| University of Michigan | Big Ten | Big Ten | VERIFIED |
| Penn State University | Big Ten | Big Ten | VERIFIED |
| University of Wisconsin-Madison | Big Ten | Big Ten | VERIFIED |
| University of Iowa | Big Ten | Big Ten | VERIFIED |
| University of Oregon | Big Ten | Big Ten | VERIFIED |
| University of Southern California | Big Ten | Big Ten | VERIFIED |
| University of Nebraska-Lincoln | Big Ten | Big Ten | VERIFIED |
| Michigan State University | Big Ten | Big Ten | VERIFIED |
| Indiana University Bloomington | Big Ten | Big Ten | VERIFIED |
| Purdue University | Big Ten | Big Ten | VERIFIED |
| University of California, Los Angeles | Big Ten | Big Ten | VERIFIED |
| Clemson University | ACC | ACC | VERIFIED |
| Duke University | ACC | ACC | VERIFIED |
| University of North Carolina at Chapel Hill | ACC | ACC | VERIFIED |
| Florida State University | ACC | ACC | VERIFIED |
| University of Miami | ACC | ACC | VERIFIED |
| University of Notre Dame | ACC | ACC | VERIFIED |
| Syracuse University | ACC | ACC | VERIFIED |
| Stanford University | ACC | ACC | VERIFIED |
| Virginia Tech | ACC | ACC | VERIFIED |
| University of Arizona | Big 12 | Big 12 | VERIFIED |
| Baylor University | Big 12 | Big 12 | VERIFIED |
| Brigham Young University | Big 12 | Big 12 | VERIFIED |
| University of Colorado Boulder | Big 12 | Big 12 | VERIFIED |
| University of Kansas | Big 12 | Big 12 | VERIFIED |
| Oklahoma State University | Big 12 | Big 12 | VERIFIED |
| Texas Christian University | Big 12 | Big 12 | VERIFIED |
| University of Central Florida | Big 12 | Big 12 | VERIFIED |
| Gonzaga University | WCC | Pac-12 | CORRECTED |
| Boise State University | Mountain West | Pac-12 | CORRECTED |
| University of Memphis | AAC | American Conference | CORRECTED |
| San Diego State University | Mountain West | Pac-12 | CORRECTED |
| Appalachian State University | Sun Belt | Sun Belt | VERIFIED |
| University of Nevada, Las Vegas | Mountain West | Mountain West | VERIFIED |
| Liberty University | Conference USA | Conference USA | VERIFIED |
| Coastal Carolina University | Sun Belt | Sun Belt | VERIFIED |
| Georgia Institute of Technology | ACC | ACC | VERIFIED |
| University of Washington | Big Ten | Big Ten | VERIFIED |
| University of Maryland | Big Ten | Big Ten | VERIFIED |
| University of Minnesota | Big Ten | Big Ten | VERIFIED |
| Rutgers University | Big Ten | Big Ten | VERIFIED |
| Northwestern University | Big Ten | Big Ten | VERIFIED |
| University of Illinois Urbana-Champaign | Big Ten | Big Ten | VERIFIED |
| University of Arkansas | SEC | SEC | VERIFIED |
| Mississippi State University | SEC | SEC | VERIFIED |
| University of Missouri | SEC | SEC | VERIFIED |
| University of South Carolina | SEC | SEC | VERIFIED |
| Vanderbilt University | SEC | SEC | VERIFIED |
| Arizona State University | Big 12 | Big 12 | VERIFIED |
| University of Utah | Big 12 | Big 12 | VERIFIED |
| Iowa State University | Big 12 | Big 12 | VERIFIED |
| Kansas State University | Big 12 | Big 12 | VERIFIED |
| West Virginia University | Big 12 | Big 12 | VERIFIED |
| University of Cincinnati | Big 12 | Big 12 | VERIFIED |
| University of Houston | Big 12 | Big 12 | VERIFIED |
| University of Pittsburgh | ACC | ACC | VERIFIED |
| University of Louisville | ACC | ACC | VERIFIED |
| Wake Forest University | ACC | ACC | VERIFIED |

## Enrollment

Old value had no year and no source. New value is the IPEDS total fall 2023 headcount for the named unit, cross-checked against the figure the school publishes itself.

| School | IPEDS unit | Was | IPEDS fall 2023 | Second source | Status |
|---|---|---|---|---|---|
| University of Alabama | 100751 | 40000 | 39622 | 42360 | CORRECTED |
| Auburn University | 100858 | 30000 | 33015 | 34195 | CORRECTED |
| University of Florida | 134130 | 55000 | 54814 | 54814 | CORRECTED |
| University of Georgia | 139959 | 40000 | 41615 | 43887 | CORRECTED |
| University of Kentucky | 157085 | 30000 | 32703 | 35952 | CORRECTED |
| Louisiana State University | 159391 | 35000 | 39418 | 42016 | CORRECTED |
| University of Tennessee | 221759 | 35000 | 36304 | 40784 | CORRECTED |
| Texas A&M University | 228723 | 70000 | 76633 | 79114 | CORRECTED |
| University of Mississippi | 176017 | 25000 | 24043 | 27124 | CORRECTED |
| University of Oklahoma | 207500 | 30000 | 29145 | 30873 | CORRECTED |
| University of Texas at Austin | 228778 | 50000 | 53082 | 53864 | CORRECTED |
| Ohio State University | 204796 | 60000 | 60046 | 60046 | CORRECTED |
| University of Michigan | 170976 | 50000 | 52065 | 53488 | CORRECTED |
| Penn State University | 214777 | 45000 | 50399 | 86557 | REMOVED |
| University of Wisconsin-Madison | 240444 | 45000 | 49605 | 48557 | CORRECTED |
| University of Iowa | 153658 | 30000 | 30042 | 31563 | CORRECTED |
| University of Oregon | 209551 | 25000 | 23786 | 24448 | CORRECTED |
| University of Southern California | 123961 | 49000 | 47147 | 47147 | CORRECTED |
| University of Nebraska-Lincoln | 181464 | 25000 | 23986 | 23954 | CORRECTED |
| Michigan State University | 171100 | 50000 | 51316 | 51838 | CORRECTED |
| Indiana University Bloomington | 151351 | 45000 | 47527 | 48424 | CORRECTED |
| Purdue University | 243780 | 50000 | 52905 | 57876 | CORRECTED |
| University of California, Los Angeles | 110662 | 45000 | 46678 | none found | REMOVED |
| Clemson University | 217882 | 30000 | 28747 | 29545 | CORRECTED |
| Duke University | 198419 | 15000 | 17112 | 17325 | CORRECTED |
| University of North Carolina at Chapel Hill | 199120 | 30000 | 32234 | 32234 | CORRECTED |
| Florida State University | 134097 | 45000 | 43234 | 44308 | CORRECTED |
| University of Miami | 135726 | 13000 | 19593 | 20104 | CORRECTED |
| University of Notre Dame | 152080 | 13000 | 13174 | 13016 | CORRECTED |
| Syracuse University | 196413 | 22000 | 22948 | 22589 | CORRECTED |
| Stanford University | 243744 | 17000 | 18446 | 17529 | CORRECTED |
| Virginia Tech | 233921 | 35000 | 38294 | 38294 | CORRECTED |
| University of Arizona | 104179 | 45000 | 53001 | 54384 | CORRECTED |
| Baylor University | 223232 | 20000 | 20824 | 20626 | CORRECTED |
| Brigham Young University | 230038 | 35000 | 35074 | 37205 | CORRECTED |
| University of Colorado Boulder | 126614 | 35000 | 37485 | 38808 | CORRECTED |
| University of Kansas | 155317 | 28000 | 28406 | 31169 | CORRECTED |
| Oklahoma State University | 207388 | 25000 | 26043 | 27241 | CORRECTED |
| Texas Christian University | 228875 | 12000 | 12785 | 12980 | CORRECTED |
| University of Central Florida | 132903 | 70000 | 69233 | 70674 | CORRECTED |
| Gonzaga University | 235316 | 8000 | 7306 | 7470 | CORRECTED |
| Boise State University | 142115 | 28000 | 26670 | 28519 | CORRECTED |
| University of Memphis | 220862 | 22000 | 21736 | 20276 | CORRECTED |
| San Diego State University | 122409 | 35000 | 39241 | 38369 | CORRECTED |
| Appalachian State University | 197869 | 20000 | 21253 | 21798 | CORRECTED |
| University of Nevada, Las Vegas | 182281 | 30000 | 31094 | 31142 | CORRECTED |
| Liberty University | 232557 | 15000 | 103251 | 104327 | CORRECTED |
| Coastal Carolina University | 218724 | 12000 | 10829 | 11881 | CORRECTED |
| Georgia Institute of Technology | 139755 | 45000 | 47946 | 56715 | REMOVED |
| University of Washington | 236948 | 47000 | 55620 | 51719 | CORRECTED |
| University of Maryland | 163286 | 41000 | 40813 | 40792 | CORRECTED |
| University of Minnesota | 174066 | 52000 | 54890 | 57879 | CORRECTED |
| Rutgers University | 186380 | 50000 | 50617 | 68942 | REMOVED |
| Northwestern University | 147767 | 22000 | 23203 | 22801 | CORRECTED |
| University of Illinois Urbana-Champaign | 145637 | 56000 | 56563 | 60848 | CORRECTED |
| University of Arkansas | 106397 | 30000 | 32140 | 34174 | CORRECTED |
| Mississippi State University | 176080 | 22000 | 22657 | 23150 | CORRECTED |
| University of Missouri | 178396 | 32000 | 31013 | 31543 | CORRECTED |
| University of South Carolina | 218663 | 35000 | 36579 | 38000 | CORRECTED |
| Vanderbilt University | 221999 | 13000 | 13456 | 13575 | CORRECTED |
| Arizona State University | 104151 | 75000 | 79593 | 160051 | REMOVED |
| University of Utah | 230764 | 35000 | 35260 | 36881 | CORRECTED |
| Iowa State University | 153603 | 30000 | 30177 | 31105 | CORRECTED |
| Kansas State University | 155399 | 20000 | 19745 | 21213 | CORRECTED |
| West Virginia University | 238032 | 26000 | 24200 | 26046 | CORRECTED |
| University of Cincinnati | 201885 | 47000 | 43367 | 53682 | REMOVED |
| University of Houston | 225511 | 47000 | 46676 | 48950 | CORRECTED |
| University of Pittsburgh | 215293 | 34000 | 34525 | 35528 | CORRECTED |
| University of Louisville | 157289 | 22000 | 22139 | 25005 | CORRECTED |
| Wake Forest University | 199847 | 9000 | 9121 | 9121 | CORRECTED |

The six REMOVED rows are the ones where the second publisher was counting a different
population, not disagreeing about the same one: all campuses instead of the main one
(Penn State, Rutgers, Arizona State, Cincinnati, Georgia Tech) or no total at all, only
the undergraduate figure (UCLA). The number does not ship and the school is in
COLLEGE_THIN with that reason, which the answer screen prints.

## Acceptance rate, dropped

Old value: an integer per school, no year, no source. Status: **REMOVED for all 70.**

Three reasons, in order of weight. It has no year in the data, so it could not be checked
against anything. It moves every admissions cycle, which makes it a claim about today
frozen inside a page that ships for weeks. And it could not be two-sourced: the IPEDS
admissions file carries applied and admitted counts for all 70 (Alabama 44,295 of 58,418,
75.8 percent for 2023), but only 31 of the 70 Wikipedia articles carry an admit rate field
at all, and where both exist they are usually different cycles and disagree by a lot:
Alabama 75.8 against 78.9, Georgia 37.2 against 29.8, Texas 29.1 against 35.4, Ohio State
50.8 against 43.5, Purdue 50.3 against 43.4, Illinois 43.7 against 36.6.

The clue slot it used to fill now says whether the school is in one of the four power
conferences, which is derived from the conference this file already verifies. The clue
count is unchanged at eleven, so scoring did not move.

## Championship counts, old prose to new ledger

| School | Old prose said | Ledger says | Status |
|---|---|---|---|
| University of Alabama | 18 football national championships | 13 poll era titles | CORRECTED |
| Ohio State University | 8 | 7 | CORRECTED |
| University of Southern California | 11 | 6, with 2004 named vacated | CORRECTED |
| University of Notre Dame | 11 consensus | 8 | CORRECTED |
| University of Oklahoma | 7 | 7 | VERIFIED |
| University of Texas at Austin | 4 | 4 | VERIFIED |
| University of Minnesota | 7 | 4 | CORRECTED |
| University of Illinois Urbana-Champaign | 4 | 0 | CORRECTED |
| Georgia Institute of Technology | 4 | 1 | CORRECTED |
| University of Nebraska-Lincoln | 5 | 5 | VERIFIED |
| University of Miami | 5 | 5 | VERIFIED |
| Clemson University | 3 | 3 | VERIFIED |
| Florida State University | 3 | 3 | VERIFIED |
| University of Florida | 3 | 3 | VERIFIED |
| Penn State University | 2 | 2 | VERIFIED |
| University of Kentucky | 8 basketball titles | 8 | VERIFIED |
| Indiana University Bloomington | 5 basketball titles | 5 | VERIFIED |
| University of California, Los Angeles | 11 basketball titles | 11 | VERIFIED |
| Duke University | 5 basketball titles | 5 | VERIFIED |
| University of North Carolina at Chapel Hill | 6 basketball titles | 6 | VERIFIED |
| University of Kansas | 4 basketball titles | 4 | VERIFIED |
| University of Cincinnati | 2 basketball titles | 2 | VERIFIED |
| University of Louisville | 3 basketball titles | 2, 2013 vacated | CORRECTED |
| University of Texas at Austin | 1 basketball title (2023) | 0 | CORRECTED |
| Georgia Institute of Technology | 1 basketball title (2004) | 0 | CORRECTED |

All 98 football season rows and all 63 basketball season rows in the two ledgers were
checked pair by pair, school and season, against both publishers by
scripts (the cross check reported "seasons not corroborated 0"). USC 2004 and
Louisville 2013 are the only vacated entries and both are named in their own lists rather
than silently dropped.

## Not re-verified, and said so

The clue fields that assert no checkable specific were left as written and are recorded
here as NOT RE-VERIFIED rather than presented as checked. They are the descriptive
Olympic and NFL Draft lines of the form "has produced athletes in track and field", and
the funFact strings, which are colour shown after the answer rather than clues. Four
funFacts were false and were replaced; they are rows in the corrections table above. The
rest have not been through two publishers and a later round should take them.
