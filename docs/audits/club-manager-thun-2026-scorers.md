# Club Manager Thun cup scorers, 2026-27

Club Manager's modern roster represents August 2026 after the summer window. In that world, Thun has goalkeeper Niklas Steffen and too few registered players to produce a complete opposing XI. These ten verified outfield names support simulated cup goals in the match report and scorer table.

## Opening participation and roles

All ten players appeared for Thun in the 21 July 2026 Champions League qualifier against Dinamo Zagreb. Thun and Dinamo record the starters and substitutions independently. Thun and UEFA both list the players by broad role. Thun also carried all ten in its November matchday squad against Young Boys, including Nicolas Bürgy on the bench, so the opening selection required no post-August departure exclusions. [Thun qualifier report](https://www.fcthun.ch/de/news/2026/matchbericht-thun-zagreb), [Dinamo match sheet](https://www.gnkdinamo.hr/hr/utakmice/389), [Thun squad and roles](https://www.fcthun.ch/de/teams/1-mannschaft/kader), [UEFA squad and roles](https://www.uefa.com/uefachampionsleague/clubs/80409--thun/squad/), [Thun November report](https://www.fcthun.ch/de/news/2026/matchbericht-young-boys-fc-thun)

| Role | Verified Thun players |
| --- | --- |
| Defense | Jan Bamert, Marco Bürki, Nicolas Bürgy, Lucien Dähler |
| Midfield | Justin Roth, Nico Maier, Nassim Zoukit, Nils Reichmuth |
| Attack | Brighton Labeau, Marc Gutbub |

These names and broad roles support attribution for simulated events. The game still relies on its existing scores, match events, ratings and lineups. An accent-insensitive scan against the pinned modern roster, A-League and Russia files, scorer pools, static player fallback, free agents, transfer overlay and roster confirmation ledger found no duplicate among the ten.

## Opening ownership

The preceding release registers Franz-Ethan Meichtry with Genoa and Uros Vasic with FC Biel-Bienne 1896 through their original Thun-origin ownership keys. The correction leaves the old baked source rows available for saves that already use them. A direct worldwide bake move reproduced Meichtry at both Genoa and Porto when the old save held a Thun-origin record at Porto. Neither departed player belongs in Thun's verified scorer supplement, and saved match and roster records continue to follow the authority in the career. [Opening departures and old-save control](club-manager-thun-2026-opening-departures.md)

## Exact pre-change replays

The local baseline uses published commit `0ad0996ba54d3c53e75d1a2db10d4ef4e11055be`, tree `f43c30b55e59c2563d68b667b994278987c88902`. It uses all current Club Manager career options, the opening coaching book and the live goal-review rule. With tracing disabled, all saved checkpoint hashes, fixture scores, reports and RNG tapes matched the earlier release candidate.

| Club Brugge start seed | Match seed | Matchday | Simulated fixture | Missing Thun attribution |
| ---: | ---: | --- | --- | --- |
| 115366 | 115373 | 2 | Thun 1-4 Manchester City | One open-play forward goal |
| 115366 | 115387 | 6 | Thun 2-0 Celtic | A free kick and an open-play goal from the same forward slot |
| 115368 | 115372 | 1 | Thun 1-1 Como | One open-play defensive goal |
| 115373 | 115377 | 1 | AGF 2-1 Thun | One open-play midfield goal |
| 115390 | 115411 | 6 | Thun 3-3 Club Brugge, managed opponent | Three goals labeled Thun No. 10, No. 11 and No. 8 |

The managed match's labels appeared at minutes 2, 49 and 78. The save had no named opponent XI or bench, and none of those goals appeared against a player in the scorer ledger. The background fixtures recorded each goal for an anonymous slot while the scoreboard still counted it.
