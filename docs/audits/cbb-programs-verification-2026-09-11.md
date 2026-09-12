# cbb_programs verification, 2026-09-11

Round 531 piece 3. The 24 rows that `docs/audits/cbb_programs_audit.md` says were generated
from memory (January 2026 cutoff) and applied 2026-06-14 without verification. Every row was
read live through the REST API on 2026-09-11 and checked field by field against Wikipedia's
program page and a second, independent publisher. The corrections are in
`supabase/migrations/20260911120000_cbb_programs_verified.sql` (not applied by this lane) and the
fence is `scripts/simCbbPrograms.mjs`.

## What the table actually holds

The brief said 24 rows. `select count(*)` on 2026-09-11 says **281**. The 24 created on
2026-06-14 are the memory-generated batch this audit covers. The other 257 were added on
2026-06-23 (68), 2026-07-03 (94) and 2026-07-04 (95) and are NOT verified here; the harness
counts them and says so on every run. Two things noticed in passing in that unverified set and
left alone: the second Loyola Chicago row (created 2026-07-03, beside the 2026-06-23 one)
spells its school_name with a long dash between the two words, which the repo's style rule
bans and which no guess would type, and
Evansville's championships hint reads "0 Division I national titles through 2025" rather than
the "N national title" shape every other row uses. Both are for a later sweep.

## Method

- Championship counts and years: Wikipedia's champions list against ESPN's all-time winners
  list, year by year from 1939 to 2026. The two agree on all 87 tournaments (2020 not held).
  Per-school counts are derived from that agreed list, never typed independently.
- Conference: Wikipedia's program infobox against ESPN's 2025-26 conference standings pages,
  plus the CBS Sports 2026-27 realignment list (27 moves) and the Pac-12's own launch notice,
  because the brief asked for 2025-26 and the 2026-27 season is the current one on the day this
  was written. Only Gonzaga moved.
- Arena, nickname, runner-up years and the narrative tournament hint: Wikipedia's program page
  against the school's own athletics site (or ESPN where noted).
- **Vacated titles are not counted.** The count is NCAA-recognised titles only. Louisville's
  2013 title is vacated on both lists ("Vacated due to infractions" on ESPN, "the first men's
  basketball national title to ever be vacated by the NCAA" on Wikipedia) and the live row
  already says 2 and names the vacated 2013, which is kept. Vacated finals and Final Fours that
  touch these rows but are counted nowhere in any hint: Michigan's 1992 and 1993 finals (the Fab
  Five, Ed Martin case), UCLA's 1980 final, Villanova's 1971 final, Ohio State's 1999 Final Four,
  Louisville's 2012 Final Four. Michigan's tournament hint says the Fab Five "reached two
  finals", which is what happened on the court, and is kept.

## Blocked or dead, not cited

- ncaa.com: every page tried came back empty to the fetcher (the D1 history page, the 2022 and
  2026 "every champion" articles, the Michigan 2026 recap). Search result titles from ncaa.com
  are mentioned below as hits only, never as a read source.
- sports-reference.com: 403 on `/cbb/postseason/` and on `/cbb/schools/michigan/`.
- britannica.com: 403.
- wdrb.com (Denny Crum obituary): 301 to an unrelated site.

## Publisher-wide sources

