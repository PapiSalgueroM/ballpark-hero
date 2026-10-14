# Round 1366: committed pitch restart continuity

Proof preparation only. Parent application is `082fc2774c8aa9f919c14efa33bfc3fbfc599597`. No runtime has run for this packet and no application change is authored yet.

The owner reported an awkward movement after a kick. The bounded source-supported candidate is the shared hook's transition from a completed goal, missed shot or save to its existing restart scene. This packet does not infer a new goal, rebound, taker or match result from animation. Scores, feed entries and saved match outcomes remain the binders' committed records.

## Source evidence and contract

`src/components/pitch-motion/scene.ts` gives an isolated action at minute 10 a carrier scene until `10 + ACTION_SPAN`. Its followup starts at that instant: kickoff for a goal, goal kick for a miss, keeper possession for a save. `pitchSceneKey` changes when that plan entry changes. Both the shared `PitchMotion` binder and `LiveSimScreen` memoize the scene with that key.

`src/components/pitch-motion/motion.tsx` presently stores travel in state and replaces it in a passive effect after a scene changes. Its first render for the new scene still reads the preceding travel destination. The action frame is no longer selected, so that render can use the old carrier coordinates before the passive update builds the restart tween from the last committed action frame.

The proposed contract is narrower than a visual redesign: the first committed non-action frame of the same cast must preserve the last committed action's ball and player coordinates, then tween toward the actual next scene. Poses, phase and net indicators may change to their normal non-action values. Reduced motion remains immediate. This is a React commit contract. No actual browser paint, frame rate, perceived smoothness or mobile visual result is established by the model tape.

## Proof method

The new nine-case unit calls the real shared hook with the real `pitchPlan`, `pitchScene`, `pitchSceneKey` and `pitchBeatAt`. The figure names and feed are declared fictional presentation inputs. Every action object is stable across caller clock updates. A retained `useLayoutEffect` tape records every committed output, including intermediate commits that a settled DOM assertion would hide after passive effects flush.

Three owned cases compare the last action coordinates with the first restart commit. They independently pin literal terminal ball coordinates and literal restart targets for goal/kickoff, miss/goal kick and save/keeper. After the continuity assertion, they check progress and eventual arrival at the existing target.

Six preservation cases check a held caller clock and resumed progress, reduced motion, a new committed action, an action withdrawn before a clock rewind, substitution identity, and an intentional own-goal defender touch and rue pose. Input/feed JSON is held and presentation calls consume zero `Math.random` draws. Caller clock progression represents the hook's time input; actual viewer speed buttons and match score handling remain covered by the unchanged existing motion harness.

The helper compiles only the shared motion, scene and contract entries, with their keyed drawing helper and empty CSS loader. React remains external. Project-local scratch modules avoid changing Vitest's filesystem policy. Before bodies, whole-parent bindings, compiled modules, metadata, raw process output, raw Vitest JSON and full committed tapes are retained before classification. Ordinary fleet discovery works without an explicit artifact variable and retains its own isolated temporary receipt root.

Baseline acceptance requires exactly nine completed tests: the three named owned Boolean assertion failures and six passes. Every failure must say `first post-action frame lost the committed terminal coordinates` and be false versus true. Missing imports, exceptions, timeouts, unhandled errors, pending tests, extra failures and file errors refuse qualification.

## Proposed minimal application seam, not authored

Use the existing committed `current` ref as the initial frame when `scene !== travel.to`, deriving a local travel value during render. Preserve the existing passive effect that persists travel. The proposed two-line replacement is:

```tsx
  const travelForFrame = scene !== travel.to ? { from: current.current, to: scene, at: clock } : travel;
  const base = reduced ? scene : between(travelForFrame.from, travelForFrame.to, smooth((clock - travelForFrame.at) / .3));
```

No new ref, timer, schema, writer, action, score calculation or contract field is needed. This proposal can be authored only after the remote unchanged-source baseline qualifies. The fixed source control restores the complete original base line in a disposable copy, asserts that the whole module equals the parent, and requires exactly the same three named faults with all six preservation cases passing.

## Remote gate scope and limits

The new workflow is baseline phase. It binds parent application, old tests/harnesses, packages and installed locked versions; runs the actual application type gate, new strict nine-case baseline, original motion and own-goal models, and ten selected effective existing controls. Those controls cover pause, reduced motion, withdrawal, cast changes, same-commit action start, presentation RNG, restart sides and intentional own-goal deflection.

Fixed-only gates are authored but unexecuted: normal nine plus copied old-render control, ordinary discovery, complete ordinary unit suite, complete application build with the two named route snapshots, all fifteen rebuilt-site readers, original save-size guards, and unchanged route download ceilings of 604 KB for Club Manager and 830 KB for Soccer Career. The exact generated `scripts/data/lastmod.json` ledger is retained separately and excluded from source hash holds; generated output is not adopted into the patch.

No source fix, green fixed outcome, browser paint, selected UI journey, full manual play, integration on newer main, backend activity, production verification, merge or publish credit is claimed. Runtime is GitHub Actions only. Main integration and release remain H owned.
