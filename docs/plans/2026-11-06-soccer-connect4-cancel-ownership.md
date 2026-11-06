# PL-05: active Soccer Connect4 Cancel ownership

Master: C:/Users/antho/Downloads/DoUKnowBall_Game_Expansion_Masterplan.txt,409 cards,444117 bytes,SHA256 fda0f7eef07d41f2ba91e89dff3542fef98cd3bd9aabcbe02f70b649797d357a. PL-05 lines6917-6927 remains partial. This follows PR519's board/mode ownership fix into one previously excluded action: the existing Cancel control.

## Active-route preflight, required before original tests

Base PR520: head069d19d994abc8f0f23c2b9edb035188b5a22519, tree4b3ec02208ca565468b3e4c4f94ae58fa1873d64.

Pinned source:
- src/App.tsx:8bfedf7aaa1d076e0f0c8e2216c7e46632cd8a33.
- src/data/gameRegistry.ts:f560b40a74d1468ac72dfde4ee6fec6635a9a255.
- public/football-connect-4/index.html:e401626658329203487a7d45eec6e745a1bed353.
- src/hooks/useFootballConnect4.ts:971dbdfa5a0e3c5adf749f9f301cc0fd994a178f.
- src/pages/FootballConnect4.tsx:634f94cea7810cfd678c3a4a6f470c3039773882.

Original CI must verify each actual Git blob and record these code-only checks:
1. Parse App.tsx with the TypeScript AST. Require exactly one Route for /football-connect-4, whose element is FootballConnect4, with its lazy import resolving to ./pages/FootballConnect4. Refuse a Navigate element or redirect on that route. The current direct route is at355, its lazy import at31.
2. Parse the registry AST and follow the CATEGORIES Soccer object into its games array. Require exactly one actual object entry for /football-connect-4, labeled Soccer Connect 4. The current entry is at110. Commented objects and explanatory prose do not count.
3. Parse the saved public HTML as an inert DOM. Require an actual #dukb-snapshot, a canonical link to https://douknowball.com/football-connect-4 and the saved game's readable content. Reject any actual meta refresh element. The current21612-byte file is an active snapshot, not a redirect stub.

Retain the parsed route node/import, registry object and HTML selector results in the preflight receipt. Do not satisfy these checks with comments, raw substring presence or a Page file that an active route never mounts. No route revival or separate lab path is part of this work.

## Bounded behavior

The actual Page's Cancel button is enabled while validation is pending. cancelSelection currently clears only selectedColumn, targetRow and validationError. It leaves pendingRequest and isValidating intact. The user can dismiss the selection yet remain locked; a later response still owns its old token and can place a chip/write a daily action or show a stale refusal.

Change only cancelSelection: first set pendingRequest.current to null and release isValidating, then perform the existing selection/error clears. The already-qualified PR519 body/catch/finally ownership checks reject the late action. This is client cancellation only. It does not abort a server request, undo a committed move, add unmount or Skip policy, or guarantee cross-tab/server authority.

Hold validator endpoint/payload/fail-closed handling, catalog/real data, board generation, random draws, daily engine/log/save format, scoring, other sports' hooks, Page and all control dimensions. A Cancel with no pending request keeps the existing clear-selection/error behavior while preserving progress, storage and draw order. Current valid/refusal behavior remains unchanged.

## Original-first and native proof

Tests must use the actual Hook, Page, Board, catalog/firstDraw and daily core with fictional validator/search transport. Unit-only clocks and storage boundaries remain explicitly scoped. Capture pending state, actual Page Cancel, immediate busy/selection state, completed old body/error, board/turn, daily log, storage, input/focus and draw tape before named assertions.

The admitted original census has six actual cases: four named business failures covering pending Daily valid, Unlimited valid, invalid and network outcomes, plus two complete no-pending/current-progress/refusal preservation cases. The unchanged hook produced 28 complete RAW frames, then the fixed hook produced 31 frames and passed all six cases. Any newer-request/Page continuation unreachable on the original busy UI must be labeled fixed-only; do not fabricate original reachability or equal trace lengths.

After original harm was admitted, the two-line Hook change was applied. Five actual control arms (fixed, original, omitted Cancel owner invalidation, omitted Cancel busy release, restored) produced 30 rows, 12 named business failures, 18 passes and 147 full RAW frames. All ten whole preservation-case vectors held; the fixed/restored whole RAW matched, and the original whole RAW matched its admitted producer. Source/index/locks/521 versions/offline receipt were restored exactly.

Native proof must use the active /football-connect-4 page, real Cancel and current board controls, bounded fictional transport and completed-response barriers. No App/DOM/save/clock/RNG/in-memory pool override. Preserve inherited size limitations honestly. No successful backend write, real-player truth or native RNG-count claim.

All App/Git/runtime work remains remote through GitHub/Actions. Root owns refs. No App fix is authored before actual original proof. Type/build/readers/caps/native and clean source/build joins remain required before a clean draft. Release and local App/Git/runtime remain held. Companion Career, Club Manager, Team-picker, K League and guide files remain untouched.

## Capture correction retained honestly

The first fixed run42201602189 passed all six actual cases but failed its stricter complete-preservation wrapper. Independent recursive comparison found exactly five page.html scalar differences, each only a generated combobox aria-controls React ID. The fixed Daily branch mounted two extra inputs before the later preservation cases. Every other field and HTML segment was exact. Its packet remains retained as a failed qualification, not a completed fixed round.

