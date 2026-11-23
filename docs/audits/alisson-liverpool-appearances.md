# Alisson Liverpool appearances audit

The two verified Alisson records cover seven completed Liverpool seasons through 2024-25. The count includes competitive first-team matches. The two match archives agree on each season and total 298 appearances. Liverpool's 300th-appearance report and lineups for his first two outings of 2025-26 corroborate that total. [LFCHistory match archive](https://www.lfchistory.net/players/1330) · [Association of Football Statisticians](https://www.11v11.com/players/alisson-becker-250168/) · [Liverpool 300th appearance](https://www.liverpoolfc.com/news/alisson-becker-becomes-seventh-liverpool-goalkeeper-reach-300-appearances/) · [2025 Community Shield](https://www.liverpoolfc.com/news/liverpool-beaten-penalties-crystal-palace-2025-community-shield/)

| Season | Premier League | FA Cup | League Cup | Europe | Other | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 2018-19 | 38 | 0 | 0 | 13 | 0 | 51 |
| 2019-20 | 29 | 0 | 0 | 5 | 3 | 37 |
| 2020-21 | 33 | 1 | 0 | 7 | 1 | 42 |
| 2021-22 | 36 | 4 | 1 | 13 | 0 | 54 |
| 2022-23 | 37 | 2 | 0 | 8 | 0 | 47 |
| 2023-24 | 28 | 2 | 0 | 2 | 0 | 32 |
| 2024-25 | 28 | 0 | 1 | 6 | 0 | 35 |

The other matches are the 2019 and 2020 Community Shields and both December 2019 Club World Cup games. Liverpool selected Adrián for the 2019 UEFA Super Cup and the 2022 Community Shield. [2019 Shield lineup](https://www.liverpoolfc.com/news/first-team/359141-team-news-liverpool-confirmed-manchester-city-community-shield) · [2020 Shield lineup](https://www.liverpoolfc.com/news/first-team/407077-confirmed-team-news-community-shield-arsenal) · [Monterrey match](https://www.liverpoolfc.com/news/first-team/378811-liverpool-monterrey-club-world-cup-match-report) · [Flamengo lineup](https://www.liverpoolfc.com/news/first-team/379484-confirmed-team-news-liverpool-flamengo-club-world-cup-final) · [2019 UEFA Super Cup lineup](https://www.liverpoolfc.com/news/first-team/360632-confirmed-liverpool-team-chelsea-uefa-super-cup) · [2022 Shield lineup](https://www.liverpoolfc.com/news/nunez-and-salah-strike-late-reds-claim-community-shield?amp=1)

The migration checks one row for each season and label at positions 6 through 12. It accepts the observed count or the verified count. The PostgreSQL fixture reproduced twelve changes, a no-op on reapplication and five atomic rollback cases. The two existing correct counts are covered by the data checks. The client applies the same values to known stale inputs and the Quiz bundle stores the corrected totals. The rebake ledger detects all twelve outdated values.

The two public histories end at 2024-25. The completed 2025-26 season has 35 appearances. A later addition needs to keep the score for a Daily already opened with the shorter career and check the related Transfer Path hints. [LFCHistory 2025-26 match log](https://www.lfchistory.net/players/1330/games-per-season/135) · [Opta competition record](https://theanalyst.com/players/4096/alisson-becker/career)
