# NFL ratings method and input audit

Date: 2026-10-02. Round 889. Status: audit and TEMP candidates only, no production rating or contract change accepted.

The expanded product goal is recognizable 0 to 99 ability numbers across sports, derived by an original DoUKnowBall method. It is not permission to copy a commercial rating dataset, inflate every roster, replace missing statistics with guesses, or rewrite earned progression in existing saves. This report covers NFL. The separate `SPORT-RATINGS-OTHER-2026-10-02.md` covers the other sports.

No site, Supabase, private API, user browser or backend request was made. Seven public CSV downloads were separately authorized, obtained once each from documented nflverse release URLs and kept in TEMP. No retry, API key, production data write, generator edit, gameplay edit, build or publish occurred. This new audit document is the only repository file written by this audit.

## Concrete problems in the current implementation

| Priority | Evidence | Effect on the player | Exact source or route |
| --- | --- | --- | --- |
| P1 | Core and depth cohorts use different rating bands. Skill/defense depth is 61 to 65, while core uses 66 to 97 or 95. | A named established player can show 65 because he is outside the curated fifteen, rather than because a common ability model evaluated him. | `scripts/genFrontOfficeRoster.mjs`: `DEPTH_SCALE`, `SCALE`, `buildDepth`; https://douknowball.com/front-office |
| P1 | `personFrom` accepts a season once `games >= 4`. The held cache has 17 qualifying quarterbacks with fewer than 100 attempts, including one with three. | Appearances in a stat file are treated as adequate evidence of quarterback quality. | Same generator: `MIN_GAMES`, `personFrom` |
| P1 | Offensive production uses a fantasy-style yards/TD/reception score divided by games. Interceptions, sacks, EPA and CPOE do not enter that score. | Poor passing efficiency can be hidden behind positive counting totals. | Same generator: `skillScore` |
| P1 | A veteran with fewer than four recent games falls into the same pedigree/service path as an untested rookie. | An established player's prior performance disappears instead of supplying an explicitly uncertain prior. Absence of recent stats does not establish an injury or loss of ability. | Same generator: `personFrom`, `rateCohort`; board `noSeason` treatment |
| P1 | OL ratings are draft/service proxies. The current recorded stat inputs have neither individual blocking outcomes nor snaps. | The displayed number cannot substantiate a blocking-quality claim. | Same generator: `pedigreeScore`; `src/data/frontOfficePlayers.ts` |
| P1 | The retained defensive record lacks coverage outcomes. The method compensates with draft pedigree. | Tackles and draft slot cannot distinguish coverage performance on their own. The absence is in this input record, not every available public dataset. | Same generator: `defenceScore`, `PEDIGREE_WEIGHT_BY_POS` |
| P1 | Current and replacement rating scales are coupled to generated salaries, potential, trade value, renewal asks and team strength. | A cosmetic rerating can create cheap stars, over-cap clubs, different aging/retirement outcomes and new-game difficulty changes. | `src/lib/frontOffice.ts`: `makeGmPlayer`, `salaryFor`, `tradeValue`, `runOffseason`, `teamStrength` |
| P2 | The held source is REG+POST for playoff participants but REG for other players. The new REG-only file changes retained fields for 478 matching players. | A regular-season comparison is not uniform if some players include postseason production. | `scripts/lib/nflverseStats.mjs`; `scripts/data/nflRosters2026.json` |
| P2 | Recorded-stat game counts differ from official appearances in checked examples. | Per-game denominators and a literal "no season" label can misdescribe the evidence. Use actual opportunities or snaps for confidence. | `personFrom`; `src/components/front-office/FrontOfficeBoard.tsx` |
| P2 | The full-roster harness requires every bench player to remain below every core player. | That old product assumption prevents a coherent common scale from recognizing a strong backup. A revised contract must replace that requirement with meaningful invariants and controls. | `scripts/simNflFullRosters.mjs`, section checking depth bands |

The current active roster dataset contains 480 core players, 1,158 active bench players and 525 practice players, 2,163 eligible records in total. The recorded snapshot is the 2026 week-four membership read on 2026-10-01. This audit preserves that membership; it does not independently reverify every current transfer or injury.

