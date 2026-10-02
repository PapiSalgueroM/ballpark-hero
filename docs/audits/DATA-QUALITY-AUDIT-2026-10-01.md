# Read-only data-quality audit, October 1, 2026

Clean local baseline: C:/Users/antho/AppData/Local/Temp/dukb-round842-845-production, commit 8542bf83. Production sports-table reads were SELECT only on October 1 UTC. Unaccepted 845 draft excluded. No product/database changes, deploys or submissions. This is data evidence, not a conclusion about Google approval or current publication.

## Findings

| ID | Priority | Evidence class | Location |
| --- | --- | --- | --- |
| DQ01 | P1 | confirmed systemic structural corruption plus two-source factual sample | public.nhl_player_stats |
| DQ02 | P1 | confirmed systemic structural corruption plus two-source factual sample | public.mlb_batting_stats |
| DQ03 | P2 | confirmed wrong visible numeric value, already marked unverified | src/data/hockeyHLPlayers.ts:32 |
| DQ04 | P2 | source disagreement, not automatic correction | src/data/cfbHLPlayers.ts:41 and public.cfb_qb_stats |
| DQ05 | P2 | documented provenance gaps, not newly proven false numbers | Soccer and CFB Higher or Lower plus five NFL categories |
| DQ06 | P3 | ambiguous source metadata needing adjudication | public.mlb_players |
| DQ07 | P3 | incomplete displayed career metadata, list completeness is unspecified | hockeyHLPlayers.teams and f1HLDrivers.constructors |

### DQ01: NHL imported rows are structurally corrupt

Of 6,353 production rows, 68 have malformed first seasons, 64 violate points=goals+assists, and 1 has a negative points total. These overlap:69 distinct rows, with 63 in both first groups.59 malformed rows have zero points. Full raw values are in nhl-malformed-rows.json.

