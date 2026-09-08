# Round 518: ticker handoff visibility

Base: `5c5f84e7`. Scope: the TopTicker frontend and regression checks only.

## Plan

1. Reproduce score visibility gaps with all nine existing sports and a long
   synthetic slate. Assert actual score-card intersection, not just mounted
   nodes or increasing scrollLeft.
2. Measure the active group's own start and final card, then crawl only that
   interval at the existing speed. Remove animated/capped width before measuring.
3. Keep a visible end hold before handoff or one-sport restart. Preserve reading
   time across pauses and keep focus, pointer and explicit pause independent.
4. Keep all reduced-motion content manually reachable and handle resizing. No
   new sport selector: existing sport labels continue to navigate to their hubs.
5. Prove old behavior fails the new tests, then run exact types/build, relevant
   ticker checks, all fifteen generated-site fences and visual/browser checks at
   320, 390, 430 and 1440 pixels. Leave broader gate limitations explicit.

No sports facts, upstream refresh promises, database writes, provider changes,
new paid service, merge or publication are part of this round.
