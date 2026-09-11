# Round 536: NFL player-steal settlement

Worktree `.worktrees/round-536-nfl-steal-settlement`, branch
`codex/round-536-nfl-steal-settlement`, base 535 `d2a7b176` (draft PR86).
Claim `596b1e69`. Root belongs to Claude and is preserved at `b0c339b1`.
Every previous worktree and preview remains available.
Implementation `488dde2b298afc7750cb0b5b462e409e2e874325`.
Draft PR87: https://github.com/PapiSalgueroM/ballpark-hero/pull/87.

## Actual baseline

Five independent checks use the original map, unchanged rosters and the
real first seed-29 battle: CLE attacks CIN and loses 21 to 10. No React
state or battle result is injected. The old hook accepts an unknown name
and a real player who is not on the losing roster. The latter adds a
second Ja'Marr Chase to CIN. Calling the legal Myles Garrett callback twice
adds two copies and records two turns and two battle logs. Reset leaves
one pending confirmation timer, which then transfers Garrett into the
fresh roster and adds a turn and log. Unmount also leaves one timer, whose
callback executes after 1200ms. Each baseline fails its intended contract
assertion, with no backend access.

The exact pre-edit hook, test, config, report and compact witnesses are in
`%TEMP%/dukb-round536-steal-baseline-d8362858a7ef44438b23bc7c05d77f92/`.

## Implemented behavior

Natural reveal completion and Skip to result install one pending battle
object in both state and a ref. A settlement action must still own that
exact object and result in the battle phase. A chosen name must belong to
the losing roster and be absent from the winner. Steal and skip consume
the same decision synchronously, before confirmation or result updates.

The existing 1200ms confirmation uses the hook's tracked timer helper.
Reset and unmount cancel it and invalidate old captured decisions. The
delayed callback uses its accepted battle, not a later pending result.
Close and Escape preserve the unresolved choice for reopening. The hook
keeps its existing direct skip behavior even with a nonempty roster; the
visible Continue fallback is only for a battle without an eligible player.
No battle rules, player data, ratings, formula or RNG changes.

## Verification

The locked install adds 543 packages, applies the existing auth patch and
reports zero vulnerabilities. Log: `%TEMP%/dukb-round536-install.log`.
Both exact app and node TypeScript checks pass with all final test files
present. The production build passes in 24.83 seconds. All fifteen
generated-site checks pass, including the separate browser boot check on
port 4337. Logs are `%TEMP%/dukb-round536-app-types.log`,
`dukb-round536-node-types.log`, `dukb-round536-build.log`,
`dukb-round536-site-fences.log` and `dukb-round536-boot.log`.

An independent unchanged replay of the five original witnesses passes
against the fixed hook. An unknown input adds zero players, the nonloser
Chase remains one copy, and repeated Garrett selection creates one copy,
one turn and one log. Reset preserves fresh rosters with no pending timer;
unmount leaves zero timers and executes zero confirmation callbacks.
The real CIN 21-10 result is unchanged. The original red artifacts remain
untouched. Fixed report and log:
`%TEMP%/dukb-round536-steal-fixed-98da7df91dd940cbb827e8845d82275c/`.

The three older unmount source controls were adjusted only for the new
cleanup line. Each still removes its original signing or reward ref and
preserves the new settlement cleanup. All three produce exactly their
intended assertion failure and pass the control wrapper. Evidence:
`%TEMP%/dukb-round536-prior-controls-572fbfd3835148fbb367852a2fe2974d/`.

The explicitly selected runner passes all nineteen new cases: nine
real-hook cases and ten Board/help cases. Seventeen prior NFL/NBA/help
harnesses also pass all 158 cases. Logs are
`%TEMP%/dukb-round536-new-sims.log` and `dukb-round536-prior-sims.log`.

All 26 hook source controls earn exactly one intended AssertionError each.
Runtime and caught import-time backend faults each reject with exit 1.
The normal result and all 28 controls verify, with no escaped or weakened
controls. Aggregate and individual logs:
`%TEMP%/round536-steal-controls-928201e408d3411390be36753ad09712/`.
The UI baseline records seven intended failures and three positive cases
before the Board change in `%TEMP%/round536-ui-baseline.json`. The final
ten pass in `round536-ui-final.json`. Independent production, test and
wrapper source reviews are clear.

All eighteen UI source controls pass with 53 exact intended failures and
every unaffected case green. These include the transport/backend boundary
assertions. The separate runtime probe rejects with nine actual Error
records and no suite/load failure. Evidence:
`%TEMP%/round536-ui-controls-u0hiok/results.json`. Across both new wrappers,
44 behavior controls produce 79 intended assertion failures. The final
source syntax checks and rival-name scan pass with zero findings.

The 390-pixel browser run passes two actual settled battles and one
abandoned confirmation. Close and Escape preserve the same score, map,
turn and log. Both reopen the picker. Two native clicks are dispatched
while the option remains connected, resulting in one Micah Parsons
acquisition, one turn and one log. The next actual battle displays exactly
one acquired row. Modes exits 231ms into the third battle's confirmation;
the fresh entry stays clean beyond the 1200ms window. Hook timer witnesses
remain the decisive cancellation proof. No React state or battle result
is injected, and network fixtures are exact and synthetic. Main visual
review of the phone choice, confirmation and acquired roster is clear.
Artifacts: `%TEMP%/dukb-nfl-steal-lEkwGd/`.

The 1440-pixel desktop run also passes the same two settled battles and
abandoned confirmation, with its Modes exit at 263ms. Both normal runs
record zero boundary violations, runtime errors or failed local requests.
The desktop acquired roster image passes main visual review. Artifacts:
`%TEMP%/dukb-nfl-steal-yaXAoM/`.

The first browser attempt checked the closing dialog before its exit
animation finished. Only the driver changed to await hidden state; its
failed artifact remains in `%TEMP%/dukb-nfl-steal-aV3dtx/`. No production
change was needed. Both duplicate-row browser controls also pass: each
inserts a second copy of the actual acquired roster row, proves the exact
single-copy assertion rejects it, and restores the original row. Both
continue through the same two settlements and abandoned confirmation,
with zero boundary, runtime or local-request faults. Evidence:
`%TEMP%/dukb-nfl-steal-2tVzMo/report.json`.

Final independent review covers the production code, tests, wrappers,
browser driver and all four completed browser reports. No actionable
finding remains. Main phone and desktop screenshot reviews are clear.

The hook tests use legal original-map states; they do
not claim separate mutation witnesses for the redundant winner-absence
or phase-only guard. The Board fixture explicitly exercises an already
owned displayed name. Direct hook skip remains valid for a nonempty roster.

Preview port 4213, PID 34964, serves index-C-uiq91h.js and
Conquest-yIPBLjiX.js. No default broad
suite, backend/account writes, root edits, main merge or publication.