| Code | Source |
|---|---|
| W-LIST | https://en.wikipedia.org/wiki/List_of_NCAA_Division_I_men%27s_basketball_champions |
| E-LIST | https://www.espn.com/mens-college-basketball/story/_/id/39445992/ncaa-mens-basketball-championship-all-winners-list |
| E-ACC | https://www.espn.com/mens-college-basketball/standings/_/group/2 (2025-26) |
| E-B12 | https://www.espn.com/mens-college-basketball/standings/_/group/8 (2025-26) |
| E-BE | https://www.espn.com/mens-college-basketball/standings/_/group/4 (2025-26) |
| E-B10 | https://www.espn.com/mens-college-basketball/standings/_/group/7 (2025-26) |
| E-SEC | https://www.espn.com/mens-college-basketball/standings/_/group/23 (2025-26) |
| E-WCC | https://www.espn.com/mens-college-basketball/standings/_/group/29 (2025-26) |
| CBS-26 | https://www.cbssports.com/college-basketball/news/college-basketball-conference-changes-2026-27-gonzaga-pac-12/ |
| PAC12 | https://pac-12.com/news/2026/6/30/general-the-new-pac-12-conference-officially-launches-with-the-addition-of-seven-full-time-members.aspx |
| E-GONZ | https://www.espn.com/mens-college-basketball/story/_/id/41550151/gonzaga-join-pac-12-basketball-school-sources-say |
| E-MICH | https://www.espn.com/mens-college-basketball/game/_/gameId/401856600/uconn-michigan (Michigan 69, UConn 63, 2026-04-06) |

## The champion list both publishers agree on

Derived counts for the 24 come from this list, which W-LIST and E-LIST give identically (the
only naming difference is UConn versus Connecticut, Oklahoma A&M versus Oklahoma State, Texas
Western versus UTEP, NC State versus North Carolina State).

1939 Oregon, 1940 Indiana, 1941 Wisconsin, 1942 Stanford, 1943 Wyoming, 1944 Utah,
1945 Oklahoma A&M, 1946 Oklahoma A&M, 1947 Holy Cross, 1948 Kentucky, 1949 Kentucky, 1950 CCNY,
1951 Kentucky, 1952 Kansas, 1953 Indiana, 1954 La Salle, 1955 San Francisco, 1956 San Francisco,
1957 North Carolina, 1958 Kentucky, 1959 California, 1960 Ohio State, 1961 Cincinnati,
1962 Cincinnati, 1963 Loyola Chicago, 1964 UCLA, 1965 UCLA, 1966 Texas Western, 1967 UCLA,
1968 UCLA, 1969 UCLA, 1970 UCLA, 1971 UCLA, 1972 UCLA, 1973 UCLA, 1974 NC State, 1975 UCLA,
1976 Indiana, 1977 Marquette, 1978 Kentucky, 1979 Michigan State, 1980 Louisville, 1981 Indiana,
1982 North Carolina, 1983 NC State, 1984 Georgetown, 1985 Villanova, 1986 Louisville,
1987 Indiana, 1988 Kansas, 1989 Michigan, 1990 UNLV, 1991 Duke, 1992 Duke, 1993 North Carolina,
1994 Arkansas, 1995 UCLA, 1996 Kentucky, 1997 Arizona, 1998 Kentucky, 1999 Connecticut,
2000 Michigan State, 2001 Duke, 2002 Maryland, 2003 Syracuse, 2004 Connecticut,
2005 North Carolina, 2006 Florida, 2007 Florida, 2008 Kansas, 2009 North Carolina, 2010 Duke,
2011 Connecticut, 2012 Kentucky, 2013 Louisville (VACATED), 2014 Connecticut, 2015 Duke,
2016 Villanova, 2017 North Carolina, 2018 Villanova, 2019 Virginia, 2020 not held, 2021 Baylor,
2022 Kansas, 2023 Connecticut, 2024 Connecticut, 2025 Florida, 2026 Michigan.

## Row by row

"Live" is the value read on 2026-09-11. Status is VERIFIED (every field holds on two
publishers), CORRECTED (a field is false or stale, the migration rewrites it) or UNVERIFIABLE
(none this time: no count or conference was disputed between publishers).

