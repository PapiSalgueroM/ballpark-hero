# Four format guide corrections

Checked 2026-09-15. This is a targeted correction of five claims, not a new audit of every season. The four original full-guide verification dates remain unchanged. No gameplay rules, results, fixtures or engine values changed.

## Verified claims and sources

### NBA: 1967 through 1970 pairings

The 1966-67 to 1969-70 table row had first against fourth and second against third. Corrected to first against third and second against fourth.

- [Wikipedia, NBA playoffs timeline and 1967 to 1970 bracket](https://en.wikipedia.org/wiki/NBA_playoffs#Timeline): explicit seed pairings and period.
- [NBA, 1966-67 season review](https://www.nba.com/news/history-season-review-1966-67): the actual division semifinal matchups corroborate the bracket.
- [Basketball Reference, playoff series](https://www.basketball-reference.com/playoffs/series.html): indexed 1967 results displayed seeds 1 against 3 and 2 against 4. The subsequent direct fetch returned 403, so this is corroboration only, not a newly added page citation.

Changed `src/lib/nbaPlayoffFormatHistory.ts`; the existing page renders that qualifying field directly in both the table and period detail.

### NBA: two divisions was the 1970 structure

The 1970-71 detail said each conference's two-division structure was still used. It now distinguishes that arrangement from three divisions per conference beginning in 2004-05.

- [NBA, 2004-05 season review](https://www.nba.com/news/history-season-review-2004-05): expansion and realignment.
- [Wikipedia, NBA playoffs history](https://en.wikipedia.org/wiki/NBA_playoffs#History): 2004 realignment to three divisions per conference.

Changed the conferences note in `src/lib/nbaPlayoffFormatHistory.ts`. Added the two official season-review citations to the affected rows.

### Champions League: 2019-20 knockout exception in the table

The 2003-04 to 2023-24 table cell implied two legs throughout. The cell now identifies the single-match quarter-finals and semi-finals in 2019-20. The existing detailed note already described this exception.

- [UEFA, Champions League to resume on 7 August](https://www.uefa.com/uefachampionsleague/news/025e-0f9a3f8c5c4d-3323c8a96a4d-1000--final-eight-in-lisbon/): the June 2020 format announcement.
- [RSSSF, European competitions 2019-20](https://www.rsssf.org/ec/ec201920.html): the completed knockout results, one match per quarter-final and semi-final.

Added a presentation-only exception field in `src/lib/uclFormatHistory.ts`, rendered by `src/pages/ChampionsLeagueFormatHistory.tsx`. The usual `koLegs` value and game comparison are untouched.

### MLB: eight qualifiers in 1981

The 1969 to 1984 table's field cell said four clubs without showing the split-season exception. It now also says eight in 1981. The existing period note already explained the extra round.

- [MLB, Complete history of baseball's postseason formats](https://www.mlb.com/amp/news/baseball-postseason-format-changes.html): the 1981 split-season format.
- [Baseball Almanac, postseason history](https://www.baseball-almanac.com/ws/postseason.shtml): the eight 1981 Division Series participants.

Added a presentation-only field note in `src/lib/mlbPostseasonFormatHistory.ts`, rendered inside the field cell by `src/pages/MlbPostseasonFormatHistory.tsx`. The ordinary field remains four. The MLB article was readable for this check; its original blocked-fetch note now records that narrow change.

### NHL: 2020-21 qualifying exception in the FAQ

The answer about how many teams qualify said the wild-card rules applied continuously since 2013-14. It now names the temporary top-four-per-division arrangement in 2020-21 and the usual format's return in 2021-22.

- [NHL, new divisions for 2020-21](https://www.nhl.com/news/nhl-teams-in-new-divisions-for-2020-21-season-319844882): the temporary qualifying rule.
- [Wikipedia, 2020-21 NHL season](https://en.wikipedia.org/wiki/2020%E2%80%9321_NHL_season): the same rule in the season overview and bracket.
- [NHL, 2025 playoff guide, page 13](https://media.nhl.com/site/asset/public/ext/2024-25/2025StanleyCupPlayoffs_1stRound.pdf#page=13): 2020-21 exception and 2021-22 return.

Changed only the affected answer in `src/pages/NhlPlayoffFormatHistory.tsx`; its library already contains the correct exception and citations.

## Verification contract

The four matching `sim*FormatHistory.mjs` harnesses render the actual page components. Only unrelated navbar and head chrome are stubbed. The shared `scripts/lib/renderFormatGuide.mjs` parses the resulting HTML without scripts or network access. Assertions inspect the specific table cell, conferences note list, or FAQ answer, never the whole page. Default runs apply the same assertions to saved HTML as well as the current component.

`FORMAT_GUIDE_SOURCE_ONLY=1` explicitly labels saved HTML as pending build. It does not waive that gate in default runs. Existing timeline, provenance, engine and snapshot checks remain. The esbuild API replaces the shell launcher to run the same bundle steps on Windows and CI.

New effective controls restore the old wrong claims while leaving the correct lower notes intact:

| Harness variable | Control | Required finding |
| --- | --- | --- |
| `NBA_PLAYOFF_CONTROL` | `pairings` | 1967 table pairings |
| `NBA_PLAYOFF_CONTROL` | `divisions` | conference note must distinguish |
| `UCL_FORMAT_CONTROL` | `table` | UCL table knockout cell |
| `MLB_POSTSEASON_CONTROL` | `field` | 1981 table field |
| `NHL_PLAYOFF_CONTROL` | `faq` | NHL field FAQ must name |

Every new mutation requires exactly one changed anchor. Controls follow the existing harness convention: exit 0 only when the expected section reports the intended error; exit 1 if the mutation does not fire or escapes the guard. Temporary bundles and control copies stay outside `src`.

Validation on 2026-09-15: all four source-only healthy harnesses passed, including the real UCL engine comparison. All 13 controls passed their intended-failure checks (eight existing controls and the five above). After the final MLB whitespace change, its field control was rerun and passed. Default runs rejected all four old snapshots at the affected saved cell or answer; the old source-count gates also rejected the missing new NBA and MLB citations. The saved-HTML adapter follows the actual prerenderer, which flattens table cells to consecutive paragraphs, and confines each lookup to its exact season label and column. It reads only the conferences note list and the NHL answer following its exact question.

Full type/build and regenerated snapshot verification remain with the release coordinator. No generated public files have been changed by this task.
