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
