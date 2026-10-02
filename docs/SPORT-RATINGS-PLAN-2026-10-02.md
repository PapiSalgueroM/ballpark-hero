# Sports ratings repair plan

Date: 2026-10-02. Owner: Codex891 audit/program, Codex889 NFL source acceptance and895 NBA integration. Claude retains875 database work and publication;890 Club Manager speed is shipped. This is an internal implementation plan, not indexed site content.

Anthony's requirement: familiar 0 to99 numbers across sports using an original DoUKnowBall method. The commercial games he named are comparison references, not datasets to copy. A player cannot be capped at65 simply because a curated list puts him outside its starting fifteen.

## Meaning and acceptance

The target interpretation is rare95+ exceptional players,90s elite players,80s strong established starters,70s developing players and ordinary rotation depth, and lower ratings for limited/fringe players where evidence supports it. These tiers are simulation design choices. No tier is a verified historical fact, and position-relative evidence must precede a number. Potential is separate from current ability. Do not force a famous name to a desired number.

Current ability, current-season performance, historical peak ability and generated future progression are separate concepts. A current card and a current GM opening player should share a method when they share the same inputs; a historical peak card need not share that current number. Saved career development must survive a calibration update.

Every accepted method needs:

- Retained source URLs, season, retrieval date, hashes, identities and validation status. Missing observations are not zeros; public snippets are not all-row verification.
- A reproducible original recipe with position-specific inputs and an explicit treatment of sample size, prior seasons, rookies and missing data.
- Clear separation between actual sourced statistics and simulated OVR, potential, salary, contracts and outcomes. Mark low-confidence estimates where the data cannot measure the job.
- Distribution and named-case diagnostics, including the owner's four Browns examples, injured established veterans, weak efficiency with high volume, reserves, rookies and ambiguous identities. The diagnostics must not become named-player overrides.
- Current-game consumer inventory and versioned new-game binding. Do not silently overwrite earned progression or replay past results in an existing save.
- Opening payroll, cap, trade, renewal, development, retirement and AI-selection checks. A rerating that turns cheap reserves into90+ trade assets is incomplete.
- Effective executable negative controls and real end-to-end play, refresh, restart and multiple-season checks for the affected games. A source-only audit or TEMP candidate is not a shipped repair.

## Sport-specific work

| Sport | Verified current problem | Current work | Required next step |
| --- | --- | --- | --- |
| NFL | Original core/depth bands capped strong depth players at65. OL and defensive inputs still cannot measure every part of the job. |889 v2.2 is accepted in source for new full-roster franchises, with2163 exact tuples,32 preserved budgets, compact lineage, explicit limitations and actual two-season play across three layouts. Existing saves and other curated consumers remain unchanged. | Claude publication, then verify the published behavior separately. Continue unresolved trade-exception and factual coverage work without claiming all NFL consumers are rerated. |
| NBA | Named OVRs are editorial literals; GM opening ages are generated. Conquest displays an O/D average but scoring also uses separate team.rating. Career team quality starts randomly. |894 v0.4 model and six4-season economy campaigns reviewed.895 separate300-player generation is frozen; original ages/terms/draws and old saves remain held. New initializer/Board acceptance is in flight. | Complete895 source controls, financial outcomes, type/build and actual multi-season UI proof. Missing identities, unchanged seed roles and box-score defensive limits must remain visible. |
| MLB | Reproducible2026 single-season percentiles represent current performance, not necessarily projected talent. Some partial rows default low; card and GM pools use different source epochs. Career team quality starts randomly. |891 re-executes seven sample ratings against actual committed pipeline and records its limits. | Retain the useful existing source pipeline; evaluate multi-year, role and sample confidence without suppressing partial markers or inflating familiar names. |
| NHL |416 seeded OVRs lack an executable recipe. OVR68 mixes absent, tiny-sample and measured observations. Boston has8F/4D/1G despite the7F/4D/2G claim. |893 retains official2024-25/2025-26 summaries/bios/realtime.415 conservative joins,397 withbothseasons;404 literals reproduced withone generic rank convention,11 goalie differences, one unresolvedalias. | Settle units/goalie count semantics, independent fact/identity checks and a deterministic multi-year F/D/G model. Preserve partial evidence and opening economy. Do not claim reconstruction is exact or repair memberships incidentally. |
| Soccer | Current Club Manager and Squad Deal use different value/age curves; six exact same-player disagreements reproduce offline. Historical and current proxies are mixed through multiple adapters. |891 inventories exact formulas and money/save consequences. | After a non-overlapping Club Manager handoff, review a shared current method over unchanged source rows. Cover own/opponent squads, cards, previews, partial inputs and generated-player economics. Preserve historical scales and existing saves. |

## Reviewed artifacts and current limits

- `docs/audits/SPORT-RATINGS-NFL-2026-10-02.md`: current NFL defect, rejected naive reranking, acquired inputs, identity hazards and revised TEMP candidates. A naive salary rebake put all32 clubs over cap; retaining cheap legacy salaries created bargain stars. Both problems must be handled, not hidden.
- `docs/audits/SPORT-RATINGS-OTHER-2026-10-02.md`: active URLs, exact consumer formulas, distribution evidence, six measured soccer inconsistencies, source gaps and bounded soccer cutover proposal.
- NFL retained evidence feeds the committed frozen bootstrap checkpoint and accepted new-game model. It does not enter the browser as a raw historical table. No production database or website reads were used for this work.
- `docs/audits/NHL-RATINGS-SOURCE-2026-10-02.md` and `docs/audits/NBA-RATINGS-SOURCE-2026-10-02.md` retain newly recovered official input coverage, hash receipts, reproducibility checks and adoption gaps. Multiple official reports are one publisher lineage, not independent two-source verification. No NBA/NHL seed or age cutover occurred.
- `docs/audits/NFL-OPENING-RATINGS-RECEIPT-2026-10-02.md` records final889 source acceptance, generator/model/engine controls, original baseline, actual native campaigns and size limits. The earlier audit retains rejected trials.892 promotion guard remains held. Offensive-line and mixed defensive evidence stays qualified; no live publication is claimed.
- NHL893 v2 fixes two opportunity guards with all416 proposed tuples held. A global flat-price trial restores much of the original long-term payroll, but a real Carolina AI draft creates a1.3M next-cap excess. That affordability defect blocks production adoption; both policy trials and the failed case remain in TEMP.

This program remains open until the affected models are implemented, reviewed and played. It does not establish AdSense readiness or approval. Do not mark all sports fixed after one NFL candidate or a formula extraction.
