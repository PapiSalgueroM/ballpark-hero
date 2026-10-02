# MLB opening rating model, Round936

This is an unimported simulation candidate. It does not change a game, a roster, a save, a contract quote or a historical statistic. The grades and opening prices are original modeling choices, not published player grades or comprehensive measurements of ability. Every candidate grade has `partial: true`.

The active MLB Front Office engine still uses its existing2026 seeds. Adoption would need a separate claimed engine/UI round, actual seasons, roster and transaction economics, save compatibility, native interaction and honest visible explanations. This preparation is not a claim that MLB Front Office has been upgraded or completed.

## Frozen source boundary

The model calls the fail-closed Round903 reader before computing output. That reader independently pins all four prior table hashes, the retained raw-source manifests, the780 current identity joins and six current source/rule hashes. A caller cannot authorize changed observations by updating their own manifest hash.

The prior tables retain2024 and2025 regular-season full-league hitting/pitching totals, acquired once from the official MLB Stats API. Current2026 observations and roster membership are the existing committed snapshots, read2026-10-01, with roster date2026-09-27. No requests were made in Round936. Raw facts stay in script-only source files; the generated candidate contains simulation grades, prices and bounded evidence metadata.

This is one official publisher lineage. The existing ESPN50-player spot check concerns current membership, birth date, bats and throws. It does not independently verify all three seasons' statistics. Missing prior-season observations are unavailable evidence, not zeros, retirement dates or proof of inactivity.

| Season | Hitting table | Pitching table | Eligible hitters | Eligible SP | Eligible RP |
| --- | ---: | ---: | ---: | ---: | ---: |
|2024|742|855|410|169|319|
|2025|765|873|393|177|317|
|2026|751|868|407|174|325|

Reference eligibility is150 plate appearances for hitters,150 recorded outs for starters and60 outs for relievers. A pitcher's observation is SP when at least half that season's appearances are starts, otherwise RP. The current game's forced rotation or CL display label never selects a historical reference cohort. Saves earn no bonus.

Among the current780 IDs,196 lack their relevant2024 stat group and97 lack their relevant2025 group. Current-vs-dated SP/RP differences are46,30 and6 respectively. These counts intentionally collapse CL to RP and differ from Round903's SP/RP/CL display-role diagnostic. The candidate marks67 players with at least one dated/current pitching-role difference.216 players lack at least one usable year; no current selected player is wholly unmeasured in this held window.

## Original simulation assumptions

All players use the same fixed prior72. There is no named player override, veteran prior, commercial grade, star quota, age-based boost or save bonus.

For each year, valid eligible full-league observations provide that year's mean and population standard deviation. Hitters use OPS only. Pitchers use strikeouts, walks and home runs per9 innings, computed from recorded outs. More strikeouts improve the target; more walks or home runs reduce it. These are separate features, not a claim to reproduce a fielding-independent pitching statistic. They omit hit-by-pitch, contact quality, defense, park effects and other context. OPS omits fielding and baserunning.

The modeled target is `84 + 12 * z`, clipped to55..98 before shrinkage. A feature with no available reference or zero variance is omitted. Missing OPS and zero recorded outs do not become observed rates. A measured zero with positive opportunity remains a measured zero.

Each annual feature target is combined using opportunity exposure. Year weights are2026=1,2025=0.65 and2024=0.4. Exposure is year weight times opportunity divided by the assumed shrinkage opportunity. The combined target weights are these exposures. Support is `exposure / (1 + exposure)`, and the feature grade is `72 + support * (target - 72)`. Pitching combines the resulting features at45% strikeouts,35% walks and20% home runs; unavailable features are omitted and remaining weights normalized.

The assumed shrinkage opportunities are150 plate appearances for OPS;150 outs for SP strikeouts/walks and60 for RP;300 outs for SP home runs and120 for RP. These thresholds, weights, scale center/spread and prior are simulation design assumptions, not empirically fitted accuracy claims. `sampleWeight` is the bounded shrinkage weight, not a probability that the grade is correct. A held game position does not establish that the player has adequate evidence for that role.

Evidence records the model version, original numeric-ID/name/position key, opening grade, feature basis, partial status, sampleWeight, used years, dated usage and a role-mismatch marker. The common version/window records the prepared date and roster date. It is opening evidence, not a live roster refresh or proof of later simulated development.

## First measured candidate

