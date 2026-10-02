# NBA rating inputs recovered

Round895 follow-up, 2026-10-02: separate new-franchise opening estimates
now have generation, engine, Board/control, economy and native evidence.
See `NBA-OPENING-RATINGS-RECEIPT-2026-10-02.md` for accepted source and
remaining limits. This earlier acquisition report stays dated to894: it
does not itself establish a cutover. Shared seeds, ages, memberships and
historical consumers remain held; missing aliases/defensive measures stay
open. All300 new estimates retain partial evidence. Publication is separate.

Date: 2026-10-02. Scope: Codex894 source preparation. Current NBA seed
ratings, generated GM ages, rosters, gameplay and saves remain unchanged.
This is not acceptance of a new player rating model.

## Retained evidence

Directory: `C:/Users/antho/AppData/Local/Temp/dukb-nba894-inputs-2026-10-02`.
`acquisition-ledger.json` records each exact official URL, requested scope,
UTC start/end, response status, bytes, SHA256 and immutable response path.
`coverage-report.json` contains the conservative identity crosswalk, all
unresolved names, actual samples, columns, scope checks and source hash.
Executable: sibling `dukb-nba894-probe.mjs`, run with the repository's
`scripts/lib/offlineTransport.cjs`. No database, live-site or browser read
was used. Public source acquisition was ten requests, once each, no retries.

| Official endpoint | Explicit season | Scope | Rows retained |
| --- | --- | --- | ---: |
| stats.nba.com/stats/leaguedashplayerstats | 2025-26 | Base, Totals, Regular Season | 582 |
| stats.nba.com/stats/leaguedashplayerstats | 2024-25 | Base, Totals, Regular Season | 569 |
| stats.nba.com/stats/leaguedashplayerstats | 2025-26 | Advanced, Totals, Regular Season | 582 |
| stats.nba.com/stats/leaguedashplayerstats | 2024-25 | Advanced, Totals, Regular Season | 569 |
| stats.nba.com/stats/leaguedashplayerbiostats | 2025-26 | Totals, Regular Season | 582 |

Each JSON response echoes the requested season, measure where applicable,
regular-season scope and totals mode. Every row has a positive unique
official PLAYER_ID, full column shape and a named player. Base datasets
pass made-versus-attempt bounds, exact scoring reconstruction
`PTS = 2*FGM + FG3M + FTM`, and `REB = OREB + DREB` across all 1,151 rows.
These arithmetic checks establish internal consistency, not independent
verification of every statistic.

## Coverage of the existing 300 named seeds

291 have a unique accent/punctuation-normalized name match in the current
season response. Their official IDs are unique across the unchanged seed
pool. All291 have matching current advanced and bio observations, identical
game counts, consistent minutes after unit conversion, and true-shooting
percentage within 0.0011 of `PTS / (2*(FGA + 0.44*FTA))`. Among these 291,
23 have no prior-season row at the same official ID, 11 have fewer than 300
current minutes, and 69 fewer than 1,000. Small samples cannot establish
elite ability merely because a per-minute statistic is high.

Nine existing names are unresolved by that conservative current-season
join: Bobby Portis, Fred VanVleet, Tyrese Haliburton, Jimmy Butler, Kyrie
Irving, Ron Holland II, Nicolas Claxton, Keon Johnson and Damian Lillard.
This is not a claim they are absent from the league or retired. Suffixes,
aliases, missed seasons and missing observations require distinct handling.
No guessed official ID, age or zero-valued season was inserted for them.

Past-season TEAM_ABBREVIATION is not evidence of 2026-27 roster membership.
Do not silently change the existing franchises from that field. Existing
seed positions also lack a dated, independently reviewed position crosswalk.

## Important interpretation limits

- Official totals, advanced and bio datasets are one NBA source lineage.
  Agreement between them is not two independent sources. Identity, age and
  selected real-stat comparisons require independent verification before
  adopting player-facing real facts.
- AGE is a season-associated field, not a birth date. It cannot establish
  exact age on 2026-10-02. Do not add one year or infer a birthday to replace
  the GM's generated age. Birth-date recovery remains open.
- The advanced response's MIN is rounded per game even though its echoed
  PerMode is Totals. Base MIN is season total. Dividing base MIN by GP
  reconciles all 291 joined records within the half-step rounding tolerance
  of 0.050001. Treating the two MIN fields as the same unit is wrong.
- Advanced DEF_RATING measures the team's results while the player is on
  court. It is not a standalone individual defensive ability grade. The
  NBA's [stats glossary](https://www.nba.com/stats/help/glossary) describes
  the metrics; its [defensive pressure article](https://cdn-uat.nba.com/news/understanding-defensive-pressure-score)
  explains why ordinary counting stats miss defensive contributions.
- OVR, development, potential and future contracts are original simulation
  judgments. Current performance, projected talent and historical peak
  must remain separate. No named-player grade was assigned in this round.

## Failed preparation attempts, retained

The first valid API response contains UTF-8 names. A Windows default
decoder failed and incorrectly selected the fallback branch. Five official
HTML pages were requested once each; their NEXT_DATA contains layout, not
player-season rows. They receive no source-dataset credit. After the decoder
was corrected, four distinct missing API datasets were requested within an
explicit updated ten-request maximum. The original responses remain held.

The first coverage pass also compared total MIN with per-game advanced MIN
and reported mismatches. That attempt is retained separately in
`coverage-unit-interpretation-attempt.json` and the original probe. The final
unit-aware pass reports zero sample/TS mismatches and 3,515 executed checks,
including the final raw production-source hold.
The first probe also demanded MIN in the bio shape, which contains no MIN
column; the corrected validator requires that column in stat responses only.
These failed attempts are not passing validation evidence. Four separate
in-memory corruption controls change the requested season, duplicate an ID,
alter a point total or remove recorded minutes. Each exits at its intended
scope, identity, arithmetic or required-sample assertion. The final normal
probe passes again; all ten raw responses stay unchanged. Controls and logs
are in `control-summary.json` and `control-*.log`. These are source-preparation
checks in TEMP, not a new production harness or certification of every fact.

## Next production scope

Resolve the nine aliases/season gaps, retrieve independently checked birth
dates and dated position identities, then evaluate a multi-year model with
separate scoring, efficiency, creation, rebounding and defensive evidence.
Apply confidence per opportunity, not just games played. Clip measured
targets before shrinking toward priors. Test opening payrolls, cap pressure,
AI choices, team strength and current-versus-peak consumers. Version new
franchises and preserve earned progression in existing saves. No NBA rating
or age cutover has passed those requirements yet.
