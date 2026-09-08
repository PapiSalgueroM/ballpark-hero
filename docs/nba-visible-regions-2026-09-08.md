# Round 526: NBA Arcade visible territories

Claimed September 8 from Round 524 f51cbe5e. The resumed task owns 525; this
original overnight task owns 526. No worktree or process is shared for edits.

Implementation commit: 7f83b89ba610c0e38c076a321a9a93ed2c11c9fd.
Draft PR: https://github.com/PapiSalgueroM/ballpark-hero/pull/77.
Base is Round 524, not main; sibling Round 525 is not included.

## Scope and acceptance

Source audit found 60 STATE_POSITIONS entering NBA Arcade, although its map
draws 58 NBA_STATES and INITIAL_TERRITORIES_NBA assigns exactly those 58. The
excluded parents CA_N/TX_S are the only initial neutral regions, receive the
only initial power markers, and enter the neutral-target/claim path. Hidden
ownership then affects territory counts, centroids and battle advantages.
This does not prove the game unwinnable; win checks count remaining owners.

Reproduce real hook initialization/reset/turns against rendered region IDs.
Change the initialization loop only, leaving team data and all existing rules
alone. No valid initial neutral land means no initial neutral power markers.
Adding new land or moving powers onto owned regions is a separate rule change.
Preserve the losing-attacker retreat regression and exact visible assignments.

Tests must deny unexpected transport/backend/storage writes, use deterministic
randomness and real hook transitions, and show exact failing controls. Run
both exact types, build, fifteen generated-site fences and a local browser
check at phone/desktop widths. No full default suite or production action.

## Results

The real hook reproduced the defect before the fix: four exact assertion
failures, with the existing away-loss rule still passing. Seed 18 actually
targeted and claimed CA_N. This was not inferred from a screenshot or a mock
of the game engine.

Production changes exactly one initializer from STATE_POSITIONS to NBA_STATES.
All 58 existing visible assignments remain. No map geometry, team data,
ratings formula, battle rule, saved-game protocol or backend changes.

Five real-hook cases pass after the fix: initial ownership, completed-turn
reset, visible neutral power locations, 24 real seeded turns, and a real
losing away attacker retaining its territory. Both exact TypeScript gates
pass. The fresh build completed in 27.73 seconds, with the existing ambiguous
duration utility and chunk-size warnings. Entry: index-DqWhZa_V.js; game:
ConquestNba-BOu6BDti.js. Preview: http://127.0.0.1:4204/conquest-nba.

The five source controls produce exactly 20 intended AssertionErrors:
old-map 4, away-loss 1, swallowed storage 5, swallowed transport 5, swallowed
backend 5. Every other case stays green, with no suite or unhandled errors.
Controls alter one checked anchor in a unique OS-temp transform copy, never
the real source or dist. The main agent independently reran the normal test
and all five controls on the final test file. All pass their exact contracts.
The final test derives imported fixture maps inside beforeEach, not at module
scope, following the import-cycle rule. The app type gate passed again after
that test-only change. No production change occurred after the build.

All fifteen built-site fences pass after the build settled: simAdsense,
simBrand, simHeadTags, simHiddenPages, simHubs, simIndexNow, simIndexing,
simInternalLinks, simNoRivalNames, simPrerender, simPrerenderBoot,
simRetiredRoutes, simSchema, simSitemap and simSnapshotAssets. The browser
boot fence used Chrome and isolated port 4404. No full default suite was run.
These are scoped code and generated-page checks, not AdSense approval or a
claim that the whole site is verified.

## Browser verification and review

The baseline 524 phone walk passes its intended smoke checks: 58 rendered
paths, a real battle, result, player selection, turn advance and reload
restart. That is deliberately not the defect reproduction. The hidden hook
keys do not appear as paths, so the real-hook tests provide the regression
proof. The true hook reset is tested separately; reload is not called reset.

The initial browser fixture correctly stopped on unhandled navbar reads.
Its corrected version answers only exact synthetic live_scores,
game_completions and global_rank read requests. The RPC POST is fulfilled
locally, never forwarded. Other writes, WebSockets and unexpected backend
requests fail closed. No real account or save is used.

Independent review caught a false green in the first protected-save check:
the sentinel was recreated on reload, which could conceal deletion. It is
now seeded only once after initial navigation and checked before and after
reload. The browser map control removes one actual SVG fill path, requires
the exact 58-to-57 failure, restores the node and continues gameplay.
The baseline phone control passes. Final corrected-build walks pass at 390
and 1440, including a real first-turn battle, result, player choice, exact
turn advance, reload restart and the protected sentinel. The corrected-build
phone map control also passes. Zero unexpected backend, local-request or
runtime errors. Main independently reran the phone walk and inspected phone
map and desktop result screenshots. No horizontal overflow was measured.
Read-only review found no remaining source or harness issue.

Two report-only issues were corrected before the final runs: the timeout
options were initially passed as the wait function's argument, and a
case-sensitive substring produced an empty result excerpt because CSS
capitalized the visible heading. The final harness reads the actual result
card and captures 416 characters. Neither issue changed production code.

Local artifacts under C:/Users/antho/AppData/Local/Temp/:
- dukb-nba-regions-c8LuPG/report.json: final 390/1440 walk and screenshots.
- dukb-nba-regions-U9bLnI/report.json: final missing-path control.
- dukb-nba-regions-o7lNjA/report.json: independent main phone rerun.
- dukb-nba-regions-XbGTFF/report.json: baseline 524 phone smoke.

## Publication dependency: visible powers

All valid NBA regions start owned. Ordinary new Arcade runs acquired powers
only by claiming the two hidden neutral regions. Removing that invalid land
therefore makes power-ups unavailable in ordinary new runs, not merely
invisible at initialization. The power system is unfinished, not removed
from the owner's requested game.

Do not publish this round as a complete mode. A separate follow-up must give
powers an intentional visible acquisition rule and align the promises in
ConquestNba.tsx lines 92, 103, 108 and 116, and ConquestHowToPlayNba.tsx
lines 48 through 57. Do not silently invent extra neutral land, move powers
onto owned regions, or change the existing Arcade away-loss rule here.
No merge, publication, backend write or real saved-game mutation occurred.

## Next-pass source audit, not executed defect proofs

The read-only handoff traced the dormant power paths without choosing a new
acquisition rule. Acquisition is pickRandomPowerupStates, then the neutral
claim's marker check, pendingPowerup and powerup_received. Consumption runs
through usePowerupNow/executePowerup. Saved inventory caps at two and replaces
the oldest. The separate cooldown free-agency feature is not this power path.

Before making powers normally reachable, reproduce these existing risks:

- useSavedPowerup is defined and exported, but has no UI caller. The standings
  display saved icons as spans. The callback also does not open the received
  phase, so merely adding a button would not prove a usable saved-power flow.
- buildFreeAgentList uses shared FREE_AGENTS, not the NBA cooldown pool. Audit
  the sport-specific eligibility before exposing that picker.
- usePowerupNow clears pendingPowerup before a deferred free-agent selection;
  signFreeAgent can then fall back to attackingTeam. Prove the recipient stays
  the awarded team when those identities differ.
- startBattle clears an active upgrade before selecting the next attacker.
  Prove the intended upgrade lifetime and effect rather than only the badge.

The future acceptance checks need a normal visible action that awards exactly
one power, a correct team recipient, actual Use Now and Save/reopen screens,
single consumption, capacity handling, real effect outcomes, no-effect exits,
visible-only territory changes and timer/reset cleanup. Preserve the existing
away-loss rule and keep transport/storage denied. These are follow-up tests
to write, not claims that this round tested or fixed every power effect.
