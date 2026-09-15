# Feature verification, September 15, 2026

These completed runs are evidence for their exact commits. None produced an
accepted release artifact. Their replacement runs must pass independently.

| Release | Completed run | Node harnesses | Vitest | Remaining failure |
| --- | --- | --- | --- | --- |
| 586 | [35015669643](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/35015669643) | 313 of 313 pass | 279 of 279, 33 files | Generated files changed after build |
| 603 to 605 | [35015688372](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/35015688372) | 314 of 314 pass | 296 of 296, 34 files | Generated files changed after build |
| 587 | [35015700619](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/35015700619) | 315 of 316 pass | 305 of 305, 36 files | `simEras.mjs`: insufficient age-35 keeper observations |
| 588 | [35015717663](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/35015717663) | 316 of 318 pass | 311 of 311, 37 files | Pack/room mutation fixtures and Stadium/Factory download limits |

The three first runs passed their type, build, browser and dedicated control
steps. Round 588 passed types and build, but its browser step rejected the two
download limits. Expected failure output from negative controls is not a
healthy-test failure. Node counts above come from complete, unique result rows.

## Retrieved logs

The log archives were downloaded and their SHA-256 values checked before
safe extraction. These are logs, not deployable build artifacts.

| Release | Exact verification commit | Log artifact | Archive SHA-256 |
| --- | --- | --- | --- |
| 586 | `f5ba388cd185fe46da6d9973f0229f8e6200d000` | `10418947520` | `604919c24da9312c0df211cbac3b73ba3ea535d8e1283a8942c779a6cf3ad0d1` |
| 603 to 605 | `83a7927d6a0b7ae5913801824e4f3a9e53522c7e` | `10418808735` | `0c9d21c2f99ce71f17ac60be8fc915c93dfd52247c5ebf2690e31c908fe340b1` |
| 587 | `47d23496e8f6b15703357e82b6cef33507883ce6` | `10418648775` | `23a6e24de92cfd958d79fdd0f17f16798d055c54634d32d043a173e4f582248d` |
| 588 | `4b5c8b40805d2484e2fbaa0310559aab993ac7fb` | `10418245733` | `3b49637a349369f7dc0b93e1a5de4501a97335534c67107359f741c7ae93b33c` |

## Repairs and limits

The roster harness wrote temporary modules into `dist`. Repair `3999a5e8`
moves its scratch directory to OS temp and cleans it after import. All 137
healthy checks and four effective controls pass. This repair is present in
the replacement sources. Artifact equality checks stay unchanged; new
diagnostics record the precise paths if another test changes build output.

Round 587's sole node failure does not report the exact keeper count. Its
message means fewer than 20 observations, not necessarily zero. The same
harness and engine passed in the earlier 588 run. Isolated repair `a46c59a0`
uses two predetermined cohorts, keeping every age-curve and retirement
standard. Its full nine-section replay passed in 966.817 seconds on Windows;
five assertion controls prove the sample and outcome fences. Exact raw
observations repeat with SHA-256
`7d93e7e847bf9e1cc2d4a17bbf00285c94242bf7d30e71fdc458704906d81c94`.
Keeper counts are 56 at age 33 and 47 at age 35. Each cohort independently
passes the original retirement floor, with 271 and 262 retirements. The repair
is not part of main or the currently running replacement releases.

Round 588 source `8a4e00a53331e2bb6a7a694dc4602e3994434c68` includes the
loading repair and both fixture repairs. Local type/build, all 11 original
download limits, phone layouts, normal/reduced motion, gear, creation and
reveal checks pass. Fifteen gear controls, seven celebration controls, 22
pack controls and 11 room controls pass their intended failure contracts.
The final standalone pack style fix is covered by actual cold pack tests;
the fresh full run must repeat the complete pack and room harnesses.

Factory is only 31 bytes below the existing rounded download boundary. No
budget was raised and no spare capacity is claimed. Saved equipment IDs,
catalog values, fees, rewards, game RNG and engine behavior are unchanged by
the loading repair. Local source, log and built-CSS hashes are recorded in
`dukb-588-final-local-evidence.json`, SHA-256
`0a019271c79eca701e206c909a76a58ba270a5cefc14825eab53cc42d126e0fb`.

The current heads and replacement run links are in `PROJECT-STATE.md`.
Publication order remains the content correction, 586, 603 to 605, 587, 588.

## Next match-action work, read-only reconnaissance

At source `8a4e00a5`, NFL `simSeason` and NBA `simNbaSeason` return season
totals or averages. NFL Front Office `simGame` returns a final opponent,
score and winner; NBA Front Office `simRound` and `playSeries` return win/loss
or series totals. These modes do not retain scoring sequences or player
attribution. The Conquest play feeds do not belong to these career modes.

A future final-whistle scene can use the committed NFL weekly result, and
an NBA court celebration can use a committed playoff-series win. Throws,
catches, baskets and blocks require engine-owned event records first. Do
not reconstruct individual actions from season totals. Preserve RNG calls,
result/save timing, immediate Skip and reduced motion. This is preparation,
not a new feature claim, reservation or implementation beyond 588.
