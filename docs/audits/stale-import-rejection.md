# Preserve the original failed import while the page reloads

The unchanged BH lazy-editor browser method reported an intermittent React
undefined.default error after its deliberate missing-chunk fault. PR291 retained
two passing repeats and a timing trace, but those do not disprove the earlier
failure. Its actual emitted Vite helper returns undefined when the global preload
event is cancelled. Production React then treats that value as a fulfilled module.

This branch starts at exact release e7f111b7. The first packet changes no app,
package or existing proof. A new browser method uses the actual built entry's
exported preload helper and React18.3.1 object, found from its exported AST and
actual imported namespace. No helper or React implementation is copied.

Four fresh signed-out pages exercise a browser-native failed import. The automatic
case deliberately holds only the reload document response before headers commit,
letting the old document finish its microtasks. This is a declared controlled
pre-unload fault, not a reproduction of BFb's natural timing. The method observes
the actual React.lazy object's private initializer, not a ReactDOM render. The
unchanged old lazy-editor browser method separately tests the actual UI, its
boundary, Close, cached failure and Retry.

Expected baseline: exactly one precise Boolean failure on original-payload import
rejection and React initialization, plus three preservation passes for an already
spent reload marker, optional sound chunk and offline state after boot. Real
payload identity, event cancellation, marker, held-document request, saved-store
bytes and full physical raw outcomes must agree. Setup, navigation, import-export
discovery or other errors cannot qualify as the intended fault.

If that causal baseline qualifies, the candidate fix is to retain every reload
guard while leaving Vite's original import rejection intact. Old tests and the
stale-chunk source guard consciously asserting cancellation need an explicit
behavior update. No error allowance, reload cap or saved-state policy changes.
Restoring cancellation must reproduce the controlled fault.

All runtime is remote/offline. Types, new method syntax, original lazy browser,
existing guarded-reload cases, simStaleChunk, production build:seo scoped only to
/soccer-career, all fifteen rebuilt-site readers, unchanged full download budgets,
source/compiled/dependency/font/browser/distribution holds and retained evidence
remain required. No runtime, application correction or live claim yet.

First attempt40735217/run38909778949 passed types, syntax, dependency bindings and
the scoped production build, then stalled in the new controlled method. Its precise
await is unproved because this first method lacked per-operation checkpoints.
Post-navigation frame-scoped evaluation was a source-level suspect. The attempt
has no causal baseline credit. Temporary workflow-onlyff2be34d/run38911607873
successfully requested cancellation of only that exact run after checking its
branch and head; its diagnostic job was explicitly skipped. That administrative
success is not a passing proof. The old attempt retains its always-run evidence.

Method-only correction keeps a read-only store closure on the actual old-document
runtime handle and uses that handle for probe and before/after reads. Setup,
protocol, body and cleanup operations have explicit bounds, per-case work/cleanup
budgets and physical progress checkpoints before later awaits. The four cases,
phase outcomes, payload/React/store/timeOrigin/URL/held-header checks stay intact.
The workflow caps the causal step at five minutes. The temporary cancellation job
and its write permission are removed before the fresh baseline. App, packages and
old proofs remain identical to e7f111b7. No product correction before qualification.

First artifact12049584675 is45,891,774bytes, SHA256
8866d45eebcf5144eacfaa5121cdf26eaee394f740349657ba7ade7360dd16ec,
retained under dukb-handoff/2026-10-16/stale-import-first. Final job was cancelled.
The retained new-method report is still running with zero completed cases and no
raw case files, so it establishes no settled import outcome or exact hang point.
Always-run old UI passed1602checks/12originals; both guarded reload files passed17
cases; full weights and source/installed/dist holds passed. Fourteen of fifteen
readers passed. simPrerender found exactly the three existing BHH What's New
entries absent from its stale snapshot. The one-route scope had omitted /whats-new.
This is a build-scope setup defect, not an application regression or waived reader.

Corrected bounded baselinef8ccda9e/run38912393217 is in progress. A subsequent
workflow-only correction includes /whats-new alongside /soccer-career and tightens
the existing related-test count to exactly two files/seventeen passes. It is saved
with skip-ci while that baseline runs; the next actual fixed or corrected baseline
run must qualify that exact scope and all fifteen readers before readiness.
