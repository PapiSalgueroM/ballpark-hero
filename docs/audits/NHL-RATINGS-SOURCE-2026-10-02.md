# NHL rating-source recovery

Date: 2026-10-02. Scope: Codex893, source recovery and a proposed deterministic method. Production data, engines, UI, saves and backend records were not changed. No live-site, Supabase, user-browser, image or per-player requests were made. Root owns the production adoption decision.

The recovered inputs are official NHL reports from one publisher lineage. They are not independently two-source-verified sports facts. Internal source inspection and calculation checks do not turn one publisher into two independent authorities.

## Findings

1. **P1: the old NHL seed remains incompletely reproducible.** `src/data/nhlFoPlayers.ts` names `bake_nhl.py`, which is absent along with its original raw inputs. Current official data and the stated percentile recipe reproduce 404 of 416 literals exactly with one general rank convention. Another 11 differ by one point. The last name cannot be joined safely. This is strong corroboration of the stated input lineage, not recovery of the original executable recipe or proof of every old value.
2. **P1: the roster-size description is false for Boston.** The literal Boston row has eight forwards, four defenders and one goalie. Every other club has seven forwards, four defenders and two goalies. All clubs contain 13 rows. The seed has 225 F, 128 D and 63 G, rather than the stated 224 F, 128 D and 64 G. This audit does not choose or invent a missing Boston goalie.
3. **P1: one seed identity remains partial.** The literal `Jake Middleton`, CGY, D, age30, OVR76 has no exact normalized name plus role match in either official two-season bio pool. The source pool contains a different full-name record, `Jacob Middleton`; an alias must be verified rather than inferred. No automatic alias or player replacement was made.
4. **P1: OVR68 mixes different evidence states.** Pyotr Kochetkov has nine 2025-26 appearances and a prior 47-game season. Sergei Murashov has five current-season appearances. Jaxson Stauber has a six-game prior-season row and no current-season row. Adin Hill has 27 current-season appearances and therefore meets the stated goalie sample qualifier; his 68 is not evidence of missing current stats. `gauntletDraftNhl.ts` excludes every68 while NHL GM includes them. A single integer cannot communicate all four source states.
5. **P2: current seed grades are one-season production proxies.** Forward and defender grades are points-per-game ranks. Goalie grades blend save percentage with wins. These inputs cannot establish all-around defensive ability or isolate a goalie's ability from team support. Prior-season evidence is available for397 of the415 joined players and is ignored by the stated original recipe.

The five differences between seed-team codes and freshly retrieved current-team codes are dated-source differences requiring review, not proven erroneous transfers. The seed describes August5; the bios were retrieved October2 and contain no effective-date field for current team. Historical season teams must not be overwritten with current bios.

## Exact consumers and held source

| URL | Current source and effect |
| --- | --- |
| https://douknowball.com/nhl-front-office | `src/lib/nhlFrontOffice.ts` imports `NHL_FO_ROSTERS`, copies `ovr` and `age`, and calculates fictional opening salary with `nhlSalaryFor`. Any scale change changes new-career payroll unless separately constrained. |
| https://douknowball.com/nhl-gauntlet-draft | `src/lib/gauntletDraftNhl.ts` uses the same literals and filters OVR68. A future confidence flag should be interpreted deliberately rather than changing this pool accidentally. |
| https://douknowball.com/conquest-nhl | `src/data/conquestDataNhl.ts` has a separate editorial team-strength model. This audit does not authorize replacing it with a new player aggregate. |

Existing GM saves contain their own player ratings and fictional contracts. Source recovery provides no authorization to rerate saved careers, change old contracts, replace historical pools or overwrite real past records with simulation outcomes.

SHA256 holds, checked before and after offline analysis:

| File | SHA256 |
| --- | --- |
| `src/data/nhlFoPlayers.ts` | `f9418936c94d96f445adffbc47861c81cf243bcbff6b33011eb1c3e4c0df592a` |
| `src/lib/nhlFrontOffice.ts` | `cc83b40683a4d9b40d3ce25341ba20ada37484bab86954a2e4b2ac0a09238b8c` |
| `src/lib/gauntletDraftNhl.ts` | `eba34c73423e75c403e3185488f9d5afbb7f718df73ef5bddaa011c352c2a096` |
| `src/data/conquestDataNhl.ts` | `d309d3b31ac2acfe6ef5965e878de2e0dc7463140ff87c147b60bf3ee9d02681` |