Test7f648764ed421584337c0a908d68a0941681e0a8 moves the two whole preservation blocks before the four harm cases. Entire fixture, case bodies, captures, mocks and assertions are byte-held, and the exact inverse reconstructs initial testbe7e16c7a1a7871957014ebac50b7a011b503132. No generated field is stripped or normalized. Fresh original42227289308 and fresh fixed42251082954 then satisfy complete-case equality, including actual HTML IDs. The original RAW is798067 bytes,SHA256968ecae8537532cea51eb5866e24427d8d3b8fe1ce16553e9d78b0b17fa93369; fixed RAW892665 bytes,SHA25626cf6e27571915ddd00c2bc1d19f29a9a44d96959aee9b1b0e8a95468c7d7f27.

The unchanged prior request-ownership12 and all-sport reason-shape22 cases run in separate actual Vitest invocations. All34 pass, and the entire prior44-frame RAW remains365602 bytes,SHA2569109bcf79649a72de8e16364ca45b5ca05129fe33ab097e0ba88910b360df823. No combined fabricated runner report is used.

## Actual qualification and retained provenance

Original42227289308 (headd182441512179bd78b7bfad59b60d97281a1c8aa) passed the expected four named business failures and two complete preservation cases. Fixed42251082954 (head40b3b670e2c7db4fb2067e08572a2bdc14d7c8b3) passed all6 new and34 prior cases. Controls42251503941 (headced20f54e92fd95dcc1aca101e41f78253282833) ran five arms with failure counts0/4/4/4/0,30 actual rows,12 named business failures,18 passes,147 RAW frames and10 whole preservation vectors. Prior34 is carried from fixed in the control packet, not rerun there.

Primary full42251560277 at980aa733e11c95e19ca145818ca234e72921bd0b remains FAILED. Proper App types, normal850-file build, all20 built readers, all16 original route caps,37 unchanged legacy browser checks and final source/dist/521/offline holds passed. Native helpereeaf194d3bb086aa788562e05fc51cc27407c572 actually passed three journeys at320,390,1280 with1474checks,171frames,63action/preparation receipts,36layouts and9PNGs. Root and peer viewed all9images. Its old outer4a23f902886c28e4bb36b2888f4c5e4abf9bb815 expected one startup navigation and saw two identical active-route events, both before the first measured frame. Every frame retained one documentTimeOrigin per journey. The old native-admission.json is0bytes and its global bind was skipped.

The sole source correctione994af30425bc4e39db9fc9832a3fe2c15615f24 requires exactly two same-route, finite, nondecreasing startup events strictly before the first frame. Its exact inverse reconstructs the former outer; all other bytes and every App/helper byte are held. Independent source and packet reviews found no other mismatch.

Retained-evidence closure42258721019 succeeded at workflow heade8013ed5d7e6abb0a558161045f8e1a5be8ae3bb, tree6256262a0bd1e5f96a44a8b398b99d1fa5f56d9b, while checking out physical source980/tree225a1b6cf15b77fb3ab69c2549151c88dc113f54. The trigger tree differs only in the owned QA workflow778454696d9a15cf9834946b85d43ce5052e0f72. Artifact13523662631 is19992260bytes,SHA2569fb2e1661fc697ed300fd85360094dcfa4983de47368df5442ff0dc1d56e2f7d. All366 actual ZIP bodies and all332 nested primary bodies were independently audited; every nested primary body is byte-identical. The corrected outer freshly passed37555checks over6892reference occurrences/6876unique physical bodies, including5777source,850built and248native bodies. Closure parses actual retained40unit/20reader/16cap/37legacy stages and explicitly carries them. It reruns no App tests/build/readers/caps/browser journeys and never changes the failed primary's conclusion.

Primary artifact13521671507 remains11834175bytes,SHA256ce732dae69a078666fced956a4941701189c3b8e9aec932ac57f0ff8b1f77f7b. Its retained dist.tgz is6986137bytes,SHA2563890e50c12992f3726c7979350345c94bb627fd31aae00533779ddb4d8e310d5, with850regular bodies totaling23851894bytes.

Clean join42260775399 succeeded at35cfd01fae4885e3ee6a2248e941f77d600e60ca/tree9ea71148818e6de6dea1aa9bc0f46832988d1f2b. Fresh proper App types, unchanged product-name fence, normal build,521locked versions, source/index/locks and zero-byte offline receipt passed. Every4656 clean src/public/scripts path, mode and blob plus all11 root configurations exactly match physical980 excluding only the remote native helper. Every path, length and SHA256 of all850 built files matches the primary's retained23851894bytes admitted by closure42258721019. Clean artifact13524373605 is660634bytes,SHA2561879db01db743bac025023a5bbeada66221d0367414af19d518187d294992e61. This is a fresh clean types/build/name check and exact source/build join, not a rerun of carried native/readers/caps.

Only Hook, regression, this plan, remote PROJECT-STATE and append-only WORKBOARD enter the clean draft on PR520. Remote-only native/control helpers and QA workflows are excluded. Grade the Transfer stays retired and its original Hook5e677e844f8af33de27c206673fcf66849ad5930 stays held. The canonical master remains unchanged and PL-05 remains partial. No merge/publish or local App/Git/runtime/PROJECT-STATE change.

Limits remain explicit: scoped40 unit cases and three native pending-Cancel journeys, not the full unit/sim suite. Bounded fictional transport proves client ownership, not real eligibility, provider truth, backend writes, server abort, unmount, Skip, other-sport Cancel or clock/RNG behavior. Inherited Cancel/mode/grid dimensions stay unqualified for44px. Actual gestures retain strict viewport/clip/hit/enabled/trusted checks; the nine disabled layouts are photographs only. Viewport crops do not establish whole-board fit.
