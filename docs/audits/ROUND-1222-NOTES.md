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

## The lift (steps 3 to 7, closed): Round A of the critic's split

New files only. Nothing under `src` imports them but their own tests, and `scripts/simGmDraftOrder.mjs` section 9
holds that with an allowlist.

| File | What it is |
|---|---|
| `src/data/gmDraftOrder/rules.ts` | the rule set type and the NBA set (the league's lottery from its 2019 draft to its 2026 draft) |
| `scripts/data/gmDraftOrderSources.json` | where each of its 14 facts was read: two reads a fact, 30 in all, joined by key |
| `src/lib/gmDraftOrder.ts` | standings with keyed tie drawings, the lottery through the field, the saved order and its validator, slots over a pick ledger, a rival's choice |
| `src/lib/gmDraftNight.ts` | the night behind a host: the saved block and its validator, the advance, his pick, a pass, the staff's draft, the run as the draft night card draws it |
| `src/lib/gmLotteryNight.ts` | a saved order as lottery rows and words, and the rules behind the "?" |
| `src/components/front-office-shared/GmLotteryCard.tsx` | a thin binding of the two to the one presenter |
| `scripts/simGmDraftOrder.mjs`, `scripts/lib/gmDraftOrderHarness.mjs` | the harness: ten sections, 27 negative controls |
| four test files beside the modules | 54 cases (order 23, night 15, lottery night 9, card 7) |

### What it does

- `buildDraftOrder(season, rules, pickRules, key?)` returns a JSON safe `SavedDraftOrder`: round one by first
  owner, every later round by first owner, the lottery as drawn (the field with each club's chance, the wins), why
  no lottery ran when none did, and every level group a drawing put in order. It is pure and keyed: the lottery
  draws on `key|lottery`, each level group on `key|tie|<its clubs>`, and nothing else anywhere draws.
- It fails closed. A lottery is drawn only when the rule set has one, every fact it needs is present and read
  twice, the table handed in is the one the rule set was read against, and the field is the size the table is
  for. Otherwise round one is plain reverse standings and `plain` says `no-lottery`, `thin-rule`, `table` or
  `field-size`. A field of another size is NOT scaled: no invented odds.
- The lottery table is never typed again: it is `GmPickRules.lottery` in `src/lib/gmPicks.ts`, and the draw is
  that module's `runLottery`.
- Later rounds are ONE rule for all three cases the critic named (correction 2): every club by record, and any
  two clubs level on record in the reverse of their round one order. Level outside the field, level inside it
  (read after the lottery) and level across the playoff line all follow from that sentence, and the league's own
  release states it as one sentence too.
- `draftSlots(order, ledger, ledgerYear, rounds)` lays the order over who holds each pick now (`roundSlots`);
  `ownSlots(order, rounds)` is the same shape for a league with no ledger.
- The night is one loop behind `GmDraftHost<L, P>` (`consume`, `sign`, `need`, `needWeight`, `read`, `shown`,
  `pos`, `id`, `name`). The slot list is resolved once at the open and saved in the block, so a ledger that
  resets mid draft cannot move the clock (correction 16). No function of the night takes or makes a random number.
- `draftRunReveal(steps, next)` returns a `DraftNight` with TRUE pick numbers for the existing card, a headline
  that counts every pick made, and always keeps his own pick as a row (correction 15).

### The NBA rule set: what was read, 2026-10-10

Every fact below has two reads on two publishers that are not each other, neither a wiki. The addresses and the
words read are in `scripts/data/gmDraftOrderSources.json`. Each page was opened by the builder through a fetch tool
that answers with quoted sentences.

| Fact | The league's page | The second publisher |
|---|---|---|
| the 14 clubs that miss the playoffs are in the lottery | the league's lottery explainer | Sports Illustrated |
| drawings decide the first four picks | the same | Sports Illustrated |
| 1,000 combinations: 140, 140, 140, 125, 105, 90, 75, 60, 45, 30, 20, 15, 10, 5 | the same | Sports Illustrated (the base table in full) |
| lottery clubs not drawn pick 5th to 14th by record | the same | Sports Illustrated |
| all 14 lottery clubs ahead of the 16 playoff clubs in round one | the league's 2026 tiebreak release (its order) | Hoops Rumors, 2018 |
| picks 15 to 30 by regular season record | the lottery explainer | NBC Sports, the 2026 draft as picked (an observed order) |
| round two is all 30 clubs by record, untouched by the lottery | the lottery explainer | NBC Sports, the 2026 draft as picked (an observed order) |
| two rounds, one pick a club in each | the lottery explainer | NBC Sports (60 picks over two rounds) |
| level records are split by random drawings | the 2026 tiebreak release | Eurohoops |
| level lottery clubs split combinations, the drawing's winner takes the odd one | the 2026 tiebreak release (11.5 and 11.5, 6.8 and 6.7) | Hoops Rumors 2023, NBC Sports Bay Area |
| no level lottery club drawn: the drawing's winner picks first of the group | NBC Sports Bay Area | Hoops Rumors 2023 (two independents, no league page) |
| level clubs pick in round two in the inverse of round one; for lottery clubs, after the lottery | the 2026 tiebreak release | NBC Sports Bay Area, Eurohoops |
| level across the line: the playoff club is ahead in round two | the 2026 tiebreak release (Portland 42nd, LA Clippers 43rd) | NBC Sports, the 2026 draft as picked |
| this lottery ran from the 2019 draft to the 2026 draft; a new one from 2027 | the league's release of 28 May 2026 | Yahoo Sports |

What the critic asked about level records inside the field (correction 2) IS read twice and is encoded, not left
in `partial`: the 2026 draft itself shows it (Utah was drawn 2nd and Sacramento picked 7th, both 22-60, so round
two went Sacramento 34th, Utah 35th).

Not read, and said so in the rule set's `gameSays` or `partial`: how the league shares leftover combinations among
three or more level lottery clubs (the game hands them out one each in the order of the drawing); everything
about the 2027 lottery beyond its dates and its 16 clubs.

Two sources the builder chose NOT to cite: a fantasy basketball brand's news page (a rival product name has no
place in a file the rival name fence scans) and any page on a feed host that simLiveScores bans from `src`.

### The two spans (correction 1)

`real: { from: 2019, to: 2026 }` is the league's own drafts, a sourced fact shown in the "?". `plays: { from: 2027,
to: null }` is the drafts this GAME runs it for. `draftRulesFor` selects on `plays`. The "?" says in the game's
own block that the league changed its lottery from 2027 and this game did not.

## What Round B (the NBA night in the engine) needs from the lift, exactly

1. `draftRulesFor('nba', league.season + 1)`: defined for 2027 to 2060 and beyond.
2. A `DraftSeason`: one row a club `{ id, wins, losses, made }`, `made` read from the saved series' NUMBERS (a
   series somebody won with four wins), never from a name. No `cls` and no `tie` for the NBA. Return null unless
   exactly 16 clubs made it; then nothing is guessed and the old draft runs. (A field that is not 14 clubs is
   refused by the lift anyway, with `plain: 'field-size'`.)
3. `buildDraftOrder(season, rules, nbaGamePickRules())`. The pick rules handed in must still carry the table
   named `the 2026 draft`, or the lift refuses with `plain: 'table'`.
4. `draftSlots(order, nbaPicksOf(desk, league), league.season, 2)` ONCE, then `openDraftNight(order, slots,
   league.season)`, saved as the desk block. Validate with `isGmDraftNight(block, teamIds, league.season)`.
5. One host object, `GmDraftHost<NbaLeague, NbaProspect>`: `consume` spends the club's marker of `slot.round`;
   `sign` is the engine's own signing; `need` is the new `nbaDraftNeed`; `needWeight` is the game's own small
   number; `read(p, club)` is what a RIVAL chooses on (the engine's grade); `shown(p)` is HIS scout's read, the
   only number a card prints; `pos`, `id`, `name`.
6. `advanceDraftNight(host, league, night, me, cls)` after the lottery card's button (`markLotterySeen`),
   `userDraftPick(...)` on his tap, `staffDraftNight(...)` for the board's "draft without me" press, and
   `passDraftPick(...)` if the lead wants the Pass button the critic advised (23a).
7. `draftRunReveal([hisStep, ...run.steps], run.onClock)` for the existing card. A GM who holds the first pick
   gets an EMPTY run: no rows, headline "You are on the clock at 1." The existing card draws nothing for no rows,
   so the board's heading tile must carry that line (correction 11).
8. `GmLotteryCard`, lazy, at the top of the draft screen: `order={block.order}`, `myClub`, `labelOf`, `rules`,
   `lottery={nbaGamePickRules().lottery}`, `seen={block.seen}`, `onContinue`.
9. In `scripts/simGmDraftOrder.mjs`, add the bind's importing files to `MOUNT_ALLOW`. That list is the one thing a
   bind edits in that harness (correction 10).

What the lift does NOT do, and Round B owns: the class builder, `nbaDraftNeed`, where the block is stored, the
load guard's fields, the balance fleet and its stop lines.

## What the other three rule sets need as data

Each is its own bind's first step, with fresh reads. The engine's branches they will use are already proven on
two synthetic rule sets in section 4 of the harness (class order, a later round that ignores the lottery, a
capped climb, tie values).

- ALL THREE: a `plays` span from that game's first draft, and that year added to `GAME_FIRST_DRAFT` in the
  harness. Section 1 goes red on a rule set whose game it does not know, on purpose. `sport` is a plain string.
- NFL: `lottery: null`. `restOfFirst: 'class'`, `cls` the round a club went out, from the bracket's numbers.
  `laterRounds: 'first-before-lottery'`, which with no lottery is the same order every round. `tie` values are
  strength of schedule, lower first. To read twice first: the order of playoff clubs, the tiebreak ladder, and
  whether level clubs rotate from round to round (not on the league's page the scout read; until it is read,
  `level.later` stays `as-first` and `partial` says so).
- NHL: the lottery already on `NHL_PICK_RULES` (16 clubs, two draws, a ten place cap). `restOfFirst: 'class'`
  with the league's four groups, `laterRounds: 'first-before-lottery'`, `level.odds: 'keep'` unless a read says
  level clubs share chances. To read twice first: the four groups, rounds two to seven, the standings tiebreak,
  and what the second draw does after a first draw that was capped. A TRAP FOUND HERE: `runLottery` writes each
  win's `slot` at the moment of that draw, and a later winner landing above an earlier capped one pushes it down
  a place, so `wins[].slot` can be one too high. The lift never trusts it: lottery night and the validator read
  final places from `first`. The NHL bind must do the same and must read the league's rule for that case.
- MLB: `lottery: null` until the base table has two reads and sits on `MLB_PICK_RULES` (that is gmPicks' file).
  Then 18 clubs and six draws. `restOfFirst: 'class'`, `laterRounds: 'first-before-lottery'`, `tie` is last
  season's share, which the desk must start saving. Revenue sharing and the consecutive year limits are not in
  the game: `partial`.

## The sibling the lift is shaped for (correction 6)

`src/lib/aussieRulesLeague.ts` already plays an earned draft: `draft: { order, pool, made, at }`. The lift's night
is shaped so that game is a later bind and not a third copy: `ownSlots(order, rounds)` is its `order`, the block's
`made` is its `at`, the pool stays the host's. `sport` on the saved order is a plain string so it is not locked
out. NOT DONE HERE, AND OWED: the Aussie Rules board draws the existing draft night card through
`buildDraftNight`, which numbers every run from 1 and never shows the picks made before your first turn. That is
the numbering fault `draftRunReveal` fixes. Whoever binds that game to the lift owes the fix; this round may not
touch a board.

## The harness

`node scripts/simGmDraftOrder.mjs` (14 seconds). Exit 0 and a last line starting `simGmDraftOrder: green.`

Controls: `SIM_GM_DRAFT_ORDER_CONTROL=<name>`. A control that FIRED exits 1 and its last line says `CONTROL
<name> FIRED.` with the red sections; 2 means it did not fire as expected, 3 that it could not run, 4 a crash.
`SIM_GM_DRAFT_ORDER_CONTROL=all` runs every control and exits 0 only if all fired; add
`SIM_GM_DRAFT_ORDER_SHARD=k/n` to share the list between lines.

| Section | Controls (the sections each must turn red, and no other) |
|---|---|
| 1 the ledger | `onesource`, `closespan` |
| 2 the draw adds nothing | `flat` (2, 3), `oddsrow` (2, 3), `extradraw`, `seconddraw` (2, 4), `mathrandom` (2, 4) |
| 3 level records | `nosplit`, `tiebyid`, `noflip`, `flipbeforelottery`, `acrossbyfield` |
| 4 the order | `champfirst`, `laterasfirst` (3, 4), `rowkey` |
| 5 slots over a ledger | `origpicks` (5, 10), `skipslot` (5, 6, 10) |
| 6 both validators | `trustall`, `trustnight` |
| 7 the reveals | `capcount`, `ghostrow`, `hidemine`, `slowcards` |
| 8 the worked example | `staleexample` |
| 9 nothing mounts it | `mounted` |
| 10 the night through a toy host | `norivals`, `shownread` |

The three controls decision 4 names are `oddsrow` (a wrong odds row), `seconddraw` (a second draw) and `tiebyid`
(a tie broken the wrong way). The measured numbers are in the harness's header.

## What is proven, and on which runner result

For commit `e6b0fe07` (the last commit that changes code), runner result `r1222-h3`: the type gate exit 0; vitest
exit 0, 94 of 94 in six files (presenter 14, order 23, night 15, lottery night 9, card 7, gmPicks' own 26);
simGmDraftOrder exit 0 (512,050 checks); the 27 controls in three shards, each shard exit 0 ("all 9 fired, each
in exactly its own sections"); simGmPicks, simRevealMoments, simNoRivalNames, simLiveScores, simHarnessAnchors,
simNoInventedQuotes, simNoInventedConduct and simInventedNames exit 0; and `git diff --name-status` against the
base lists 16 files, every one added.

For commit `bdebb085`, runner results `r1222-f1` and `r1222-f2`: the 24 rule fences of the gate. 21 exit 0.
simSchemaNames and simLeaderboardCaps need the live database, which a runner cannot reach, and simWritesAreSent
could not drive Guess the Nation on a runner with the database blocked: none of the three is a result, and no
file of this round is in any page.

A RED ON MAIN, NOT THIS ROUND'S: simDraftNight section 5 fails for the NBA board ("NBA does not hand the captured
rivals to buildDraftNight"). The same harness on the base commit `09df145a`, in the same runner request
(`r1222-h1`, line `base-simDraftNight`), prints the same two failures. This branch edits no board.

What a later session must not trust: nothing was left half done. Every commit is on origin and the worktree is
clean. Nothing is mounted, so nothing here has been seen in a browser; the first mount owes the walk.

## Not done, by scope

Everything in Rounds B, C and D: the class builder and its curve, need, the NBA host in the engine, the board's
three branches, the walks, the price by slot, What's New, the guide sentence the bind will owe the other lane.