## Acquisition receipt

Exactly eight authorized public requests were made, once each, with zero retries. All succeeded. Every data response's returned count equals its API total; `limit=-1` did not silently truncate these eight retained responses. Hashes are for raw response bytes, not reserialized JSON.

Evidence folder: `C:/Users/antho/AppData/Local/Temp/dukb-nhl893-source-2026-10-02`.

Each `request-01.json` through `request-08.json` records the full request URL, UTC start/end, season/filter, pagination, status, byte count and raw SHA256. `schema-receipt.json` records actual fields and the NHL's own configuration response. `audit-report.json` contains all416 literal rows, safe joins, stats, diagnostics and reconstruction variants. `audit.mjs` operates offline under `scripts/lib/offlineTransport.cjs` and verifies source/raw hashes.

The authoritative endpoint schema was read from the NHL's own [configuration endpoint](https://api.nhle.com/stats/rest/en/config). Unofficial search results were discovery hints only; they were not treated as a sports-stat authority.

| Request | Retained report | Filter | Returned/API total | Retrieved UTC | Raw SHA256 |
| --- | --- | --- | ---: | --- | --- |
| 1 | `official-config.json` | Configuration, no season | n/a | 17:17:29 | `2684a6822dbbc83e3373a576e4229f59fdeab9094876d09ba03db2848e58c6cb` |
| 2 | `skater-summary-20242025.json` | 20242025, regular season | 920/920 | 17:18:50 | `5d9bec593868802864436746c995cc705c049706b27541cbdb2c3d7759a22f55` |
| 3 | `skater-summary-20252026.json` | 20252026, regular season | 940/940 | 17:18:50 | `00bfd1344d2cc7df8c5a6e054475a9d341145f8bc67f734f374d378fb85d55f3` |
| 4 | `goalie-summary-20242025.json` | 20242025, regular season | 103/103 | 17:18:50 | `fb9122019cf52f2c4b16303ba76a85f249ee96c44d4539d1dc4f2e6cdfe86c71` |
| 5 | `goalie-summary-20252026.json` | 20252026, regular season | 98/98 | 17:18:50 | `bf0f5312dde65799897ce8d28fe34cc1a0652ab2f060cd9929660377e08a131f` |
| 6 | `skater-bios-both.json` | Both seasons, regular season | 1069/1069 | 17:18:52 | `65afa5bc92104d8d38f5105045324cdd51aaaece622a6dabbb1bacee1a6097c6` |
| 7 | `goalie-bios-both.json` | Both seasons, regular season | 118/118 | 17:18:52 | `ec86994b1200163a14b675f89914e818252a2718d9598ece502db56d1ba51805` |
| 8 | `skater-realtime-both.json` | Both seasons, regular season | 1860/1860 | 17:18:53 | `fb89e3206fb3b9e1f9e45424fce77d2bb3d5b84d9bd27b4c27814ab4710b96cc` |

Data URL shape: `https://api.nhle.com/stats/rest/en/{skater|goalie}/{summary|bios|realtime}?isAggregate=false&isGame=false&start=0&limit=-1&cayenneExp={encoded expression}`. Exact expressions are `seasonId=20242025 and gameTypeId=2`, `seasonId=20252026 and gameTypeId=2`, or `seasonId>=20242025 and seasonId<=20252026 and gameTypeId=2`. Full exact URLs are retained in the per-request receipts. No more requests are authorized in this acquisition budget.

## Identity, season and pool coverage

Join rule: Unicode accent normalization, case folding and punctuation/space removal, plus compatible broad F/D/G role. A name joins only when exactly one official player ID survives. No edit distance, inferred nickname or guessed birthplace was used. All415 accepted joins have distinct official IDs; no duplicate season-total keys were found.

