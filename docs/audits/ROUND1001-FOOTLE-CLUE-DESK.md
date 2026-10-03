# Round1001: Footle clue desk

2026-10-03. Design contract, not accepted or live.

Help a player read every clue on a phone and learn from a finished five-puzzle
run. The current shared board is880px wide; Footle should have a compact view
without requiring sideways panning. Keep the shared board intact for other games.

The loop remains search, guess, compare and revise. A selected guess presents
eight labeled clue cards with its actual value, exact/close/incorrect/unknown
state and higher/lower text. History buttons let players revisit prior guesses.
These are existing revealed clues, never extra hints derived from the answer.
Use existing value formatting and unknown semantics. A fresh guess selects its
own clues, with finite reveal motion and a static reduced-motion presentation.

A completed practice run offers five compact puzzle selectors. Each review
reconstructs that puzzle's actual guesses using its saved frozen pool and the
existing comparator. Solved and missed rounds remain distinct. Future puzzles
must not be revealed while playing. Reviewing never changes run bytes, Daily
records, streaks, score or completion counts. No save-schema change is needed.

All modes retain their scoring, eight guesses and existing target selection.
Explain clue/history controls and completed-run review in reopenable help with
a hypothetical worked example. Keep44px controls, stable focus, a visible return
to search, readable phone cards and results revealed without driver scrolling.
Do not add real sports facts, external images, prizes or paid mechanics.

Own Footle.tsx and new adjacent presentation files plus focused tests/remote
workflow. Leave useGame, GameBoard, comparison engine and run model unchanged.
Verify actual eight-clue rendering, correct historical selection, missing values,
frozen review after reload/pool changes and quiet unchanged saved results. Source
controls must cause a named outcome failure while an independent original mode
still passes. Retain all995 model/mounted/control/native gates and built readers.
Inspect320/390/1440 images, light/dark, keyboard/touch and reduced motion.

Keep the product PR isolated until the accepted publication batch has a live
receipt. No local runtime gates or production DB calls. Next free1003 is shared
with the simultaneous1002 reservation.
