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

No combined gate has passed yet. The separate Round 515 full node run started
at 04:21 Eastern, session 95111, PID 56308. A pass there would cover that branch,
not this combined candidate. Do not duplicate it or modify its runtime or dist.

## Other lane

Claude's committed branch is `c3f69168`. Its final targeted deal, UCL and spacing
checks are recorded green. Its broad neighboring, browser, generated-site and
full node evidence are not all current on the final committed bytes.
Seven root files contain uncommitted Round 508 work and are excluded here.

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
