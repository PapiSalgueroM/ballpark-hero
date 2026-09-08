# Round 533: NFL reward action lifecycle

Worktree `.worktrees/round-533-nfl-powers`, branch
`codex/round-533-nfl-powers`, base532 `41810f8b` (draft PR83).
Claim `ad5ec9c9`. Root belongs to Claude and remains untouched.
Implementation `c9334cca`, stacked draft PR84:
https://github.com/PapiSalgueroM/ballpark-hero/pull/84.

## Change

Earned and reopened rewards retain their actual owner until resolved.
Current phase, owner, reward type and consumed callback guards reject
repeated, stale, wrong-phase and unoffered actions. Invalid explicit player
or territory choices keep the reward available; omitted choices retain the
existing random fallback. A saved card now opens its decision dialog.
Closing that dialog saves it. Closing, escaping or backing out of a target
picker returns to the same card. The two-slot inventory and its oldest-card
replacement rule remain. Saved buttons have 32px touch targets and accessible
owner/slot labels. Help explains earning, saving, reopening and cancellation.

Starting another turn requires a ready board with no unresolved reward.
A docked signing consumes the current start callback before the roster changes.
Territory powers resolve once, log as powers, and immediately finish the game
when they remove the final opponent. Highlight cleanup does not reopen a
completed game or interrupt another card. Starting a new turn also clears
the previous highlight before cancelling its timer.

No real-world data, battle formulas, upgrade lifetime or stacking rules change.
The existing upgrade disappearing on an unrelated turn is reproduced and
queued separately for Round 534.

## Reproduction and checks

Three real-hook baseline witnesses on Round532 reproduced duplicate saved
cards, duplicate slot removal, stale post-reset shield/save/sign actions,
duplicate signings, unoffered signings during animation, and invalid or stale
Upgrade/Territory choices spending rewards. Seed29 earned CIN's card after
five real turns and four battles. Only reward type was fixed after consuming
the normal random draw. Zero transport/storage/backend/runtime faults.
Evidence: `%TEMP%/round533-reward-baseline-36f837b432f04306af07f803c34cc147/`.

The nine new hook tests on the exact old hook produce eight intended
AssertionErrors and one passing legacy random-choice case:
`%TEMP%/round533-newtests-red-473c03f60c8241c8b35ac9962113d826/`.
The Board baseline produces eleven intended failures and four existing
preservation passes: `%TEMP%/round533-ui-baseline.json`.

Final coverage is nine real-hook cases, fifteen Board/help cases and one
explicitly declared starting-map final-victory case. The final-map fixture
keeps real geometry, rosters and hook actions, with CIN owning all but a
marked neutral PA_W and WAS's last MD. It earns, saves and reopens the real
territory reward, chooses MD twice, and proves exactly one elimination/log,
immediate gameover and preserved gameover after animation cleanup. It is
not a naturally reached endgame. A separate six-seed natural scout played
625 turns and 482 battles without finding the needed final-power witness;
that scout is not credited as proof of the final-territory path.
Scout: `%TEMP%/dukb-round533-final-scout-fb2b6fc6c08e4943ace6b6aa7547bcbd/`.

All 34 hook source controls produce one intended error each. Runtime and
caught backend probes are rejected. The four changed Round531 controls
remain exact. One overly broad animation control initially triggered the
earlier cross-action guard; narrowing it to the phase check restored the
intended measurement. The original and final logs remain in the evidence.
Hook controls: `%TEMP%/round533-powers-controls-8ab75d1acaee490a8402b72b13d95fd8/results.json`.
All 32 UI source controls produce 95 exact intended AssertionErrors. Its
runtime probe is rejected with 14 actual Error records. The source controls
include caught transport/storage/backend access and import-time backend
access. UI evidence: `%TEMP%/round533-ui-controls-1lJuRI/results.json`.
Four final-map controls produce four intended failures, with runtime and
caught import-time backend probes rejected:
`%TEMP%/dukb-round533-victory-controls-d61094a496304497a11123e86d9cbbfd/`.

The added immediate-next-turn check exposed a highlight left behind when
startBattle cancelled its cleanup timer. The exact HIGHLIGHT assertion was
red before the one-line cleanup and green afterwards:
`%TEMP%/round533-territory-next-turn-before.log` and
`%TEMP%/round533-territory-next-turn-final.log`.

Both exact TypeScript projects pass. Final build passes in 18.92 seconds.
All 15 generated-site fences pass. The actual selected runner executes all 25
new cases and 83 previous NFL/NBA/help cases successfully. The prior Free
Agency saved-card expectation now checks the visible received-card phase.
Final source brand scan, wrapper/browser syntax and diff whitespace checks
pass. No default broad suite was run.
Logs: `%TEMP%/round533-app-types-final2.log`,
`%TEMP%/round533-node-types.log`, `%TEMP%/dukb-round533-build-final2.log`,
`%TEMP%/dukb-round533-site-fences.log`, `%TEMP%/dukb-round533-boot.log`,
`%TEMP%/dukb-round533-prior-sims.log`, `%TEMP%/dukb-round533-new-sims.log`.

The phone browser earns WAS's Upgrade from the visibly marked KY after
seven actual turns, five settled battles and two neutral claims. It verifies
the true claiming owner and marker removal before saving, reopening,
award Close/Escape, all three picker exits, final selected player/owner,
single-card consumption and a fresh run with unrelated storage preserved.
No hook state or result is injected. Normal phone evidence:
`%TEMP%/dukb-nfl-powers-XRPzDh/report.json`.
Initial browser attempts used a different RNG algorithm than the hook
fixture, first assuming a first-turn award and then finding none within 16
turns. The driver now uses the same Mulberry32 seed algorithm. These were
fixture misses, with zero app/transport errors, not product defects.
Those attempts remain in `%TEMP%/dukb-nfl-powers-NzAsxZ/`,
`%TEMP%/dukb-nfl-powers-WaLiwa/` and `%TEMP%/dukb-nfl-powers-UJQH1R/`.
Main inspected the phone reward, saved card and picker screenshots.
Desktop normal and both dead-button controls also pass the same seven-turn
witness and complete reward flow. Each control replaces the actual saved
button with a handler-free clone, requires the exact missing-dialog timeout,
restores the original button and completes the run. Jayden Daniels is the
actual selected player. All four runs have zero transport violations,
runtime errors or local asset failures. Backend responses are exact local
fixtures. Main desktop picker visual review is clear.
- Normal desktop: `%TEMP%/dukb-nfl-powers-Cz56bK/report.json`
- Phone control: `%TEMP%/dukb-nfl-powers-h5JDo1/report.json`
- Desktop control: `%TEMP%/dukb-nfl-powers-MPm3v0/report.json`

Independent production, hook, UI and final-map test/wrapper reviews are clear.

Preview4210, PID6112, serves `index-b5c2B-SM.js` and
`Conquest-DS5MQ8np.js`. Preserve every prior preview and worktree.
No snapshots, ledger, dependencies, backend/account writes, root edits,
main merge or publication.

## Next witnessed issue

On the real hook, CIN arms Ja'Marr Chase after the same five-turn earned
reward. Selecting SEA for the next actual neutral claim clears both upgrade
fields even though CIN never participates. Only the next attacker random
draw is directed; the target and resulting claim are real.
Evidence: `%TEMP%/round534-upgrade-baseline-17e6102f5fc64bcd8a0bb9a0ebce51f4/`.
