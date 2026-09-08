# Combined review candidate

Round 516, September 8, 2026. Local review only, not merged or published.

## Contents

Start from Round 514 `ebca3ead`, which includes the earlier Conquest and daily
save candidate. Carry over Round 515 source `5729e43d` and harness `9918a6dd`.
Their common ancestor is `d1c541b3`. The newer main base `a4579db3` changed only
PROJECT-STATE, so no production main change is omitted by this starting point.

There are no overlapping production files, test files or harnesses. Resolve
the package manifests as a union, not by choosing one branch's lockfile.
Keep the geometry packages and the storage patch packages with their existing
locked versions. Keep the newer combined state notes rather than reintroducing
Round 515's earlier, now stale, in-progress descriptions of Round 514.

Round 515 changes denied-storage paths only. Its normal page output is unchanged,
so keep Round 514's verified public snapshots and lastmod ledger. Rebuild the
JavaScript and verify actual snapshot booting against that new build.

## Verification plan

1. Verify dependency preservation and a clean install applying the SDK patch.
2. Run the exact app type gate and the combined focused tests.
3. Build once the code is settled. Do not build over Round 515's active suite.
4. Run all fifteen generated-site fences on the new combined dist.
5. Run the actual page-comfort and storage-denial browser walks on a new port.
6. Measure the existing full-map Conquest UI timeout before changing its driver.
   Preserve the full game, final winner, ranked-score exclusion and reload checks.
7. Record remaining broad or external checks honestly before owner review.

## Results so far

The lockfile preserves all 599 Round 514 and 619 Round 515 resolutions, with
zero missing or changed version, resolved or integrity entries. Clean npm ci
passed, installing 544 packages and applying the auth-js 2.95.3 patch. All
three installed module/source copies contain the guarded read probe once.
Exact Git comparisons confirm the Round 515 implementation and harnesses,
and the Round 514 public snapshots and lastmod ledger, are retained.

The combined Conquest board file passes all 16 tests. Its full-map case took
20.462 seconds in that final file run, within the unchanged 30-second limit.
The profile of the original driver passed in 29.148 seconds, spending 11.46
seconds on whole-page button queries and only 0.22 seconds parsing saved state.
Scoping the query to the existing action panel reduced query time to 1.57
seconds and total time to 20.374 seconds. A no-parse variant took 20.368 seconds,
so it was discarded: the final test keeps reading the actual committed phase.

The test still plays all 160 actions on the real map. It additionally verifies
all 48 interactive regions at the start and finish, plus the champion. Existing
ranked-score exclusion and exact reload-preservation assertions remain. A
159-action control fails at the actual completion assertion, with phase recap
instead of finished. No production game code or timeout was changed. This is
a test-driver speed improvement, not evidence that the visitor's game is faster.
The file run retained one existing Radix missing-description warning in help.

The initial combined exact type gate, production build and all fifteen
generated-site fences passed. The build transformed 2,839 modules in 47.43
seconds, with entry `index-Bl9c41sd.js`. The page-comfort browser walk passed
all 121 registered routes and the six-route, four-width layout matrix.

The storage browser walk then failed one of 46 checks. A denied storage getter
caused a delayed Footle first-visit effect error. Fresh traces reproduced the
same old unguarded read on both Round 515 and this candidate. The earlier
Round 515 browser pass was therefore a timing gap, not proof that this path
worked: checking the URL did not wait for the first-visit effect. The repair
and a condition-based browser wait are implemented and verified below.

Review also reproduced a separate footer failure. When removal of accepted
consent was denied, Cookie choices reloaded anyway, kept the old answer and
issued another intercepted vendor request. The fix now reloads only after a
successful null readback. A failed removal or unverifiable read stays put with
an accessible, accurate error. The new focused cases failed on the old handler
and all six footer tests pass after the fix. Real-browser normal, failure,
retry and original-handler checks also pass on the final rebuild.

The four-file Conquest harness was not fully green: the 20-seed map case failed
with a `STACK_TRACE_ERROR` stack while engine, save and all 16 UI cases passed.
Installed Vitest code uses that placeholder stack for its timeout error. The
same unchanged 20-seed map file passed alone in 97.831 seconds, within its
120-second limit. The same four real files then passed with one worker:
125/125 outcomes, seeded map case 111.628 seconds, full-map UI case 19.713
seconds, total process 160.843 seconds. The harness now sets only
`--maxWorkers=1 --minWorkers=1 --no-file-parallelism`. Its final tracked run
passes all 125 outcomes and all 20 seeds in 148.143 seconds. The existing
revision control also passes. No timeout, seed count or game rule changed.
The UI short-run control now passes with an empty explicit
runtime-error sidecar and exactly one owned assertion failure. An injected
uncaught exception makes the harness fail even alongside that expected failure.

