# Round 999 candidate data provenance

Reviewed 2026-10-03. Scope: the proposed completed-league-career Rank 'Em circuit, using `C:/Users/antho/ballpark-hero/src/lib/orderTheList.ts` (SHA256 `4a9b29264c7fe9d7fef11787308c2f768b16b0a751995237fa0c9452b5e7c460`). This is not an audit of the database or every existing Rank 'Em board. No production queries, source changes, tests or builds were performed.

## Decision

The final approved circuit pool has nine boards and 45 checked name/value entries: eight existing boards with 40 matching entries, plus the five matching entries in the circuit-only stolen-base board below. Each matches an official league source and the independently maintained Sports Reference tables. Ty Cobb's existing stolen-base entry does not have agreement between those record conventions. The previously excluded hits board has the same problem.

Parent approved `mlb-sb-circuit` using the five verified entries below, with the same-family exclusion when today's legacy ID is `mlb-sb`. The approved existing IDs are `nba-pts`, `nba-reb`, `nba-blk`, `nba-gp`, `nhl-pts`, `nhl-ast`, `nhl-gp` and `mlb-hr`. Neither `mlb-hits` nor the existing `mlb-sb` is approved for this circuit. Neither legacy board was rewritten.

## Existing boards cleared

All totals below are regular-season totals in the named league. Names are the existing display names; Hank Aaron and Henry Aaron refer to the same player.

| Board | Five checked entries, descending | Official primary | Independent check |
| --- | --- | --- | --- |
| `nba-pts` | Kobe Bryant 33,643; Dirk Nowitzki 31,560; Shaquille O'Neal 28,596; Carmelo Anthony 28,289; Allen Iverson 24,368 | [Pelicans 2025-26 media guide, printed p. 215][nba-guide] | [Basketball Reference points][nba-points] |
| `nba-reb` | Tim Duncan 15,091; Karl Malone 14,968; Kevin Garnett 14,662; Dwight Howard 14,627; Pau Gasol 11,305 | [Media guide, printed p. 214][nba-guide]; [NBA Gasol release][pau] | [Basketball Reference rebounds][nba-rebounds] |
| `nba-blk` | Hakeem Olajuwon 3,830; Dikembe Mutombo 3,289; Kareem Abdul-Jabbar 3,189; Tim Duncan 3,020; David Robinson 2,954 | [Media guide, printed p. 214][nba-guide] | [Basketball Reference blocks][nba-blocks] |
| `nba-gp` | Robert Parish 1,611; Kareem Abdul-Jabbar 1,560; Vince Carter 1,541; Dirk Nowitzki 1,522; Kevin Garnett 1,462 | [Media guide, printed p. 214][nba-guide] | [Basketball Reference, Reg G column][nba-games] |
| `nhl-pts` | Wayne Gretzky 2,857; Jaromír Jágr 1,921; Mark Messier 1,887; Ron Francis 1,798; Mario Lemieux 1,723 | [NHL Records, RS P column][nhl-points] | [Hockey Reference points][hr-points] |
| `nhl-ast` | Wayne Gretzky 1,963; Ron Francis 1,249; Mark Messier 1,193; Jaromír Jágr 1,155; Adam Oates 1,079 | [NHL Morning Skate, Feb. 24, 2025][nhl-assists] | [Hockey Reference assist milestones][hr-assists] |
| `nhl-gp` | Patrick Marleau 1,779; Mark Messier 1,756; Jaromír Jágr 1,733; Joe Thornton 1,714; Chris Chelios 1,651 | [NHL Records games played][nhl-games] | [Hockey Reference games played][hr-games] |
| `mlb-hr` | Barry Bonds 762; Henry Aaron 755; Babe Ruth 714; Albert Pujols 703; Willie Mays 660 | [MLB 500-home-run hitters][mlb-homers] | [Baseball Reference home runs][br-homers] |

Column checks matter: the NHL primary points page includes playoffs in a separate total, so only its `RS P` values were used. The NBA independent games page contains combined totals, so only `Reg G` was used. Jágr's NHL line ends in 2017-18. These boards concern completed NHL totals, not a claim about retirement from every professional league. Mays remains at 660 homers in [MLB's Negro Leagues adjustment][mays].

## Verified circuit-only MLB replacement

The approved `mlb-sb-circuit` is separate from the existing `mlb-sb`. All five numbers also agree with the same independent [Baseball Reference stolen-base table][br-steals].

