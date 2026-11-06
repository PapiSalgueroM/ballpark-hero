# PL-05: Soccer Connections mode-owned selection

Master: C:/Users/antho/Downloads/DoUKnowBall_Game_Expansion_Masterplan.txt,409 cards,444117 bytes,SHA256 fda0f7eef07d41f2ba91e89dff3542fef98cd3bd9aabcbe02f70b649797d357a. PL-05 lines6917-6927 remains partial. Its acceptance requires duplicate and interrupted actions to preserve balances and produce one coherent resulting state.

## Bounded problem

The original Soccer Connections hook retains shared transient selection and refusal feedback when changing Daily/Unlimited mode. Four names selected on one board can remain selected after switching to a distinct board. The actual Page enables Submit based only on selected.length===4. Submitting those off-board names can consume the destination board's life despite no destination tiles having been selected.

This slice makes transient selection belong to the current mode. It does not add durable event history, server authority, cross-device coordination or broad action idempotency.

## Source and proposed change

Base clean draft PR519, headf1ce570f140443f161e566e2a6974410e8d92185, tree46e419a6514473e8e7fffe2ba3f30ba3cede90b3.

Original Hook: src/hooks/useConnections.ts,blob85964ad8462a9b7c60cd3709240c3107bfb47e7f.
Held Page: src/pages/Connections.tsx,blobb5bd5aaba7d8877be86cc592ca4ae1616b517a5f.

Change only switchMode:
1. Return immediately when the requested mode equals the current mode.
2. Set the new mode.
3. Clear selected to[].
4. Clear lastIncorrect to null.
5. Clear oneAway to false.
6. Depend on mode in useCallback.

The later-declared setters are captured by the callback and are initialized before a UI action can invoke it. No effect or timer invokes switchMode during render. The pinned Hook and Page contain no deferred feedback timer to cancel.

Keep shuffleKey, seedShuffle, random draws, puzzle pool, selected puzzle indices, solved groups, lives, hint categories/counts, streak, daily action log, save schema, scoring, completion and all data unchanged. Same-mode clicks preserve selection and feedback. The Page, Board, other sports' Connections hooks, visual dimensions and copy stay held.

## Original-first proof before implementation

Use two disjoint explicitly fictional fetched boards through the existing pool boundary. Keep the actual hook and Page, and the daily core where practical. Record actual original state and side effects before named assertions, including selected names, current board identity, lives, solved groups, hints, daily action log/storage, ordering and random tape. Do not replace the board engine with a test oracle.

Predicted failures to demonstrate:
- Daily selection carried into distinct Unlimited leaves Submit enabled and can cost Unlimited a life.
- Unlimited selection carried into Daily can cost Daily a life or append a wrongful refusal action.
- A real mode change retains lastIncorrect and/or oneAway from the other board.

Preservation cases should cover same-mode clicks, current-board valid and invalid submissions, existing progress and hints after switching away and back, daily storage/log, deterministic ordering and unchanged random consumption. Exact final case counts and named failures are owed by actual original execution, not asserted by this plan.

After the original evidence is admitted, apply the minimal Hook change and run the same regression, related existing loss/relabel/shake tests where applicable, proper app type check, normal build and unchanged output-reader/weight fences.

## Native and delivery boundaries

Exercise actual Page controls at320x568,390x844 and1280x900. Load fictional boards through bounded transport only. Select actual tiles, switch mode through a trusted click, observe cleared selection and disabled Submit, then select and submit a legitimate current-board group. Record native frames/actions/viewport screenshots and raw references.

Do not override App state, DOM, save state, clock, RNG or in-memory pools in native proof. Do not claim real player-data correctness, native random-count measurement or backend writes from fictional transport. Measure inherited control dimensions honestly; this behavior fix does not claim whole-page44px compliance.

All App/Git/runtime work stays remote through GitHub and Actions. Local App/Git/runtime are held, release remains held, and no merge or publish is authorized by this slice. Clean delivery should contain only the scoped Hook change, regression and updated plan/PROJECT-STATE/WORKBOARD. Remote-only qualification helpers and workflows must be excluded. Final product source and built-byte joins must bind the clean draft to the actual completed proof. Companion-owned Career, Club Manager, Team-picker, K League and guide files remain untouched.
