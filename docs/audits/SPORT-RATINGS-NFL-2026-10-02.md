# NFL ratings method and input audit

Date: 2026-10-02. Round889. Update: new-franchise source integration is now accepted in [the final receipt](NFL-OPENING-RATINGS-RECEIPT-2026-10-02.md). Publication remains separate. The dated audit and rejected trials below are retained as evidence of the original implementation and review process.

The expanded product goal is recognizable 0 to 99 ability numbers across sports, derived by an original DoUKnowBall method. It is not permission to copy a commercial rating dataset, inflate every roster, replace missing statistics with guesses, or rewrite earned progression in existing saves. This report covers NFL. The separate `SPORT-RATINGS-OTHER-2026-10-02.md` covers the other sports.

No site, Supabase, private API, user browser or backend request was made. Seven initial public CSV downloads and three later historical weekly roster downloads were separately authorized, obtained once each from documented nflverse release URLs and kept in TEMP. Six primary honor articles were also read within a separate bounded authorization. No retry, API key, production data write, generator edit, gameplay edit, build or publish occurred. This new audit document is the only repository file written by this audit.

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
2. Join PFR defense/snaps through the recorded GSIS/PFR crosswalk. All 439 raw OL roster entries have blank PFR IDs; 394 of those are in the eligible pool. The acquired crosswalk resolves 2,142 of 2,163 current members, adds 526 IDs including 390 eligible linemen, and finds no conflicting retained PFR IDs or birth dates. Twenty-one unresolved identities remain flagged.
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
- OL uses a clearly partial participation/draft proxy because blocking quality is unmeasured. All 394 eligible OL estimates remain partial, even after 276 obtain 2024/2025 snap exposure. This is a blocker to calling the NFL ratings complete. An earlier audit count of 404 was incorrect and was replaced after a direct record recount.

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

## Follow-up review: dated roles, feature reliability and honors

Independent review found concrete blockers in the frozen refined candidate. It compared 199 used defensive player-season observations with a reference group that did not represent the same historical role. Generic historical `DL` had entered DT references and generic `LB` had entered ILB references, while current depth labels selected other models. Safety/off-ball coverage was also weighted by defensive snaps even where the actual coverage sample contained only one to eight targets. A blank missed-tackle rate could become zero in the helper, though no currently used ILB/S observation had that blank. The blank case is a required fence repair, not a verified current historical record error.

The frozen v1 reports remain available. They must not be adopted simply because a few named results appear credible.

### Additional authorized historical role inputs