The existing initializer copies literal ratings. There is no hidden engine lookup that defaults these four reported Browns players to 65. `FrontOfficeBoard` restores saved league ratings directly. A new opening estimate must not rebake those saved values on refresh.

## Local input inventory before acquisition

The scoped repository/cache search found `scripts/.cache/nflverse/stats_player_regpost_2025.csv`, a 150-column CSV with 2,025 unique player rows. It contains 1,496 REG rows, 524 REG+POST rows and five POST rows. All 1,696 retained player-stat records in the committed roster snapshot match its retained fields exactly. That establishes reproducibility from one source, not independent truth verification.

The cache carries 129 fields omitted from the committed compact record, including passing attempts/completions/interceptions/sacks, EPA/CPOE, carries, targets, target share and receiving/rushing EPA. The current formula does not use many useful fields already available locally.

No 2023/2024 player-stat CSV, snap-count CSV or individual coverage/blocking dataset was found in the scoped local cache before this acquisition. Existing NFL grid and career aggregate files retain identity or career milestones, not enough season-performance detail to reconstruct these inputs. The generated database types describe historical offense and career-defense identity tables, but no database request was made and those types do not prove current database contents.

Existing cache source hash: `a4cd28b5209608d87967c4e0db9720fc617c3f9aafe0a3a097461586ea90fd6d`.

## Authorized public inputs acquired into TEMP

