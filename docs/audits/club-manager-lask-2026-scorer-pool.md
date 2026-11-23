# LASK 2026-27 Club Manager scorer pool

The pool supplies names and broad roles for LASK scorer credits in the modern opening season. The baked roster is labeled August 2026, after the summer window, in [clubManagerRosters.ts](../../src/data/clubManagerRosters.ts#L39). It contains seven LASK players and marks the club `CM_PARTIAL`. The six additional identities were already playing for LASK in August. [Baked LASK rows](../../src/data/clubManagerRosters.ts#L2702), [Austrian Bundesliga match sheet, August 14](https://www.bundesliga.at/de/spielbericht/saison-2026-2027/56672/matchcenter), [LASK match report, August 25](https://www.lask.at/de/m/news/spielbericht-lask-celtic)

| Player | Line | Dated membership evidence |
| --- | --- | --- |
| Samuel Adeniran | ATT | Started against Ried on August 14 and Celtic on August 25. He also scored twice in the July 31 league opener against Grazer AK. |
| Moses Usor | ATT | Started against Ried and Celtic and scored in both matches. |
| Sascha Horvath | MID | Started against Ried and Celtic as captain. LASK's July 31 opener report also records his involvement. |
| Alessandro Schöpf | MID | Came on for Horvath against Ried and for Robert Ljubičić against Celtic. |
| Xavier Mbuyamba | DEF | Started in the back three against Ried and Celtic. |
| Andrés Andrade | DEF | Started in the back three against Ried and Celtic. |

The Austrian Bundesliga lineups and the UEFA squad agree on the broad roles in the table. UEFA also describes Adeniran as a striker and Usor as a winger. The pool uses `ATT` for both. UEFA, LASK and the league spell Horvath without an accent and Schöpf with an umlaut. [UEFA 2026-27 squad](https://www.uefa.com/uefachampionsleague/clubs/63405/squad/), [UEFA LASK season profile](https://www.uefa.com/uefachampionsleague/news/02a9-2182ea0b2967-71f1f3de557b-1000--lask-in-the-2026-27-champions-league-what-are-their-fixtu/), [UEFA Celtic match record](https://www.uefa.com/uefachampionsleague/match/2049216/), [LASK league opener](https://www.lask.at/de/m/matches/pros/admiral-bundesliga-26-27/1-runde-14)

The two defenders are centre-backs. Mbuyamba joined permanently from FC Volendam in January 2026. Andrade returned from Arminia Bielefeld in 2023 and signed an extension in August 2025. Both LASK announcements specify contracts through summer 2028. Panama's federation lists the defender as Andrés Alberto Andrade Cedeño and UEFA uses the shorter display name Andrés Andrade. [LASK Mbuyamba signing](https://www.lask.at/en/m/news/lask-sign-dutch-defender), [LASK Andrade extension](https://www.lask.at/en/m/news/andres-andrade-extends-contract-with-lask), [FEPAFUT player identity](https://www.fepafut.com/blog/2026/06/16/del-barrio-al-mundial-los-origenes-de-los-26-guerreros-de-panama/)

João Victor Tornich was the third starter in both August back threes. LASK calls him Joao Tornich or Alemao and made his Portimonense loan permanent in May 2026. UEFA registers him as João Victor Tornich. [LASK purchase announcement](https://www.lask.at/de/m/news/lask-bindet-leistungstraeger-langfristig), [UEFA registered squad](https://www.uefa.com/uefachampionsleague/clubs/63405/squad/)

## Identity checks

The six names were checked against the baked modern, A-League and Russia rosters and the summer transfer and roster confirmation ledgers at published main `4259e67066a4a67e89b774e59069fbc1699dfcaf`. A case- and accent-insensitive comparison also checked Sam Adeniran, Sascha Horváth, Alessandro Schoepf, the Mbuyamba surname, Andres Andrade and Andrés Alberto Andrade Cedeño. It returned no matching rows for the six candidates. [Joined modern roster sources](../../src/data/clubManagerWorldRosters.ts#L24), [Transfer overlay](../../scripts/transferOverlay2026.mjs), [Roster confirmation ledger](../../scripts/data/rosterConfirmation2026.json)

Robert Ljubičić scored for LASK against Celtic and played on LASK's side against AEK Athens on September 8. LASK announced his loan from AEK with a purchase option on July 22, and UEFA independently confirms the move. The existing AEK Athens row spells the same midfielder `Robert Ljubicic`. His loan and present roster identity belong in a separate ownership correction. Christoph Lang played in August, but the league and UEFA classify him in midfield and LASK groups him with its forwards. [LASK loan announcement](https://www.lask.at/de/m/news/robert-ljubicic-wird-laskler), [UEFA AEK Athens match record](https://www.uefa.com/uefachampionsleague/match/2049558--aek-athens-vs-lask/), [Baked AEK Athens row](../../src/data/clubManagerRosters.ts#L90), [Official LASK squad](https://www.lask.at/de/m/teams/pros)

## Replay baseline

The published tree `f7fafd7c73117f7c330f7b83b7e27440a84a4980` matches the previously captured replay at `4c0d9df7f84efa18d451b4bba45996a52bcb7c4e`. The modern Real Madrid replay starts with seed `116137`. From the pending week 3 save, seed `116141` settles the first group matchday and records Galatasaray 0-2 LASK. LASK's two goals draw anonymous midfield and striker slots. The same slots account for one LASK goal at Stuttgart on matchday 3 and one against Dinamo Zagreb on matchday 5. All seven baked LASK players are present at each fixture.

The prior replay files are `title-firstBefore.raw` and `title-firstAfter.raw` in `dukb-cm-ucl-parity-4c0d9df7-ieWYiN`. Their SHA-256 hashes are `8d433adc1dc8c376ab38f6136eba428bc5b7c9e37b207fd1debce87e074c0b69` and `c719ea109efc60f0adc00245810016b3d3225745819548497659ee54ea1d82e1`.

A second modern Real Madrid career starts with seed `119735`. Seed `119739` settles week 3 into week 4 and records LASK 1-1 Sporting CP. The published baseline deals the LASK goal to an anonymous centre-back slot. The candidate credits Andrés Andrade. Both runs use the same 437 random draws, with tape SHA-256 `39fdf910c1f89a845895dea6f675cee022ac54d88c4c9a2de0f0cab134d98771`. Their pending saves have identical SHA-256 `44366266952989243db4bdf4444f388ff20e80a5bc5e540376a980d77db4797e`.