| Existing group | Literal rows | Exact identity joins | 2024-25 stats | 2025-26 stats | Both seasons | Current stated qualifier |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| F | 225 | 225 | 219 | 225 | 219 | 225 |
| D | 128 | 127 | 121 | 127 | 121 | 127 |
| G | 63 | 63 | 58 | 62 | 57 | 60 |
| Total | 416 | 415 | 398 | 414 | 397 | 412 |

The current reference populations, before restricting to the shipped13-per-club pool, contain436 forwards with GP>=30,224 defenders with GP>=30, and70 goalies with GP>=15. Using only the shipped stars as the percentile reference would change what the grade means and inflate it.

All415 joined players have birth dates. Their computed age on2026-08-05 equals the literal seed age. This corroborates the file's stated age basis against one official lineage; it is not a current-age refresh or independent verification of birth dates.

Bio responses contain no `seasonId`, despite a two-season filter. They contain one player identity and window totals, plus present-day team fields. Their totals must not be assigned to one historical season. Summary and realtime responses do carry `seasonId`; each returned row matches the requested season range. `gameTypeId` is scoped by the request and is not returned as a row field, so the manifest must travel with the data.

Seed/current-bio team differences: Chris Kreider ANA/MTL, Kirill Marchenko CBJ/TOR, Elvis Merzlikins CBJ/TOR, Luke Evangelista NSH/NJD, Matthew Knies TOR/CBJ. These are unresolved dated membership checks. The recovery scope neither validates nor changes any transfer.

## Available features and limits

| Group | Recovered usable source fields | Opportunity or confidence basis | Important missing evidence |
| --- | --- | --- | --- |
| F | GP, goals, assists, points, P/GP, EV/PP/SH points and goals, shots, TOI/GP, shooting percentage, faceoff win percentage; realtime hits, blocks, giveaways, takeaways, attempts | GP for production, shots for shooting rate; actual ice-time volume after unit validation | No isolated player-impact model, verified defensive skill, on-ice expected goals or competition adjustment. Faceoff percentage lacks an attempt denominator in these selected reports. |
| D | The same dated skater reports; separate defender reference population | GP and ice-time opportunity, never forward ranks | Defensive suppression and role deployment are absent. Hits/blocks measure activity, not proof of good defending; team/rink effects are not controlled. |
| G | GP, starts, TOI, shots against, saves, save percentage, goals against, GAA, wins, shutouts | Shots faced for save-rate reliability, starts/TOI for workload context | No shot-quality or goals-saved-above-expectation input. Wins and GAA are team-sensitive. No medical or injury facts were acquired. |

Units and stat definitions must be recorded before turning TOI-based fields into per60 inputs. This receipt preserves raw API values; it does not silently invent denominator semantics.

Checks: all skater point totals equal goals plus assists; all numeric GP values are nonnegative integers; all returned skater totals have matching realtime rows; all season-total keys are unique; all joined season roles agree at broad F/D/G level; save percentage agrees with saves/shots against within0.00002 for every returned goalie row with shots against>0.

Two diagnostics require correct interpretation rather than automatic rejection:

- Eight traded-player seasons contain83 to85 appearances, and each carries multiple historical team abbreviations. A blanket GP<=82 player check would wrongly reject them; the team's schedule size is not a ceiling on a player who changes clubs.
- Forty goalie rows have `shotsAgainst != saves + goalsAgainst`, while every measurable save percentage agrees with saves/shots against. Raw values are preserved. This audit does not infer the reporting convention or declare40 historical errors. A future validator must settle the field semantics rather than rewrite goals against to force arithmetic agreement.

## Old-recipe reconstruction

The executable offline probe applies the header's66..97 forward and66..95 defender ranges to current P/GP populations, and the66..95 goalie range to a60% save-percentage/40% wins percentile blend. It tries four general percentile/rounding conventions without named overrides.

| General convention | Exact literals | Within one point | Mean absolute difference |
| --- | ---: | ---: | ---: |
| Midrank divided by population size | 395 | 415 | 0.06731 |
| Inclusive empirical CDF | 368 | 414 | 0.13462 |
| Average zero-based rank divided by N-1 | 404 | 415 | 0.04567 |
| Same rank, goalie truncation | 400 | 415 | 0.05529 |

