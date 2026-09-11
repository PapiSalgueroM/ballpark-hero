# Round 535: NFL legend card identity

Worktree `.worktrees/round-535-nfl-legend-cards`, branch
`codex/round-535-nfl-legend-cards`, base 534 `fb0f12c9` (draft PR85).
Claim `2ac533bb`. Root belongs to Claude, tracked-clean at `b0c339b1`.
Implementation `b9093683`, draft PR86:
https://github.com/PapiSalgueroM/ballpark-hero/pull/86.
All previous worktrees and previews are preserved.

## Reproduction

The name-only resolver turns an ordinary reward-pool Adrian Peterson card
from 80 into 99 when MIN signs him. Marshawn Lynch similarly changes from
79 into 99 for SEA. Conversely, an earned franchise legend loses that
rating after a transfer to another team. No new sports facts are involved:
these are different existing cards in the game's own pools.

The independent resolver/engine baseline has four 128-seed comparisons.
Every comparison changes all 128 box scores. Visible plays change in 10,
9, 10 and 10 runs respectively; each comparison changes one final score.
There are zero participants outside the supplied current rosters. The
original 32-output digest remains
`10bb2817b31e2fb8c187724bd6aca41ea55055de9962a8fc49a0a43c00787d3c`.
The census finds zero legend names on initial active rosters and zero
duplicate names in TEAM_LEGENDS. Evidence:
`%TEMP%/dukb-round535-legend-baseline-ac7fcb0e6a604b87b809aad3d63e0775/report.json`.

Two real-hook witnesses reproduce the defect using explicitly declared
initial territory ownership, original rosters and actual geometry. These
are fixture campaigns, not natural original-map witnesses. The ordinary
case plays three actual BUF away losses and two MIN neutral reward claims.
Peterson's reward-pool card is offered and resolved as 99 instead of 80;
using the subsequently earned Legend silently spends it without adding a
card or log. The transfer case earns and activates MIN's legend through a
neutral claim, then a real MIN away loss and actual stealPlayer action move
him to BUF, where he drops to 80. Both witness cases pass with no boundary
or runtime faults. Immutable pre-edit sources and reports are retained in
`%TEMP%/round535-legend-baseline-98bc11d8043344f288dca8d170679b24/`.

The Board baseline produces seven intended failures and one ordinary-card
preservation pass across eight component cases. Evidence:
`%TEMP%/round535-ui-baseline.json`.

## Contract

The hook records actually earned legend names for this run. Every live
roster, offer, waiver and battle lookup receives that explicit set. An
unmarked ordinary card keeps its existing pool rating even at its franchise.
A marked known legend stays 99 through transfer, elimination and subsequent
signing. Reset clears the set. A missing set preserves legacy resolver and
engine behavior for older callers.

The existing NBA duplicate rule also applies here: when the franchise
legend's name is already on any surviving roster, keep the reward saveable.
This includes an ordinary same-name card on the receiving team. A reward
does not silently promote an ordinary card or create another active copy.
The initial roster census and this acquisition guard keep activated legend
names unique among active rosters. The result tables derive the legend
badge from the resolved card, and retain the separate temporary Upgrade
overlay. Existing ratings, player data and battle formulas are unchanged.

## Verification

The locked dependency install adds 543 packages, applies the existing auth
patch and reports zero vulnerabilities. The initial app type check passes.
Logs: `%TEMP%/dukb-round535-install.log` and
`%TEMP%/dukb-round535-initial-app-types.log`.

Build passes in 25.00 seconds and the exact node type check passes. All
fifteen generated-site checks pass, including the browser boot fence on
port 4336. The selected runner executes fourteen existing NFL/NBA/help
harnesses with 132 passing cases. No default broad suite is run.
Logs: `%TEMP%/dukb-round535-build.log`, `%TEMP%/dukb-round535-node-types.log`,
`%TEMP%/dukb-round535-site-fences.log`, `%TEMP%/dukb-round535-boot.log` and
`%TEMP%/dukb-round535-prior-sims.log`.

Preview 4212, PID 35496, serves `index-E-_nGaLM.js` and
`Conquest-DLXx-el3.js`. Independent hook/Board/help production review and
root resolver/engine/component-test/browser-source review are clear.

