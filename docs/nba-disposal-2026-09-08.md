# Round 538: NBA retired callback cleanup

Worktree `.worktrees/round-538-nba-disposal`, branch
`codex/round-538-nba-disposal`, base 537 `426cc673` (draft PR88).
Claim `ec203cf9`. Preserve Claude's root at `b0c339b1` and all earlier
worktrees and previews.
Implementation `56162e3c4b715e2c8a32783e716aa1e305e239f7`.
Draft PR89: https://github.com/PapiSalgueroM/ballpark-hero/pull/89.

## Original-map baseline

The independent seed530 hook audit runs the original NBA map and rosters.
Its first actual battle has BKN attack TOR, with TOR winning 115-108.
An unused Nicolas Claxton steal callback retained before unmount schedules
one new 1200ms timer after disposal and executes one settlement callback.

Three comparison cases already pass: a confirmation accepted before unmount
is canceled, repeated choices settle once, and captured decisions cannot
settle a later actual battle or a reset run. A copied-hook change that clears
pendingBattleRef in cleanup changes the failed case from one scheduled and
executed callback to zero of each. The same four unchanged cases pass.

This is evidence of retired work executing, not visible corruption of a new
game. Exact old hook, test, config, red report, paired fixed hook/config and
green report are preserved at
`%TEMP%/dukb-round537-nba-settlement-audit-f746337b5f8c4f9ab18b7c02eec63779/`.

## Repair and verification

Unmount cleanup now invalidates the pending-battle ref before canceling
tracked timers. Existing steal and skip identity guards therefore reject
disposed decisions. No selection, battle, reward, roster or rating rule
changes. All scoped verification is complete.

The new regression keeps the same four real-hook cases. Its positive
run passes all four, and independent source review is clear. Both exact
TypeScript checks pass with the final test file present. Logs:
`%TEMP%/dukb-round538-app-types.log` and `dukb-round538-node-types.log`.

The older NBA powers unmount source control now removes only timer cleanup
while preserving the new ref invalidation. It still produces its one exact
accepted-timer failure, independently reviewed. Evidence:
`%TEMP%/dukb-round538-prior-unmount-control.log`.

The independent unchanged four-case replay against the actual Round538
hook is complete. The old hook produces three passes and the exact unused
callback failure; the new hook passes all four. BKN/TOR 115-108,
CHI/MIL 106-88 and reset PHX/UTA 116-109 remain identical. The unused
disposed action changes from one scheduled/executed callback to zero.
Evidence: `%TEMP%/dukb-round538-nba-replay-9a2e31b4df0548cf8d393d3f52a7bbfc/`.

The locked install added 543 packages, applied the existing auth patch and
reported zero vulnerabilities: `%TEMP%/dukb-round538-install.log`.

All six new source controls produce exactly one intended AssertionError
each. Runtime and caught import-time backend faults reject with exit1.
The normal run plus all eight controls verify, without escaped controls
or refinements. Evidence:
`%TEMP%/round538-nba-disposal-controls-e1a88fce0b3e4e12b2dc741315994e8f/`.

The selected runner executes eight NBA/help harnesses: 68 prior cases plus
the four new cases, all passing. Build passes in 25.57 seconds. All fifteen
generated-site checks pass, including browser boot on port4339. Logs:
`%TEMP%/dukb-round538-scoped-sims.log`, `dukb-round538-build.log`,
`dukb-round538-site-fences.log` and `dukb-round538-boot.log`.
Source syntax and whitespace checks pass. Independent production, test,
wrapper and migrated-control reviews are clear.

The unchanged NBARegions browser walk passes at 390 and 1440 pixels.
Each plays the actual HOU 105-95 DAL battle, chooses a loser-roster player,
settles one turn and reloads to the original 58 regions and turn0. Unrelated
storage remains. Both record zero transport, runtime and local-request
faults. Main phone/desktop result and phone restart image reviews are clear.
This is gameplay and reload regression coverage; the hook timer witnesses
prove the disposed-callback fix. Artifacts:
`%TEMP%/dukb-nba-regions-zikY87/`.

Preview4214, PID23984, serves index-HQ5kJYFh.js and ConquestNba-BzJsKAFc.js.

No backend/account writes, broad suite, root edits, main merge or publication.