The current [player-stat loader documentation](https://nflreadr.nflverse.com/reference/load_player_stats.html) distinguishes REG, POST and combined summaries. Its [actual loader source](https://github.com/nflverse/nflreadr/blob/main/R/load_stats.R) constructs the release URLs used here. The older `player_stats` release is explicitly deprecated; this acquisition uses `stats_player`.

The [advanced-stat loader](https://nflreadr.nflverse.com/reference/load_pfr_advstats.html) supports season-level defensive data from PFR. The [snap loader](https://nflreadr.nflverse.com/reference/load_snap_counts.html) supplies game-level playing time. The [players loader](https://nflreadr.nflverse.com/reference/load_players.html) provides the GSIS/PFR identity bridge. Their documented loader sources construct the corresponding release paths; no private PFR endpoint or web scrape was used.

| Local TEMP file | Source URL | Retrieved UTC | Rows or usable scope | SHA256 |
| --- | --- | --- | --- | --- |
| `stats_player_reg_2023.csv` | [2023 REG](https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_reg_2023.csv) | 2026-10-02 15:40:24 | 1,943 unique GSIS rows, all REG 2023 | `0cc79526a678907817713a7f603b75c4424a1cd4dfc98daa2b3018af80312b9c` |
| `stats_player_reg_2024.csv` | [2024 REG](https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_reg_2024.csv) | 2026-10-02 15:40:24 | 1,997 unique GSIS rows, all REG 2024 | `fbad4e9f1b892e3870a51a4eea808d692cde14ed6dbacd67cce3a0def8ddcbaa` |
| `stats_player_reg_2025.csv` | [2025 REG](https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_reg_2025.csv) | 2026-10-02 15:40:25 | 2,020 unique GSIS rows, all REG 2025 | `aaa8559478dd8d58569c93e278239e70e9411e79ee649c99d8d506030cd42b12` |
| `advstats_season_def.csv` | [PFR season defense](https://github.com/nflverse/nflverse-data/releases/download/pfr_advstats/advstats_season_def.csv) | 2026-10-02 15:52:12 | Includes 2018 through 2026; prototype selects only 2023/2024/2025 | `8935ac010182b566a44db166d5c216ab7be77970ebfedbedd0e170f89deed6af` |
| `snap_counts_2024.csv` | [2024 snaps](https://github.com/nflverse/nflverse-data/releases/download/snap_counts/snap_counts_2024.csv) | 2026-10-02 15:52:13 | 25,398 REG game/player/team rows, 2,190 player IDs | `a2aa58efe093f8aa0ad5aadf09f81d8ec690a1183bd2dde68d20e7f109a9c335` |
| `snap_counts_2025.csv` | [2025 snaps](https://github.com/nflverse/nflverse-data/releases/download/snap_counts/snap_counts_2025.csv) | 2026-10-02 15:52:14 | 25,396 REG game/player/team rows, 2,187 player IDs | `3fc2deb0e9ad86d34d4578cb80bb21c95253e088ee22ca028adf46f7485eff1f` |
| `players.csv` | [Player identities](https://github.com/nflverse/nflverse-data/releases/download/players/players.csv) | 2026-10-02 16:02:12 | 24,844 rows, GSIS to PFR bridge | `810c1a8b09de1dc2ef94af7cabce5b66d0a6d5ac0751f99c5eaf09dc21425a21` |

Acquisition receipts preserve exact source URLs, start/end dates, byte lengths, hashes and one attempt per file. These are public-source snapshots for review. They are not yet production imports or an all-row two-source validation result.

### Actual acquired defensive schema

The advanced defensive CSV contains `tgt`, `cmp`, `cmp_percent`, `yds`, `yds_tgt`, `td`, `rat`, `bltz`, `hrry`, `qbkd`, `sk`, `prss`, `comb`, `m_tkl` and `m_tkl_percent`. These fields supply substantially better evidence than tackles alone. No individual pass-block pressure-allowed field was found in these seven inputs.

The primary source advertises defensive advanced data, but the fetched loader documentation links its passing dictionary rather than a complete defense dictionary. Definitions and season aggregation should therefore be pinned with the actual upstream transform before production use. Pressures divided by all defensive snaps remain a proxy, not a true pass-rush-win rate. Coverage outcome depends on assignments, scheme and opponents; this source does not prove individual responsibility on every play.

Direct PFR advanced-defense webpage access returned 403. No retry or workaround scrape followed. The authorized nflverse release download succeeded independently of that webpage.

### Identity and aggregation fences needed

1. Join offensive inputs by GSIS ID and season, not player name. All three REG files have unique player IDs.
2. Join PFR defense/snaps through the recorded GSIS/PFR crosswalk. Current roster records have blank PFR IDs for all 404 linemen. The acquired crosswalk resolves 2,142 of 2,163 current members, adds 526 IDs including 390 linemen, and finds no conflicting retained PFR IDs or birth dates. Twenty-one unresolved identities remain flagged.
3. Exclude blank IDs. Never treat all blank IDs as one player.
4. Resolve one consistent season total, rather than summing `2TM`/`3TM` totals with the corresponding team stints. The 2024/2025 DEF source contains both shapes.
5. Reject contradictory duplicate identities before using a last-row-wins map. The 2023 DEF source gives each of two David Long IDs both an MIA and a `3TM` row, and each of two DJ Turner IDs both CIN and LV rows with different positions. This audit does not guess which upstream row to repair.
6. Preserve unknown position labels as unresolved. The prototype excludes 146 row/groups for missing identity or unresolved duplicates/positions; this is a conservative ingestion count, not a claim that all 146 are erroneous historical records.
7. Filter snap data to REG before aggregating. The checked game/player/team keys are unique. Filter acquired DEF rows to the selected historical seasons, so 2026 data cannot leak into a 2025 estimate.
8. Pin dataset version and retrieval date. An identity file is a current bridge, not evidence of a current transfer or a historical contract.

## Selected official sanity checks

These checks compare retained fields and identity against official pages. They do not independently certify every acquired row, and copies of the same upstream source are not two independent sources.

| Player | Exact selected comparison | Official source |
| --- | --- | --- |
| Denzel Ward | 2025: solo 27, PDEF 9, INT 1 agree; official appearances 15 versus CSV stat-games 14. | [NFL stats](https://www.nfl.com/players/denzel-ward/stats/) |
| Mason Graham | 2025: games 17, solo 26, sacks 0.5, PDEF 4 agree. | [NFL career](https://www.nfl.com/players/mason-graham/stats/career) |
| Denzel Boston | Browns, 2026 draft pick 39 matches the recorded identity and rookie prior inputs. | [NFL draft report](https://www.nfl.com/news/2026-nfl-draft-browns-select-washington-wr-denzel-boston-with-pick-no-39-in-second-round) |
| KC Concepcion | Browns, 2026 draft pick 24 matches the recorded identity and rookie prior inputs. | [NFL draft report](https://www.nfl.com/news/2026-nfl-draft-browns-select-ol-spencer-fano-at-no-9-wr-kc-concepcion-to-address-major-needs) |
| Shedeur Sanders | 2025: attempts 212, completions 120, yards 1,400, TD 7, INT 10 and sacks 23 agree. | [NFL career](https://www.nfl.com/players/shedeur-sanders/stats/career) |
| Josh Allen | 2025: attempts 460, completions 319, yards 3,668, TD 25, INT 10 agree. | [NFL career](https://www.nfl.com/players/josh-allen/stats/career) |
| Lamar Jackson | 2025: attempts 302, completions 192, yards 2,549, TD 21, INT 7 agree. | [NFL career](https://www.nfl.com/players/lamar-jackson/stats/career) |
| Joe Burrow | 2025: attempts 259, completions 173, yards 1,809, TD 17, INT 5 agree. | [NFL career](https://www.nfl.com/players/joe-burrow/stats/career) |

Ward's acquired advanced row and snap row both carry 15 appearances, while the play-derived player-stat row carries 14. Confidence should use measured targets/snaps, rather than assuming these two different game fields have the same meaning. EPA/CPOE are nflverse-derived metrics and must be attributed as such, not described as manually verified official ratings.

## Rejected first candidate

The initial TEMP candidate applied the existing rating formula to all 2,163 eligible players on one full-position scale. It held source membership, opening fictional salary/years, schedule and initial RNG counts, and kept no-depth legacy initialization unchanged.

That candidate was rejected as a finished solution. Average opening team strength rose from 82.34125 to 90.97604. Its derived Shedeur estimate was 84, Graham 89 and Bosa 74. Ninety-five 90+ players retained salaries at or below $1.5M. Naively deriving salaries again from those ratings put every club over the opening cap, with payrolls from $318.2M to $532M. A common pool alone does not create a credible ability model.

Original candidate receipts remain intact, including the failed Windows import attempt and a strict AI-cut membership comparison that caught a changed NYG survivor. Those failures were not counted as accepted proof.

## Refined TEMP method and measured candidate

The refined experiment uses unchanged current membership, REG-only 2023/2024/2025 offense, acquired coverage/pressure data, 2024/2025 snaps and the identity crosswalk. No named-player override is present.

- Offensive confidence uses actual passing attempts plus sacks, carries/targets or receiving targets. It never uses the stat-games field as an exposure denominator.
- Quarterback features include EPA per pass play, CPOE, an adjusted-net-yards calculation that includes turnovers/sacks, and rushing contribution. RB/WR/TE features use actual opportunity rates and first-down/efficiency measures.
- CB comparison uses coverage outcomes with target exposure. Edge and interior comparison use pressure/sack/tackle rates against actual defensive snaps. Safety and off-ball estimates are explicitly partial because opportunity and coverage responsibilities remain incomplete.
- Reference cohorts are fixed to the acquired statistical universe, rather than only the selected fifteen or the bench. Weighted means, standard deviations and composite variance come from those inputs. Adding an eligible bench player does not rerank everyone else to the ends of a scale.
- Recency weights 0.45, 0.7 and 1, the prior curve, feature weights, scale `84 + 12*z`, clipping and half-typical-exposure shrinkage are explicit original simulation choices. They require calibration review. They are not historical facts or proof of ability.
- A small latest sample can retain an established prior. For example, the acquired Bosa input has 119 defensive snaps in 2025 and 693 in 2024. The prototype does not invent an injury explanation or infer that he is a rookie.
- A zero-season rookie uses a declared draft-only estimate with uncertainty. That does not establish his actual NFL performance.
- OL uses a clearly partial participation/draft proxy because blocking quality is unmeasured. All 404 OL estimates remain partial, even after 276 obtain 2024/2025 snap exposure. This is a blocker to calling the NFL ratings complete.

| Existing name | Current displayed seed | Refined TEMP estimate | Important interpretation |
| --- | ---: | ---: | --- |
| Denzel Ward | 65 | 88 | Coverage-based multiyear estimate, not a handwritten correction |
| Mason Graham | 65 | 73 | Full recent sample, weak measured pass-rush proxy; run-defense detail still incomplete |
| Denzel Boston | 65 | 73 | Draft-only uncertainty |
| KC Concepcion | 65 | 74 | Draft-only uncertainty |
| Nick Bosa | 65 | 91 | Verified prior exposure retained; no invented injury reason |
| Myles Garrett | 95 | 95 | Strong recent measured pass-rush inputs |
| Pat Surtain II | 84 | 95 | Coverage inputs and exposure |
| Derek Stingley Jr. | 92 | 95 | Coverage inputs and exposure |
| Sauce Gardner | 88 | 86 | Consistent season-total selection avoids counting stints twice |
| Cooper DeJean | 82 | 89 | Coverage sample and prior |
| Jared Verse | 86 | 88 | Edge cohort and measured snap denominator |
| Josh Allen | 97 | 93 | Actual passing/rushing efficiency and multiyear sample |
| Lamar Jackson | 82 | 92 | Actual passing/rushing efficiency and multiyear sample |
| Joe Burrow | 83 | 88 | Prior seasons retained alongside recent shorter season |
| Patrick Mahomes | 95 | 85 | A remaining established-ability/calibration gap, not overridden to match a benchmark |
| Shedeur Sanders | 69 | 63 | Negative passing outcomes are no longer omitted |
| Nick Mullens | 61 | 75 | Latest three attempts do not become an elite estimate |
| Deshaun Watson | 65 | 66 | Missing latest season uses actual prior performance, not a guessed high floor |

These numbers are a review artifact, not shipped player facts. Matching a familiar number on one celebrity cannot validate the method. The current experiment has six QBs at 90+, while the 104-player QB population has median 70 and 90th percentile 86. The remaining established-star discrepancy is visible; a broader, properly dated performance/reputation prior may be required instead of fitting a name-specific exception.

Full opening team strength in the actual initializer averages 83.94021, versus current 82.34125. This is substantially less inflation than the rejected 90.97604 candidate, but it is not a calibrated season-result proof. The new full pool has 105 estimates of 90+, and low-volume defensive tails and positional proxies still need review.

## Contract and payroll experiment

Preserving all old cheap depth contracts exactly is not a complete financial answer. With refined ratings, 32 90+ estimates would still carry at most $1.5M in the held opening contracts.

A separate TEMP financial option reallocates each club's existing fictional active payroll by the existing `salaryFor(newOVR)` relative demand above the game's current minimum floors. Exact tenths are assigned by remainder allocation. Contract years and source membership stay unchanged. Practice deals use the same club multiplier outside active payroll, so promoting a stronger practice player does not silently cost the old blanket minimum.

Measured results:

- All 32 opening active payrolls match their old totals exactly; all contract years and initial membership hold.
- The no-depth initializer remains deeply equal to the original engine, with the same initial RNG counts. The full initializer's schedule and initial RNG counts also hold.
- No 90+ estimate retains a salary at or below $1.5M in this option. The cheapest such simulated salary is $7.5M.
- Three actual direct offseason transitions reach 2027/2028/2029 with zero over-cap clubs in both old and candidate probes. Candidate average payroll is approximately $167.03M/$164.36M/$171.47M; the old probe is $163.56M/$153.39M/$140.35M.
- Later retirement/development/contract decisions and RNG counts intentionally diverge as player ratings change. Only opening draw order was held. Three offseason calls are not three played seasons or full AI-management acceptance.

These prices are simulated, not real NFL contract data. Normalizing inside separate club budgets creates salary variation at equal ability and can change trade incentives. The untouched renewal, tag, dead-money, trade, generated-player and free-agent curves require end-to-end review before adopting the option. An opening payroll equality assertion cannot certify the entire economy.

## Required next implementation boundary

1. Review and pin input schema/season semantics, identity failures and source lineage. Record retrieval/source URLs, hashes, season, verification status and explicit missing fields. Do not place the broad 24,844-row identity file in the browser; retain only reviewed compact joins/inputs needed for the eligible roster.
2. Review a general ability/tier calibration over representative strong, average, backup, rookie, recently absent and low-sample players at every position. Keep the existing 18 named diagnostics plus distribution and sensitivity outcomes. Do not fit only the four reported Browns numbers or copy a vendor dataset.
3. Obtain a credible blocking-quality or dated established-starter/award prior before claiming OL talent quality. Participation alone cannot close that gap. Additional opportunity-sensitive defense and broader established-QB priors may also be needed. No additional acquisition beyond the seven-file budget occurred here.
4. If approved, keep `FO_TEAMS` and its other-game consumers unchanged. Add a reviewed compact opening mapping through the full-roster initialization option only. Preserve old played saves, ratings, salaries, outcomes and progression. Do not migrate an opening save merely because `week === 1` without proving it has no earned actions.
5. Mark the estimate basis and missingness on actual player-facing roster cards. Correct "no 2025 season" where it merely means an insufficient recent sample. State real membership/stat inputs separately from simulated rating, potential, salary, prospects and future events.
6. Replace the blanket bench-below-core assertion with common-basis, source-membership, missing-input, deterministic estimate and opportunity-confidence checks. Effective controls should remove confidence, drop prior seasons, restore separate bands, include postseason, misjoin a same-name defender, double-count totals/stints or use a missing coverage value as zero.
7. Review opening and later money jointly: cap room, contracts, tags, trade responses, cuts/dead money, practice promotion, generated-player asks and AI signings. Require useful paired season and multi-season outcomes, not just no crash or one payroll check.
8. Verify real new-game UI, old/current save refresh and native end-to-end season behavior only after source and input review. Nothing in this source audit credits those checks as complete.

## Exact evidence and retained limitations

Owned evidence directory: `C:/Users/antho/AppData/Local/Temp/dukb-nfl889-candidate-2026-10-02`.

- `local-data-audit.json`: original local availability, field coverage, 17 short-sample QB examples and 120 WR/TE stat-game qualifiers with fewer than 20 targets. The numerical thresholds here are diagnostics, not proposed shipping cutoffs.
- `download-reg-receipts.json`, `download-defense-receipts.json`, `download-identities-receipt.json`: all seven bounded public acquisitions.
- `multiyear-audit.json`: exact REG scope, unique IDs, retained-field differences and selected actual source rows.
- `defense-input-audit.json`: acquired coverage/pressure schema, duplicate-ID/stint shapes, raw snap coverage and selected source comparisons.
- `candidate-report.json`: rejected original full-rank candidate, payroll inflation and unchanged-source proof.
- `refined-offense-report.json`: retained earlier partial offensive prototype, including compressed elite tail; this was not accepted as a finished scale.
- `refined-full-before-position-alias-report.json`: retained first prototype classifier report. A TEMP position-alias bug stripped the L in plain LB; the explicit alias correction preserves that report rather than treating it as final coverage.
- `refined-full-before-crosswalk-report.json`: retained missing-identity result before the authorized crosswalk.
- `refined-full-report.json` and `refined-full-payload.json`: final reviewed-input prototype and complete estimate basis for the unchanged 2,163 eligible records.
- `refined-finance-report.json` and `refined-finance-payload.json`: actual original/candidate initializer, exact payroll checks and three direct offseason transitions. The esbuild metafile excludes Supabase dependencies.

Five production source/data hashes hold throughout the final estimates, and the financial probe separately holds engine and both seed-file raw bytes. The existing cache and committed record remain unchanged. No production code, input snapshot, guide, master list or save was edited by these probes. No complete NFL data validation, full career/GM playthrough, vendor-rating equivalence, live deployment or AdSense-readiness claim is made.