| Player | Career steals | Official primary |
| --- | ---: | --- |
| Rickey Henderson | 1,406 | [MLB career record][rickey] |
| Lou Brock | 938 | [Cardinals career biography][brock] |
| Tim Raines | 808 | [MLB career record][raines] |
| Vince Coleman | 752 | [MLB career record][coleman] |
| Kenny Lofton | 622 | [MLB career record][lofton] |

The first four are already present and verified in the old stolen-base board. Lofton is the one additional verified entry. Treat the old `mlb-sb` daily ID as the same category for exclusion so today's stolen-base challenge is not replayed through a renamed variant. This still leaves home runs available; on a home-run daily, the new stolen-base board is available.

## Unresolved legacy discrepancies, excluded from this circuit

The [current official MLB Cobb record][cobb] reports 4,191 hits and 892 steals. Baseball Reference instead records [4,189 hits][br-hits] and [897 steals][br-steals], which match the existing game values. This is a source-convention disagreement, not evidence that the game invented those numbers.

[SABR's detailed hit reconstruction][sabr-cobb] supports 4,189, while [MLB explicitly distinguishes its official count from Baseball Reference][mlb-cobb-hits]. MLB editorial coverage itself sometimes uses 897 steals, including the [Raines career article][mlb-raines-story], but that does not remove the contradiction with its current player record. Neither discrepancy is resolved by counting multiple MLB pages as independent sources.

The existing `mlb-hits` and `mlb-sb` remain outside the clear-board list. The report does not certify the other four entries on the excluded hits board. No legacy values were changed.

## Method and limits

League-hosted records, official media documents and official player records were compared against Basketball Reference, Hockey Reference and Baseball Reference. Those three sites are one independent publisher relative to the leagues, not three independent confirmations of one fact. Syndicated articles, mirrors, search snippets citing another site's table, and two pages from one league were not counted as independent sources.

Some Sports Reference pages refused direct automated opening. Their indexed source text exposed the full relevant rows and column headings, which were read and matched; this report does not claim a locally downloaded archival copy of every source. The entries are completed-career totals, but historical record research can revise them. Preserve these source links and review any later proposed refresh rather than changing saved historical results silently.

[nba-guide]: https://cdn.nba.com/teams/uploads/sites/1610612740/2025/10/2025-26-Pelicans-Media-Guide-v2.pdf
[pau]: https://www.nba.com/news/pau-gasol-joins-trail-blazers-release
[nba-points]: https://www.basketball-reference.com/leaders/pts_career.html
[nba-rebounds]: https://www.basketball-reference.com/leaders/trb_career.html
[nba-blocks]: https://www.basketball-reference.com/leaders/blk_career.html
[nba-games]: https://www.basketball-reference.com/leaders/g_career_c.html
[nhl-points]: https://records.nhl.com/records/skater-records/points/most-points-career-including-playoffs
[nhl-assists]: https://media.nhl.com/site/vasset/public/attachments/2025/02/18718/MorningSkate_022425.pdf
[nhl-games]: https://records.nhl.com/records/skater-records/seasons-and-games/most-games-played
[hr-points]: https://www.hockey-reference.com/leaders/points_career.html
[hr-assists]: https://www.hockey-reference.com/friv/milestones.cgi?stat=assists
[hr-games]: https://www.hockey-reference.com/leaders/games_played_career.html
[mlb-homers]: https://www.mlb.com/stories/mlb-500-home-run-hitters
[br-homers]: https://www.baseball-reference.com/leaders/HR_career.shtml
[mays]: https://www.mlb.com/news/willie-mays-negro-leagues-stats-adjustment
[rickey]: https://www.mlb.com/player/rickey-henderson-115749
[brock]: https://www.mlb.com/cardinals/fans/tribute/lou-brock/bio
[raines]: https://www.mlb.com/player/tim-raines-sr-120891
[coleman]: https://www.mlb.com/player/vince-coleman-112487
[lofton]: https://www.mlb.com/player/kenny-lofton-117863
[br-steals]: https://www.baseball-reference.com/leaders/SB_career.shtml
[cobb]: https://www.mlb.com/player/ty-cobb-112431
[br-hits]: https://www.baseball-reference.com/leaders/H_career.shtml
[sabr-cobb]: https://sabr.org/journal/article/how-many-hits-did-ty-cobb-make-in-his-major-league-career-what-is-his-lifetime-batting-average/
[mlb-cobb-hits]: https://www.mlb.com/news/ichiro-suzuki-ties-ty-cobb-with-4191-hits/c-143238738
[mlb-raines-story]: https://www.mlb.com/news/tim-raines-10-best-moments
