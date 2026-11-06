# PL-05: active Soccer Connect4 Cancel ownership

Master: C:/Users/antho/Downloads/DoUKnowBall_Game_Expansion_Masterplan.txt,409 cards,444117 bytes,SHA256 fda0f7eef07d41f2ba91e89dff3542fef98cd3bd9aabcbe02f70b649797d357a. PL-05 lines6917-6927 remains partial. This follows PR519's board/mode ownership fix into one previously excluded action: the existing Cancel control.

## Active-route preflight, required before original tests

Base PR520: head069d19d994abc8f0f23c2b9edb035188b5a22519, tree4b3ec02208ca565468b3e4c4f94ae58fa1873d64.

Pinned source:
- src/App.tsx:8bfedf7aaa1d076e0f0c8e2216c7e46632cd8a33.
- src/data/gameRegistry.ts:f560b40a74d1468ac72dfde4ee6fec6635a9a255.
- public/football-connect-4/index.html:e401626658329203487a7d45eec6e745a1bed353.
- src/hooks/useFootballConnect4.ts:971dbdfa5a0e3c5adf749f9f301cc0fd994a178f.
- src/pages/FootballConnect4.tsx:634f94cea7810cfd678c3a4a6f470c3039773882.

Original CI must verify each actual Git blob and record these code-only checks:
1. Parse App.tsx with the TypeScript AST. Require exactly one Route for /football-connect-4, whose element is FootballConnect4, with its lazy import resolving to ./pages/FootballConnect4. Refuse a Navigate element or redirect on that route. The current direct route is at355, its lazy import at31.
2. Parse the registry AST and follow the CATEGORIES Soccer object into its games array. Require exactly one actual object entry for /football-connect-4, labeled Soccer Connect 4. The current entry is at110. Commented objects and explanatory prose do not count.
3. Parse the saved public HTML as an inert DOM. Require an actual #dukb-snapshot, a canonical link to https://douknowball.com/football-connect-4 and the saved game's readable content. Reject any actual meta refresh element. The current21596-byte file is an active snapshot, not a redirect stub.

Retain the parsed route node/import, registry object and HTML selector results in the preflight receipt. Do not satisfy these checks with comments, raw substring presence or a Page file that an active route never mounts. No route revival or separate lab path is part of this work.

## Bounded behavior

The actual Page's Cancel button is enabled while validation is pending. cancelSelection currently clears only selectedColumn, targetRow and validationError. It leaves pendingRequest and isValidating intact. The user can dismiss the selection yet remain locked; a later response still owns its old token and can place a chip/write a daily action or show a stale refusal.

Change only cancelSelection: first set pendingRequest.current to null and release isValidating, then perform the existing selection/error clears. The already-qualified PR519 body/catch/finally ownership checks reject the late action. This is client cancellation only. It does not abort a server request, undo a committed move, add unmount or Skip policy, or guarantee cross-tab/server authority.

Hold validator endpoint/payload/fail-closed handling, catalog/real data, board generation, random draws, daily engine/log/save format, scoring, other sports' hooks, Page and all control dimensions. A Cancel with no pending request keeps the existing clear-selection/error behavior while preserving progress, storage and draw order. Current valid/refusal behavior remains unchanged.

## Original-first and native proof

Tests must use the actual Hook, Page, Board, catalog/firstDraw and daily core with fictional validator/search transport. Unit-only clocks and storage boundaries remain explicitly scoped. Capture pending state, actual Page Cancel, immediate busy/selection state, completed old body/error, board/turn, daily log, storage, input/focus and draw tape before named assertions.

The proposed original census covers pending Daily valid, Unlimited valid, invalid and network outcomes, plus no-pending/current-progress/refusal preservation. Exact actual case counts and failures are still owed. Any newer-request/Page continuation unreachable on the original busy UI must be labeled fixed-only; do not fabricate original reachability or equal trace lengths.

After original harm is admitted, apply the two-line Hook change and rerun original/current-preservation cases. Meaningful source controls should remove Cancel invalidation and busy release separately, prove each edit changed executable source, classify only named business failures, and restore source/index/locks/versions/offline receipt exactly.

Native proof must use the active /football-connect-4 page, real Cancel and current board controls, bounded fictional transport and completed-response barriers. No App/DOM/save/clock/RNG/in-memory pool override. Preserve inherited size limitations honestly. No successful backend write, real-player truth or native RNG-count claim.

All App/Git/runtime work remains remote through GitHub/Actions. Root owns refs. No App fix is authored before actual original proof. Type/build/readers/caps/native and clean source/build joins remain required before a clean draft. Release and local App/Git/runtime remain held. Companion Career, Club Manager, Team-picker, K League and guide files remain untouched.
