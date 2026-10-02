# NBA rotation implementation receipt

Date:2026-10-02. Round887. Source acceptance, publication remains Claude's.

## Result

https://douknowball.com/nba-front-office gains Roster > Set rotation: five starter and three bench slots, native labeled selections, automatic reset, temporary injury cover and saved preferences. The actual strength and box-score engines consume the same slots. Choosing another player already in the rotation swaps the slots. Departures are repaired after accepted moves and offseason transitions. Invalid, foreign, injured or identical choices preserve state. A restart returns the new franchise to its roster list.

Feedback follows an accepted change, runs once for400ms and becomes static under reduced motion. Mount, passive redraw and reload stay quiet. Back receives initial focus and returns to the exact roster opener with preventScroll. Controls are at least44px. The panel replaces the roster card while open and includes a Back action.

## Integration and engine evidence

Claude's ReleaseV landed during this round. It includes851 balanced schedules and full NBA trade lists. The three overlapping source files were held raw inTEMP, then merged onto881c9aca. A normalized three-way merge preserved the schedule and rotation imports and every trade-list change. The old4b3e0138 gate/receipts remain pre-merge evidence, not final acceptance.

The final engine suite passes16/16. Physical pre887851 engines reproduce six complete original campaigns, fresh seeds117/431/907 and legacy saves with no schedule after a played round. Every canonicalized field and exact RNG draw count holds through regular season, play-in/playoffs, awards/tax, real draft choices, offseason and the resumed next season. Opaque minted IDs and matching team|ID keys are projected to collision-checked player identities; this is not a claim that different module counters mint byte-identical IDs.

Fresh full campaigns assert all30 clubs play80 games. Draw counts are12648/12619/12685 for fresh campaigns and17256/17207/17317 for legacy campaigns. Runtime preservation reconstructs881c9aca exactly outside11 engine and7 stat integration deltas, with declared workingCRLF/gitLF normalization.

Eighteen paired fictional-roster regular seasons use identical random draws. Deliberately weak starters change measured win probability from0.86678 to0.29104; six-seed blocks gain43.5,40 and44.83 wins for the stronger selection. Assertions require a probability gap above0.5 and every block above30 wins. This measures the effect in those controlled fixtures, not a prediction for real NBA clubs.

Sixteen exact executable controls prove strength, box participation, injury cover, uncovered holes, healthy selection, swaps, auto reset, malformed preferences, release, signing, both trade paths, restored IDs, offseason, all-injured emergency and RNG preservation. Each runs all16 outcomes, including independent baselines. Physical original consumers produce10 intended failures and6 held passes. Controls preserve raw source bytes and remove only their own copies.

## UI and native evidence

- Existing new-panel suite:15/15 after updating only its first-round expectation from6 to4 for851's booked schedule. Eight controls hold exact failure/pass identities: save3/12, slot2/13, auto1/14, accepted2/13, focus1/14, return1/14, finite1/14, reduced1/14. All15 cases execute every run.
- Actual Board restart suite:3/3. Removing only the new reset line gives the stale-view failure while both independent save/restart baselines hold. The first captured test snapshot already contained the fix and is not credited as original evidence.
- Native original regression: open rotation, abandon, select another franchise and open Roster. The pre-fix Board showed the previous rotation view. Retained explicit failed assertion identifies this defect; an earlier wait timeout is not acceptance.
- Final native actual Board/engines/completion hook:1440 keyboard,390 touch and320 touch/reduced. Two whole booked seasons per layout, including actual playoffs, drafts, offseason, roster cuts and next-season play. Manual/automatic changes, exact refresh and recap saves, no duplicate completion on reload, new-franchise restart and unrelated save preservation pass.305 checks,15 screenshots, zero console/page errors or outbound browser attempts. All eight actual runtime/CSS inputs remain held.

Native fixtures use fictional renamed players, simulated low-cost contracts and replaced remote recording seams. Desktop exercises native keyboard selections; phone cases use touch buttons and DOM selectOption, not an OS picker. This is full NBA Board flow, not a full App/navigation/auth/backend or real-data certification. Fixture RNG restarts on page reload.

## Final gates and derived content

A clean881c9aca archive, node_modules junction and only the owned scope exclude the12 paused drafts. Final app type0 and build0. All15 required built readers pass. simGuideHeadings, simNbaRotation, simNbaRotationUi, simNbaRotationReset, simNbaSeasonStats and simHarnessAnchors pass. Existing851 schedule, luxury-tax, IDs, trade finder/talks, cuts and save-recovery fences also pass. The historical schedule reader uses a read-only GIT_DIR/GIT_WORK_TREE context because the archive has no.git; its earlier environment refusal is retained and uncredited.

Only one NBA rules paragraph and one visible instruction change. The mixed paused basketball file is staged through a clean HEAD-based blob, not whole-file staging. NBA-only prerender samples at0/5/11 days pass. Only /nba-front-office changes in the frozen guide and lastmod maps; the other169 sitemap entries keep their prior dates. The final build and all15 readers run after that regeneration.

One prerender invocation accidentally used the shared checkout's older dist. Its output is retained as an uncredited wrong-build snapshot, the tracked NBA snapshot was restored fromHEAD, and the authoritative run used the isolated merged gate. No unrelated snapshot was generated. Early type compatibility and keyboard-write-count failures are also retained, corrected and excluded from acceptance.

All12 paused raw files remain identical when the single owned NBA paragraph is reversed. All original stashes remain unchanged. Exact owned sources match the passing gate. Owned browsers/servers are closed; no4987/4988 listener remains. No desktop, Supabase or live-site request was used.

## Limits and records

Minutes remain fixed simulation slots, not a fatigue/tactical/position-fit system. The original all-injured box-score exception still plays the best eight even if injured, explicitly disclosed in the panel and rules. Real-name ratings and generated opening ages are untouched and remain part of the open ratings audit. Old saves gain optional preferences only through a deliberate edit or existing repair paths. This does not mark the complete NBA simulation or AdSense submission ready.

Authoritative local records:

- TEMP/dukb-887-engine-merged-851-2026-10-02/verified-summary.json, physical originals, measured margins and preservation report.
- TEMP/dukb-nba-rotation887-ui-merged-2026-10-02: normal and eight control logs.
- TEMP/dukb-nba-rotation-reset887-2026-10-02/verified-summary.json.
- TEMP/dukb-887-native-release-v-2026-10-02/run-1790958234137/report.json and15 images.
- TEMP/dukb-887-release-v-gate-2026-10-02: final type/build, all15 built readers, focused and existing-family logs.

Read-only peers reviewed resolver, injuries, reconciliation, automatic/default paths and reset behavior. The review caught the reset view leak before acceptance. Claude: pull887 and publish from your release gate. Live publication has not been verified by this lane.
