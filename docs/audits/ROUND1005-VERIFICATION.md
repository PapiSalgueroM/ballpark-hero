# Round 1005: Your picks

## Scope

Pin games from the Home catalog or Search, then launch them from a compact
Your picks shelf on Home. Pins are browser-local and work signed out. Existing
game saves and scores are not changed. Storage failures retain useful picks
for the current visit and show a plain warning. Cross-tab updates preserve
newer saved choices, and removing a focused shelf item keeps a useful focus.

## Candidate evidence

Candidate 06360a67 passed the real TypeScript gate, production build, all
sixteen built-reader and guide checks in the picks workflow, and the separate
Footle clue desk workflow. Remote run 37353065297 found two visibility
controls whose intended assertion used a different error class, an existing
Rank Em Circuit save-key omission in the long-form Continue audit, and native
pinning failures. None of that run is treated as release acceptance.

The normal-motion profiles moved a deep catalog card when the first shelf
appeared. The follow-up anchors that actual card through the layout change.
The later hit-test failures checked a shelf during Home's deliberate scroll
restoration hold. The native script now waits for that existing restoration,
brings each shelf card fully into view, and records the hit owner and complete
geometry before requiring an owned 44px target. It retains strict no-jump
checks and effective geometry controls.

The warning controls now assert presence explicitly before visibility.
Rank Em's three-puzzle side mode is explicitly accounted for in the Continue
audit: that route opens Daily and the circuit is reopened from its own mode
button. No false automatic-resume promise was added.

The exact remotely generated What's New snapshot and hash ledger were copied
from artifact 11363582442 after SHA256 verification:
`1f1847f012c620c22a1d122d59beb64d1b2628c04da8f01d7dd9d02ca0954fc1`.
Only the What's New content hash changed. Its existing October 5 date and all
other ledger entries stayed unchanged. Final CI reads committed snapshots;
the temporary generation step has been removed.

## Acceptance pending

Candidate 7c0b8481 passed all four triggered workflows. The picks run
37355325829 passed ten mounted cases, fourteen controls and all four native
profiles, including pin/unpin/re-pin stability. Home launch, Footle five-run
and Footle clue desk compatibility also passed.

Independent source review then found that a delayed cross-tab event could
reverse the action shown on a stale button. The follow-up captures the visible
Pin or Unpin intent and applies it to the newest saved list. Both same-target
cases are now exercised, with a fifteenth effective control.

Require ten mounted outcomes, all fifteen effective controls, four native
profiles, existing Home/Search behavior, built readers and both triggered
Footle workflows. Recheck the published site and capture the visible shelf
after merge and publication. No live or completed claim yet.

All runtime verification is remote. No production database probes were run.
