# PL-05: Soccer Connect4 pending request ownership

Master: C:/Users/antho/Downloads/DoUKnowBall_Game_Expansion_Masterplan.txt,444117bytes,SHA256 fda0f7eef07d41f2ba91e89dff3542fef98cd3bd9aabcbe02f70b649797d357a. PL-05 lines6917-6927 is P0. Exact acceptance: "Duplicate and interrupted actions preserve balances and produce one coherent resulting state." This is one Soccer Connect4 client-settlement slice, not complete PL-05 or authoritative server scoring.

Source authority read at348416c8f8c626b39abe56e90044c426332987f1:
- src/hooks/useFootballConnect4.ts:04f0907ffce5488cffe693ff0e80154108b70b89.
- src/pages/FootballConnect4.tsx:fcdebeebc3dc5d6050665fbb23364a81cbbd69de.
- src/types/footballConnect4.ts:b189d5c460af28ed43b7ce652d495e72df6448b0.
- src/components/football-connect4/FootballConnect4Board.tsx:aa57d68f047d92eb83438f5dac12984051f8111a.
- src/components/game/PlayerAutocomplete.tsx:a0bd500b63306c75e0dea251cb6fb67ea2ed9452.
- src/lib/playerSearch.ts:0d19f2c23735eb30512dc7fc3a447eacef5e128f.
- src/lib/firstDraw.ts:0ce3060e439f2168bd0d07bb723255547a20c95b.
- src/hooks/useDailyPuzzle.ts:b8a0d6ba268efe0e728c4ee96fbc6c60fcc73846.

The hook captures mode/config/board/cell/turn before fetch and body awaits, then commits those closed-over values at252-275. Page mode buttons82-93 remain available during validation. switchMode297-310 clears/re-deals even when the highlighted Unlimited button is pressed again. A late result can therefore put an abandoned round's chip into the new board, append an unseen daily action, or replace new-round feedback. Its finally279 also clears busy without owning the current request.

Page47-50 awaits submitPlayer then unconditionally clears playerInput. Important qualification: on the original hook a mode switch leaves isValidating true, so a user cannot yet enter fresh-round text until the old request settles. The page preservation test first owns that lock boundary; only its future fixed continuation tests that releasing the new round does not expose a stale input-clearing regression. It does not claim an original native fresh-input wipe was observed.

Calls and shared sports: the verified direct production consumer is FootballConnect4.tsx. NBA1140a376,NFLa61d0561,NHL7d3d05be and MLB8f2fa1e0 implement separate hooks and do not import/call the Soccer hook. Their engines are held. GitHub search currently returns incomplete_results:true and cannot certify a complete reference census. Before product authorization, the original CI must retain git grep -n -e useFootballConnect4 -e hooks/useFootballConnect4 -- src scripts. Report every consumer and preserve its contract. Known existing connect4ReasonShape112831b4 and connect4FinishPages67a8676c exercise the four US sports, not this Soccer hook. Existing playFootballConnect4Failures01fddf10 covers immediate429/invalid/unverified/contradictory/valid responses plus an effective accept-on-error control, not round abandonment.

Proposed test: src/test/footballConnect4RequestOwnership.test.tsx, immutable blob1b96c80d33916f9e55cd785e67663b7abcc3ac0c.
Twelve actual cases, predicted original census6 named business AssertionErrors and6 preservation passes:
- C4_OWNER_RESET: real Unlimited generator repeats the same source board while an old JSON body is pending; the old valid result must not enter the re-dealt round.
- C4_OWNER_DAILY: switch to Unlimited during a daily request; late validity must not write the hidden daily log/storage.
- C4_OWNER_REFUSAL: an old invalid response cannot restore error text in the new round.
- C4_OWNER_NEWER: a fresh round unlocks immediately; once its new request starts, the old finally must not clear that busy state or selection.
- C4_OWNER_PAGE: actual page/board/autocomplete/search processing preserve freshly typed input and focus when the old continuation resumes, qualified as above.
- C4_OWNER_DUPLICATE: two calls to the existing submit API before React commits its busy render initiate one request and persist one daily action. This is API-level same-origin ownership, not a claim that ordinary separate native clicks bypass Page's rendered lock.
- C4_PRESERVE_VALID: timely canonical validity keeps the original one blue chip/red turn/action schema.
- C4_PRESERVE_INVALID,UNVERIFIED,CONTRADICTORY,BUSY,NETWORK: existing current-round refusals remain no-penalty and allow one subsequent valid retry.

The real baked catalog, generator, firstDraw, daily codec/replay, hook, board, page, autocomplete and search normalization/ranking execute. No engine or generator is mocked. Math.random's unit tape is recorded and returns0, so identical re-deals exercise real round identity. The fake unit clock is fixed at2026-11-06T12:00:00Z to prevent original/fixed parity crossing Eastern midnight. All validator names and search rows are fictional. Only validator fetch/body and PostgREST transport plus external auth/completion/non-game shell boundaries are stubbed. Search uses both real thenable query legs. No real data/API/DB change is proposed.

C4_REQUEST_OWNER_RAW is an optional fresh absolute output. It retains the complete source board catalog, all public hook state, selected cell, mode/turn/busy/error, full storage and parsed daily log, request payload/headers/body stages/signals, observed random draws, search transport, completion calls and actual page input/focus/HTML. These are authored expectations until the original actual output is admitted.

Only after named original reds: review minimal hook request/round ownership and page continuation guards. Preserve mode availability, ordinary reset draws, current validation and failure semantics, board physics/win logic, score, saved action schema, endpoint and public helpers. Do not expand rejection-shape bugs, rewrite other sports or add data. Source controls must physically remove the implemented origin, finally, input and pending-entry guards with unique anchors, measure the actual case sets, and restore exact bytes. No speculative control set is called passed.

Remaining holds: full caller census, actual original types/business census and RAW, fixed/control/restored outputs, proper build/readers/immutable caps and scoped native proof. Cancellation-only policy, other games, broader cross-tab authority, server ranking and whole-master completion are not admitted by this proposal. No production code, refs, local Git/App/Node/Python/browser/build execution or local source writes occurred while authoring these immutable blobs. Root owns refs and remote execution.
