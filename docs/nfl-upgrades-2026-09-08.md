# Round 534: NFL upgrade lifetime

Worktree `.worktrees/round-534-nfl-upgrade-lifetime`, branch
`codex/round-534-nfl-upgrade-lifetime`, base 533 `2e34734c` (draft PR84).
Claim `03d4a795`. Root belongs to Claude and remains untouched.

## Reproduced defect

The old hook clears its single upgrade at the start of every map turn.
On the real seed29 run, CIN earns an Upgrade after five turns and four
battles. Choosing Ja'Marr Chase arms the existing upgrade, then an actual
SEA neutral claim clears it while CIN never participates. Only the next
attacker random draw is directed; the target and claim remain real.
This proves the lifetime defect, not a statistical improvement: Chase's
existing CIN card is already 99. Effect checks must use existing sub99
cards instead.

Evidence: `%TEMP%/round534-upgrade-baseline-17e6102f5fc64bcd8a0bb9a0ebce51f4/`.

## Contract

Each team can queue one chosen player's upgrade. Neutral claims and other
teams' battles preserve it. Creating that team's next actual battle uses
and consumes the participating teams' entries, while retaining a separate
snapshot for both result roster tables. The next accepted turn clears that
display snapshot. A second Upgrade for an already queued owner stays
saveable instead of replacing the first one. Waiving the selected player,
losing the final territory to a power, or resetting clears the appropriate
queue. Ordinary battle elimination already consumes that team's entry.

The engine accepts a team-to-player map after its existing arguments. An
omitted map keeps the legacy single-team pair; an explicit map, including
an empty map, takes precedence. Ratings are keyed to the player's actual
owning team, including when the same name appears on opposing rosters.
No player data or battle formula tuning is intended.

## Late Round 533 type-check correction

The first Round 534 app check exposed TS2367 in the late Round 533
powerVictory test. Its assert.ok narrowed the hook's current phase across
an act callback. A fresh read-only app check at the preserved Round 533
checkpoint confirms the same error. The previous successful app check
started before that fixture was added, so its recorded final type claim
was too broad. PR84's description now explicitly qualifies it and remains
draft pending the stacked correction.

This round uses a void assertion helper in that test. Every condition and
error message remains the same, as do the final-victory controls. Previous
worktrees and previews remain untouched. Evidence:
`%TEMP%/dukb-round534-app-types.log` and
`%TEMP%/dukb-round533-post-handoff-types.log`.

## Verification

Nine hook cases pass. Seven retain the original initial map and earn their
upgrades through actual neutral claims after real battles. They cover owner
and unrelated neutral claims, unrelated battles, attacking and defending,
independent queues, duplicate-card saving/reuse, reset and stale callbacks.
Two separately labeled initial-map fixtures keep real geometry and rosters,
with every non-rendered region left neutral. Actual claims earn their cards:
one verifies partial territory loss and final elimination cleanup; the other
verifies both queued owners enter the same real simulation once, consume
both queues, and retain both battle snapshots. Neither is presented as a
naturally reached campaign.

Thirty-six hook controls produce 36 exact intended failures. Runtime and
caught import-time backend probes are rejected. The three changed prior
controls remain exact and the two older hook suites pass 18 cases. The
REAL RESULT check compares outcome values, not object identity, and its
control changes a score. Evidence:
`%TEMP%/round534-upgrade-controls-6c1d422111844be0baa2f6412b8aa287/results.json`.

Eight engine cases pass against an independent reference that changes only
the selected existing card's in-game rating to 99 in declared roster inputs.
Both owners, both home roles, receiver and rusher effects, legacy and empty
map inputs, absent owners/players and same-name ownership are covered.
The original 32 no-upgrade output digest stays exact. Joey Bosa is the sole
eligible defender and Tee Higgins the sole receiver in their focused
fixtures so those rating paths are actually exercised. A full-roster sample
initially let the rush-defense control stay green; the stronger fixture
and 128 fixed seeds make that control catch the actual error. The MIN99 and
BUF80 Peterson cards use existing metadata, not new player facts.
Pre-edit baseline: `%TEMP%/dukb-round534-engine-baseline-d04cbafd0bbd407899495bfaec5fa736/`.
The final engine suite matches the dual-owner reference in 128/128 runs
for each home role. Peterson isolation matches 128/128 queued and 128/128
legacy outputs. All fifteen engine source controls produce exactly fifteen
intended failures; runtime and caught-backend probes are rejected. The
corrected prior victory test passes and all four old controls remain exact.
Evidence: `%TEMP%/dukb-round534-engine-controls-c903084b0cbd42bfac23da5aef0cdba4/`
contains `normal-final.log`, `results.json` and `victory-results.json`.

