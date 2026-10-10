# Round 1222 notes: the draft you earn, the shared lift

PRESENTER COMMIT, FOR ROUND 1220 TO MERGE: `538d90e6` on `origin/r1222-gm-draft-order`
(the one lottery presenter, three new files, nothing else in the commit).

Written by the builder of Round 1222, desktop Claude lane, 2026-10-10. Kept current after every pushed step.

## The lottery presenter (step 1, closed)

One presenter of a lottery reveal for every game that has one. It knows no sport, no GM and no career.

| File | What it is |
|---|---|
| `src/components/motion/LotteryReveal.tsx` | the card: tiles in a fixed two column grid, a rule line, a "?", a continue button |
| `src/lib/lotteryReveal.ts` | the pace, the row cleaner, the move words, the rule line built from a table |
| `src/components/motion/LotteryReveal.test.tsx` | 14 cases, jsdom and server rendered |

Proven on runner result `r1222-s1` for commit `538d90e6`: the type gate exit 0, vitest exit 0 (14 of 14),
simRevealMoments exit 0 (19 files declare a keyframe, 52 animated classes named inside a reduced motion rule, 31
callers of `revealDelay`), simNoRivalNames, simLiveScores, simNoInventedQuotes, simHarnessAnchors,
simInventedNames and simNoInventedConduct exit 0. simResultMoment exited 1 there for want of Playwright on a
request that did not ask for it (it is a browser harness and reads no file of this step): not run, not a result.

### The props (do not change without a line here)

```ts
import LotteryReveal from '@/components/motion/LotteryReveal';
import { lotteryFactsFromWeights, lotteryRuleLine, type LotteryRevealRow } from '@/lib/lotteryReveal';

interface LotteryRevealRow { slot: number; label: string; seed: number; moved: number; mine?: boolean }

<LotteryReveal
  rows={rows}            // in the order the tiles TURN (last slot first is a lottery's own drama); the grid sorts by slot
  ruleLine={line}        // lotteryRuleLine(lotteryFactsFromWeights(table, picksDrawn)): built from the table, never typed
  eyebrow="Lottery night"        // optional, the small label
  headline="..."                 // optional, arrives with the last tile (so it may say where his club landed)
  note="..."                     // optional, one plain line that is there from the first frame
  help={[{ heading, lines }]}    // optional, the rules behind the "?"; no help, no "?"
  onContinue={fn}                // optional; no handler, no button
  continueLabel="Continue to the draft"
  reveal={true}                  // false draws the last frame at once (no draw, or a night already watched)
/>
```

`lotteryFactsFromWeights(weights, drawn)` takes one weight a club, worst record first, in whatever unit the table
uses (percent for `GmLotteryRules.odds`, combinations for `PreDraftLottery.combos`), so both tables print the
same sentence: "14 clubs are in the lottery and the top 4 picks are drawn. The 3 worst records share the best
chance at the first pick, 14% each."

### What it promises

- The box never changes size: every tile is in the DOM from the first frame, face down, and the "?" opens its
  panel over the grid inside the card's own box. A mount with `help` gives the stage a floor of 11rem so the
  panel has room; a mount without help has no floor.
- No timers. A tile turns on a CSS delay from the celebration kit's `revealDelay`.
- It does not hold the player: the button is live from the first frame; pressed early every tile lands at once
  (`data-lottery-settled`) and `onContinue` runs.
- The pace is a rule: `lotteryRevealPace(count)` fits any field inside 3,750 ms, three quarters of the house
  ceiling of 5,000 ms. Fourteen tiles take 3,700 ms, sixteen take 3,720 ms, four take 2,000 ms.
- Reduced motion ends on the final frame; every animated class is named inside the rule.
- Hooks: `data-lottery-reveal` (the box), `data-lottery-slot`, `data-lottery-mine`, `data-lottery-face`,
  `data-lottery-rule`, `data-lottery-note`, `data-lottery-headline`, `data-lottery-help`,
  `data-lottery-help-panel`, `data-lottery-help-close`, `data-lottery-stage`, `data-lottery-grid`,
  `data-lottery-continue`.

### Owed by whoever mounts it

- A browser walk of the mounted card (box and scroll position equal at the first frame, mid reveal and the last
  frame; no two tiles overlap; every button at least 44 px tall). Nothing mounts it in this round.
- `scripts/sweepWeight.mjs` on the route that loads it.
