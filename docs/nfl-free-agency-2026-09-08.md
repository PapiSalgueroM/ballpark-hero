# Round 531: NFL Arcade signing safeguards

## Baseline

An independent real-hook seed 531 witness settled three actual battles:
DAL over HOU 20 to 10, SF over LAR 31 to 20, and GB over CHI 38 to 27.
It selected surviving BUF and Montez Sweat from the eliminated CHI roster.
Calling the captured signing callback twice in one event added that player
twice, grew the roster from 10 to 11, added two log entries and two audit
entries, and changed the offense/defense overrides from 89/81 to 93/85.
That was +4 from one cooldown, which moved from 3 to 0 only once.

A fresh second witness started the next battle after those three settled
battles. During its animation the old hook still advertised signing and
accepted it, adding a transaction and consuming the cooldown mid-turn.
Both witness tests passed with no transport, storage, backend or runtime
faults. These are simulation results, not real sports results or ratings.

Artifacts:
`%TEMP%/dukb-round531-baseline-d92387e5da684d59b620e3915831f1a6`.
The baseline uses the real hook, rosters and simulator. No production state
or backend was changed.

NFL already has a working Change team button and a global weakest-player
lookup. Those NBA defects were not copied into this diagnosis. A saved
power card can open its dialog while phase remains ready, so phase alone
does not establish that a signing is allowed. Waiving the player holding
the current upgrade also left that upgrade pointing at a missing player.

## Intended change

Only the current unconsumed callback can change the favorite or sign.
Require a ready phase with no pending or active power choice, a surviving
favorite, three settled battles and a canonical current-pool candidate.
Reject unknown names and players already on active rosters without consuming
the valid action. Phase transitions, opening a saved reward, team changes,
reset and unmount invalidate older callbacks. An accepted signing consumes
its callback before any roster, rating, audit or log write.

Preserve NFL's dynamic pool of curated names and eliminated final rosters,
its global weakest-player lookup, three-battle cooldown and +2 drift with
the existing cap. Clear an upgrade only when the signing waives that same
owner's selected player. Keep the badge and Change team flow, show only
surviving choices, and disable all panel actions during unresolved turns.

Remove fourteen unsupported static current-contract blurbs. Player names,
positions and game ratings stay unchanged. The optional blurb still carries
the existing event computed from an eliminated roster in this run. Add no
replacement real-world facts. Help and panel copy explain game availability,
settled battles, the waiver and the rating cap.

## Verification

The initial exact app type check passed on the clean Round 530 base.
Round 531 uses its own worktree and the exact locked dependency installation;
the local Playwright package is an untracked junction to the already installed
copy. No package or lockfile change. Planned gates: both exact types, build,
real-hook and panel outcomes with exact negative controls, prior related
checks, all fifteen generated-site fences and bounded built phone/desktop
playthroughs. Only explicit reviewed harness selections, no default suite.

Candidate preview port 4208. Preserve every prior worktree and preview.
No real backend/account writes, root edits, main merge or live publication.
NFL battle-engine acquired-player metadata is a separate candidate; this
round does not change battle odds, positional selection or upgrade lifetime.

The built baseline at port 4207 also reproduced an enabled Change team button
after starting a battle. Its exact unresolved-turn assertion failed with
exit 1 before the panel edit. Report:
`%TEMP%/dukb-nfl-free-agency-Yi2eb2/report.json`.

The fixed hook passes all nine focused cases, including an actual neutral
claim earned and saved as a reward, reopening that reward while phase is
ready, and both waived and retained upgrade outcomes. Independent hook
review found no actionable issue. Both exact type configurations passed;
the production build passed in 31.64 seconds. All fifteen generated-site
checks passed, with the boot check on port 4332 through installed Chrome.
No public snapshot or lastmod ledger file changed. Preview 4208 serves
`index-Bwd-Ucls.js` and `Conquest-CLQcyeMZ.js` (server PID 32612).

Logs: `%TEMP%/dukb-round531-build.log`, `%TEMP%/dukb-round531-fences.log`,
`%TEMP%/dukb-round531-boot.log`.

All 23 exact hook source controls pass, each by producing its one intended
assertion failure with every unaffected case green. This includes an explicit
neutral-claim cooldown control. Deliberate runtime and caught-backend probes
exit 1 and receive no passing credit. Hook results:
`%TEMP%/round531-nfl-hook-28f9b88fea8e4b0e9b196fed3234efbc/results.json`.
The prior NBA hook/panel and NBA/NFL help harnesses also pass through the
actual explicitly selected runner (31 cases across three harnesses). Log:
`%TEMP%/dukb-round531-prior-harnesses.log`.

Independent review of the final production changes and hook/UI wrappers is
clear. The UI wrapper requires all fourteen exact named cases and checks
each control's precise assertion identity, unaffected cases and child exit;
runtime failures cannot masquerade as a passing regression control.

The UI suite passes all fourteen cases. Its 24 exact source controls produce
92 intended assertion failures, and its runtime probe rejects thirteen actual
errors without counting any suite/load failure as expected. UI results:
`%TEMP%/round531-nfl-ui-9a7c3154c76b401ea10dd43e352ac94b/results.json`.
Main reran both new harnesses through the actual selected runner, confirming
both execute as Node jobs and pass. Log:
`%TEMP%/dukb-round531-targeted-runner.log`.
The final app type check after the test edits also passes.

The first candidate browser run failed in the driver: immediately after
closing help, the dialog's exit animation still hid main from accessibility
queries, so a role query captured an empty pre-turn cooldown. The driver
now reads the actual status element and waits for the ready button before
capturing it. No product edit was needed. The failed report is retained at
`%TEMP%/dukb-nfl-free-agency-s4zFHn/report.json` and is not counted as green.

Both phone and desktop dead Change team controls pass: removing the actual
React handler fails the exact team-picker check, restoring it permits both
team changes. Report: `%TEMP%/dukb-nfl-free-agency-eOBpfJ/report.json`.
A temporary real-hook probe confirms the bounded scout's constant draw:
DET beats GB 20 to 16 and eliminates GB, without replacing game state or
battle results. The browser must replay that actual result from identical
fresh map state. Probe:
`%TEMP%/round531-constant-scout-599eff6cfa7f4788984806c8d3a82851/evidence.json`.

Both built viewports pass and their browser processes exit 0. Each completes
thirteen actual map turns: six signing battles and five neutral claims,
followed by one scout battle and its identical replay. Both signing cycles
produce one transaction and +2 displayed rating points; neutral claims do
not advance the cooldown. The replay eliminates the selected GB team and
the real Change team flow recovers to a surviving team. Reset and the
unrelated save sentinel pass. No transport, runtime or local asset faults.
Phone: `%TEMP%/dukb-nfl-free-agency-sHe7Pq/report.json`.
Desktop: `%TEMP%/dukb-nfl-free-agency-qeoGLE/report.json`.
Main inspected phone help, signing and elimination, plus desktop signing.
The final browser syntax check and shipped-name fence also pass.