| Arm | Mean | Median |90th percentile | Range | Grades90+ |
| --- | ---: | ---: | ---: | --- | ---: |
|Existing opening seeds|78.53|78|92|64..97|118|
|Same new model, current2026 only|80.69|81|90|61..94|83|
|Three-year candidate|82.01|82|90|64..96|92|
|Half shrinkage opportunities|83.05|83|92|63..97|129|
|Double shrinkage opportunities|80.50|80|88|66..94|42|

The candidate's390 hitters average82.19 and390 pitchers81.82. The90th percentiles are92 and88. Among18 shallow-current players with eligible prior evidence, change from the current-only arm averages+4.61, median+4, range-4..+17. Historical evidence can lower a grade as well as raise it. Neither the distribution nor the sensitivity arms establish actual talent accuracy or a future game-balance guarantee.

## Opening prices and unresolved economy work

The model preserves each original club's measured opening payroll in tenths,118.9M at the low end and230.1M at the high end. All30 remain below the existing244M simulation budget line. The allocation keeps13 priced contributors and13 depth deals at0.7M. It selects the candidate's best8 existing hitters,3 existing SP and2 existing RP/CL, without changing memberships or inventing roles. A roster lacking those units refuses allocation.

The priced unit receives the original payroll less the13 depth floors, proportionally to the unchanged existing salary curve's weights. Whole tenths use largest remainders with deterministic original-slot tie breaking. This preserves the budget and13/13 shape; it does not preserve every old player's price. Every price is a fictional simulation value.

This is only an opening allocation proposal. It does not adopt a future renewal curve. The existing engine's quoted prices, depth-deal expiry, bench trades, cuts, free agency and AI actions have not been revalidated against the new grades. A0.7M bench player can still be valuable. No full-season or multi-season economy acceptance is claimed here.

## Verification scope

The dedicated Node proof exercises the actual frozen builder, literal independent calculations for tiny samples and pitching features, annual roles, missing/null/zero and variance, shallow-season evidence, recency, exact original budgets via the current engine's actual salary/unit function bodies, deterministic rendering and physical checkpoint refusal before writes. Copied source controls must change executable bindings, run every outcome case, hold independent source/identity baselines and reject exact expected outcomes. Matching normalizes CRLF while final holds compare raw bytes. Owned cleanup resolves and bounds Windows paths. The harness imports the offline transport blocker.

Final normal proof passes16/16. All18 copied controls are accepted, with every16-case file executed and the independent retained-source and780-identity baselines held:

| Executable control | Intended rejects | Held passes |
| --- | ---: | ---: |
|Remove target clipping|7|9|
|Remove unmeasured prior|1|15|
|Replace support with full trust|9|7|
|Reverse strikeout direction|3|13|
|Reverse walk direction|3|13|
|Reverse home-run direction|3|13|
|Remove longer home-run opportunity|3|13|
|Restore saves bonus|2|14|
|Coerce missing OPS to zero|1|15|
|Invent an out for zero-outs evidence|1|15|
|Use unavailable variance|1|15|
|Reverse dated SP/RP classification|5|11|
|Replace recency weights|4|12|
|Remove depth floor|3|13|
|Spend the depth reserve twice|3|13|
|Remove partial status|2|14|
|Remove dated/current mismatch marker|2|14|
|Bypass the pinned source reader|1|15|

The first matrix is retained. Four initial classifier sets missed additional or unaffected outcomes; only those expected title sets were corrected. No failing expectation was removed or relaxed. The final proof also checks missing checkpoint files, zero variance, and the actual generator's write/check path in an owned private project. A changed valid OPS plus caller-updated seal is refused before its existing candidate sentinel can be overwritten. Normal generation writes the expected bytes.

Final matrix results and source hashes are recorded at `C:/Users/antho/AppData/Local/Temp/dukb-mlb936-model-2026-10-02/verified-summary.json`, with `controls-final.json` and the19 final logs. No browser test, full engine initializer campaign, game save, mobile interaction, runtime bundle or remote verification is attributed to this script-only proof. Independent source review and parent app type/build,15 built readers, exact generator check, source-input and model-outcome harnesses now pass. The exact-person guard allows the candidate file only, with all25 alternative-spelling probes caught and no outside findings. See the separate MLB-OPENING-MODEL-RECEIPT-2026-10-02.md for final parent source acceptance. Gameplay adoption remains separate.
