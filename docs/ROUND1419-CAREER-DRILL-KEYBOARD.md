# Round1419: Soccer Career drill keyboard controls

The drill board's window shortcut handler consumed keys meant for native controls. On a ready board, Enter or Space on Close or Back started the round. During play, Space played an attempt instead of activating navigation, and the Wall Shot power slider's arrows moved the aim instead of changing power.

The product change is one early return in `DrillBoard.tsx`: respect an event already handled elsewhere, and leave keys from buttons, links, inputs, selects, text areas and editable content to those controls. Body and pitch shortcuts keep their existing behavior. Native Start and action buttons use their existing click handlers. No engine, scoring, save, parent screen, economy or sports-data change.

- Base: `775564305e9da84dab59f2b9fe246d044a3cc8e9`.
- Tested and pushed product source: `e8c08a91e7af2d4fa23e550d9730bc5d35fee274`.
- Branch: `codex/career-drill-keyboard`.
- Review: [PR334](https://github.com/PapiSalgueroM/ballpark-hero/pull/334), draft for Claude I's release integration.
- Original whole component SHA256: `42591173de244f05f7e21166035ee6b7fe2d04ac78a8dc54c69bbd817038a99e`.
- Fixed whole component SHA256: `c817635ae72f800ea414cbea6e710655299776290cba1d0f3f9cc2e05df1adbf`.

## Verification

Original source `00233ddea8c373e060ceb4eb24a70519b6fbd4c1` qualified in [run39119689293](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/39119689293), job117652572747. Two independent 35-case unit children each reproduced exactly26 named routing faults and9 healthy cases. Their complete raw observations matched at SHA256 `e7f7d8f130cd2594a1b589d4e17966155a78182b5e1cd633b8de0ab3435ee238`. Six existing match tests and five existing markup tests also passed. The actual native browser fixture reproduced20 faults and retained21 healthy cases, plus six healthy action-button subchecks.

Fixed source qualified in [run39120346421](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/39120346421), job117654506333:

| Arm | Pass | Exact routing faults |
| --- | ---: | ---: |
| Normal | 35 | 0 |
| Whole original inverse | 9 | 26 |
| Interactive-origin guard removed | 15 | 20 |
| Already-handled guard removed | 29 | 6 |
| Restored | 35 | 0 |

The whole original raw file matched the separately received baseline. Every unaffected unit observation matched its normal counterpart. Normal and restored raw files matched completely at SHA256 `c9b7b1e2488c56c7baa70b247c4f62cb75566f8078ba726d63317d959b5ada7c`. The existing six match and five markup tests passed before and after. These cases retain the supplied frozen fictional career, callbacks, full local/session stores, random draws, real one-round daily scores and cleanup checks.

All41 native Chromium browser cases and six action-button subchecks passed. The fixture builds the actual `TrainingPanel` and `DrillBoard`, uses real browser keys, clicks, tabbing and range behavior, and retains actual served resource bodies and gzip files. Its declared manual clock holds playing time at200ms. Healthy game behavior matches the original; full event logs retain the intended switch from intercepted keys to native button activation.

Application types, plain production build, all15 completed-build readers and all14 unchanged fatal page-weight checks passed. Measured Soccer Career834.0K against835K, Club Manager618.4K against619K and NFL490.2K against491K. No cap was raised. Ordinary runtime remained offline. The unchanged weight sweep's denied font and flag requests are retained as denied attempts, without outbound credit.

Native saved-artifact admission passed80,856 checks for the repeatable original and86,289 for the fixed packet. It joins the official433/486 payloads to their physical files, all4,922 canonical source files, unit cases, all47 native case/subcheck records and response bodies, gzip decompression, original/fixed healthy behavior and completed production dist. Installed tool inventories are CI hash-hold evidence, not a claim that those binaries were delivered in the packet.

## Preserved corrections and limits

The first native run on `b82fe24b` remains failed. The fixture sampled key cancellation in an early microtask and missed clicks stopped by the actual dialog. A fixture-only capture observer now retains actual Event references and reads their final cancellation state after dispatch. Browser assertions and product source stayed held during that correction.

The next original run on `f79c73ba` passed its semantic and native checks, but comparison with the first unit file exposed drifting animation-frame schedules. Product adoption stopped before mutation. The unit fixture now schedules frames through explicit16ms fake timers and fake performance time; full raw fields and all35 predicates remain held. The extra original replay proves repeatability before adoption. An additional native shell-wrapper stale exit-status check was corrected by verifying the actual saved PASS receipt; no test or source predicate changed.

Evidence lives at `C:/Users/antho/dukb-handoff/2026-10-18/career-drill-keyboard-1419/`, including `native-repeatable-original-admission-attempt1.json` and `native-fixed-admission-attempt1.json`. The original and fixed artifact SHA256 values are `a6abc197c8af0b4512c06e8ba6393c260ba19c833d0be5e746377555aa7d2d11` and `32574c0ed5b4712983f17a44347a40c68f6597c4e4f3cc9b7d3ed47eb8ffe8b2`.

This is actual-component browser coverage, not full production-route, physical-device, geometry, assistive-technology, full-save or full-suite qualification. Only three closing documents change after the tested head. Their final source closure and all57 branch push check are recorded outside the repository after the closing commit.

Claude I still owns the protected Soccer Career hosts/engine/world, Manager/tournaments, release join and publication. The finite20-file checkpoint at10:32UTC was unchanged. No new lease or tournament acceptance was inferred. This round creates no publication claim.
