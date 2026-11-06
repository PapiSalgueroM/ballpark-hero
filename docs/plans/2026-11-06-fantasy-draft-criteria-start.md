# FD-01: wait for the daily criterion before Start

## Master and scope

Canonical master: C:/Users/antho/Downloads/DoUKnowBall_Game_Expansion_Masterplan.txt, SHA256 fda0f7eef07d41f2ba91e89dff3542fef98cd3bd9aabcbe02f70b649797d357a, FD-01 lines4267-4277, P0.
Exact requirement: "Publish the daily rule before the first pick and preserve its version for the complete contest."
This is only the pending-criteria entry slice. Versioned rules, rejection receipts and the whole FD-01 card remain partial.

## Source evidence

Read-only source base e4987975ad0be520114cf2b4fe15923f7c7e9925:
- src/pages/FantasyDraft.tsx: 2343cadb8ff109230f8ed6d13fe3c70e21c57014.
- src/lib/fantasyCriteria.ts: f6f7d27ee0af80e4386e650a9d7128cd89702f90.
- src/components/fantasy-draft/PlayerPool.tsx: 08a84d008390d68293482de3e818fada9120c5b3.
- src/components/fantasy-draft/DraftRoster.tsx: 61d938308edcded2adffc810c01b7d9c12fd3a35.
- src/test/fantasyDraftFormation.test.tsx: 4db9e392fdc40f01e2c668342e45eafcf37b79f6.

The page invokes fantasy-draft-daily asynchronously at lines133-142. Start at lines320-327 currently sets started without considering loadingCriteria. Starting draws the first seat and fetches the player pool at lines145-158. The active rule derives directly from criteria at line127. Null is deliberately unrestricted in fantasyCriteria lines78-103. If the pool arrives first, an over-age forward can be admitted before a delayed Under25 response changes the rule. Existing completion checks formation, not a retroactive criterion replay. This is a reachable source-level ordering gap; no live provider occurrence is claimed.

## Original-first test

Proposed leaf: src/test/fantasyDraftCriteriaStart.test.tsx.
Use the actual page, PlayerPool, DraftRoster, eligibility, first-seat draw and AI timers. Mock only external criteria/pool/auth/completion and non-game shell boundaries. All27 player records are fictional. No real sports data, provider, DB or backend writes.

Four cases:
1. FD_RULES_PENDING_SUCCESS: attempt Start while criteria is unresolved, exercise the premature over-age pick if the original page exposes it, then resolve Under25. Before and after the callback, require no opened draft, pool read, first-seat draw, pick, settlement or completion. After a legitimate Start, refuse the veteran, admit a young forward and retain the actual two consecutive AI turns.
2. FD_RULES_PENDING_REJECTION: the same pending boundary, then reject the transport. Once settled, preserve the current unrestricted fallback and exact native seat/AI sequence.
3. FD_RULES_SETTLED_NULL: existing null response remains permissive.
4. FD_RULES_SETTLED_LEGACY: the unrecognized legacy label remains visible and permissive.

Predicted original result: exactly2 named business AssertionErrors (PENDING_SUCCESS and PENDING_REJECTION),2 preservation passes. These are predictions only until actual CI output is admitted.
FD_RULES_START_RAW optionally writes full per-case state/input-pool/HTML frames to a fresh absolute path with flag wx. It records the original harmful path and callback result before the owned assertion. Pending tests assert actual admission and side effects, not only the disabled attribute.

## Minimal future implementation, held until original business reds

Page only: prevent Start while loadingCriteria. No eligibility helper, pool, AI, random draw, draft-order, team-state, simulation, scoring or completion changes. Preserve the existing settled null, error and legacy behavior. No new version/snapshot abstraction or real-data changes.
The current criteria request runs once, so waiting for its final callback prevents that response from arriving after play has begun. Any later retry/polling feature would need its own active-run rule policy.

## Qualification

First admit proper app types and the actual4-case original census. Then review the smallest page diff and run all4 fixed/restored cases plus the existing3 formation cases and relevant real PlayerPool tests. A physical source control that removes the pending Start gate must restore exactly the2 pending business failures while both settled preservation cases still pass. Verify that the source control actually changes the intended gate and restore exact bytes in finally.

Retain callback frames, full pool, RNG draws, storage and completion/settlement evidence. Existing global failures are not waived. Build/output-reader/cap/native scope follows the root's actual qualification workflow and may not be inferred from source review.

No App code, refs, local application runtime, local Git, Node, Python, browser or build was executed while authoring these immutable proposal/test blobs. Root owns branch/ref mutations and remote qualification. Companion Career/Club Manager/Team-picker/K League ownership is unchanged.