The best convention matches every352 safely joined skater exactly and52 of63 goalies. Eleven goalie outputs differ by+1, and unresolved Jake Middleton cannot be measured; its default fallback was counted as a mismatch, not accepted as a real estimate. There is no proof that the original generator used this precise convention. Later source corrections or an undiscovered tie/rounding rule may explain the goalie differences. Do not promote a best-fitting reconstruction into a claim of exact reproducibility.

## Proposed deterministic replacement, before production

The proposed output is a **simulation estimate**, never a historical statistic or a copied commercial grade. A reproducible implementation would keep structured source facts, the model version and the resulting grade separate.

1. Key retained observations by official player ID, season and regular-season scope. Read dated role from each season report. Keep current seeded C/W/D/G unchanged until separately reviewed. Reject ambiguous identity, missing observations and duplicate season totals; distinguish unsupported from a genuine numeric zero.
2. Build reference populations from all observed players in each season and broad role, not just the selected416. Stable sorting and an explicitly specified tie convention make the same inputs produce the same outputs. Use a single documented0..99 display scale, with different role features feeding it.
3. Use two-season production and opportunity. A player's small current sample must not erase a substantial prior season, and no current-season record must not be interpreted as rookie status. Any recency weights and prior constants are simulation assumptions, retained in versioned model metadata and reviewed with distributions before acceptance.
4. For F, test a production combination of points/game and even-strength points/game with shooting volume as context. Avoid treating shooting percentage on a few attempts as elite skill. Faceoff win percentage cannot enter a confidence-aware feature until an attempt denominator is available. For D, evaluate offense separately from usage; do not call a P/GP-only number complete defending ability. Keep missing defensive-impact evidence visibly partial.
5. For G, prioritize a source-checked save rate with shot-based reliability. Keep wins, shutouts and GAA as supporting context rather than allowing team wins to create an elite goalie. Shrink low-shot estimates toward a documented role reference, carrying dated prior observations. The model must bound the measured target before confidence blending so extreme small samples cannot escape the safeguard.
6. Grade each feature with its own denominator. GP cannot establish confidence in save percentage or shooting percentage. Missing metrics must remain null and receive no fabricated perfect/zero performance. A player with only an unsupported feature remains partial; raw observed facts stay unchanged.
7. Keep generated prospects, fictional contracts, development, injuries and future seasons outside the sports-stat record. Validate new opening economy separately: `nhlSalaryFor` currently depends directly on OVR, so rerating without a salary policy changes finances. Preserve saves and historical pools. Do not combine this work with Boston roster repair or live transfer updates.

This is a recipe proposal, not a calibrated finished model. There is no new NHL grade payload, production generator, player-facing label change or salary cutover in this round.

## Adoption gate and remaining work

- Verify the Middleton alias with independent evidence or keep it partial. Review the Boston missing-goalie selection separately with dated membership sources.
- Recover an executable, versioned model and condensed input manifest. Preserve official IDs, season, retrieval date, source hash and validation status; do not turn a current bio into a historical roster fact.
- Independently compare a bounded selection of real season inputs before any player-facing stat adoption. All acquired reports here share the NHL lineage; secondary checks have not been performed. The source-guardian two-source rule remains unsatisfied for publishing these new facts.
- Settle goalie count semantics and TOI units before enforcing derived checks. Do not discard valid traded-player appearances above82.
- Test feature-specific shrinkage with deliberate small samples, nulls, duplicate IDs, mixed seasons, one-season veterans and changed roles. Controls must actually change outputs and fail the intended assertion.
- Review F/D/G distributions, elite and ordinary examples, rookie/prior evidence and statistical limits. Defensive grades stay partial until the model has defensible evidence rather than pretending activity counts establish talent.
- Preserve the13-per-club selection and all existing games until an explicit separate decision authorizes membership or consumer changes. Run full opening-payroll, contract, roster and career-save comparisons before production use.

No site quality, AdSense readiness, completed game or correct-current-roster claim follows from this source recovery.
