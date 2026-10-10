# Round 1218: Club Manager, VAR made true (the switch has NOT moved)

Written 2026-10-10 by the builder of the round, desktop Claude lane. Branch `r1218-cm-var-true`, base
`origin/release-at-gate` at 46e4231c.

VAR in Club Manager still ships dark. `CM_VAR_LIVE` in `src/lib/clubManagerVarLive.ts` is false and this round
did not touch that line. What changed is everything the switch stands on: where the rates come from, and which
matches may be reviewed at all. The last two steps of the brief (the review screen cases and the switch itself)
are not done. Section 6 lists them.

## 1. The rule in one paragraph

A review rate is no longer typed anywhere. `scripts/genCmVarRates.mjs` derives the rates from two ledgers of
published figures and one measurement of the engine, and writes `src/data/clubManagerVarRates.ts`, which
`src/lib/clubManagerVar.ts` reads. A match is reviewed only when the caller asks, the world is modern (the rule
that was there), AND the competition's row in the coverage ledger says yes for that stage.

## 2. The rates ledger, `scripts/data/cmVarRates.json`

Five readings from three publishers, read on 2026-10-10. A quantity is used only when two publishers count it,
and the engine takes the LOWEST per match reading (the stricter one: fewer results moved).

| Quantity, a match | Readings | Used | Target | Range |
|---|---|---|---|---|
| goals ruled out after a review | 55, 50, 47 in 380 (Premier League 2022-23 to 2024-25, one journalist's tally); 29 in 380 (Serie A 2017-18, a former referee's count) | yes | 0.0763 | 0.0763 to 0.1447 |
| penalties awarded after a review | 26, 28, 25 in 380 (same tally); 35 in 380 (Serie A 2017-18); 40 in 306 (Bundesliga 2025-26, a data outlet's count) | yes | 0.0658 | 0.0658 to 0.1307 |
| penalties cancelled after a review | 12, 12, 11 in 380; 18 in 380 | recorded, not modelled | | 0.0289 to 0.0474 |
| goals awarded after a review | 33, 34, 35 in 380; 14 in 380; 10 in 306 | recorded, not modelled | | |
| red cards after a review | one publisher | THIN | | |
| reviews after which the call stood | one publisher (4, 2, 2 a season), not split by kind of call | THIN | | |
| why a goal is ruled out | one publisher | THIN | | |
| review penalties that were scored | one publisher (18 of 26, 26 of 28, 21 of 25) | THIN | | |

Four things follow from the THIN rows, and each is a decision of this round:

1. **The game shows no review that ends with the call standing.** The only count of those is one publisher's and
   it does not say whether the call was a goal or a penalty. So `overturn` is 1 and `penaltyReview` is 0: a
   review card means a goal was ruled out or a penalty was given. "VAR: goal confirmed" and "VAR: penalty
   confirmed" still exist in the code and are proven on fixture rates, but the shipped rates never reach them.
2. **The card names no reason.** A ruled out goal reads "VAR: goal ruled out".
3. **The kick is the engine's own penalty.** The generator reads `SHOOTOUT_BASE_RATE` (0.76) and
   `SHOOTOUT_SAVE_SHARE` (0.65) off `src/lib/clubManager.ts`.
4. **The goals target is a 2017-18 figure.** It is the lowest of the readings and the brief says to take the
   stricter one. The three recent Premier League seasons pool to 0.1333 a match. Changing the rule to "the lowest
   reading from 2022-23 on" would need a second recent publisher for goals, which was not found.

What was looked for and not used is in the ledger's `notUsed` list.

## 3. The engine measurement, `scripts/data/cmVarEngine.json`

`scripts/measureCmVarEngine.mjs` on a GitHub runner (result `r1218-b1`, head b6d1cf80): 200 careers, 6,780
league matches. The engine draws 2.3895 goals a match that a review can look at, and awards 18.252 penalties a
match per unit of missed foul rate (495 awards at a probe rate of 0.004 a foul). So:

- goalReview = 0.076316 / 2.3895 = **0.031938** a reviewable goal (was 0.16 with a 0.32 overturn);
- missedFoulReview = 0.065789 / 18.252 = **0.003605** a foul (was 0.015).

The figures file was adopted from the runner's own output file (`--adopt`), not typed.

## 4. The coverage ledger, `scripts/data/cmVarCompetitions.json`

All 48 competitions a modern save can play are named exactly once (27 leagues, 20 domestic cups, the Champions
League). Five say yes on two sources each: Premier League, La Liga, Serie A, Bundesliga, Champions League (every
stage). Three carry one source and are unknown: the Championship (the source says no), Ligue 1 and the 2.
Bundesliga (each source says yes). Forty were not read in this round (20 leagues, every domestic cup) and are
unknown. Unknown plays without reviews.

A row turns on with data alone: add the second source, run `node scripts/genCmVarRates.mjs`, commit both files.

## 5. What holds it, all on GitHub runners

`scripts/simCmVarLedger.mjs` (pure data, 316 checks): every reading opens on an https page that is not a wiki and
prints its figure, every modelled quantity stands on two publishers and two seasons from 2022-23 on, the
competitions file names exactly the engine's own leagues and cups, a yes stands on two publishers on two hosts,
each receipt carries its ledger's hash, the generated rates file is what the generator writes, and the engine
figures are measured. Eight controls, each fires for its own reason and exits 1.

`scripts/simCmVar.mjs` now has eleven outcomes. The nine of Round 1181 are the mechanics and run on FIXTURE
rates (the old constants, handed to the engine in place of the generated module), because the real rates are too
small to find every kind of review in a bounded search. Two are new:

- **bands**: a fleet of 20 clubs, five from each league that says yes, one season a seed, six seeds, about 4,000
  league matches, on the generated rates. Each outcome a match must sit inside real football's range, wider by a
  headroom of 0.20 that was measured (five fleets on five disjoint seed sets, result `r1218-b2`):

  | | fleet 1 | 2 | 3 | 4 | 5 | target |
  |---|---|---|---|---|---|---|
  | goals ruled out a match | 0.0710 | 0.0782 | 0.0780 | 0.0753 | 0.0819 | 0.0763 |
  | penalties awarded a match | 0.0643 | 0.0687 | 0.0745 | 0.0725 | 0.0703 | 0.0658 |
  | goals a match, reviews on minus off, same match | -0.0188 | -0.0228 | -0.0261 | -0.0177 | -0.0245 | within 0.05 |

  Also held: no review that confirms is shown, the kick is the engine's penalty law, at least 3,000 league
  matches and five seeds. Five controls put each old constant back and each is caught for its own reason: goal
  review 0.16 gives 0.3975 goals ruled out a match, overturn 0.32 gives 0.0177, penalty review 0.45 shows 622
  confirmed penalty reviews, missed foul 0.015 gives 0.2648 penalties a match, penalty scored 0.74 is not the
  engine's law. (In this harness a control that is caught exits 0 and prints `CAUGHT by "..."`. That is the
  other lane's convention for the file and it was kept.)
- **coverage**: Wolves, Ajax, Lyon and Celtic (leagues with no yes) play 48 league matches that are the same
  match, and leave the random stream in the same place, whether reviews are asked for or not. Their Champions
  League nights carry the opt in. Arsenal's league and Champions League kickoffs carry it and its FA Cup tie does
  not. A cup that says yes from the quarter finals is covered from there on (a staged coverage handed to the
  engine). Control `everywhere` lets reviews into every competition and is caught at Wolves' first match.

What does not move, each against origin/release-at-gate (result `r1218-c1`, head 7549bc74):
- a caller that does not ask for reviews plays the byte equal match: the integrator's probe gives digest
  `93805ba678e3b838641265b7bc453cf0bba5dd35b9d5b6de1bb92237c30fd488` on this tree and on 46e4231c, the digest
  Release AT's own proof printed;
- showing a review or skipping it is the same match: 345 of 345 whole reports, table rows, draw counts and next
  three draws equal (arm A of the same probe);
- with reviews on, on the new rates and coverage, the same 345 matches: 23 had a review (14 goals ruled out, 9
  penalties awarded), the score differs in 18 and the result in 9, goals 891 without and 885 with. On the old
  rates it was 190 matches with a review, 83 penalties awarded, goals 891 to 920;
- `scripts/simDailyDeals.mjs` is green, and so are the old save harnesses that were run.

`src/test/clubManagerSave.test.tsx`: its two live match cases play a seeded first half with no review in it, the
same match on every run. Ten runs with reviews off and ten with the switch on for that file (`CM_SAVE_VAR=on`):
0 of 10 red each (result `r1218-d1`).

## 6. Not done. Do these before `CM_VAR_LIVE` reads true.

1. **The review screen cases of fix-AT.md section 7**, each with a test that fails first: a review in the last
   minute of a half, two in one minute, leaving the site mid review and coming back, Skip to the whistle during a
   review, a review in the minute of the other side's substitution. None was played by this round. On the new
   rates a review is rare (about one league match in seven has one), so each needs a seeded or built match.
2. **`scripts/playCmVar.mjs` on a lit build** at 390 and 1280, with the screenshots looked at. The walk was
   written for the old rates: it looks for a goal that is confirmed and a penalty that is confirmed, which the
   shipped rates never produce, and for the label "ruled out, offside", which is now "VAR: goal ruled out". It
   has to be rewritten around the three outcomes that exist (goal ruled out, penalty awarded and scored, penalty
   awarded and missed) before it can say anything.
3. **The switch and its unit file**: `CM_VAR_LIVE = true`, the cases of `src/test/clubManagerVarLive.test.tsx`
   turned to assert the lit rule with the dark control kept, the What's New entry reworded (the old text is in
   fix-AT.md section 2.1; three of its sentences are no longer true: a goal "confirmed", "ruled out for offside,
   an attacking foul or handball", and "a penalty that was given can get a second look").
4. **A mid review test for the save file.** The seeded cases skip a first half with a review in it on purpose.
5. **Review rows in the report timeline** were cut off at 390 and 1280 (fix-AT.md section 7 item 5). The labels
   are shorter now. Nobody has looked.

## 7. For the lead

- `scripts/simManagerAppealIsolation.mjs` pins the hash of `src/lib/clubManager.ts`
  (`scripts/fixtures/managerAppealIsolation1081/manifest.json`, `unchangedSource`). This round changes five
  lines of that file, so the pin is red on this branch by construction. Rounds 1216 and 1225 touch the same
  file. One re-record after the three are merged.
- The hunks in shared files. `src/lib/clubManager.ts`: the import line of `@/lib/clubManagerVar` (one name
  added) and the `varReviews` line of `kickOff` (now four lines). `LiveSimScreen.tsx`: three strings inside
  `LiveMatchHelp`, nothing else.
- Guide sentences owed to the other lane: none while the switch is off. When it moves, the Club Manager guide
  in `src/data/gameContent` should say that reviews exist, in which competitions, and that they are rare.
- The coverage is thin on purpose. Ligue 1 needs one more source that speaks of 2026-27 to turn on, and so does
  the 2. Bundesliga. The Championship's one source says no. Every cup needs two sources AND the round its
  coverage starts.

## 8. The review fix (2026-10-10, after two adversarial reviews). The switch has still NOT moved.

Sections 1 to 7 are the builder's and are left as he wrote them. Where this section disagrees, this section is
the current one. The reviews are `review-run-1218.md` and `review-read-1218.md` in the lead's handoff folder.

**The rates ledger now does what the lead's decision 1 says.** A FIGURE is one quantity in one competition in
one season, and it is used only when two publishers on two hosts each counted it. Before, a quantity was used
when two publishers counted it anywhere, so both shipped rates stood on one url. AGI's own count of Serie A
2017-18 (31 goals ruled out, 34 penalties given, 19 taken back, 117 changed decisions, 26 May 2018) joined
Tiziano Pieri's (29, 35, 18, 115). The stricter count of each is used: goals ruled out 29 in 380 (unchanged,
`goalReview` 0.031938), penalties 34 in 380 where it was one publisher's 25 in 380 (`missedFoulReview` 0.003605
to 0.004902). So the game now gives a penalty after a review about once in 11 matches, not once in 15. The
ESPN and LigaInsider rows are still on file, THIN, and are read by nothing.

