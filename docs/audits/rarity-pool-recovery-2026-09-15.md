# Rarity pool recovery repair

## Diagnosis and scope

Base: `31f5672ab5c77da955d0ab6ebab9d06cf5a209f7`, isolated branch `codex/rarity-pool-recovery`.

CI run 35038033612 reported one empty attacking-midfielder pool. The old source collapses an exhausted page error to an empty result, so that message cannot establish a timeout or distinguish it from a genuinely empty response. The new prominence memo does not intercept the position-pool endpoint. Root's separate bounded anon probe at 2026-09-16T01:25:43.762Z returned 2240 usable entries in three HTTP 200 pages (1000, 1000, 240; 395, 176, 162 milliseconds). It shows the pool was available then, not the cause of the earlier CI failure.

The confirmed recovery defect is independent: the session cache permanently retained an empty or rejected pool promise, so the existing Try again button could not reload that category. The app patch retains pending and nonempty successful promises, evicts empty and rejected results for only their category, and preserves the original rejection. It adds no automatic retry. All query filters, scoring, sorting, existing page retry counts and other app source remain unchanged.

Harness-only logging now records failed pool endpoint requests using endpoint, offset, limit, HTTP status (0 for transport failure), bounded error code and bounded message. It does not log headers, credentials, rows, details or hints. Responses remain readable and transport errors retain identity. Successful and unrelated prominence requests produce no diagnostic line. Existing harness assertions and retries are unchanged.

## Offline proof

`node scripts/simRarityPoolRecovery.mjs` passed all six cases using real CATEGORIES, the actual REST client and mocked fetch: pending deduplication plus nonempty identity and ranked values; empty retry; original rejection and recovery; three failed HTTP attempts followed by caller-triggered recovery; category isolation; and diagnostic scope/body/error preservation. The run issued 12 mocked category requests and no real requests.

All 13 unique source controls failed at their intended assertions and printed CONTROL PROVED: pending, success, empty, rejected, propagate, automatic, isolation, rejectisolation, diagnostic, body, transport, scope, bound. Each exited 1. Control copies and bundles were isolated in OS temp and removed afterward. The mocked fetch fence remains installed through process exit so pending control callbacks cannot reach the network.

Both JavaScript syntax checks and git diff whitespace checks pass. Source comparison in source-scope.json proves that replacing only the cache block with its original and removing only the diagnostics wrapper plus wiring restores both original files exactly after LF normalization. The real app type command, `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json`, also exited 0.

Evidence: healthy.log, controls.json, control-*.log, source-scope.json and types.log in this directory. No build, database mutation, additional production probe, full-suite rerun, commit or push was performed by this repair lane.
