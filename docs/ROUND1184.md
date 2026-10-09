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

## Validation still required

Remote types/build, focused outcomes, effective copied defects, unchanged old-save/future/custom baselines, existing fixture and world harnesses, native phone/desktop journeys, and output-reader gates are pending. Authored proof includes 11 real fixture outcome groups, all 760 player fixture readings, all 760 calendar readings, a full 380-match simulated campaign and nine copied outcome controls. The independent old/generated comparison uses the pre-change engine and calendar card, with whole-save and random-draw equality across three seeds and current, historical, edited and custom contexts. The balance harness retains its three original controls and adds five controls for natural version binding, fallback flag/count and engine/calendar resolver bypasses. These counts describe the required remote proof, not passing results.

Native journeys cover real, old-key-absent and actually rolled future saves at 390 and 1280 pixels, with calendar source copy, actual Quick Sim settlement, whole saved state equality and reload preservation. Their outcome and screenshot artifacts remain pending.

No local site runtime, compiler, build, test or browser was executed for this audit. No database write or deployment is part of this round.

A passing focused gate will not imply all-repository, live database, prerender, release or publication acceptance. Merge and publication remain with the release integrator.