**What is still owed, and it holds the switch.** The lead asked for two RECENT seasons on two publishers each.
Three readers looked (the builder in five leagues, the read reviewer for the Premier League split, the fixer
for the Bundesliga, Serie A, the Premier League and La Liga) and every recent count is one publisher's own or
one newspaper's count repeated by others. That is written in the ledger under `owed` (`recent-seasons`,
state open), and `scripts/simCmVarLedger.mjs` fails if `CM_VAR_LIVE` reads true while an owed entry is open
(control `owedlive`). The lead closes it with a second count for two seasons from 2022-23 on, or by writing a
ruling into the entry (`"state": "accepted"`, `"ruling": "who, when, in what words"`), then
`node scripts/genCmVarRates.mjs`.

**The review screen** (`LiveSimScreen.tsx`, the block headed "when a review opens"):
- A review used to open 0.05 before its minute whatever the pitch was doing. Played on the real rates that put
  a card reading "goal ruled out" on top of a real goal of the minute before that was still in the air and
  then counted. Now no review opens while another action is playing.
- A goal a review rules out is drawn first: the pitch plays it as a goal (the plan stages it as a shot, so the
  defending side restarts and nobody kicks off), the card opens with the ball in the net, the score never
  moves, and the action stops when the card closes. A goal ruled out in the last two clock places of a period
  is NOT drawn (there is no room to play it before the whistle): its card opens on its own.