Seven Board/help cases pass. Twenty UI source controls produce 45 exact
intended errors, including caught transport/storage/backend and import-time
backend access. The runtime probe rejects with six actual Error records.
The prior Board fixture migrations keep their existing assertions.
Evidence: `%TEMP%/round534-ui-controls-rWoxjJ/results.json`.

Production build passes in 24.80 seconds. All fifteen generated-site checks
pass, including the browser boot fence on port 4335. The selected runner
executes eleven prior NFL/NBA/help harnesses, totaling 108 passing cases,
and all three new harnesses with 24 passing cases. No default broad suite
is run. Node types pass. The final app check passes after all new TypeScript
test files, the ninth hook case and the late-fixture correction are present.

Logs: `%TEMP%/dukb-round534-build.log`, `%TEMP%/dukb-round534-site-fences.log`,
`%TEMP%/dukb-round534-boot.log`, `%TEMP%/dukb-round534-prior-sims.log`,
`%TEMP%/dukb-round534-node-types.log` and
`%TEMP%/dukb-round534-app-types-last.log` and
`%TEMP%/dukb-round534-new-sims-final.log`.

The three new harnesses have 71 source controls with 96 exact intended
failures in total. Independent hook, engine, Board/help, test and wrapper
source reviews are clear. Final syntax and source brand checks pass.

The normal phone and desktop browser walks each pass eleven actual turns
(seven battles and four neutral claims). WAS earns the marked KY reward on
turn 7 and chooses Jayden Daniels from his displayed 88 card. The same queued
upgrade survives SEA claiming WY, WAS claiming WV, and SEA fighting LV.
WAS then fights CAR; its queue is consumed and the actual result roster
shows Jayden at QB, rated 99, with his existing key stat. The final fresh-run check
proves a clean starting state, not clearing a still-live queue; the hook
tests separately prove that reset behavior. All requests use exact local
fixtures, with zero transport, runtime or local-asset faults.

- Phone: `%TEMP%/dukb-nfl-upgrades-zgTFqL/report.json`
- Desktop: `%TEMP%/dukb-nfl-upgrades-Vn1lun/report.json`

The phone and desktop queue-removal controls also pass all eleven turns.
Each removes the actual queued banner, requires the named assertion to
reject it, then restores that node and continues through real consumption.
Both report zero transport, runtime or local-asset faults. Combined report:
`%TEMP%/dukb-nfl-upgrades-jD5y9N/report.json`.
An additional phone control run scrolls the queued banner into view before
each preservation screenshot. Its report also passes, with the same zero
fault counts: `%TEMP%/dukb-nfl-upgrades-1SslP7/report.json`. Main inspected
its owner-neutral screenshot and both normal consumed-player roster images;
the banner wraps clearly and the upgraded card retains position and key stat.

The initial driver planned random-sort directions in Node. Installed Chrome
ordered that random comparator differently, so its owner-neutral prediction
failed. The driver now computes direction draw plans in Chrome and uses a
temporary bundled copy of the real selection helpers only to predict legal
targets from visible owners, reconstructed in STATE_POSITIONS order. Actual
map deltas and battle teams remain the assertions. No hook state or result
is injected. The initial fixture failure is retained at
`%TEMP%/dukb-nfl-upgrades-QQbGMt/report.json`. A source review also corrected
team-ID comparisons to the actual displayed team names before the final runs.

Preview 4211, PID 36716, serves `index-C2ak2tWO.js` and
`Conquest-MNngEgrY.js`. Preserve every previous worktree and preview.
No snapshots, ledger, dependency changes, backend/account writes, root
edits, main merge or publication.
