# Round 1222 notes: the draft you earn, the shared lift

PRESENTER, FOR ROUND 1220: the presenter first shipped in `538d90e6` (three new files). THE FIX PASS MOVED AND
CHANGED IT, so Round 1220 takes the three files again from the head of `origin/r1222-gm-draft-order` and imports
`@/components/lottery/LotteryReveal`. What changed for a mount is the section "The fix pass" just below.

Written by the builder of Round 1222, desktop Claude lane, 2026-10-10. Kept current after every pushed step.
The fix pass after the two adversarial reviews was written the same day by the round's fixer.

## The fix pass (after review): what a later round must know

1. THE PRESENTER MOVED. `src/components/motion/` is the Season Centre's fenced motion kit:
   `scripts/simSeasonCentreMotion.mjs` lets a file there import `react` and `src/lib/motion` only, and it went red
   on this round (3 of 17 checks) and on Round 1220, which carries the same files. The presenter and its test now
   live in `src/components/lottery/`. ROUND 1220: delete `src/components/motion/LotteryReveal.tsx` and its test,
   take the two files in `src/components/lottery/` and `src/lib/lotteryReveal.ts` from this branch, and change the
   import in `DraftNightSequence.tsx` to `@/components/lottery/LotteryReveal`.
2. THE PACE NUMBER CHANGED MEANING. `lotteryRevealPace(n).totalMs` used to be the moment the closing line STARTS.
   It is now the END of the run on screen (the last tile has turned, 0.32 s, and the closing line is in, 0.3 s),
   and the step is cut so that end still fits 3,750 ms. The old number lives on as `closingMs`. Fourteen tiles:
   step 0.23 s, closing line at 3,420 ms, over at 3,720 ms. Sixteen: 3,400 and 3,700. Round 1220 schedules what
   follows its lottery on `totalMs`, which is now the right number for that; nothing to change there but the files.
3. TWO OPTIONAL PROPS WERE ADDED, both defaulting to the old behaviour: `drawn` (false prints no seed and no move
   on a tile: an order nobody drew has neither) and `mineLabel` (what marks the tile flagged `mine`, default
   `yours`). No existing prop changed.
4. HIS TILE: every face is solid now (`bg-card`) and the gold is a tint inside it (`data-lottery-tint`). Before,
   the face down number showed through the gold on top of his club's name. A mount that passes `mine` is safe.
5. THE "?": the same button shows a close mark while its panel is open, only the words scroll
   (`data-lottery-help-text`) and "Back to the lottery" stays in sight under them.
