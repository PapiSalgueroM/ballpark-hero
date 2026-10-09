# Round 1184: real first-season league fixtures

Status: implementation authored and static review completed. Remote validation is pending. This document records retained data and source checks, not release acceptance.

## Verified scope

One league-season is covered: the 2026/27 Premier League. The ledger certifies round order, opponents and home/away venues. Calendar dates, kickoff times, scores, results and scorers are excluded. Domestic cups and European competitions continue to use the game's simulation.

The two-source receipt is [clubManagerPremierFixtures2026.receipt.json](../scripts/data/clubManagerPremierFixtures2026.receipt.json). The product bake is [clubManagerPremierFixtures2026.ts](../src/data/clubManagerPremierFixtures2026.ts). Source names are mapped to the game's existing canonical club names; no club or player facts are added.

| Retained source | Publication | Rows read | Unique fixtures |
| --- | --- | ---: | ---: |
| [Official Premier League fixture release](https://www.premierleague.com/en/news/4675097) | 2026-06-19 | 381 | 380 |
| [Sports Illustrated full fixture schedule](https://www.si.com/soccer/2026-27-premier-league-fixtures-full-schedule-arsenal-defend-title) | 2026-06-19 | 380 | 380 |

Both were read on 2026-10-09. The official article repeats Liverpool at home to Brighton in round 8 at source lines 157 and 161. The receipt marks the second occurrence as a duplicate; it is excluded from the ledger. The two retained sources' unique `round | home | away` tuples agree exactly, with zero differences. No disagreement was resolved by guessing.

The sources do not certify one shared set of match dates. The independent article retains released dates, while the official article contains rearranged dates. Those date fields were deliberately excluded, so the game's weekly dates remain simulated.

## Independent file audit

Plain PowerShell/.NET JSON reads independently confirmed:

- 20 distinct canonical clubs and 380 fixtures.
- 38 rounds with 10 matches and all 20 clubs appearing once per round.
- 19 home and 19 away games for each club, against 19 distinct opponents.
- Exactly one directed home fixture against each other club.
- Exact equality between the ledger and both retained source tuple sets after the documented duplicate is removed.
- No match dates, scores, kickoff times, results or scorers in the ledger.
- The durable receipt preserves every retained acquisition field and all 761 source rows, adding only readable canonical name mappings. The product data copy preserves every ledger field and adds only the two source links.

Retained acquisition inputs under `.tmp-fx/cm-real-fixtures1184`:

| File | SHA256 |
| --- | --- |
| `verified-ledger.json` | `bc2001888404408cada9815163c326cbf3cf569e72a6a4d7fdacbf899c6f4efc` |
| `acquisition-receipt.json` | `291b351308b4b7bdeeb6aac8220b89cbe8e0474296cbe1153d425932984a5a0c` |

The committed receipt adds `nameNormalization` only: AFC Bournemouth to Bournemouth, both Brighton spellings to Brighton, Newcastle United to Newcastle, and Tottenham Hotspur to Tottenham. Its SHA256 is `7e97c3119a28400654366b8979d3f1146c635a0303da4d1bc8adce00fba6d54e`. An independent field comparison confirmed that no retained source tuple or other acquisition field changed.

## Reviewed source contract

Only a newly bound, unedited first season with the verified league, start year and exact club field may use the real ledger. Existing saves without the opt-in key retain their generated fixture order. Unsupported leagues, historical eras, edited or custom fields, and future seasons retain generated schedules. The saved membership order and the existing generated round-pair function stay intact.

All five direct fixture consumers use the same saved resolver: the player's fixture lookup, the other results in that league round, bye handling, AI world rounds and the calendar card. The unchanged generated pairing function remains the resolver's single fallback, using the save's existing balance flag. Calendar coverage and Help explicitly distinguish real opponent order and venues from simulated dates and results.

The generated balance harness removes only `realLeagueFixtures` when constructing its generated schedule contexts. Its original league sizes, structural run-of-two bound, old venue oracle, old-save load/play behavior, rollover checks and AI ledger floors remain intact. The generated digest comparison also removes only the new key before hashing and playing; no golden digest changes. Natural real-eligible starts are tested separately against the retained fixture tuples, rather than the generated venue-run bound.

## First remote run

Run `37955981328` on source `df9988b53820e0fa942fa6bade09d49fa613e129` did not pass the focused proof. The retained early artifact is `11628486227`, SHA256 `37de6154c701905271b7f905fbb687daaa781d7aa2dc9f87b5aacf04ea1856d5`. It is diagnostic evidence, not release acceptance.

The real fixture reads reached all 760 checks. Later assertions incorrectly read a nonexistent `TableRow.p` instead of deriving played from wins, draws and losses. The test-only calendar bundle used classic JSX, and a fresh-save byte assertion omitted the existing loader's default repairs. The corrected proof retains complete input, prior/candidate loaded and saved JSON, full field comparisons and equal random draws. Fresh first-load repairs must exactly match the independent prior loader, with exact byte stability on subsequent loads. Already repaired legacy saves retain their original byte invariant. Every copied fault also requires an untouched current-source baseline; the legacy guard fault must fail precisely its legacy and affected unsupported-world groups.

These corrections affect verification scripts only. Remote validation of the corrected source is still required.

## Second remote run

Run `37958406252` on source `0cb43f22d69675815f5d93329131d4bee1b6642d` passed the app types and production build. Its retained early artifact is `11630951132`, SHA256 `940c6c81e8792802c2890e4544b7befd042bcd0fbc3a6c32d15115ada8087465`. This remains diagnostic evidence, not acceptance.

The normal proof reached all 760 fixture readings, 760 calendar readings and all 380 settled matches. Its one remaining assertion compared an untouched raw save with a JSON clone that had discarded existing own properties holding `undefined`. The revised in-memory immutability snapshot uses `structuredClone`, retaining full field equality and adding exact serialized-byte equality. All nine copied fault processes already met their exact expected failure/pass sets.

Both later-season browser journeys passed complete oracle settlement and saved-world initialization. The real journeys stopped at a comparison of the official article's within-round publication order. An independent JSON audit confirmed zero round/home/away tuple differences across all 38 rounds; 25 official rounds differ only in publication order, while the product's pair order matches the independent source. The revised comparison retains all 38 round bindings and normalizes directed tuple order only within each round. Legacy journeys remain required because the stopped real journey had not produced their input.

No product source changed for these proof corrections. A fresh exact-head remote run is still required.

## Third focused proof and broad diagnosis

Run `37959415902` on source `8514d8a3d73cfa9576161edd0a2d121df24f09fb`, tree `4b29275163de9e0c1e53b84ca14603ef04b9bbf0`, passed types/build, all 11 focused outcome groups and nine effective copied faults. Its early artifact `11629752888` was downloaded and SHA256 verified as `31fc4d9f4b670ecd42a775be9060740279bb4f5a9424408e359164d83b0fb01c`, with matching head/tree receipts. All 760 fixture readings, 760 calendar readings and 380 settled matches passed. All six real, legacy and future phone/desktop journeys passed, with complete saved-state differences empty, 18 neutral opening results, two effective native faults and no page/asset errors or forwarded external requests. This focused acceptance is not broad release acceptance.

The first run's final artifact `11630787198`, SHA256 `cd52bd9c73cc83da4bf5fd975be58a4267d98bb471148511208f0c1ef14c8efd`, retained 67 runner verdicts: 63 passed and four failed. No runner was classified as skipped, empty or not run. Direct Quick Subs passed 10 actual outcomes and 13 controls. The healthy generated fixture harness and all eight existing faults passed, as did all 15 required built readers and four additional search/SEO readers; source bytes held.

The four broad failures require compatibility proof corrections:

- Live Match's measured generated cohort retained a real first-season key while artificially moving some fixtures to a future season. Its original 42 generated cases and 30/10/10 floors now explicitly use the generated context. Two additional, separately counted and source-bound real openers must finish the existing signed-player checks through live and Quick Sim paths. All six original controls remain.
- Saved Slots' measured four-season plus 15-entry old-save fixture now starts without only the new opt-in key. The strict history trim check, whole roundtrip, budget, rollback and all 20 switches remain; natural real starts also require the sourced opening pair, venue and version key. All six controls remain.
- The new pure harness reads anchor text with immediate UTF8 line-ending normalization, while preserving independent raw-byte hashes and both source-held comparisons. The existing anchor fence is unchanged.
- World Editor counted a final result log capped at 60 matches. Its revised observer records every actual returned league report, retains the exact calendar match count (46 in the Championship), requires the own table to record that same count and requires calendar completion. Complete traces, final saves and retained log composition are recorded. Its new copied-observer fault omits exactly one actual report in each of the three original runs and must fail precisely those three count assertions while every unrelated check passes. The raw log cap and all original product source are unchanged.

These verification corrections require a new exact-head remote run, including all existing Manager and output-reader gates plus the retained lifecycle controls. No product source or golden baseline digest changed during diagnosis.

## Native screenshot review

The third run's desktop calendar images were captured before the existing parent/selected-strip two-frame reveal completed and showed mostly blank space. Passing saved-state assertions do not establish visual acceptance. The driver now reaches the overview and source links with actual focus actions, waits for readable geometry, a painted centre, settled finite animations and four stable frames, then records full scroll/style/layout diagnostics before each image. Selected-day reveal is checked without forced scrolling, styles or state. Help is captured after real dialog focus. All six journeys and complete save/oracle/control assertions remain intact. A fresh exact-head native run and visual inspection are required.

## Validation still required

Remote types/build, focused outcomes, effective copied defects, unchanged old-save/future/custom baselines, existing fixture and world harnesses, native phone/desktop journeys, and output-reader gates are pending. Authored proof includes 11 real fixture outcome groups, all 760 player fixture readings, all 760 calendar readings, a full 380-match simulated campaign and nine copied outcome controls. The independent old/generated comparison uses the pre-change engine and calendar card, with whole-save and random-draw equality across three seeds and current, historical, edited and custom contexts. The balance harness retains its three original controls and adds five controls for natural version binding, fallback flag/count and engine/calendar resolver bypasses. These counts describe the required remote proof, not passing results.

Native journeys cover real, old-key-absent and actually rolled future saves at 390 and 1280 pixels, with calendar source copy, actual Quick Sim settlement, whole saved state equality and reload preservation. Their outcome and screenshot artifacts remain pending.

No local site runtime, compiler, build, test or browser was executed for this audit. No database write or deployment is part of this round.

A passing focused gate will not imply all-repository, live database, prerender, release or publication acceptance. Merge and publication remain with the release integrator.