Two reporting mistakes were corrected rather than accepted as evidence. The
installed and locked Vitest is 3.2.7; its JSON reporter omits unhandled errors,
so checking a nonexistent field as zero did not guard them. It also counts the
file and nested describe as two failed suites. The corrected check asserts one
actual failed file and one named failed case, not one internal suite. An abort
message's fallback printed the assertion when the sidecar was empty; that was
initially misread as an unhandled assertion. Structured diagnostics disproved
it. The live control's sidecar is empty; the injected arm has exactly the named
uncaught exception. All temporary control files were removed. This closes the
scoped Conquest harness gap, not the separate whole-suite gate.

The final two production fixes pass independent source review, with no concrete
findings. The exact app type gate and rebuilt production bundle then passed:
2,839 modules in 44.39 seconds, entry `index-ChbuCbOA.js`. All 19 focused
page-layout tests passed across Footer, GameNav, GameSeoContent and PageComfort.
The earlier 15-test storage startup fence and all five controls also pass on
the combined source. The new Footle fence passes five real-page cases, with
the isolated original-effect control failing exactly the three denied-storage
cases while both healthy cases stay green. Runtime-error sidecars are valid
and empty, and temporary files are cleaned. The strengthened actual browser
walk passes all 50 checks, including the visible Footle first-visit dialog,
with zero page errors. Its injected vendor-request control fails exactly the
two vendor guards and leaves 49 other assertions green.

The final page-comfort browser walk passes all 121 registered routes and the
six-route matrix at 320, 390, 430 and 1,440 pixels, with zero page errors or
horizontal overflow. Each route has one valid stable six-link next-game block.
The full legal disclosure and all 12 secondary footer links remain reachable.
The final 390px Footle and 1,440px expanded-footer screenshots were inspected.
All nine layout controls reproduced exactly their owned defects, including
duplicate next-game sections, inaccessible policies and truncated legal text.

The final Cookie choices browser harness passes all 47 live checks across
normal reset, denied removal, no-op removal, unverifiable confirmation and
successful retry. Failed cases stay put with the honest alert and no new vendor
request; successful resets clear the value, reload and show the choices banner.
The original-handler control passes eight checks and reproduces exactly three
owned failures: reload, vendor reissue and missing alert. All external requests
were intercepted and aborted. A 390px failure screenshot was inspected and
showed a readable alert without overlap or clipping, then was removed.

All fifteen generated-site fences pass on the final build: simAdsense, simBrand,
simHeadTags, simHiddenPages, simHubs, simIndexNow, simIndexing, simInternalLinks,
simNoRivalNames, simPrerender, simPrerenderBoot, simRetiredRoutes, simSchema,
simSitemap and simSnapshotAssets. They ran serially after control cleanup.
Key counts are 139/139 verification documents, 75 ad callers, 140 ledger-backed
sitemap rows, zero orphan pages, 121 game FAQ/breadcrumb pages, 148/148 current
snapshot asset sets and zero brand drift. Fresh boot port 4336 had zero failed
requests on all three sampled snapshots and verified all 11 retired redirects.
Initial build results above do not cover those later production changes.
The separate Round 515 full node run started at 04:21 Eastern, session 95111,
PID 56308. A pass there would cover that branch, not this combined candidate.
Do not duplicate it or modify its runtime or dist.

These browser checks deliberately abort external traffic. They verify local
UI, preservation of seeded saves and attempted vendor requests, not live OAuth,
cross-device profile history, form delivery or the published Google CMP's
interaction with vendor code. Those remain separate checks. None of these
results guarantees AdSense approval or means the entire game backlog is done.

## Other lane

Claude's branch advanced during this verification to `f56dde02`, synchronized
with its tracked remote. Round 508's outgoing-loan work is committed at
`2588c89a`; the later commit repairs seven issues found in the prior fixes.
Those include keeping the second-leg result separate from shootout advancement,
using the saved calendar for knockout seeding, and correcting transfer locks,
keeper protection, spending totals, patience restoration and the wage input.
Its commit records the exact type gate, UCL checks with six controls, deal and
transfer checks as green. A final build, broad neighboring/browser/generated-site
rerun and full node result are not recorded for those newest bytes. The root
tracked tree was clean at 05:24 Eastern. Its untracked owner artifacts stay
untouched. None of those Club Manager commits are included in this candidate.

## Dependency reference check

The Supabase changelog was checked again before integration. The applicable
JavaScript runtime and future TypeScript notices do not require a version
upgrade here: local Node is 24.14.1 and the project already uses TypeScript 5.
The auth storage capability probe still checks writes without a read in the
current upstream source. Keep the previously reproduced, versioned three-line
patch and verify it on both module formats through the existing tests.

- https://supabase.com/changelog/45715-deprecation-notice-dropping-support-for-node-js-20
- https://supabase.com/changelog/47812-deprecation-notice-supabase-supabase-js-will-require-typescript-5-0
- https://github.com/supabase/supabase-js/blob/master/packages/core/auth-js/src/lib/helpers.ts