- A penalty a review gives opens at its own minute, after the foul is told, and its kick is played after the
  card. One at the whistle's own place opens before the last kick's wind up, so the kick is played whole.
- The card names the man, his club and the minute and says what the call means. Under reduced motion the wait
  is 0.3 s and the decision stays up 1.2 s, as long as with motion.
- The feed line and the report row name the man and his club, and a review row of the report wraps.

**What holds it.** `src/test/clubManagerVarScreen.test.tsx`: twelve cases on real halves of the engine on the
shipped rates. Six of them fail on the screen as it was (runner `r1218-fx-d0`): the ruled out goal not drawn,
the card over the goal of the minute before (twice), the card a minute early, the save told the wrong minute
on leaving, the decision up 0.8 s under reduced motion. `scripts/playCmVar.mjs` is rewritten on fixtures the
real rates hold and asserts every case: 21 cases and two help views at 390 and 1280 on a lit build.
`scripts/simCmVar.mjs`: the historic era clause is held again (control `historic`), a review dealt from the
match stream is caught (outcome `stream`, controls `streamgoal` and `streamfoul`), and the coverage outcome
reads what a kickoff should carry off the ledger itself, so a row that turns to yes needs no hand in the
harness. The Eredivisie row was the proof: it turned to yes with its two sources and nothing else changed.

