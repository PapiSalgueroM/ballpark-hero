# Round1426: keep the newer report draft

Source-qualified draft [PR340](https://github.com/PapiSalgueroM/ballpark-hero/pull/340), 2026-10-18. Tested source `48225075cf3ff2937a83e38e7e8c0807ca0ace64`, based on main `775564305e9da84dab59f2b9fe246d044a3cc8e9`. Integration and publication remain with Claude I. This is not live-site credit.

Both report forms previously captured the correct submitted payload but let its later result replace a newer draft. An old success timer could also close and erase a reopened form. Completion and the1500ms reset now belong to the submitted draft and dialog opening. Editing or reopening invalidates the older UI result while its already captured relay and fallback delivery continue. Send stays disabled while that request is pending. A current error remains retryable. An unchanged success still closes and resets after1500ms and returns focus.

The product change is limited to `ReportSiteIssue.tsx`, `ReportQuestion.tsx` and the new shared `useReportDraftLifecycle.ts`. Typed fields remain in their components. Captured payloads, bounded context, relay-first fallback, categories, validation, styles, copy and focus handlers stay unchanged. No game state, real sports data, backend, dependency, schema or protected simulation change.

## Evidence

Original behavior was admitted before product adoption: source `1bcdf95d093436d865ab5ad04f6f376d63e9e945`, run39147889794, job117735357429, artifact12144256160. Fourteen cases produced12 exact draft/session faults and2 healthy normal successes. Twelve actual built browser contexts produced8 observed original faults and4 healthy held-fallback deliveries. The external original feature receipt is `53f45a11d9408cc3ba9820129112c61a076cd2c45e3792e0abcd87bda8654bff`; common receipt is `44d530c5717fa6720938511b4f4a6e9eb5711ecdd3c72554d4b377c49813f92e`. Four earlier preparation failures remain retained and unqualified.

Fixed run [39148882363](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/39148882363), job117738259286, artifact12144462646 passed. ZIP SHA256 is `5b393cb3ea01542c9e164f83f0dc88567543689956507aa825a57d55917fbf77`. Native common admission is `bb3d1bc97328ddf51dc31f09e3d7c6230fe36618fd6550ac8b3763162e0c2df8`; native feature admission is `44d8c1c52ee6b833614e2806f93f9f1e72c19703cd570fd4067f450d029cf42e`.

The14 frozen cases cover both forms: details-only edits, category-only edits, pending close/reopen without editing, edits during fallback, an older success deadline, stale failure followed by current retry, and normal1499/1500ms close/reset/focus. Their body remains `ca6774ec49cdf7fe4d64aff59deebab94bc43f9925833c4f7a9d8a631dca3255`.

| Unit arm | Passed | Expected faults |
|---|---:|---:|
| normal |14|0|
| bare, ordinary test swap absent |14|0|
| whole original forms restored |2|12|
| completion ownership removed |4|10|
| timer cancellation and deadline ownership removed |12|2|
| exact fixed hook restored |14|0|

Each inverse changes executable source at unique targets. Ten hunks per form recover the entire actual main775 original, then reconstruct the whole fixed form. Hook mutations and inverses retain complete changed/restored copies and hashes. Timer controls fail after the old deadline, not during setup or initial reopen. No runtime, timeout, lookup, transform or unhandled errors qualify as faults.

All12 built browser contexts passed: footer and game report,390 and1280 widths, pending relay, old success timer and normal held fallback. The8 preservation contexts keep the new category and text editable. The4 normal contexts keep the expected timing and blank reopen. All16 report POSTs were intercepted and fulfilled locally, captured relay/fallback payloads matched, full browser stores stayed equal, and errors/unexpected writes were empty. Root viewed12 viewport PNGs across both forms/widths, covering preserved completion, preserved deadline and normal blank reopen. No visual blocker found. Other56 PNGs have inventory/hash credit only.

Actual app types, unchanged reportDetails19 and reportContext5, simReportContext with its4 existing controls, serial production build, all15 built-site readers and all14 unchanged fatal download caps passed. Source4921, installed dependency24466, browser-tool176, font10 and dist787 file hashes were held, with membership checks. Child transports were empty. The inherited weight sweep recorded only its known font/flag blocks. Whole simReportRelay was NOT RUN because it unconditionally accesses the live database. It earns no relay, schema or database qualification.

Measured standalone weights: home243.5/244K, Club Manager618.6/619K, Soccer Career834.3/835K, NFL490.5/491K and Manager Hot Seat635.8/636K. These use the unchanged Math.round fatal gates. I must rerun caps on the combined tree. This is not a full-suite claim.

## Limits and integration

Packet: `C:/Users/antho/dukb-handoff/2026-10-18/report-draft-lifecycle-1426/`. All app runtime ran remotely with ordinary offline transport guards. No actual report or email was sent. The exact existing most-played read RPC was fulfilled locally with an empty fixture. Unmount continuity is source-reviewed only, with no dedicated unmount runtime credit. Browser clock control and native trigger scrolling are explicit; there is no no-scroll qualification.

Only docs may differ after the tested head. Final native source closure must compare every non-doc member and byte against the artifact's canonical source ZIP. Claude I owns joined-tree qualification, main, preview and publication. Manager requests and the source-only missing-Yamal trace stay with I. The trace identifies a possible post-sale market gap, not a reproduced disappearance from an owned squad.