6. THE WORDS ON THE GM CARD (`src/lib/gmLotteryNight.ts`): the line under the heading is `lotteryNightRule(saved,
   lottery)`, the table's line on a night drawn on the table and the night's own numbers where level clubs shared
   their chances AT THE TOP (the table's line stays whenever everything it says is still true of the night); every
   closing line is about "your club's own pick", which stays true for a pick he traded away, and the tile's mark is
   "you";
   an order nobody drew prints the reason once under the heading and how round one runs behind the "?"; no line
   is printed twice and no rule id is printed.
7. THE VALIDATOR IS STRICTER: `isSavedDraftOrder` replays the saved wins on the saved field and the result must be
   the head of round one, so an order that contradicts its own draw is refused.
8. THE NIGHT: a slot that finds the class dry now spends its club's marker, as a pass does; the host may hand in
   its own `choose`; `userDraftPick` still answers null when the engine holds no marker for HIS slot, so a board
   MUST offer `passDraftPick` or `staffDraftNight` (it is not optional).
9. `thin` STOPS A LOTTERY AND NOTHING ELSE. A fact that could not be read twice and is not a lottery need does not
   go in `facts` at all: it goes in `partial` and the engine plays the game's own choice. Section 1 of the harness
   goes red on a thin fact no lottery needs. The NFL, NHL and MLB binds will meet this.

## The lottery presenter (step 1, closed)

One presenter of a lottery reveal for every game that has one. It knows no sport, no GM and no career.

| File | What it is |
|---|---|
| `src/components/lottery/LotteryReveal.tsx` | the card: tiles in a fixed two column grid, a rule line, a "?", a continue button |
| `src/lib/lotteryReveal.ts` | the pace, the row cleaner, the move words, the rule line built from a table |
| `src/components/lottery/LotteryReveal.test.tsx` | 18 cases, jsdom and server rendered |

Proven on runner result `r1222-s1` for commit `538d90e6`: the type gate exit 0, vitest exit 0 (14 of 14),
simRevealMoments exit 0 (19 files declare a keyframe, 52 animated classes named inside a reduced motion rule, 31
callers of `revealDelay`), simNoRivalNames, simLiveScores, simNoInventedQuotes, simHarnessAnchors,
simInventedNames and simNoInventedConduct exit 0. simResultMoment exited 1 there for want of Playwright on a
request that did not ask for it (it is a browser harness and reads no file of this step): not run, not a result.

### The props (do not change without a line here)

Changed once, in the fix pass: `drawn` and `mineLabel` were ADDED, both optional. Nothing else moved.

```ts
import LotteryReveal from '@/components/lottery/LotteryReveal';
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
  drawn={true}                   // optional; false prints no "Seed n" and no move on a tile (an order nobody drew)
  mineLabel="yours"              // optional; what marks the tile flagged mine (the GM card passes "you"; it never shrinks, the seed is cut first)
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
- The pace is a rule: `lotteryRevealPace(count)` fits any field inside 3,750 ms TO THE END OF ITS LAST ANIMATION,
  three quarters of the house ceiling of 5,000 ms. `totalMs` is that end and `closingMs` is when the closing line
  starts. Fourteen tiles are over at 3,720 ms, sixteen at 3,700 ms. The tile's turn (0.32 s) and the closing
  line's arrival (0.3 s) are constants of the lib that the CSS reads through `--lr-turn` and `--lr-close`; never
  type a duration into the style block, the pace cannot see it (and never put a `${}` inside that block either:
  simRevealMoments reads its braces).
- Reduced motion ends on the final frame; every animated class is named inside the rule.
- Hooks: `data-lottery-reveal` (the box), `data-lottery-slot`, `data-lottery-mine`, `data-lottery-face`,
  `data-lottery-tint`, `data-lottery-under`, `data-lottery-mark`, `data-lottery-rule`, `data-lottery-note`, `data-lottery-headline`,
  `data-lottery-help`, `data-lottery-help-panel`, `data-lottery-help-text`, `data-lottery-help-close`,
  `data-lottery-stage`, `data-lottery-grid`, `data-lottery-continue`.
- IT MAY NOT LIVE IN `src/components/motion/` or `src/lib/motion/`: those two folders are fenced for the Season
  Centre by `scripts/simSeasonCentreMotion.mjs`. A builder who adds a file anywhere runs the fences that READ that
  folder, not only the fences that read the file.

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
| `scripts/data/gmDraftOrderSources.json` | where each of its 14 facts was read: two reads a fact or more, 31 in all, joined by key |
| `src/lib/gmDraftOrder.ts` | standings with keyed tie drawings, the lottery through the field, the saved order and its validator, slots over a pick ledger, a rival's choice |
| `src/lib/gmDraftNight.ts` | the night behind a host: the saved block and its validator, the advance, his pick, a pass, the staff's draft, the run as the draft night card draws it |
| `src/lib/gmLotteryNight.ts` | a saved order as lottery rows and words, and the rules behind the "?" |
| `src/components/front-office-shared/GmLotteryCard.tsx` | a thin binding of the two to the one presenter |
| `scripts/simGmDraftOrder.mjs`, `scripts/lib/gmDraftOrderHarness.mjs` | the harness: ten sections, 40 negative controls |
| four test files beside the modules | 63 cases (order 27, night 17, lottery night 12, card 7) |

### What it does

- `buildDraftOrder(season, rules, pickRules, key?)` returns a JSON safe `SavedDraftOrder`: round one by first
  owner, every later round by first owner, the lottery as drawn (the field with each club's chance, the wins), why
  no lottery ran when none did, and every level group a drawing put in order. It is pure and keyed: the lottery
  draws on `key|lottery`, each level group on `key|tie|<its clubs>`, and nothing else anywhere draws.
- It fails closed. A lottery is drawn only when the rule set has one, every fact it needs is present and read
  twice, the table handed in is the one the rule set was read against, and the field is the size the table is
  for. Otherwise round one is the plain order (the clubs that missed, worst record first, then the playoff clubs)
  and `plain` says `no-lottery`, `thin-rule`, `table` or `field-size`. A field of another size is NOT scaled: no
  invented odds. The NBA lottery's needs are seven facts: the four of the draw (`field`, `draws`, `table`,
  `restOfLottery`) and the three about level records (`tieDraw`, `levelOdds`, `levelFirst`), because level clubs
  are seeded by a drawing and share their chances.
- THE TABLE GUARD IS A NAME AND A SIZE, NOTHING MORE. `lotteryRefusal` compares the table's name on the pick
  rules and the size of the field. On main the NBA's and the NHL's tables are BOTH named `the 2026 draft`; only
  their sizes (14 and 16) keep them apart. Section 1 of the harness now goes red if two tables ever share both.
  This round may not edit `src/lib/gmPicks.ts`: THE NHL BIND SHOULD GIVE ITS TABLE A NAME THAT CARRIES THE LEAGUE.
- The lottery table is never typed again: it is `GmPickRules.lottery` in `src/lib/gmPicks.ts`, and the draw is
  that module's `runLottery`.
- Later rounds are ONE rule for all three cases the critic named (correction 2): every club by record, and any
  two clubs level on record in the reverse of their round one order. Level outside the field, level inside it
  (read after the lottery) and level across the playoff line all follow from that sentence, and the league's own
  release states it as one sentence too.
- `draftSlots(order, ledger, ledgerYear, rounds)` lays the order over who holds each pick now (`roundSlots`);
  `ownSlots(order, rounds)` is the same shape for a league with no ledger whose clubs all pick once a round.
- The night is one loop behind `GmDraftHost<L, P>` (`consume`, `sign`, `need`, `needWeight`, `read`, `shown`,
  `pos`, `id`, `name`, and an optional `choose` for a league whose clubs do not pick by read plus need). A slot
  is USED whatever happens: its marker is spent first, so a slot that finds the class dry costs the marker as a
  pass does. The slot list is resolved once at the open and saved in the block, so a ledger that
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
| round two is all 30 clubs by record: a lottery club does not keep its round one place there | the lottery explainer | NBC Sports, the 2026 draft as picked (an observed order) |
| two rounds, one pick a club in each | the lottery explainer | NBC Sports (60 picks over two rounds) |
| level records are split by random drawings | the 2026 tiebreak release | Eurohoops |
| level lottery clubs split combinations, the drawing's winner takes the odd one | the 2026 tiebreak release (11.5 and 11.5, 6.8 and 6.7) | Hoops Rumors 2023, NBC Sports Bay Area |
| no level lottery club drawn: the drawing's winner picks first of the group | NBC Sports Bay Area | Hoops Rumors 2023 (two independents, no league page) |
| level clubs pick in round two in the inverse of round one; for lottery clubs, after the lottery | the 2026 tiebreak release | NBC Sports Bay Area, Eurohoops |
| level across the line: the playoff club is ahead in round two | the 2026 tiebreak release (Portland 42nd, LA Clippers 43rd) | NBC Sports, the 2026 draft as picked |
| this lottery ran from the 2019 draft to the 2026 draft; a new one from 2027 | the league's release of 28 May 2026 (2027), the lottery explainer (2019) | Yahoo Sports (both halves) |

What the critic asked about level records inside the field (correction 2) IS read twice and is encoded, not left
in `partial`: the 2026 draft itself shows it (Utah was drawn 2nd and Sacramento picked 7th, both 22-60, so round
two went Sacramento 34th, Utah 35th).

Corrected in the fix pass: the line under "The league's rule" and the fact `laterRounds` used to say the lottery
does not move round two. The league's own tiebreak release says otherwise for level lottery clubs (their round
two order "cannot be determined until after the Lottery is conducted"), which the fact `levelLater` and the engine
already had right. Both sentences now say only what the reads say.

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
   `passDraftPick(...)`. ONE OF THE LAST TWO IS NOT OPTIONAL ON THE BOARD: `userDraftPick` answers null when the
   engine holds no marker for HIS slot or the class is empty, the night stays where it is, and only a pass or the
   staff moves it on. Without a button for one of them that case is a screen with no way forward (the lockout of
   correction 11 by another door). Rivals pass such a slot silently.
7. `draftRunReveal([hisStep, ...run.steps], run.onClock)` for the existing card. A GM who holds the first pick
   gets an EMPTY run: no rows, headline "You are on the clock at 1." The existing card draws nothing for no rows,
   so the board's heading tile must carry that line (correction 11).
8. `GmLotteryCard`, lazy, at the top of the draft screen: `order={block.order}`, `myClub`, `labelOf`, `rules`,
   `lottery={nbaGamePickRules().lottery}`, `seen={block.seen}`, `onContinue`. Two things the board owes it:
   - WHO HOLDS THE PICK. The card is handed a saved order and a club, never the night's slots, so it marks his
     CLUB'S OWN pick (the mark "you" on the tile, "Your club's own pick lands 3rd, up 2 places."). That is true when
     he has traded the pick away and it does not mark a lottery pick he bought. If Round C wants the card to say
     who USES each pick, it reads `block.slots` (holder against orig in round one) and hands the words in; do not
     change the card's words back to "yours" without the slots.
   - A SHORT LABEL. About 13 letters fit a tile at 390 px; full club names were cut in 9 of 14 tiles in the
     review's walk and the two Los Angeles clubs differed by two letters. Hand `labelOf` a short name.
   Also owed by the first mount: the walk (the "?" panel scrolls its words inside the card on a phone, with the
   way back always in sight), and the `headline` prop on the existing draft night card, which until then says
   "9 went off the board." under the lift's "Picks 1 to 11 are in."
9. In `scripts/simGmDraftOrder.mjs`, add the bind's importing files to `MOUNT_ALLOW`. That list is the one thing a
   bind edits in that harness (correction 10).

What the lift does NOT do, and Round B owns: the class builder, `nbaDraftNeed`, where the block is stored, the
load guard's fields, the balance fleet and its stop lines.

## What the other three rule sets need as data

Each is its own bind's first step, with fresh reads. The engine's branches they will use are proven on three
synthetic rule sets in section 4 of the harness (class order, a later round that ignores the lottery, a capped
climb, tie values, and since the fix pass level clubs flipped in a later round off the lottery, the one branch
the first pass never ran).

TWO RULES FOR EVERY BIND, both held by section 1: a fact that could not be read twice and is NOT a lottery need
is not a fact (it goes in `partial`, see the fix pass, point 9); and a lottery's `needs` name every fact its
result rests on.

- ALL THREE: a `plays` span from that game's first draft, and that year added to `GAME_FIRST_DRAFT` in the
  harness. Section 1 goes red on a rule set whose game it does not know, on purpose. `sport` is a plain string.
- NFL: `lottery: null`. `restOfFirst: 'class'`, `cls` the round a club went out, from the bracket's numbers.
  `laterRounds: 'first-before-lottery'`, which with no lottery is the same order every round. `tie` values are
  strength of schedule, lower first. To read twice first: the order of playoff clubs, the tiebreak ladder, and
  whether level clubs rotate from round to round (not on the league's page the scout read; until it is read,
  `level.later` stays `as-first` and `partial` says so). A SHAPE DECISION HIDES HERE: the saved order has ONE
  `later` list for every later round, and `level.later` is only "the reverse of round one" or "the same". If the
  read says a level group ROTATES (a three club group in another order in round two and in round three, and that
  game plays three rounds), one list cannot hold it: it is a change to `SavedDraftOrder`, its validator,
  `draftSlots` and the night's validator, or a line in `partial`. Decide it in that bind's brief.
- NHL: the lottery already on `NHL_PICK_RULES` (16 clubs, two draws, a ten place cap). `restOfFirst: 'class'`
  with the league's four groups, `laterRounds: 'first-before-lottery'`, `level.odds: 'keep'` unless a read says
  level clubs share chances. To read twice first: the four groups, rounds two to seven, the standings tiebreak,
  and what the second draw does after a first draw that was capped. A TRAP FOUND HERE: `runLottery` writes each
  win's `slot` at the moment of that draw, and a later winner landing above an earlier capped one pushes it down
  a place, so `wins[].slot` can be one too high. The lift never trusts it as a final place: lottery night reads
  final places from `first`, and the validator REPLAYS the wins in draw order, which reproduces the push (a test
  holds 200 capped nights, 63 of them with a pushed winner). The NHL bind must do the same and must read the
  league's rule for that case. Its table also needs a name of its own (see the table guard above).
- MLB: `lottery: null` until the base table has two reads and sits on `MLB_PICK_RULES` (that is gmPicks' file).
  Then 18 clubs and six draws. `restOfFirst: 'class'`, `laterRounds: 'first-before-lottery'`, `tie` is last
  season's share, which the desk must start saving. Revenue sharing and the consecutive year limits are not in
  the game: `partial`.

## The sibling the lift is shaped for (correction 6)

`src/lib/aussieRulesLeague.ts` already plays an earned draft: `draft: { order, pool, made, at }`. The lift's night
is shaped so that game is a later bind and not a third copy: a slot list where holder and first owner are one
club holds its order, the block's `made` is its `at`, the pool stays the host's, and `sport` on the saved order
is a plain string so it is not locked out. WHAT THAT BIND STILL WRITES ITSELF (the first pass said less than
this, and a reviewer caught it):
- Its slot list. That game's order is `expandOrder(draftBaseOrder(state), vacancies)`: a club picks once a pass
  only while it still has a vacancy, so clubs take different numbers of picks. `ownSlots` gives every club the
  same number and is NOT that game's order. The slot type and `isGmDraftNight` hold an uneven list as it is (a
  club with no pick in a round is absent), and a unit test plays one.
- Its rivals' rule, through the host's optional `choose`. Its clubs take the biggest need first and never a
  prospect another club still needs, which is not read plus weighted need.
- Its saved order: round one must be exactly the clubs handed to the validator, so it is built by
  `buildDraftOrder` on a rule set with no lottery, not typed. NOT DONE HERE, AND OWED: the Aussie Rules board draws the existing draft night card through
`buildDraftNight`, which numbers every run from 1 and never shows the picks made before your first turn. That is
the numbering fault `draftRunReveal` fixes. Whoever binds that game to the lift owes the fix; this round may not
touch a board.

## The harness

`node scripts/simGmDraftOrder.mjs` (about 15 seconds, 602,997 checks). Exit 0 and a last line starting
`simGmDraftOrder: green.`

Controls: `SIM_GM_DRAFT_ORDER_CONTROL=<name>`. A control that FIRED exits 1 and its last line says `CONTROL
<name> FIRED.` with the red sections; 2 means it did not fire as expected, 3 that it could not run, 4 a crash.
`SIM_GM_DRAFT_ORDER_CONTROL=all` runs every control and exits 0 only if all fired; add
`SIM_GM_DRAFT_ORDER_SHARD=k/n` to share the list between lines.

| Section | Controls (the sections each must turn red, and no other) |
|---|---|
| 1 the ledger | `onesource`, `closespan`, `thinoutside`, `twintable` |
| 2 the draw adds nothing | `flat` (2, 3, 8), `oddsrow` (2, 3, 8), `extradraw`, `seconddraw` (2, 4, 6, 10), `mathrandom` (2, 4) |
| 3 level records | `nosplit` (3, 8), `tiebyid`, `noflip` (3, 4), `flipbeforelottery` (3, 4), `acrossbyfield` |
| 4 the order | `champfirst`, `laterasfirst` (3, 4), `rowkey`, `restlevel`, `flipbranchoff`, `thinplayed`, `anytable`, `anyfield` |
| 5 slots over a ledger | `origpicks` (5, 10), `skipslot` (5, 6, 10) |
| 6 both validators | `trustall`, `trustnight`, `winsloose` |
| 7 the reveals | `capcount`, `ghostrow`, `hidemine`, `slowcards`, `shortend`, `literaltime`, `headlineswapped` |
| 8 the worked example and the line under the heading | `staleexample`, `tableline` |
| 9 nothing mounts it | `mounted` |
| 10 the night through a toy host | `norivals`, `shownread`, `drymarker` |

Thirteen of the forty came with the fix pass, one or more for each check it added. Five older ones redden a
section more than they did, each for its own reason, written beside the control in the harness.

NOT HELD BY THE HARNESS, ONLY BY THE UNIT TESTS (a reviewer's mutations showed it, and it is left so on purpose:
the release gate runs these test files): a rival's level call going to the lower id and a rival's need, a pick
out of turn being refused, the mine flag on a staff pick, and the host's own `choose`.

A NUMBER THIS HARNESS HOLDS THAT ANOTHER FILE OWNS: section 7 holds a run of picks to four fifths of the house
ceiling, 4,000 ms, and `src/lib/draftNight.ts` makes the longest run 3,780 ms. A change of about 6 percent to
`PICK_STEP_MS` there, legal under simDraftNight's own 5,000, turns this harness red. That is deliberate (a
quarter in hand was the first pass's rule) and deterministic; whoever retunes that step reruns this harness.

The three controls decision 4 names are `oddsrow` (a wrong odds row), `seconddraw` (a second draw) and `tiebyid`
(a tie broken the wrong way). The measured numbers are in the harness's header.

## What is proven, and on which runner result

THE FIRST PASS, before the reviews. For commit `e6b0fe07` (its last commit that changes code), runner result `r1222-h3`: the type gate exit 0; vitest
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
clean. Nothing is mounted, so no PAGE of the site has shown the card; the first mount owes the walk of its page.
The card itself HAS been seen in a browser since the fix pass: a small page bundled on a runner mounts the real
`GmLotteryCard` on real orders beside the site's built CSS, and a Chromium walk at 390 and 1280 measures it and
takes screenshots (the review's walk, reused by the fixer). That walk is not in the repo; the first mount's walk
replaces it.

## Not done, by scope

Everything in Rounds B, C and D: the class builder and its curve, need, the NBA host in the engine, the board's
three branches, the walks, the price by slot, What's New, the guide sentence the bind will owe the other lane.
