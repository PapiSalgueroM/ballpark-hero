# Round 520: build-tool dependency safety

Claimed September 8, 2026, from Round 519 ac84b913. This is a local review
candidate, not a production release or a claim that all security risk is gone.

## Plan and acceptance

1. Recheck the prior audit's five affected packages against current primary
   advisories, registry metadata and the actual config. Record the baseline
   audit before implementation. Never use an unreviewed force upgrade.
2. Make the smallest supported manifest and lock updates. Preserve the exact
   Supabase 2.95.3 pin and its patch. Inspect all transitive changes and peers.
3. Verify a clean install applies the patch, the exact app type check passes,
   production builds, local mocked screens still work, and all fifteen
   generated-site fences pass. Report warnings and any failed attempts.
4. Rerun the dependency audit and request independent diff review. Back up only
   as a draft candidate; do not merge, publish or change existing servers.

The source audit, five affected packages and proposed versions are recorded in
docs/dependency-audit-2026-09-08.md. Versions there are proposals to verify, not
changes already made. Runtime account/provider behavior is outside this round.

## Broad test boundary

The default runAllSims runner is not read-only. Its production table probes can
insert if safeguards regress, and validator endpoints can populate caches.
No new full suite was launched. A global fetch replacement alone cannot cover
browser, native transport and native child processes. Do not label unexecuted
backend gates as green. Continue explicitly mocked bounded checks while a
separate process-tree isolation design remains pending.

## Results

Pending. No dependency changes or completion claim at the claim checkpoint.
