# Round 532: NFL acquired roster cards

Worktree `.worktrees/round-532-nfl-roster-cards`, branch
`codex/round-532-nfl-roster-cards`, base531 `e5642529` (draft PR82).
Claim `255a129b`. Root belongs to Claude and remains untouched.

## Change

The NFL engine and three Board consumers only knew their current team's
original players. Acquired players lost their positions, game ratings and
key stats. Battles treated them as unknown 75 OVR players and omitted them
from position-specific selections. The roster, Steal and Upgrade screens
also lost their cards.

`getNflRosterPlayer` now supplies existing metadata to those consumers and
the hook's waiver and offer calculations. Priority is owner original card,
owner franchise legend, global original card, power pool, curated pool,
remaining franchise legends, then unresolved. Original cards are returned
unchanged. Pool cards have no invented key stat. Existing unknown fallbacks
remain. The resolver reads its imports only when called.

Reward and eliminated-player offers resolve for their recipient. This fixes
the duplicate Stefon Diggs pool entry advertising 88 while the original
card used by the receiving roster is 86. Filtering, deduplication, pool cap,
signing cooldown and team rating formulas are unchanged. No new sports facts.

Known limit: rosters store names, not activation identities. Adrian Peterson
remains 99 for MIN and 80 elsewhere; Marshawn Lynch remains 99 for SEA and
79 elsewhere. This round does not invent legend tracking or change power
lifetimes. NBA already has its own acquired-card resolver and is unchanged.
MLB/NHL daily modes use the shared engine, not this NFL Arcade path.

## Reproduction and checks

Before the fix, 32 seeded simulations selected Montez Sweat for original
CHI defense 32/32 times but acquired BUF defense 0/32 times. A temporary
resolver correction restored 32/32 and nine visible plays. Evidence:
`%TEMP%/dukb-round532-roles-0ab05ee7e6d94c918874267767cd17a4/evidence.json`.
The real Board baseline had five exact metadata failures and two passing
preservation cases: `%TEMP%/round532-roster-ui-baseline.json`.
The old4208 build reproduced missing position, rating and key stat after
a real GB to DET transfer, with the exact card assertion failing:
`%TEMP%/dukb-nfl-roster-Zye4kv/report.json`.

The engine suite passes ten cases and 320 real seeded simulations. All 32
original-lineup outputs and all 32 unknown-fallback outputs match digests
captured before editing the engine. Acquired QB, WR, RB, TE, curated QB and
legend scenarios each fill their intended role 32/32 times. Visible play
counts are Sweat9, Jackson76, Diggs23, Peterson35, Davis37, Garoppolo76 and
Smith7. Box scores and named play participants stay on current rosters.
Golden source and output evidence:
`%TEMP%/round532-engine-golden-a0d8e5dfb6344d368cef1189776c22d7/`.
Final measured output: `%TEMP%/round532-engine-final.log`.

Seven Board cases cover both roster tables, original/legend/upgrade display,
pool cards, unknowns and Steal/Upgrade metadata and actions. One real-hook
offer case uses seed29, 21 map turns and 17 battles to eliminate NE, opens
CIN's actually earned saved reward, checks the WR86 offer, and signs it.
Only the reward type is fixed; state and battle outcomes are real. A bounded
seed search selected this repeatable case because later eliminations often
leave Diggs below the existing top30 reward cap.

The new checks have 42 source controls producing 69 exact intended failures:
26 engine,41 UI and2 offer failures. Runtime probes are rejected by all
three wrappers. Caught backend access is detected, including import-time
access in the offer and UI fixtures. The prior531 metadata control was
updated for the shared resolver and still produces its one intended error.
Evidence:
- `%TEMP%/round532-engine-controls-916f8f5a2a0f4137bce06e19e372d2ec/results.json`
- `%TEMP%/round532-ui-controls-fc2f75d3ebaf43479883c0fb6341c204/results.json`
- `%TEMP%/round532-offer-controls-final.log`

Both exact TypeScript projects pass. Build passes in 23.40 seconds.
All 15 generated-site checks pass. The first boot check timed out navigating
Soccer Career during concurrent checks; the complete rerun passed without
code changes. The selected runner passes the 18 new cases plus 54 existing
NFL/NBA Free Agency and help cases. Its first offer job was marked EMPTY
because the one-case wrapper printed only three lines; the wrapper now
prints actual witness output and structured report counts, and its selected
rerun passes. No default broad suite was run.
Logs: `%TEMP%/dukb-round532-{app-types,node-types,build,site-fences}.log`,
`%TEMP%/dukb-round532-boot-rerun.log`,
`%TEMP%/dukb-round532-scoped-sims.log` and
`%TEMP%/dukb-round532-offer-runner-final.log`.

Built 390 and 1440 checks each play two real battles and transfer Micah Parsons
GB to DET to CLE. The acquired roster and subsequent Steal option match his
original DE99 card and key stat. Each DOM control changes the measured
position cell, triggers the intended assertion, restores it and completes
the transfer. Normal and controlled runs both exit0 with zero transport,
runtime or local asset faults. All backend responses are local fixtures.
- Normal: `%TEMP%/dukb-nfl-roster-Y7HhSm/report.json`
- Controls: `%TEMP%/dukb-nfl-roster-nxkogt/report.json`

Main inspected phone roster and picker screenshots plus desktop picker.
Independent production, test, wrapper and browser source review is clear.
Preview4209, PID34344, serves `index-KPtWT1aL.js` and
`Conquest-DwMGahpo.js`. Every previous preview and worktree is preserved.
No dependency, snapshot or ledger changes, real backend/account writes,
main merge or live publication.

Next free533: review the separate NFL reward action lifecycle. Its direct
power signing callback still needs a bounded canonical-choice and repeated
action audit. This round repairs card identity, not all NFL power actions.
