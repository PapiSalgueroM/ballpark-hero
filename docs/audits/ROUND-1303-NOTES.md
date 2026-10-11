# Round 1303: Club Manager, VAR for goals. What was built, what was measured, and how the switch came on (section 6)

Read `docs/audits/ROUND-1218-NOTES.md` and `docs/audits/ROUND-1302-NOTES.md` first: this round stands on both.

## 1. The standard a simulation rate stands on (the lead's decision 1)

A review rate is a parameter of the match engine. No screen prints it as a statistic of a real league, and the Help
never names a real season. So the rule of the rates ledger (`scripts/data/cmVarRates.json`) changed:

- A READING is one publisher's own count of a quantity over one full season of a top division under video review.
- A rate is USED when at least two independent publishers, on two hosts, each hold a reading AND every reading on
  file agrees within a factor of two. No reading is left out to make the rest agree.
- The rate is derived from the LOWEST reading, so a review moves fewer results, never more.
- One publisher is THIN and refused, however many seasons it counted.
- The receipt says in plain words that the publishers count different leagues and seasons (the generator writes
  that block from the rows).

No new page was read. On the rows Rounds 1218 and 1302 filed:

| quantity | readings | lowest (derived from) | highest | spread | rate |
|---|---|---|---|---|---|
| goals ruled out | 6 by 4 publishers | 23 in 306 (Ligue 1 2023-24, the league's own review) | 55 in 380 | 1.926 | `goalReview` 0.031456 a goal (was 0.031938) |
| penalties awarded | 7 by 5 publishers | 25 in 380 (Premier League 2024-25, one outlet's tally) | 40 in 306 | 1.987 | `missedFoulReview` 0.003605 a foul (was 0.004902) |

The season total of penalties is a band and not a rate: it keeps Round 1218's rule (one competition in one season
that two publishers each counted). The owed entry `recent-seasons` is `accepted` and carries the lead's ruling in
his words.

## 2. The kind of review is data (the lead's decision 2)

- The ledger has a `kinds` block (`goal`, `penalty`), each with `on`, the quantity its rate is, and why. Each open
  owed entry names the kinds it holds (`holds`); one that names none holds every kind.
- The generator writes `CM_VAR_KINDS` into `src/data/clubManagerVarRates.ts`: the kinds that are on, whose rate
  meets the standard, and that no open entry holds. It also writes `CM_VAR_ACCEPTED` (the entries a ruling closed).
- The hook asks kickOff through `cmVarGameAsk(CM_VAR_LIVE)` (`src/lib/clubManagerVar.ts`): the list, or nothing
  while the switch is off or the list is empty. It never asks with `true`, which stages every kind the engine can
  play and is how tests and harnesses ask.
- kickOff saves the list with the match (`live.varKinds`) and the engine plays a kind only in a match kicked off
  with it, in both halves and in extra time. A match with `varReviews` and no list plays every kind (a staged
  match; no save in the wild holds one).
- The How to Play block and the match's own help say what the kinds the game plays do.

## 3. Why no kind is played: the goal kind alone is outside the goals band

Decision 6 asks that goals a match stays inside the band the balance harnesses hold, with reviews on. That band is
0.05 goals a match on the same match played both ways (`tolGpm` in `scripts/simCmStoppageTime.mjs`, `realism.gpg`
in `scripts/simSeasonCentreAgreement.mjs`, `BANDS.goalGap` in `scripts/simCmVar.mjs`). A goal a review rules out is
a goal fewer, and with the penalty kind off nothing gives one back.

Measured on a runner (result `r1303-gap`, head 05b3a5e5): ten fleets of 3,917 to 4,060 league matches, the goal
kind alone, each match beside the same match without reviews.

- goals ruled out a match: 0.0713 0.0770 0.0794 0.0720 0.0779 0.0838 0.0704 0.0781 0.0700 0.0662 (mean 0.0746,
  standard deviation 0.0054; the target is 0.0752; the band's low edge 0.0601 lies 2.7 of those under the mean)
- goals a match moved by: -0.0671 -0.0750 -0.0789 -0.0740 -0.0740 -0.0876 -0.0739 -0.0751 -0.0700 -0.0660
  (mean -0.0743). EVERY fleet is outside 0.05, the nearest by a third.
- about one league match in 14 has a goal ruled out; 2.6 to 3.6 percent of matches end with another result.

With both kinds staged the pair sits inside the band (-0.0189 on the bands fleet) because a review's penalties put
about 0.05 back, which is why nobody had met this. So the ledger holds the goal kind in an open owed entry,
`goals-level`, and `penalties-total` still holds the penalty kind. `CM_VAR_KINDS` is empty and `CM_VAR_LIVE` is
false. Three ways close `goals-level` (the entry lists them): the lead rules that he takes the gap; the penalty
kind is lit with it; or the engine changes (for one: the goals a review rules out are drawn on top of the match's
own goals, so a review never takes away a goal that counted).

To light the goal kind after a ruling: set `goals-level` to `accepted` with the ruling (who, when, in what words),
set `kinds.goal.on` to true, run `node scripts/genCmVarRates.mjs`, set `CM_VAR_LIVE` to true, flip the cases of
`src/test/clubManagerVarLive.test.tsx` to the lit rule, add the What's New entry, and walk the plain build
(`CI=1 node scripts/playCmVar.mjs`). Until then `node scripts/qa/cmVarLit.mjs on goal` stages exactly that game
in a scratch checkout.

## 4. What holds it

- `scripts/simCmVarLedger.mjs`: section 2 (the standard, recomputed from the rows alone), 2d (the kinds: a kind
  that is on while an entry holds it or while its rate does not meet the standard is refused; the generated list
  and the line on disk are the kinds the ledger plays; the switch is on only with a kind to play), 6 (nothing
  under `src` outside `src/test` hands the engine `varReviews: true`; the hook asks through `cmVarGameAsk` at
  exactly its two kickoffs; kickOff saves the list). Controls added: `disagree`, `receiptsilent`, `kindon`,
  `kindline`, `gametrue`; `thin` now leaves three seasons of one outlet; `owedlive` is the switch on with no kind
  played.
- `scripts/simCmVar.mjs`: a `kinds` outcome on the fixture rates (60 first halves and their second halves: the
  saved list, each kind alone, an empty list is no ask, a half time save plays its second half on the saved list)
  with controls `kindgoal`, `kindpenalty`, `kindsaved`; the bands outcome plays a second fleet with the goal kind
  alone and is red when the ledger and the measured engine disagree (controls `goalslevel`, `playsgoal`).
- `src/test/clubManagerVarLive.test.tsx`: `CM_VAR_LIVE_CONTROL=on` stages the goal kind with the switch and must
  go red; `CM_VAR_LIVE_CONTROL=switch` turns the switch on alone and must stay green while the list is empty.
- `scripts/playCmVar.mjs` asks the engine with the list the build was handed and walks the penalty cases only on
  a build that plays that kind.

## 5. Open

- **`goals-level`** (section 3): the lead's ruling, the penalty kind, or the engine.
- **Penalties by review**: `penalties-total` is open (the engine is above the band of all penalties a match with
  reviews on), and the five cases marked `fails` in `src/test/clubManagerVarScreen.test.tsx` all concern a penalty
  a review gives at a crowded end of a half (seeds 10321, 2287 and 6428 of league match 2). None concerns a goal
  ruled out, so none was mended in this round and all five stay marked.
- **The lower penalty rate moved two halves of the screen test.** A review's id holds the fixture, the minute and
  the man, so a fixture reviews only a handful of incidents, and on 0.003605 a foul the first four matches of the
  test's career hold no saved penalty by review at all (120,000 first halves, runner result `r1303-scan`). The
  saved case stands on the tenth entry now (seed 1832) and the fourth crowded row on the eleventh (seed 2022, the
  one half of that shape in 200,000, runner result `r1303-scan2`).
- **Finding 6 of Round 1302's fix report (live today, VAR off): NOT FIXED in this round.** A real goal that is the
  last kick of a period is told by its pill and its line and gets no scorer card, and of two goals in the last two
  clock places only one is drawn. It is Round 1101's own rule in `src/components/club-manager/LiveSimScreen.tsx`
  (the comment above the goal sequence: "A goal fired late keeps the pill, and so does the last kick of a period")
  together with the plan playing nothing in the place before a last kick (`src/components/pitch-motion`). The cure
  is the twin of Round 1302's stoppage for a real goal: hold the whistle while the last kick's goal has its
  sequence, and play a goal in the place before a last kick with the clock stopped. That is a change to the live
  match screen every player uses, held by `scripts/simLiveSimMotion.mjs` (55 tests, 12 controls) and five browser
  walks; it wants a round of its own. Its test is written first and is in the repo: three cases marked `fails` at
  the foot of `src/test/clubManagerVarScreen.test.tsx`, on halves nobody asks a review in (league match 1 of that
  file's career). Measured on a runner (`r1303-lk`): seed 1742, my goal by the last kick at 45+4, no scorer card in
  any frame; seed 1860, theirs at 45+3, none; seed 1773, goals at 45+2 and 45+3, one goal drawn of the two. Each
  case is green while the defect is there and goes red the day it is mended, and then it becomes a plain case.
- The two orderings Round 1302 chose knowingly (seed 1987, seed 42322) and its minors are as it left them.

## 6. The fix pass (after the two adversarial reviews): the switch is ON for goals

Sections 3 and 5 above are the round as the builder left it, kept as the record. Two reviews called both open items
major, and a fix pass closed them. What changed, in the order it was pushed:

- **`goals-level` is closed in the engine, the third of the three ways its own entry named.** The engine's goals are
  calibrated on goals that COUNTED, and real football's counted goals are already net of reviews, so taking 2.8
  percent out again counted the review twice (both reviewers said so). A match that reviews goals now draws them
  `1 / (1 - goalReview x overturn)` times as often (`cmVarGoalLift` in `src/lib/clubManagerVar.ts`, one factor on the
  two Poisson means in `drawSegment`). A goal a review can look at is ruled out at `goalReview` = 0.030501 a DRAWN
  goal (0.075163 over the 2.3891 reviewable goals a match the engine counts, then `x / (1 + x)`); a penalty or a
  direct free kick, which no review looks at, is taken back at the same rate with no review. A match that does not
  review goals is not touched: the factor is exactly 1 and the default path is byte equal. The entry is out of the
  ledger, the goal kind is on, `CM_VAR_KINDS` is `['goal']`.
  Measured on ten fleets of about 4,000 league matches (`r1303-fx-c`): goals a match moved by -0.0118 to 0.0106,
  mean 0.0007, against the band of 0.05; goals ruled out 0.0699 to 0.0808 a match, mean 0.0751 (target 0.0752);
  penalties a match level. The run review's own fleet, which shares no code with the harness, agrees
  (`r1303-fx-d`: 2.7142 with against 2.7152 without over 4,297 matches). Controls `nolift`, `liftkind`, `liftpens`.
  One thing to know: a lit match is not "the dark match with a goal taken out". The lift changes the first draw of
  the half, so the match of a seed with reviews is another match from its first goal on; 5.9 to 7.0 percent of
  league matches end with another result than the same seed without reviews. Nobody can see the other match, and
  the totals are level.
- **Finding 6 is mended on the live match screen** (`goalStop` in `LiveSimScreen.tsx`): a real goal has a stoppage
  of its own where the pitch had no room for it. The last kick of a period that is a goal gets its scorer card with
  the whistle waiting; a goal in the clock place before a last kick is played whole, clock stopped, before that
  kick is wound up. Skip and a tap on the card end it. The three cases marked `fails` are plain cases, with a
  reduced motion case and a Skip case beside them, and one of Round 1302's five open penalty rows closed on the way
  (seed 2287: the kick of a penalty a review gives in the place before a last kick is played now). Four cases still
  pass by failing, all four about a penalty a review gives at a crowded end (seeds 10321 and 6428). Runner
  `r1303-fx-e`: the screen file, `liveSimMotion` (93), `simLiveSimMotion` with its twelve controls, eight screen
  harnesses.
- **The lit rule is a standing case** (`src/test/clubManagerVarLive.test.tsx`): a live kickoff, a Quick Sim and the
  fast forward through the real hook play the goal kind alone. Modes `dark` and `lit` run either rule on any build;
  controls `on`, `switch`, `off`, `allkinds` must go red. The mutation every gate let through (the fast forward
  handing the engine a boolean) is caught by it (`r1303-fx-h`), and so is the match help telling of a penalty by
  review, by three cases on the real screen.
- **The Help never states a real league's rate** is held at source level, by shape and by default
  (`scripts/simCmVarLedger.mjs` section 7, control `helprate`), and the four copies of the list of kinds are tied
  (section 6b).
- **Two halves of the screen test moved with the lift** (hints 1894 to 2099 and 3046 to 8058 on league match 3) and
  **the Round 1081 manifest pin followed the engine file** again; each in its own commit with its proof.
- **The switch.** `CM_VAR_LIVE` is true, one What's New entry (goals only, the listed competitions, from the next
  kickoff), and the walk runs on the plain build. To take VAR out again, make that one line false.

Still open after the fix pass:

- **Penalties by review** stay off: `penalties-total` is open, and the four cases marked `fails`.
- **The generator refuses both rates if the penalty readings stop agreeing** (they agree by 0.65 percent). Not
  changed: teaching the generator, the ledger harness and simCmVar a "no penalty rate" state is a design choice for
  the round that turns penalties on.
- **Two paths kick off without asking**: the previous manager's weeks before a mid season takeover (`playRunIn`)
  and `simToDate` (no caller). Nobody watches those matches and, with the lift, asking or not asking leaves the same
  goal totals; left as they are.
- **For the other lane and the lead**: the guide in `src/data/gameContent` for Club Manager says nothing about VAR
  yet (theirs to write: goals only, the listed competitions, from the next kickoff, rare, both ways).
  `.github/workflows/career-next-batch.yml` runs `scripts/playCmVar.mjs` on its own build with the offline
  transport: that walk refused a dark build with exit 2, and it runs on the plain build now, so that step has a
  real walk to pass from this round on; nothing in the file has to change. The saved page of `/club-manager` and of `/whats-new`, the
  sitemap dates and the page weight budgets are the lead's at release.