**The help** states the 2026/27 protocol: red cards, and since 1 July 2026 a red that came from a clearly wrong
second yellow (the laws' own page and FIFA's release of the IFAB meeting of 28 February 2026), a modern save
only, and which season the counts are from.

**Still not done.**
- Coverage: 39 competitions unread (19 leagues, every domestic cup), three one source short.
- A review in the same minute as the other side's substitution, an own goal beside a review, a review in
  extra time, two reviews in the same minute: no such half was found in 7,500 searched, so no test plays them.
  By the code a review waits for whatever action is playing and a change off the clock waits for the action,
  which is the rule Release AR already holds for goals.
- Penalties a match with reviews on is about 0.45 to 0.48 and held by no band (no Club Manager harness holds
  one). Penalties cancelled, goals awarded and red cards after a review are on file and not modelled.
- `scripts/playCmRealFixtures.mjs` plays its oracle without reviews and needs the opt in when the switch moves.
- The What's New entry. It is written when the switch moves, and must say: goals and penalties only, in which
  competitions, a modern save from its next kickoff, rare, and that it changes results.

## 9. The closing fix (2026-10-10, after the closing check). The switch has still NOT moved.

**The rates.** A fourth reader looked for a second publisher's own count of a season from 2022-23 on (Premier
League, La Liga, Serie A, Bundesliga, Ligue 1) and found none. What the pages give is one more count by one
publisher, now a row of `scripts/data/cmVarRates.json`: the French league's own review of Ligue 1 2023-24
(`lfp-ligue1-2023-24`, https://ligue1.com/fr/articles/l1_article_35- , 19 June 2024): 23 goals ruled out and
23 penalties given thanks to the video assistant in 306 matches, 0.075 a match each. One publisher, so the row
is on file and read by nothing: no rate moved. It changes what the owed entry can honestly say. The used
figure for goals (29 in 380, Serie A 2017-18, 0.076 a match) is where that recent official count sits, and it
is below the three Premier League seasons one outlet counted (0.124 to 0.145). For penalties the used figure
(0.089) is above the French count and inside the range of the recent counts (0.066 to 0.131).
The owed entry `recent-seasons` is still open, so the switch is still held. Closing it is the lead's ruling.

**The coverage.** Thirteen of the 48 competitions say yes, each on two publishers on two hosts that speak of
2026-27, every line read on its page on 2026-10-10: the six of the review fix, and Ligue 1, the Primeira
Liga, the Scottish Premiership, the Super Lig, the Belgian Pro League, the Swiss Super League and the
2. Bundesliga. The Danish Superliga is on file with one source and stays unknown, as does the Championship
(one source, which says no). Thirteen leagues and all twenty domestic cups are unread. A cup needs a source
that speaks of 2026-27 and names the round its reviews start at, and the FA Cup pages a search gives in
October 2026 speak of 2025-26, so the cups were not filed.

**What it took.** Data alone: the two ledgers, the generator, and one comment in `scripts/simCmVar.mjs`. The
fleet the bands are measured on is a fixed list of clubs, so its numbers did not move (seeds 31 to 36: goals
ruled out 0.0704 a match, penalties given 0.0873).

## 10. The switch commit is written and proven, and it waits on a separate branch

The round's branch (`r1218-cm-var-true`) still ships dark. The last step of the round is on its own branch,
`r1218-cm-var-switch`, one commit on top of the round's branch: `CM_VAR_LIVE = true`, the What's New entry, and
the unit file `src/test/clubManagerVarLive.test.tsx` turned to hold the lit rule (four cases; its control is now
`CM_VAR_LIVE_CONTROL=off`, the dark build of Release AT, and it must go red).

**Why it is not on the round's branch.** `scripts/simCmVarLedger.mjs` is red on that commit, on purpose: the
owed entry `recent-seasons` of `scripts/data/cmVarRates.json` is open. A fifth read on 2026-10-10 (La Liga
2022-23, Serie A 2023-24, the Bundesliga 2025-26) found no second count either; what it opened is in the
ledger's `notUsed` list. So the entry closes one way only, the lead's ruling written into it.

**To switch VAR on** (the lead, by hand):
1. In `scripts/data/cmVarRates.json`, entry `owed[0]`: set `"state": "accepted"` and add `"ruling"` (who, when,
   in what words). Run `node scripts/genCmVarRates.mjs` (it rewrites the generated rates file without its OWED
   line and stamps the receipt) and commit the three files.
2. Merge `r1218-cm-var-switch`.
3. Gates: `node scripts/simCmVarLedger.mjs` exits 0, `node scripts/genCmVarRates.mjs --check` exits 0, the unit
   file is green and its control red, `scripts/playCmVar.mjs` is green on the plain build.

**What follows the switch.** Two browser proofs compare the page's Quick Sim with an engine run of their own:
`scripts/playCmQuickSubs.mjs` and `scripts/playCmRealFixtures.mjs`. Both now ask the engine what the hook asks
(they read the switch from the source the build was made from, the way `scripts/playCmVar.mjs` does), so they
hold with the switch off and with it on. `.github/workflows/career-next-batch.yml` runs `scripts/playCmVar.mjs`,
which exits 2 on a dark build and runs for real once the switch is on.

**Proven on runners with a stand-in ruling** (applied on the runner only, never committed): the ledger harness
and the generator check exit 0, the three ledger controls fire, the type gate is clean, the unit file is green
and its control fails three cases, every test file that drives the hook, the help or the live screen is green,
and the walk is green on the plain build at 390 and 1280 (21 cases, two help views). The runner names and the
numbers are in the closing report of the fix.
