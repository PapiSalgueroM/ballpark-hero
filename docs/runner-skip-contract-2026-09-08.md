# Round 537: explicit runner skip contract

Worktree `.worktrees/round-537-runner-skip-contract`, branch
`codex/round-537-runner-skip-contract`, base 536 `bde9110f` (draft PR87).
Claim `eb8db65c`. Root remains owned by Claude at `b0c339b1`.

## Reproduced behavior

Five copied-runner fixtures use marker-only synthetic children and an
intercepted parent probe. A child that prints the no-work phrase and then
throws exits 1, but the runner calls it SKIP and exits 0. A child that prints
an actual FAIL after the phrase is also called SKIP with exit 0. The same
runtime failure remains a failure when the probe is forced reachable.
A legacy no-work child receives SKIP; a clean selected child also reveals
the existing unconditional parent database probe. No real network or
production harness executes in this reproduction.

Evidence: `%TEMP%/round537-runner-audit-63427a3fb5ec48df9e56623d361f6f5f/`.

## Implemented contract

The runner retains the child's exit code. SKIP requires code 77, the existing
`NOTHING WAS CHECKED` marker and an unavailable database probe. Ordinary
failure exits remain FAIL regardless of prose. A valid skip is still named
and excluded from pass counts; a reachable database or missing marker makes
even code77 a failure. Existing zero-exit and empty-output handling remain.

No production data caller is opted in. The original four callers conflate
unavailable transport with invalid or undersized pools, or partial results.
For example, ValueFreshness can print the matched phrase for a later batch;
WorldXI returns null for transport/parser failure, fewer than 800 players or
fewer than 12 countries. Those ordinary nonzero exits now remain visible
failures. A future opt-in must demonstrate a pre-check availability abort.

This change classifies results. It does not isolate network calls, writes,
storage, child lifetimes or browser servers. Explicit ONLY remains required.
The existing parent probe remains, and selected offline verification sets
DB_PROBE=unreachable. No broad suite or legacy live probes are run.

## Verification

The locked install added 543 packages, applied the existing auth patch and
reported zero vulnerabilities. Evidence: `%TEMP%/dukb-round537-install.log`.
The selected runner executes all ten new skip cases and all 21 prior
selection cases. Six exact source controls produce 24 intended behavioral
failures; an unexpected runner/load error rejects with exit1. Individual
child start/exit receipts prove the actual synthetic children ran, including
a thrown runtime error overriding exitCode77. Every mixed result table,
failure exit, skip name and pass count matches its expectation. Evidence:
`%TEMP%/round537-runner-skip-controls-de2f8be04a4d41c08929d60f5a2d0cbd/`.

The prior selection fixture now uses77 for its deliberate unavailable child;
its unrelated failing child still uses7. Its source control retains the
exact skip code and reverses only probe availability, producing its original
two intended failures. Logs: `%TEMP%/dukb-round537-runner-sims.log` and
`dukb-round537-selection-skip-control.log`.

Both exact TypeScript checks pass, as does the 34.95-second production build.
All fifteen generated-site fences pass, with browser boot on port4338.
Logs: `%TEMP%/dukb-round537-app-types.log`, `dukb-round537-node-types.log`,
`dukb-round537-build.log`, `dukb-round537-site-fences.log` and
`dukb-round537-boot.log`. Source syntax and whitespace checks pass.
Independent production and new-harness source reviews are clear.

No app behavior or sports-data changes. The entry bundle remains
index-C-uiq91h.js; the previous phone/desktop-reviewed preview4213 remains
available. No new gameplay browser walk is claimed for this runner-only
change. Earlier worktrees and previews are preserved.

## Next confirmed repair

NBA's unused captured steal callback can schedule new work after unmount.
An independent original-map seed530 audit shows BKN losing at TOR 115-108;
a retained Nicolas Claxton choice schedules and executes one callback after
disposal. Existing repeated, cross-battle, reset and accepted-timer checks
pass. A copied-hook cleanup that nulls pendingBattleRef changes that outcome
to zero scheduled and zero executed callbacks, with all four unchanged
cases green. This proves retired work executes, not visible corruption in
a newly mounted game. Preserve the exact red/green evidence for Round538:
`%TEMP%/dukb-round537-nba-settlement-audit-f746337b5f8c4f9ab18b7c02eec63779/`.