| School | Titles, live | Titles, verified | Conference, live | Conference, verified (2025-26 / 2026-27) | Other hints checked | Wikipedia | Second publisher | Status |
|---|---|---|---|---|---|---|---|---|
| Gonzaga | 0, runner-up 2017 and 2021 | 0; finals lost 2017 (71-65 to North Carolina) and 2021 | West Coast Conference (WCC) | WCC / **Pac-12 Conference** (joined 2026-07-01) | McCarthey Athletic Center; Mark Few | https://en.wikipedia.org/wiki/Gonzaga_Bulldogs_men%27s_basketball | E-WCC (2025-26), PAC12 and CBS-26 and E-GONZ (2026-27), https://gozags.com/news/2017/4/3/Gonzaga_Falls_to_North_Carolina_in_National_Championship_Game_71_65.aspx (2017 final), PAC12 names "2021 Gonzaga" in the title game, https://gozags.com/facilities/mccarthey-athletic-center/1 | **CORRECTED** (conference_hint) |
| Houston | 0, runner-up 1983, 1984 and 2025 | 0; finals lost 1983, 1984, 2025 (65-63 to Florida) | Big 12 Conference | Big 12 / Big 12 | Fertitta Center; Phi Slama Jama; Kelvin Sampson | https://en.wikipedia.org/wiki/Houston_Cougars_men%27s_basketball | E-B12, https://uhcougars.com/documents/download/2011/10/21/_hou_m_baskbl_2011_12_misc_non_event__mg-51-98.pdf (runner-up 1983, 1984), https://uhcougars.com/news/2025/4/7/mens-basketball-houston-falls-in-national-championship (2025), https://uhcougars.com/news/2025/4/14/mens-basketball-mens-basketball-to-celebrate-2024-25-season-in-fertitta-center-on-april-23 | VERIFIED |
| Baylor | 1 (2021) | 1 (2021, 86-70 over Gonzaga) | Big 12 Conference | Big 12 / Big 12 | Foster Pavilion (home since January 2024); Scott Drew | https://en.wikipedia.org/wiki/Baylor_Bears_men%27s_basketball | E-LIST, E-B12, https://baylorbears.com/feature/2021-mens-bball-national-champs, https://baylorbears.com/facilities/foster-pavilion/1358 | VERIFIED |
| Kansas | 4 (1952, 1988, 2008, 2022) | 4 (same years) | Big 12 Conference | Big 12 / Big 12 | Allen Fieldhouse; Naismith the first coach (1898-99); Self's titles 2008 and 2022 | https://en.wikipedia.org/wiki/Kansas_Jayhawks_men%27s_basketball | E-LIST, E-B12, https://kuathletics.com/news/2018/2/3/ku-celebrates-120-years-of-kansas-mens-basketball, https://kuathletics.com/facilities/allen-fieldhouse/188 | VERIFIED |
| Cincinnati | 2 (1961, 1962) | 2 (same) | Big 12 Conference | Big 12 / Big 12 | Fifth Third Arena; Oscar Robertson 1957-60, titles the two years after | https://en.wikipedia.org/wiki/Cincinnati_Bearcats_men%27s_basketball | E-LIST, E-B12, https://gobearcats.com/history-of-cincinnati-basketball, https://gobearcats.com/fifth-third-arena-1 | VERIFIED |
| Ohio State | 1 (1960) | 1 (1960) | Big Ten Conference | Big Ten / Big Ten | Value City Arena; Lucas and Havlicek; finals 1960, 1961, 1962 | https://en.wikipedia.org/wiki/Ohio_State_Buckeyes_men%27s_basketball | E-LIST, E-B10, https://ohiostatebuckeyes.com/news/2010/1/31/1960-national-championship-team-honored-at-halftime-of-minnesota-game, https://ohiostatebuckeyes.com/value-city-arena-at-the-jerome-schottenstein-center/ | VERIFIED |
| Duke | 5 (1991, 1992, 2001, 2010, 2015) | 5 (same) | Atlantic Coast Conference (ACC) | ACC / ACC | Cameron Indoor Stadium; Krzyzewski 1,202 career wins | https://en.wikipedia.org/wiki/Duke_Blue_Devils_men%27s_basketball | E-LIST, E-ACC, https://goduke.com/facilities/cameron-indoor-stadium/11, https://goduke.com/sports/mens-basketball/roster/coaches/mike-krzyzewski/4159 | VERIFIED |
| Virginia | 1 (2019) | 1 (2019, 85-77 OT over Texas Tech) | Atlantic Coast Conference (ACC) | ACC / ACC | John Paul Jones Arena; 2018 loss to 16 seed UMBC; Tony Bennett | https://en.wikipedia.org/wiki/Virginia_Cavaliers_men%27s_basketball | E-LIST, E-ACC, https://virginiasports.com/news/2019/04/9/mens-basketball-virginia-wins-2019-national-championship, https://virginiasports.com/john-paul-jones-arena | VERIFIED |
| UCLA | 11, 10 of them 1964-1975 | 11 (1964, 65, 67, 68, 69, 70, 71, 72, 73, 75, 95); Wooden 10 in 12 seasons, seven straight 1967-1973 | Big Ten Conference | Big Ten / Big Ten (joined 2024) | Pauley Pavilion | https://en.wikipedia.org/wiki/UCLA_Bruins_men%27s_basketball | E-LIST, E-B10, https://uclabruins.com/ucla-mens-basketball-ncaa-championships, https://uclabruins.com/pauley-pavilion-home-to-bruin-basketball-volleyball-and-gymnastics | VERIFIED |
| Kentucky | 8 (1948, 1949, 1951, 1958, 1978, 1996, 1998, 2012) | 8 (same) | Southeastern Conference (SEC) | SEC / SEC | Rupp Arena; Calipari's 2012 title | https://en.wikipedia.org/wiki/Kentucky_Wildcats_men%27s_basketball | E-LIST, E-SEC, https://ukathletics.com/news/2015/09/29/131461809631737984/, https://ukathletics.com/facilities/rupp-arena/ | VERIFIED |
| Indiana | 5 (1940, 1953, 1976, 1981, 1987) | 5 (same); 1976 the last undefeated champion | Big Ten Conference | Big Ten / Big Ten | Assembly Hall (Simon Skjodt Assembly Hall); Knight | https://en.wikipedia.org/wiki/Indiana_Hoosiers_men%27s_basketball | E-LIST, E-B10, https://iuhoosiers.com/news/2026/2/12/mens-basketball-no-one-did-it-better-reliving-1976-national-basketball-championship-perfection | VERIFIED |
| Connecticut | 6 (1999, 2004, 2011, 2014, 2023, 2024) | 6 (same); 2026 runner-up to Michigan | Big East Conference | Big East / Big East | Gampel Pavilion; the Hartford arena is **PeoplesBank Arena** since June 2025, the live row still says XL Center; Calhoun and Hurley | https://en.wikipedia.org/wiki/UConn_Huskies_men%27s_basketball | E-LIST, E-BE, https://uconnhuskies.com/facilities/peoplesbank-arena-(formerly-xl-center)/4, https://uconnhuskies.com/news/2024/4/8/mens-basketball-back-to-back-champs, https://ctnewsjunkie.com/2025/06/04/xl-center-officially-renamed-peoplesbank-arena-in-hartford-ceremony/ | **CORRECTED** (mascot_hint) |
| Louisville | 2 (1980, 1986); 2013 vacated | 2 (1980, 1986); 2013 vacated on both lists | Atlantic Coast Conference (ACC) | ACC / ACC | KFC Yum! Center; "Doctors of Dunk" is the Crum era nickname (Wikipedia's Denny Crum page and ESPN's Jamfest piece) | https://en.wikipedia.org/wiki/Louisville_Cardinals_men%27s_basketball and https://en.wikipedia.org/wiki/Denny_Crum | E-LIST, E-ACC, https://gocards.com/news/2020/2/6/mens-basketball-uofl-will-honor-the-cards-1980-ncaa-championship-team-on-feb-8, https://gocards.com/facilities/kfc-yum-center/7, http://www.espn.com/espn/eticket/story?page=jamfest83 | VERIFIED |
| Michigan State | 2 (1979, 2000) | 2 (same) | Big Ten Conference | Big Ten / Big Ten | Breslin Center; Magic Johnson 1979; Izzo | https://en.wikipedia.org/wiki/Michigan_State_Spartans_men%27s_basketball | E-LIST, E-B10, https://msuspartans.com/sports/2018/7/20/trads-national-champions-html, https://msuspartans.com/facilities/breslin-center/5 | VERIFIED |
| Arkansas | 1 (1994) | 1 (1994, 76-72 over Duke) | Southeastern Conference (SEC) | SEC / SEC | Bud Walton Arena; "40 Minutes of Hell" is Richardson's style and the title of the ESPN film about the 1994 team | https://en.wikipedia.org/wiki/Arkansas_Razorbacks_men%27s_basketball and https://en.wikipedia.org/wiki/Nolan_Richardson | E-LIST, E-SEC, https://arkansasrazorbacks.com/the_national_championship_1371981/, https://arkansasrazorbacks.com/facility/bud-walton-arena/, https://news.uark.edu/articles/17721/jeff-long-welcomes-nolan-richardson-to-court-for-40-minutes-of-hell-premiere | VERIFIED |
| Villanova | 3 (1985, 2016, 2018) | 3 (same); 1985 over Georgetown; Jenkins buzzer beater 2016 | Big East Conference | Big East / Big East | Finneran Pavilion; the Philadelphia arena is **Xfinity Mobile Arena** since September 2025, the live row still says Wells Fargo Center | https://en.wikipedia.org/wiki/Villanova_Wildcats_men%27s_basketball | E-LIST, E-BE, https://villanova.com/news/2025/9/11/complete-2025-26-mens-basketball-slate-is-now-set.aspx ("Xfinity Mobile Arena (formerly Wells Fargo Center)"), https://villanova.com/sports/2024/8/5/finneran-pavilion.aspx | **CORRECTED** (mascot_hint) |
| Arizona | 1 (1997) | 1 (1997); beat three No. 1 seeds that tournament | Big 12 Conference | Big 12 / Big 12 (joined 2024) | McKale Center; Lute Olson | https://en.wikipedia.org/wiki/Arizona_Wildcats_men%27s_basketball | E-LIST, E-B12, https://arizonawildcats.com/sports/2013/12/16/209343001.aspx, https://arizonawildcats.com/sports/2019/2/21/facility-mckale-memorial-center.aspx | VERIFIED |
| Maryland | 1 (2002) | 1 (2002, 64-52 over Indiana) | Big Ten Conference | Big Ten / Big Ten (joined 2014) | Xfinity Center; Gary Williams and Juan Dixon | https://en.wikipedia.org/wiki/Maryland_Terrapins_men%27s_basketball | E-LIST, E-B10, https://umterps.com/news/2026/4/2/2002-mens-basketball-national-championship, https://umterps.com/facilities/xfinity-center/8 | VERIFIED |
| North Carolina State | 2 (1974, 1983) | 2 (same); 1983 won 54-52 on Lorenzo Charles' dunk | Atlantic Coast Conference (ACC) | ACC / ACC | Lenovo Center; Valvano | https://en.wikipedia.org/wiki/NC_State_Wolfpack_men%27s_basketball | E-LIST, E-ACC, https://gopack.com/sports/2015/7/15/MBB_0715153315, https://gopack.com/facilities/lenovo-center/19 | VERIFIED |
| Michigan | **1 (1989)** | **2 (1989, 2026)**; 2026 final 69-63 over UConn on 2026-04-06 | Big Ten Conference | Big Ten / Big Ten | Crisler Center; Fab Five finals 1992 and 1993 (both vacated by the NCAA, hint kept as an on-court fact) | https://en.wikipedia.org/wiki/Michigan_Wolverines_men%27s_basketball | E-LIST (2026 Michigan), E-MICH, E-B10, https://mgoblue.com/news/2026/4/7/michigan-to-celebrate-2026-mens-basketball-national-champions-on-april-11, https://mgoblue.com/feature/26-mens-basketball-national-champions | **CORRECTED** (championships_hint) |
| Syracuse | 1 (2003) | 1 (2003, 81-78 over Kansas; Carmelo Anthony MOP) | Atlantic Coast Conference (ACC) | ACC / ACC | JMA Wireless Dome (the hint says "a huge domed stadium", which holds); Boeheim | https://en.wikipedia.org/wiki/Syracuse_Orange_men%27s_basketball | E-LIST, E-ACC, https://cuse.com/sports/2003/5/12/champs, https://cuse.com/facilities/jma-wireless-dome/526 | VERIFIED |
| Georgetown | 1 (1984) | 1 (1984, 84-75 over Houston) | Big East Conference | Big East / Big East | Capital One Arena; Thompson and Ewing | https://en.wikipedia.org/wiki/Georgetown_Hoyas_men%27s_basketball | E-LIST, E-BE, https://guhoyas.com/feature/1984_MBB_NCAA_Champs, https://guhoyas.com/sports/2018/6/6/facilities-gu-verizon-center-html.aspx | VERIFIED |
| Florida | 3 (2006, 2007, 2025) | 3 (same) | Southeastern Conference (SEC) | SEC / SEC | O'Connell Center (Exactech Arena at the Stephen C. O'Connell Center); Donovan 2006 and 2007 | https://en.wikipedia.org/wiki/Florida_Gators_men%27s_basketball | E-LIST, E-SEC, https://floridagators.com/feature/2025-mbb-national-champs, https://floridagators.com/sports/2020/4/4/exactech-arena-stephen-c-oconnell-center | VERIFIED |
| North Carolina | 6 (1957, 1982, 1993, 2005, 2009, 2017) | 6 (same); Jordan's shot with 17 seconds left in 1982 | Atlantic Coast Conference (ACC) | ACC / ACC | Dean Smith Center | https://en.wikipedia.org/wiki/North_Carolina_Tar_Heels_men%27s_basketball | E-LIST, E-ACC, https://goheels.com/sports/2017/6/23/dean-smith, https://goheels.com/facilities/smith-center/136 | VERIFIED |