Six changed prior hook controls each produce their one exact intended
failure: free-agency metadata, raw and docked roster offers, and the upgrade
attack-call, participant-call and duplicate-reason checks. Logs:
`%TEMP%/dukb-round535-prior-<script>-<control>.log`.

Nine engine cases pass. Both ordinary franchise cards match the existing
pool-card reference in 128/128 complete outputs, and both transferred
legends match their earned-card references at both battle sides in 128/128
outputs. A separate queued QB upgrade still applies alongside the legend.
Twenty new controls produce twenty exact intended failures; runtime and
caught-backend probes reject. Eight migrated prior engine controls remain
exact. Evidence:
`%TEMP%/dukb-round535-legend-controls-2e798ce13a024115a91bdff43423e4dd/`.

Nine Board/help cases pass, with 18 controls producing 61 intended failures.
The runtime probe is rejected with eight Error records. Six migrated prior
roster controls pass; the owner-only resolver control correctly rejects
the additional existing legend assertion now that resolved metadata owns
the badge. Evidence: `%TEMP%/round535-ui-controls-2s68lY/` and
`%TEMP%/round535-old-roster-controls-R4WJA6/results.json`.

Eight hook cases pass using the explicitly declared ownership fixtures.
They cover both ordinary cards, same-owner and other-owner duplicate
rewards, one-time activation, real transfer and engine call-through,
elimination and both released-player offers, signing and reset. The waiver
check needed strengthening: the first fixture had an ordinary 79 card,
which hid the regression that treated the legend as 80. The final fixture
performs one real signing to remove that card, three more actual battles
and a second signing with ordinary cards above 80. The omitted-marker
control then rejects the wrong waiver. This proves retaining the legend
when a weaker ordinary player is waived, not an actual legend-waiver event.
The latter was not naturally reachable with the unchanged roster inputs.
All 25 hook controls produce their exact intended failures; runtime and
caught-backend probes reject. The missed first control is retained beside
the repaired proof:
`%TEMP%/round535-legend-controls-ebd06413d5df4ff9bebd4aaf5b4bb133/results.json`,
`results.initial.json`, `waiver.log` and `waiver-final.log`.

The selected runner passes all 26 new cases after the waiver-test update.
Together the three harnesses have 63 source controls producing 106 exact
intended failures. Final syntax and source brand checks pass. The final app
check passes after that last fixture edit, so both exact types are clean. Logs:
`%TEMP%/dukb-round535-new-sims-final.log`,
`%TEMP%/dukb-round535-app-types-last.log` and
`%TEMP%/dukb-round535-final-brand.log`.

The first phone browser run passes five actual turns across two fresh
original-map scenarios: one marked IA claim and two battles earn and
transfer the legend from MIN to GB, followed by a fresh claim and battle
showing the ordinary signing. The transferred row stays RB/99/Legend in
GB's next battle; the fresh ordinary MIN row is RB/80 with no legend badge.
Main inspected both roster screenshots. The report records zero boundary,
runtime and local-asset faults: `%TEMP%/dukb-nfl-legends-MULxh2/report.json`.
These are two scenarios, not one uninterrupted five-turn campaign. Returning
through Modes starts the second scenario; direct Reset is covered by the
hook tests, not this browser walk.

Desktop and both rating-cell controls also pass, with the same five-turn,
two-scenario witness and zero faults. The control changes the actual
transferred player's 99 cell to 80, requires the named assertion to reject
it, then restores the cell before finishing. Main inspected the desktop
transferred roster as well. The final independent source and runtime
review is clear, including the repaired waiver control.
Desktop: `%TEMP%/dukb-nfl-legends-qoEhDE/report.json`.
Both controls: `%TEMP%/dukb-nfl-legends-XZERlC/report.json`.

Next separate candidate, Round 536: the existing player-steal confirmation
uses an untracked timer and lacks the reward actions' stale-callback guards.
An independent original-map, real-battle witness now reproduces five
failures: unknown and non-loser names accepted, double legal selection
adding two copies and settling twice, an old confirmation mutating a reset
run, and a timer surviving unmount. Evidence:
`%TEMP%/dukb-round536-steal-baseline-d8362858a7ef44438b23bc7c05d77f92/`.
No such repair is included here.