Bobby Robins stores GP33/start`3`/G3/A0/P0. Correct agreed career totals are GP3/start2014-15/G0/A0/P0. The sources support this sample, not a blanket replacement for all 69 rows. [primary](https://api.nhle.com/stats/rest/en/skater/summary?isAggregate=true&isGame=false&cayenneExp=skaterFullName%3D%22Bobby%20Robins%22), [independent](https://www.hockey-reference.com/players/r/robinbo01.html).

Tyson Gross stores G0/A1/P-2. That is an internal arithmetic defect; his correct real total is not asserted. The pattern is consistent with shifted importing, but no parser cause has been proven.

Affected field paths: /hockey-grid accepts the numeric columns, /perfect-season-nhl uses date filters, GP and ratings, /puck-detective uses points for difficulty. Draft 49 malformed rows pass broad 2010s filters, but franchise/top-N/actual wheel gates restrict admission; no actual drafted corrupt player is claimed. Only David Spacek 0 and Tyson Gross-2 exact-name join the roster table before Puck normalization. Both values are below 75, and actual normalized admission was not replayed. Connect 4 consults teams for confirmation. No changed achievement verdict, draft result or difficulty tier is demonstrated by these low-total samples. The eligible_nhl_players view has no quality filtering and no active source reader located beyond generated types.

Flag 69 records for a separately authorized import review. Do not add 68+64 as independent records.

### DQ02: MLB career table contains invalid dates and totals

The original SQL measurements on 2,000 rows found 147 first-year values matching `year_from !~ '^[12][0-9]{3}$' OR year_from < '1871'`, 53 matches of the TEXT predicate `year_from > year_to`, and 161 total-bases identity failures. The first-year predicate has no future-year upper bound. Rechecking the 161 captured rows numerically finds 9 reversed year spans; the other 44 TEXT matches have malformed short first-year strings that compare above four-digit last years lexically. The union remains 161 records. The evidence annotations use the original first-year predicate and the numeric reversal check, rather than calling all 53 TEXT matches reversed careers. The total-bases formula is `TB = H + doubles + 2 × triples + 3 × HR`; 2B and 3B denote the doubles and triples columns.

Al Bridwell stores start1252/end1905/H457/2B935/3B95/HR32/TB90. Official MLB and Baseball Reference agree on H1064/2B95/3B32/HR2/TB1229, and debut 1905. [primary](https://statsapi.mlb.com/api/v1/people/111459/stats?stats=career&group=hitting), [primary-bio](https://statsapi.mlb.com/api/v1/people/search?names=Al%20Bridwell), [independent](https://www.baseball-reference.com/players/b/bridwal01.shtml), [metric-definition](https://www.mlb.com/glossary/standard-stats/total-bases). The invalid dates and totals are established; the importing cause remains unproved.

GP remains unresolved: MLB 1253 against Baseball Reference 1252. Last year also requires league-convention reconciliation: the MLB bio says 1913, Baseball Reference 1915. No automatic correction is recommended for those fields.

No exact-name intersection exists between these 161 rows and the 55-player MLB HL pool or handpicked Rank Em names. Those are baked selected records, and Perfect Season MLB reads Lahman instead. This is a serious latent data corruption finding, with no currently demonstrated wrong game result from these particular rows. Full rows: mlb-malformed-rows.json.

### DQ03: Lundqvist shows 46 points instead of 27

Henrik Lundqvist's NHL HL entry has careerPoints 46. The official NHL goalie career summary and independent career/season table show 27 points, all assists. [primary](https://api.nhle.com/stats/rest/en/goalie/summary?isAggregate=true&isGame=false&cayenneExp=goalieFullName%3D%22Henrik%20Lundqvist%22%20and%20gameTypeId%3D2), [primary-readable](https://www.nhl.com/news/henrik-lundqvist-retires-326000932), [independent](https://www.statmuse.com/nhl/ask/has-henrik-lundqvist-scored-a-assist).

The card already says unverified, but it still displays 46 and the hook compares 46. /hockey-higher-lower uses every 45-player entry. This correction would not invert a pair in the current pool, because the other goalie has 18 and all skaters exceed 400. Separately authorize correcting the displayed number with provenance; do not assume the other goalie is verified.

### DQ04: Bo Nix has a one-yard publisher disagreement

The CFB file and table contain 15,351. Oregon and Denver publish 15,352; the independent five-season values sum 15,352. Sports Reference retains 15,351. [primary](https://goducks.com/sports/football/roster/bo-nix/16140), [primary](https://www.denverbroncos.com/team/players-roster/bo-nix/), [independent](https://www.statmuse.com/cfb/ask/boe-nix-passing-yard-stats), [disagreeing-original-publisher](https://www.sports-reference.com/cfb/players/bo-nix-1.html).

Flag this disagreement and choose a documented convention. The official source convention favors 15,352, but no edit or pair-ordering inversion is claimed. Oregon's bio was available through search results; the full web open was unavailable.

### DQ05: Missing verification is recorded, not solved by green tests

Soccer HL has 199 players, 398 unverified club-stat cells (appearances/goals), 70two-publisher cap totals and 129 single-publisher cap totals. Nine older club-career rows carry an extra pre 1985 caveat. /higher-lower and soccer /face-off consume these marked numbers. See the existing September 12 audit and source marker functions.

All 65 CFB file names now have an exact name/year/yardage match in the production table.66 rows cover those names because Josh Allen includes a separate Maryland 9-yard record; the file matches the Wyoming 5,066-yard career. The old 32-of 65 fence comment is stale, but this is still same-publisher parity, not independent verification. NFL's six categories include 160 additional numeric entries outside the 60-player TD-scored parity fence.

### DQ06/DQ07: Metadata flags with limited impact

MLB roster table 2,280 rows cover 1,122 IDs;17 IDs have conflicting undated team fields, with zero conflicting names/positions/DOBs. The table has no as-of field. It may contain accumulated snapshots; the correct current club is unknown. MLB_PLAYER_SOURCE exists but has no active import located in this baseline, so no visitor-facing club correction is claimed.

Jagr's card lists four teams and omits five confirmed career teams; Alonso's list omits Minardi 2001. These bare lists have no declared completeness convention, so flag clarification or source-backed completion rather than calling their performance metrics wrong. [primary](https://www.nhl.com/news/jaromir-jagr-talks-love-of-pittsburgh-number-retirement-nhl-com-interview), [independent](https://www.espn.com/nhl/player/bio/_/id/405/jaromir-jagr). [primary](https://www.formula1.com/en/information/drivers-hall-of-fame-fernando-alonso.2Ig4mBh2FaPMgAMjI0bBF9), [primary-team](https://www.minardi.it/auto-e-piloti-del-minardi-team/fernando-alonso/), [independent](https://www.espn.com/rpm/f1/2001/0227/1113540.html).

## Major dataset inventory

Retrieval date for every row below: October 1, 2026. Last verification dates are existing record/bake dates and are not evidence of fresh two-source verification in this audit. Historical season cutoffs are preserved.

| Production dataset | Rows | Season/snapshot | Last verification record | Read-only result |
| --- | --- | --- | --- | --- |
| cfb_qb_stats | 5800 | 1980..2025 | 2026-07-21 declared source check | 65 file identities covered in current DB; two-source coverage incomplete; Bo Nix conflict |
| nba_player_stats | 3227 | 1965-66..2025-26 | 2026-09-22 (stored DB parity record) | Structural season/negative/name checks clean; external all-row facts not reverified |
| nhl_player_stats | 6353 | 1..2025-26 | Not recorded | Invalid first-season values; union 69 flagged rows |
| world_cup_players | 9613 | 1970..2026 | 2026-09-01 declared 2026 snapshot verification | 9613 historical squad rows; no all-row factual validation in this audit |
| world_cup_player_stats | 0 | Not recorded | Not recorded | No current consumer identified; empty does not establish broken game |
| nflfastr_rosters | 60350 | 2002..2025 | Not recorded | 2002..2025 historical snapshots, not proof of current 2026 rosters |
| nhl_players | 1752 | Not recorded | 2026-07-02 declared source check | 876 IDs, duplicates agree on names/team/position/DOB |
| mlb_players | 2280 | Not recorded | 2026-07-02 declared source check | 17 stable IDs have conflicting undated team values |
| career_players | 253 | Not recorded | 2026-10-01 fallback bake parity | 253 IDs; individual facts not reverified |
| career_seasons | 3640 | Not recorded | 2026-10-01 fallback bake parity | 3640 seasons;201 null assists preserved; individual facts not reverified |
| player_market_values_dedup | 136542 | Not recorded | Not recorded | Latest 2026 subset basic checks clean; rosters/provenance require adjudication |
| player_verified_positions | 134 | Not recorded | Not recorded | 134 names inventoried; not all positions reverified |
| f1_driver_standings | 3106 | 1950..2025 | 2026-09-30 stored official+second-source record | 3106 season standings; record contents inventoried, not all primary pages refetched |
| golf_majors | 504 | 1860..2026 | 2026-09-30 stored official+second-source record | 504 records; no new all-row external validation |
| tennis_grand_slam_winners | 1015 | 1877..2026 | 2026-09-30 stored official+second-source record | 1015 records; maiden/married aliases documented; no new all-row external validation |
| lahman_batting | 110495 | 1871..2021 | Not recorded | 1871..2021 intentionally historical; do not call it outdated for historical games |
| world_cup_players_2026 | 1236 | 2026..2026 | 2026-09-01 declared migration verification | 1236 distinct country/shirt keys, 48 countries, zero future DOB/negativecaps/goals |
| nflfastr_player_stats | 134470 | 1999..2024 | Not recorded | 1999..2024; intentionally snapshot career metrics, no two-source review of all 134470 rows. |
| bref_nba_player_seasons | 30462 | 1949-50..2024-25 | Not recorded | All 30462 games NULL, consistent with intentional per 36 display;577 minutes NULL; no negative points/minutes. No whole-table factual review. |
| nba_players_extended_v2 | 5135 | Not recorded | Not recorded | 5135 unique stableIDs, no missing publisher marker; no row-level dates or factual all-player review. |
| mlb_batting_stats | 2000 | Malformed first-year fields; lastyear maximum 2026 | 2026-09-28 stored 55-player parity record only | 161 distinct structural violations; see DQ02; allcreated_at 2026-04-11 does not verify fact dates. |
| soccer_player_facts | 96 | Not recorded | Not recorded | Two DOB missing; no missing source URL; no independent second publisher per row established. |

| Local major dataset | Entries | Snapshot | Last record/bake | Status/limit |
| --- | --- | --- | --- | --- |
| Soccer HL | 199 | Per-row mixed career snapshots | 2026-09-12 partial verification | 398 club-stat cells unverified;70 caps two-publisher, 129 caps single-publisher |
| NBA HL | 80 | Per-row lastSeason, active totals through 2025-26 | 2026-09-22 DB parity record | 68 source-record verified, 12 held from file; no fresh independent review of all 80 |
| NFL HL | 60 | REG career totals through 2024 source maximum | 2026-09-28 DB parity record | Stable playerID, career start 2000+; fiveadditional categories 160 entries outside this fence |
| MLB HL | 55 | Retired careers finished 2019 or earlier | 2026-09-28 DB parity record | All 55 record matches;0 intersections with 161 malformed current table names |
| NHL HL | 45 | Per-row lastSeason; two goalies unverified | 2026-09-21 DB parity record | 42 source-record verified, Gordie Howe held, two goalies unverified; DQ03 |
| CFB HL | 65 | Career starts 1981+; source seasons through 2025 | 2026-07-21 declared source check, not independent record | Current same-source coverage 65 names; Josh Allen Maryland excluded by years/yards; DQ04/05 |
| Tennis HL | 44 | Per-row lastYear, counts through explicit tournament snapshot | 2026-09-28 DB parity record | 44 record matches; maiden/married alias merges recorded; no active-total automatic error |
| F1 HL | 42 | 1950..2025 | 2026-09-19..28 stored two-source sports record | Existing full facts fence passed; constructor lists lack completeness convention |
| Golf HL | 61 | Major title totals through declared 2026 snapshot | 2026-09-19 stored two-source record | Sports facts fence passed; not primary-page rechecked in this audit |
| AFL HL | 60 | Retired-only VFL/AFL careers | 2026-08-20 declared two-source check | Static structural scan only; all 60 not externally reverified |
| Club Manager now | 3658 | August 2026 rosters;2026 market rows with 2025 fallback | 2026-09-11/15 partial roster adjudication | 356 fallback candidates:16 confirmed, 18 moved, 4 outsideclub, 4 notcurrent, 314 pending. CM_PARTIAL is preserved. Derived ratings/future rosters are game fiction. |
| Club Manager historical | {"2005":747,"2010":802,"2015":1098} | 2005-06/2010-11/2015-16 | Not recorded | Historical value snapshots/verified overlay declarations preserved; not compared to current rosters |
| Soccer international pools | 533 | 2016..2026 | 2026-08-21 bake, not independent fact review | String-encoded pools not parsed by the literal duplicate scanner; missing thin nations intentionally generated |
| Soccer fallback pools | 553 | Footle 2026 market rows retain autumn 2025 counts; career historical rows | 2026-10-01 bake parity, not fresh external sports facts | Date/cell convention recorded; no unsupported null-to-zero or current-season reinterpretation |
| NFL Front Office | 480 | 2026 external nflverse rosters, 2025 rating production | 2026-09-02 bake | Uses external 2026 release separately from older DBrosters. Ratings and contracts model assumptions; no current mismatch claimed |
| MLB Front Office | 390 | August 5, 2026 rosters, 2025 stats and 2026 rookie fallback | 2026-08-05 bake | 13 sample players per team, derived ratings and fictional game contracts; all 390 facts not reverified |
| NHL Front Office | 416 | August 5, 2026 rosters, 2025-26 performance | 2026-08-05 bake | 13 sample players per team; prospects default 68, derived ratings and fictional contracts; all 416 facts not reverified |

## Validation and untouched-data receipt

Existing source-only commands passed: simHigherLowerFacts 31 checks across five fenced games and simSportsFacts 10 sections. They compare stored records and source metadata; they do not refetch every player's career. No build or broad gameplay suite was run by this lane.

The TEMP static inventory covers 48 selected data files and 51 literal arrays/groups. It found no duplicate ID/name within evaluated groups or simple negative/year flags. The 10,101 entries include markers and team containers and must not be described as 10,101 verified players. Dynamic exports, nested Conquest/FOobjects, nationality object maps and string-encoded national pools are not fully covered.

The NBA career table's 3,227 rows passed basic season-bound/negative/exact-name checks. NBA season table 30,462 rows all have gamesNULL, consistent with existing per 36 rules;577 minutesNULLand no negative points/minutes. NHL current roster 1,752 rows has 876 IDs with matching repeated fields and no future DOB. Latest soccer market 5,861 rows pass basic age/value/club/nationality checks. The 2026 World Cup squad table has 1,236 distinct country/shirt keys across 48 countries, no future DOB and no negative caps/goals. These structural passes do not establish every real-world fact.

Full source/reference/date fields and 16 existing verification-ledger summaries are in data.json. All 48 selected local data RAW hashes and 16 ledger RAW hashes remain held: true.

Untested or incompletely tested: all-row external facts, all retired/current membership and roster moves, alias resolution across every game, validator database joins, full awards winner lists, historical source conventions and all stat/position fields. Existing article/ledger claims are inventoried, not adopted as new verification. Missing provenance and historical snapshots remain visibly distinct from confirmed errors.

## Critical data errors

DQ01 and DQ02 are the systemic structural failures:69 distinct NHL records and
161 distinct MLB records. The combined230 records are annotated for review in
`evidence847/data-review-rows.json`;20 actual examples are listed in
`TOP20-DATA-REVIEW-2026-10-01.md`. Correct replacements are unknown for most
rows. Source-backed sample corrections do not authorize rewriting all rows.
The gameplay impact limits above remain binding, including the lack of a
demonstrated current MLB game result from the161 malformed rows.

## High priority errors and trust gaps

DQ03 is a confirmed wrong numeric entry for Lundqvist. DQ05 documents missing
independent verification rather than proving every marked cell wrong. Keep
existing unverified labels while reviewing values and their snapshot dates.

## Medium priority errors and flags

DQ04 needs publisher-convention adjudication. DQ06 needs dated roster identity
and DQ07 needs a declared list convention or source-backed completion. Do not
deduplicate legitimate same-name athletes or interpret historical snapshots
as current rosters.

## Missing data

Source/retrieval/as-of/last-verification fields are absent on multiple datasets,
as recorded individually in data.json. The201 null career assists and577 null
NBA season minutes are preserved, not converted into zero. Empty unused
world_cup_player_stats does not prove a broken game. The314 pending Club
Manager fallback roster cases need review; a partial/generated squad is already
marked. Actual current roster gaps require verified memberships and dates.

## Validated data and limits

The Bobby Robins selected career fields, Al Bridwell's selected batting fields
and Lundqvist's27 points have the two-source comparisons linked above. Bridwell
GP/final year remain unresolved. Basic structural checks passed on the stated
NBA career, NHL roster, soccer latest-value and2026 World Cup subsets. Existing
record/parity fences passed31 HL checks and10 sports-facts sections. None of
those statements means every database record was externally reverified.

## Validation tests added

Permanent repository tests added:0, preserving the current evidence-only
instruction. Existing validation ran, SELECT checks measured impossible fields,
and TEMP tooling evaluated48 local files/51 literal groups. The review-row
annotation refuses a count other than230 or a row with no measured structural
reason. It is a report consistency check, not a production data repair.

For a later separately claimed validation round, add independent fail-closed
checks for entity+season uniqueness, required fields, season/date ranges,
stat identities, position vocabularies, alias collisions between distinct
stable IDs, sourced championships and future records labeled as simulation.
Actual player-team/career-path validity needs dated source facts, not guessed
rules. Test negative controls that really change evaluated inputs, and do not
let existing source comments satisfy the checks.