The [weekly roster documentation](https://nflreadr.nflverse.com/reference/load_rosters_weekly.html) and its [actual loader](https://github.com/nflverse/nflreadr/blob/main/R/load_rosters_weekly.R) identify the dated GSIS/PFR, team, week and depth-position fields needed for these joins. Each file below was acquired once, without a retry.

| TEMP file | Source | Retrieved UTC | REG rows | SHA256 |
| --- | --- | --- | ---: | --- |
| `roster_weekly_2023.csv` | [2023 weekly](https://github.com/nflverse/nflverse-data/releases/download/weekly_rosters/roster_weekly_2023.csv) | 2026-10-02 16:37:03 | 43,545 | `1433f1f239784dde7fcb35349d211a9b83abfc0156337b72ec4f923abf715bd3` |
| `roster_weekly_2024.csv` | [2024 weekly](https://github.com/nflverse/nflverse-data/releases/download/weekly_rosters/roster_weekly_2024.csv) | 2026-10-02 16:37:04 | 44,473 | `074ecaeb9325de943c11f7bbc941425626985090ef8386f90cd837fa5cb5d4b3` |
| `roster_weekly_2025.csv` | [2025 weekly](https://github.com/nflverse/nflverse-data/releases/download/weekly_rosters/roster_weekly_2025.csv) | 2026-10-02 16:37:04 | 44,697 | `c2f7a1ffebe06058400af1989d1cd2900cc5c9659f084623708a06d4e28de35b` |

The actual historical labels distinguish DE, DT/NT, ILB/MLB and defensive-back roles. OLB is mixed: the acquired 2024/2025 records give both Matt Milano and Jared Verse that label. Therefore OLB alone must not be converted into a factual edge-rush assignment.

The separate TEMP v2 fits a model per season and observed role, matches played REG snap weeks/team through exact GSIS/PFR identities, and excludes unsupported or conflicting role assignments. Generic labels do not silently become DT or ILB. OLB stays an explicitly partial separate cohort. An unresolved season does not acquire a guessed role from today's roster.

Coverage confidence now uses actual targets. Missed-tackle confidence uses recorded combined tackles plus missed tackles. Pressure and sack rates use defensive snaps and retain the explicit missing pass-rush-opportunity limitation. Missing values stay null and contribute no fabricated perfect performance. Partial features, ambiguous roles and absent inputs remain visible in the payload.

The final normal v2 probe exits zero and holds frozen offense/OL estimates, the original full payload and five production file hashes. Three executable copies separately restore missing-as-zero, coverage weighted by all snaps, and current-role historical normalization. Each fails its exact intended assertion; raw logs and cleanup proof are retained. This verifies those narrow method boundaries, not every sports fact.

Selected v2 estimates are Ward 87, Graham 75, Bosa 94, Garrett 98, Surtain 94, Stingley 98, Verse 81 (partial OLB), Hamilton 87 (partial safety) and Warner 82 (partial off-ball). Offense remains frozen, including Mahomes 85. All are review numbers, not shipped grades. Its separate financial output remains retained; the bounded-target issue below prevents adopting this version as the final method.

The v2 economy probe later held all 32 opening budgets and showed another method boundary: an extreme standardized small sample could extrapolate its measured target beyond 98 before the final combined clamp. The separate v2.1 clips the measured target first, then blends by confidence. This changes one low-volume off-ball example from 92 to 81 with confidence 0.3895. An executable unbounded-target copy rejects that exact logical confidence bound. The original v2 source, reports and economy outputs remain frozen.

V2.1 estimates are Ward 87, Graham 75, Bosa 91, Garrett 95, Surtain 94 and Stingley 95. Frozen offense/OL estimates stay unchanged. Its opening average strength is 83.97521, with 100 estimates of 90+ and zero at or below $1.5M after the separate simulated-price normalization. The minimum such price is $7.4M. All 32 opening budgets/years and the original no-depth initializer hold. Three direct offseason transitions remain under cap, with candidate average payrolls about $168.11M/$166.37M/$169.68M. This still is not full-season, trade, tag or UI acceptance.

Four final v2.1 controls reject unbounded targets, missing-as-zero, coverage weighted by snaps and current-role historical normalization. Each changes one executable copied binding and fails its exact intended assertion. Final source/report bytes hold and all copies are removed. Independent method review is pending; these controls do not establish football-model calibration or complete input truth.

Independent v2.1 review subsequently accepted the bounded method as an implementation candidate, conditional on honest evidence labels and integration checks. It found 12 records whose inherited fine group implied a current S/DT measurement while their dated evidence had only CB/DE roles. The broader correct predicate uses the actual current explicit depth role, separately from inherited fine. That identifies 42 previously nonpartial defensive records without matching dated current-role evidence, including OLB/DE transitions. These are evidence-label gaps, not a reason to hand-edit their grades.

The separate TEMP v2.2 marks all 42 gaps partial using that generic predicate, records the current explicit role alongside unchanged dated roles and leaves every grade, confidence, player fact, contract term and fictional opening price unchanged. Unsupported current fine roles remain partial. A copied executable omission fails the exact 42-gap assertion; supported-role and unknown-role probes remain explicit. V2.1 payloads, reports, financial evidence and the original verified summary remain byte-for-byte frozen. No new full-season or engine acceptance is claimed for this metadata correction.

Round892 is authorized to change the production engine's promotion-cap boundary separately. Its committed engine must become an explicitly new integration baseline. The earlier v2.1 source hashes and economy receipt describe their original baseline and must not be silently recomputed or presented as hashes of a later engine.

Graham's v1 decomposition was 763 snaps, prior 77.9563, measured estimate 72.4747 and confidence 0.8321. Shrinkage raised that estimate to 73; removing shrinkage produced 72. Changing confidence alone cannot justify a target of 80. Role alignment and unmeasured run-defense responsibilities deserve review instead of a name-specific patch.

### Dated selection evidence, kept separate from ratings

The bounded article reads cover the [2023 NFL-hosted AP list](https://www.nfl.com/news/2023-all-pro-team-lamar-jackson-tyreek-hill-aaron-donald-highlight-roster), [2024 list](https://www.nfl.com/news/2024-all-pro-team-lamar-jackson-jamarr-chase-justin-jefferson-highlight-roster), [2025 list](https://www.nfl.com/news/2025-all-pro-team-matthew-stafford-bijan-robinson-jaxon-smith-njigba-highlight-roster) and each corresponding AP announcement. AP direct opens were inaccessible; only primary search-returned announcements were used as limited corroboration, without retry. These are one AP selection lineage, not two independent selection authorities.

`honors-facts.json` retains 184 factual season/tier/position/team selections, including 30 OL selections. Unique normalized identity, historical position-group compatibility and rookie/last-season checks resolve 182 records. Two source list spellings remain unresolved: `Chris Lidstrom` in 2023 and `Garrett Bolles` in 2025. They were not fuzzy-assigned to a current player. Ties and source labels remain intact.

A separate general honor sensitivity affects 50 eligible estimates while preserving every non-honored estimate exactly. Its explicit first/second-team target and recency choices are trial simulation choices. Twelve eligible OL have joined honors, and that trial raises their maximum from 83 to 96. The 90+ pool increases from 105 to 128. This has not been merged into v2 or financially accepted, and it does not measure blocking quality for the remaining linemen.

Mahomes has no selection in these three AP lists. This acquisition cannot support inventing a recent honor or forcing him to an external benchmark. A broader established-performance prior needs its own dated evidence and general calibration.

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
- `download-weekly-receipts.json`, `weekly-schema-audit.json`: three later authorized dated roster inputs and actual role fields.
- `honors-facts.json`, `honors-facts-receipt.json`, `honors-resolved-facts.json`, `honors-sensitivity-report.json`: factual article provenance, unresolved spellings and separate trial sensitivity. First import and schema/floor calibration attempts remain retained rather than counted as accepted evidence.
- `refined-v2-report.json`, `refined-v2-payload.json`, `refined-v2-final.log`, `refined-v2-controls.json`: dated-role/feature-confidence candidate, exact failing controls and source holds. The first failed diagnostic-print attempt is retained and excluded from the accepted normal run.
- `refined-v2-finance-report.json`: retained v2 economy result before the measured-target correction.
- `refined-v21-report.json`, `refined-v21-payload.json`, `refined-v21-run2.log`, `refined-v21-controls.json`, `refined-v21-finance-report.json`: separate bounded-target candidate, four exact controls and financial option. The first failed Windows preparation/missing-script attempt remains retained and is excluded from accepted proof.
- `refined-v22-report.json`, `refined-v22-payload.json`, `refined-v22-finance-payload.json`, `refined-v22.log`, `refined-v22-controls.json`: metadata-only current-role evidence correction, unchanged grades/confidence/finance, exact executable omitted-marking control and byte holds for all frozen v2.1 evidence.

Five production source/data hashes hold throughout the final estimates, and the financial probe separately holds engine and both seed-file raw bytes. The existing cache and committed record remain unchanged. No production code, input snapshot, guide, master list or save was edited by these probes. No complete NFL data validation, full career/GM playthrough, vendor-rating equivalence, live deployment or AdSense-readiness claim is made.