## The four corrections

| School | Column | Live | New |
|---|---|---|---|
| Michigan | championships_hint | 1 national title (1989) | 2 national titles (1989, 2026) |
| Gonzaga | conference_hint | West Coast Conference (WCC) | Pac-12 Conference (joined in 2026 after decades in the West Coast Conference) |
| Connecticut | mascot_hint | The Huskies, who play at Gampel Pavilion and the XL Center | The Huskies, who play at Gampel Pavilion and PeoplesBank Arena (formerly the XL Center) |
| Villanova | mascot_hint | The Wildcats, who play at the Finneran Pavilion and Wells Fargo Center | The Wildcats, who play at the Finneran Pavilion and Xfinity Mobile Arena (formerly the Wells Fargo Center) |

A note on Michigan: `docs/audits/cbb_programs_audit.md` says the row was "kept at 2 titles
(1989, 2026), the 2026 confirmed by Anthony", but the live row read on 2026-09-11 says 1. Either
the applied draft differed from the audit's description or the row was later edited; the
migration settles it at 2 on the record above.

## What the harness pins

`scripts/simCbbPrograms.mjs` carries the champion list above (one entry per tournament) and
derives each school's count and years from it, plus one typed conference per school (the
2026-27 membership). It parses the count as the leading integer of `championships_hint`, the
years as the four digit numbers inside the first parenthesis that follows "national title(s)"
(skipped for zero-title rows, whose parenthesis-free text names runner-up finishes, and
replaced by a "1964-1975" text check for UCLA whose years are a range), the conference as
the text of `conference_hint` before its first " (", and the home arena as a phrase
`mascot_hint` must contain (typed per school from the table above; Syracuse's hint describes
its dome rather than naming it, so its phrase is "domed stadium"). Until the migration is
applied the four corrected rows fail against the live table and are printed as "pending
migration 20260911120000"; the run still exits 1. When the table cannot be read it exits 1
and says nothing was checked.
