# Round 1216 notes: an own goal is drawn as one in Club Manager's live match

Written 2026-10-10 by the desktop Claude lane (session G), builder of Round 1216.
Branch `r1216-own-goal-motion`, base origin/release-at-gate 46e4231c (Release AT as it went to its gate).

READ THE LAST SECTION FIRST ("The review fix pass"). Two adversarial reviews found that a keeper's own goal had no
rule that made the ball turn and that a keeper was never drawn holding his head. Both are fixed, and several
numbers written below by the builder are superseded there: the count of tests (16, not 15) and of controls (20,
not 14), the turn's least (it was read off one lucky fleet), the walk bounds, and the recorded OWN digest.

## Why

A player's report the owner forwarded on 2026-10-09: in a Club Manager live match an own goal still played like any
other goal. Round 1146 made the words right (the card, the pill, the list and the report print the man who put it
in with (O.G), under the club that got the goal). The picture was left: the feed line carries `og`, the shared pitch
never read it, looked the name up on the scoring side, found nobody, and drew that side's most advanced man shooting
and celebrating. So the card said (O.G) over a defender's name while the grass showed a striker scoring.

## What changed

1. `src/components/pitch-motion/contract.ts`: two optional fields on `PitchEvent`, `og` and `ogBy`. The contract
   number stays 1 (optional fields only, as the freeze allows).
2. `src/components/pitch-motion/motion.tsx`: one entry line at the top of `actionFrame`, a new `ownGoalFrame`, an
   exported `ownGoalFigure`, a `rue` pose on the figure and `ownGoalBy` on the frame. Nothing under the entry line
   was edited, so every chance that is not an own goal draws what it drew.
3. `src/components/pitch-motion/PitchSurface.tsx`: `data-pm-own-goal` on the surface, only on the frames of an own
   goal (the man's key, or an empty string when he is not on the grass). `index.ts` exports `ownGoalFigure`.
4. `src/components/club-manager/LiveSimScreen.tsx`: ONE HUNK, one line, the (O.G) bullet of `LiveMatchHelp` gains
   "On the pitch the ball goes in off him and he holds his head." No binding code: the engine's feed line already
   carries `og` with exactly this meaning and is handed to the part as it is.
5. `src/test/pitchOwnGoal.test.tsx` (new, 15 tests), `scripts/simOwnGoalMotion.mjs` (new, 14 controls),
   section 9 of `scripts/playLiveMatchFit.mjs` with its control, one What's New entry, this file.

No engine, no rule, no save: `git diff 46e4231c -- src/lib src/hooks src/components/pitch-motion/scene.ts` is empty.

## The picture, and why it is this one

`ownGoalFrame` IS the goal the same line draws without `og` (it calls `actionFrame` on that line, with the text
taken off so the man who delivers it is the man the plan led in and never one found by name), with three things
changed. That is why the instants cannot drift: the phase, the action, the net, the net pulse and the holder are
the plain goal's own, sample for sample.

- THE BALL COMES TO THE MAN, not the man to the ball. The draft had the man walk to a point on the delivery's
  line. Measured on the dense fleet before any number was chosen (result r1216-measure): 139 own goals by a back,
  walk median 13.7 and 90th percentile 30.7 of the pitch, 12 of them standing on a team mate two samples running,
  and 45 with the man shown by his number alone at the touch. With the ball brought to where he stands the walk is
  median 0.1 and 90th percentile 6.3, nobody is stood on, and nobody loses his name.
- Where he meets it: his own place, kept 13 to 18 from his own goal line (the keeper never comes further out than
  10) and no wider than 26 from the middle, then moved 5 off the straight line from the foot to the corner when he
  is nearer that line than 5, so the turn can always be seen.
- The corner is the one on HIS side of the goal and his keeper dives the other way (the plain goal's own keeper,
  told which flank), so the second leg never crosses the keeper.
- When the man IS the keeper the ball goes to where his dive has him at the touch and off his gloves into the
  other corner, which is the plain goal's own end point.
- From the touch to the net the ball passes nobody: anyone but the keepers within 3.6 of that leg steps off it
  while the man comes to meet the ball. 3.6 is also R2's box on the diagonal, so it clears the place where he meets
  it of his own team mates. A man who has to come a long way (the cast can put a back in a forward's slot) is kept
  off his team mates by the part's own `passing`.
- Once it is in he holds his head (`rue`), nobody hops, and the man who delivered it and his two nearest raise
  their arms where they stand: nobody walks to anybody, so nobody reads as the scorer.
- A line that names a man who is not on the grass moves nobody: the ball turns in front of that goal on its own
  and `ownGoalBy` is null. No fallback to "the nearest back" (the critic's advice 16): both binders always say who.
- A goal from the spot or a direct free kick is never drawn as an own goal, whatever the line says.
- A figure is drawn upright and has no face, so "facing his own net" cannot be drawn without turning figures, which
  the contract leaves to a binder that asks. He is goal side of the ball, the ball goes in behind him, his hands go
  to his head.

## Numbers measured (GitHub runners)

The dense fleet: 100 matches, 200 half feeds, 163 own goals staged (118 goals left as they were), 79 for me and 84
against me, 139 by a back and 24 by the keeper. The named man is on the viewer's cast in all 163 (not on it: 0), no
action starts outside its goal's own minute and none is a last kick.

| Rule | Own goal arm | Baseline arm (og off) |
|---|---|---|
| OG1 at the touch the figure nearest the ball is the named man, within 1 | 163 of 163 (gap at most 0.1) | 0 of 163 |
| OG2 samples whose phase, action, net, pulse or holder differ | 0 of 7,009 | the reference |
| OG3 own goals with a hop on a net frame | 0 | 163 of 163 |
| OG4 pairs of one side overlapping two samples running | 0 | not read |
| OG5 the sharpest turn of the ball, degrees | least 34.1, median 63.6, most 130.2 | least 1.3, most 3.3 |
| OG9 ball within 2 of another figure from the touch to the net | 0 of 163 (13 before the step off rule) | not read |

The floor for the turn is 20, between 3.3 and 34.1. How far the man goes: median 0.1, 90th percentile 6.3, most
29.2; from his own third (159 of 163) most 10.0; 4 stand further up when it starts. Shown by his number alone at
the touch: 0 of 163, so the viewer's label rule needed no change (the critic's question 6).

The viewer's fixtures: an own goal for me in match 3 of the search (7', card "GOAL! Nobel Mendy 7' (O.G)" under
"Aston Villa") and one against me in match 17 (10', a keeper's, under "Ipswich Town"). The held cast twin: found on
attempt 274, and the case where the man who put it in is the one who leaves on attempt 325, of a cap of 4,000.

The part alone: 21,074 bytes minified and 8,886 gzipped, from 19,526 and 8,179 on the base, under its ceiling of
23,133 and 9,693. BUNDLE_MEASURED was not touched.

Recorded once: OWN_DIGEST 669ef935 and RUE_DIGEST c9817b1a (in `src/test/pitchOwnGoal.test.tsx`). The three
digests of `src/test/liveSimCelebration.test.tsx` were not edited and that file is byte equal to the base's.

## The harness and its controls

`scripts/simOwnGoalMotion.mjs` runs the test file. `OWN_GOAL_CONTROL=<name>` rewrites a disposable copy of one source
file (the anchor is asserted to be there exactly once first), and must turn exactly its own test red on an assertion
while the material test stays green: exit 1 when it does, as it must, 3 when it does anything else.

| Control | What it changes in the copy | The test it turns red |
|---|---|---|
| plain | og is ignored (the picture before this round) | OG1 |
| side | the man is looked up on the side that got the goal | OG1 |
| crowded | nobody steps off the line from the touch to the corner | OG9 |
| late | the instants are read a tenth of the action late | OG2 |
| cheer | the hop is left on the man who delivered it | OG3 |
| through | nobody steps aside when the man's walk passes through a team mate | OG4 |
| straight | the ball meets the man on the straight line to the corner | OG5 |
| absent | a named man who is not there falls back to the first outfield man | OG6 |
| reducedog | the hook follows the clock under reduced motion | OG7 |
| setpiece | og is honoured on a penalty and on a free kick | OG8 |
| touchmoved | the touch comes at half of the flight | OWN, the recorded frames |
| ruemoved | the hands stop short of the head | RUE, the recorded figure |
| viewerplain | the same change as plain, read in the live match | both live match tests |
| castnow | the viewer no longer holds the cast while a chance plays (a copy of LiveSimScreen.tsx) | the held cast twin |

OG4 and OG9 each carry a scene made by hand beside the fleet, so `through` and `crowded` do not rest on what the
fleet happens to hold: the squads will be re-baked by a later round and the fleet will move with them.

The comparison with the base was done ONCE, as a request line of this round, and is not a harness (a harness that
reads another commit dies on a shallow clone and goes red the first time a later round changes how an ordinary goal
is drawn). Result r1216-plain: over the 200 real half feeds (own goals at the engine's real one in 32) every chance
that is not an own goal, 2,144 chances and 47,168 frames with 6 own goals set aside, digests to 93301059 on this
round's `motion.tsx` and on the base's, and to 8f04cad2 with one number of the base's moved (the flight's share .48
made .5), so the comparison can see a change.

## Section 9 of the walk

`scripts/playLiveMatchFit.mjs` section 9 runs at the end of the default walk, and alone with `LIVE_FIT_OWN=1`. Its
two saves (an own goal for me, one against me) are found in node by the engine on the walk's seed plus nine, the way
`scripts/playCmQuickSubs.mjs` bundles the engine, and are started through the walk's own `LIVE_FIT_SAVE` path. The
man is told by who he is (one of mine by `data-cm-dot`, his id; one of theirs by `data-cm-dot-opp`, the number on his
back), never by a label a crowd can hide. The ball and the dots are read in pitch percent off the page's own styles
through the orientation, on flight frames only. `LIVE_FIT_OWN=1 LIVE_FIT_CONTROL=ogbefore` is for a BUILD with the
entry line taken out: the card must read (O.G) in all four watches and section 9 must go red on the last touch and
on the turn. Section 8 is the replay mode since Round 1215, so the brief's "section 8" is section 9 here.

## What a later session must not trust, and what is owed

- STEP C IS NOT DONE: the Season Centre's little pitch (`src/components/season-centre/MiniPitch.tsx`) still plays an
  own goal as a goal for the side that got it and says "Own goal" underneath. The contract's two fields have one
  binder until then, which costs nothing. The design is ready: a pure `ownGoalKey(goal, role, onFrom, onTo)` (null
  when `goal.own` is absent; own 'you' is his figure, 'k' when he keeps goal and 'd0' otherwise; own 'teammate' is a
  back that is not him, 'd1' when the ring is on 'd0' and 'd0' otherwise; own 'opponent' is 'd0'), and `goalEvent`
  hands the part `og: true` and `ogBy`. The help sentence in `src/components/soccer-career/SoccerSeasonCentre.tsx`
  (its HELP list, "The pitch still plays it as a goal for the side that got it and says Own goal underneath...")
  becomes false in the same commit and must change with it. The other lane's PR216 has a hunk right there, so the
  step waits for PR216. The sentence to use: "The pitch shows it going in off one of the side that conceded and says
  Own goal underneath, and when it was yours the ring is on you at the back."
- docs/WORKBOARD.md says the little pitch "draws an own goal as one". It labels it. The record is the lead's to fix.
- THE VAR SEAM (the brief's 3.8 item 4) is untouched: a goal that is reviewed, confirmed and then tagged as an own
  goal has its review line under the drawn scorer's name and its goal line under the own goal man's. VAR is switched
  off on this base by one constant, and Round 1218 owns it. The viewer tests of this round skip a goal with a review
  line near it, so they are written to neither behaviour.
- `castnow` in `scripts/simOwnGoalMotion.mjs` anchors on the viewer's `castFrom` line, the same line
  `scripts/simLiveSimMotion.mjs` anchors on. A round that edits that line (Round 1218 works beside this one in
  LiveSimScreen.tsx) must carry both anchors. NOTHING GOES RED BY ITSELF WHEN IT DOES NOT (corrected in the review
  fix pass: an earlier version of this note said `simHarnessAnchors` would say so, and it will not. That fence
  checks that every harness parses and that every MULTI line anchor is read with line endings normalised; a
  single line anchor that no longer matches is seen only when its control is run, which then ends with
  "ABORTED" and exit 3). So after any merge that touches LiveSimScreen.tsx, run both controls and read their
  last lines: `OWN_GOAL_CONTROL=castnow node scripts/simOwnGoalMotion.mjs` and
  `LIVE_MOTION_CONTROL=castnow node scripts/simLiveSimMotion.mjs`, exit 1 each with "as it must".
- No guide sentence in `src/data/gameContent` became false. The Club Manager guide's own goal sentence
  (clubManagement.ts) says nothing about the pitch.
- `scripts/simOwnGoalMotion.mjs` is a new `sim*.mjs`, so `runAllSims` discovers it. The release gate's list of rule
  fences may want it and section 9's `LIVE_FIT_OWN=1` beside the two older live match harnesses.

## The proof, on GitHub runners

Result names are branches `rc-results/<name>` on origin; a log is `git show origin/rc-results/<name>:logs/<label>.log`.

| What | Result (head) | Exit | What it printed |
|---|---|---|---|
| The base before any edit: type gate, simLiveSimMotion, simLiveSimCelebration, simHarnessAnchors | r1216-base (46e4231c) | 0, 0, 0, 0 | 55 and 17 tests, the part 19,526 and 8,179 bytes, R6 chances staged 2,150, the AR half found on attempt 71 |
| The measuring pass on the dense fleet, before the numbers were chosen | r1216-measure (46e4231c) | 0 | the walk table above |
| Type gate | r1216-c3 (14644f5d) | 0 | |
| simOwnGoalMotion, clean | r1216-c3 | 0 | 15 tests passed |
| Its 14 controls | r1216-c3, og-<name> | 1 each | each "turned ... red on an assertion ... and the material stayed green, as it must" |
| simLiveSimMotion, clean (real own goals are in its 200 half feeds now) | r1216-c3 | 0 | 55 tests, R2 still 0, the part 21,074 and 8,886 bytes |
| Its six controls that anchor in motion.tsx: save, lineup, reduced, mouth, takenback, samecommit | r1216-c3, lm-<name> | 1 each | each as it must |
| simLiveSimCelebration, clean, and its six controls in motion.tsx | r1216-c3, lc-<name> | 0 each (its convention) | 17 checks; "intended assertion failed, independent destinations stayed green" |
| Every frame that is not an own goal against the base, with plainmoved | r1216-plain (14644f5d) | 0 | 93301059 twice, 8f04cad2 moved |
| Five more vitest files and sixteen harnesses and fences | r1216-wide (e0ec82c7) | 0 each | managerScorerMarks, miniPitchScene, seasonCentreOwnGoals, clubManagerSave, liveSimCelebration; simLiveSim, simLiveMatch, simCmMatchCentre, simCmOwnGoals, simSoccerOwnGoals (CAREERS=120 SEEDSET=0), simSeasonCentreMotion, simRevealMoments, simFlagshipWeight, simAccessibility, simNoRivalNames (0 findings), simNoInventedQuotes, simTrustCopy, simLiveScores, simStorageWrites, simNumberFormatting, simLegalPages, simHarnessAnchors |
| Section 9 alone, in a browser on a served build | r1216-walk (5cb45fe8), own | 0 | four watches green: turn 78.7 and 56.0 degrees, the ball within 0.3 of the man |
| The whole walk with section 9 at its end | r1216-walk, walk | 0 | all green, 140 s |
| Section 9 on a build with the entry line taken out (the picture before this round) | r1216-ogbefore (5cb45fe8) | 1 | the card reads (O.G) in all four watches; red on the last touch (the ball never nearer the man than 10.9 and 13.7), on the turn (2.1 to 2.2 degrees), on the head held and on the pitch's own mark; "as it must" |

In the browser the engine search found, on seed 3208792616 (the walk's seed plus nine): an own goal for me in match
69 of the search (Real Madrid v Manchester United, 9', their keeper, number 1) and one against me in match 371 (Ajax
v PSV, 21', one of my backs). So section 9 watches a keeper's own goal and a back's.

And on the later heads:

| What | Result (head) | Exit | What it printed |
|---|---|---|---|
| Type gate, the WHOLE vitest suite, simOwnGoalMotion, simHarnessAnchors, simNoRivalNames | r1216-all (5cb45fe8) | 0 each | 402 test files passed, 2 skipped, of 404, in 568 s |
| Section 9 alone, then the whole walk | r1216-walk2 (48b31bcb), own and walk | 0, 0 | green, 43 s and 140 s |
| The replay mode and its control | r1216-walk2, replay and noseed | 0, 1 | digest d3b0b2c5 three times with 1864 draws; noseed "as it must" |
| The walk's four older controls | r1216-walk2, bar, silentlist, earlyscore, nocard | 1 each | each "as it must": section 9 does not run under a control, so their "nothing else is red" still means what it meant |
| Section 9 on the mutated build, again | r1216-ogbefore2 (48b31bcb) | 1 | "as it must" |
| The weight sweep, this round and the base | r1216-walk2, sweepWeight and sweep-base | 1, and the base's own sweep exits 1 | the same six rows over budget on both, see below |

## The weight sweep

`SWEEP_OFFLINE=1 node scripts/sweepWeight.mjs` is red on this branch and on its base, on the same six rows, with
the same sizes to the tenth of a kilobyte or one tenth apart (a build is not byte stable):

| Row | Budget | This round (48b31bcb) | The base (46e4231c) |
|---|---|---|---|
| /club-manager | 578K | 581.7K | 581.7K |
| /soccer-career | 786K | 796.9K | 797.0K |
| /footle | 345K | 348.0K | 348.1K |
| /nfl-my-career | 468K | 468.7K | 468.8K |
| /manager-hot-seat | 596K | 599.6K | 599.6K |
| /deadline-day | 606K | 609.7K | 609.7K |

So none of it is this round's: the live match viewer and the pitch part are not in what a page downloads when it
opens, and the part's own 707 gzipped bytes show in none of these rows. The budget numbers are the lead's.

## The screenshots, looked at

From r1216-walk2 (`git show origin/rc-results/r1216-walk2:files/own-<me|opp>-<390|1280>-<flight-a|flight-b|card>.png`)
and, for the picture before this round, from r1216-ogbefore2 (`files/ogbefore-own-...png`).

- Against me, a back (Ajax v PSV, 21', number 4), at 390 and at 1280: the card reads "GOAL! Simon Adingra 21'
  (O.G)" under PSV; he stands where he met it with both hands at his head; the ball is in the corner of my net on
  his side and the net bulges there; my keeper lies the other way; nobody of mine has his arms up; three of theirs
  raise their arms where they stood during the flight. At 1280 the list beside the pitch reads "21' GOAL! Own goal,
  Simon Adingra (O.G)".
- For me, their keeper (Real Madrid v Manchester United, 9', number 1), at 390: the card reads "GOAL! Senne Lammens
  9' (O.G)" under Real Madrid, the ball is in the far corner of their net, three of mine raise their arms where
  they stand and nobody of theirs does.
- The same goal on the build with the entry line out (the live site today): the same card, and on the grass their
  number 10 with his arms up, two team mates walked over to him, the ball in the other corner, and the man the card
  names standing by.
- One thing seen that is not this round's: a booking in the goal's own minute ("Booked: ... 9'") puts its pill
  across the top of that penalty area, and in the keeper's own goal it lies over the keeper while he dives.

## The review fix pass (2026-10-10, after two adversarial reviews)

Head before it f5a40cc2. The reviews: one major (run lens), the rest minors. What changed, and what is now true.

### A keeper's own goal always turns (the major)

For a back the corner is on his own side and he stands 5 off the straight line to it, so the turn is a bound of
the geometry. For a keeper the corner was left to the line's own flank (Club Manager's goal lines carry none, so
the minute's parity chose it) and the touch was wherever his dive had him: with the man who delivered it on the
far side from that corner the ball went almost straight through his gloves. The run reviewer read the committed
test on sixteen other fleets: 2.2 to 17.2 degrees on four of them, OG5 red with nothing wrong, and the committed
fleet's least (34.1) was the highest of the seventeen. A floor read off one sample is a coin toss.

The fix, one line of `ownGoalFrame`: a keeper's own goal ends in the corner ON THE SIDE THE BALL CAME FROM, so it
comes back across him. A back's own goal and a named man who is not on the grass are computed as they were.

OG5 now holds the floor of 20 where it is a bound of the geometry, on a sweep by hand (the man who delivers it at
25 places across the box for each side; a keeper at five places, each parity of the minute, each flank; a back at
170 places of his own half; and the scene the read reviewer worked by hand), and reads the fleet beside it.
`OWN_GOAL_FLEET=<n>` hands the first describe of the test another fleet (the same five clubs on the seeds
n * 100003 + 17 to 21). Measured on the committed fleet and on fleets 1 to 16 (r1216-fx-a, r1216-fx-b):

| | least on any of the seventeen fleets | on the sweep by hand |
|---|---|---|
| the turn off a back | 28.4 (per fleet 28.4 to 46.0) | 27.1 (4,420 scenes) |
| the turn off a keeper | 59.9 (per fleet 59.9 to 65.7; fleets 9 and 10 gave 2.2 before) | 43.3 (1,500 scenes) |
| the baseline arm, most | 3.3 on every fleet | |

The scene the reviewer worked by hand (7.2 degrees by arithmetic before) turns by 103.8.

### A keeper who put it in is drawn holding his head

The figure draws hands at a head only when it is not in a dive, and a keeper's own goal left him lying in his dive
to the end, so he was drawn as any beaten keeper while the help and What's New said he holds his head. He now gets
up as it goes in: his dive eases back to nothing between the net and the end of the action, and the last frame
(and the still frame of reduced motion) has him on his feet with both hands at his head. No copy changed: it is
true of a defender and of a keeper now. The tests read the drawing and not the mark `data-pm-rue` (RUE renders the
pose his own goal ends on beside the same line without og; OG3 holds it on every keeper of the fleet against the
baseline arm; OG7 under reduced motion; section 9 of the walk reads how far his figure leans).

### The rest

- The material's two exact counts (100 matches, 200 halves) are a floor and an identity: a walk ends early on a
  sacking. Its other floors are at half of the least measured over seventeen fleets, not at half of one.
- OG5's walk bound was the fleet's maximum. It is a bound of the geometry on every back now (he is brought into
  the band and at most 5 further across, never beyond), and the two statistics are read on backs only with their
  measured numbers beside them (median 0.0 to 0.6 against 3, 90th percentile 3.0 to 4.8 against 8).
- OG10 (new) holds each edge of the band a back meets it in, on scenes made by hand. OG8 also holds that og on a
  shot or a save is not read. The test file has 16 tests.
- Controls, 20 now. New: `keepercorner` (OG5), `keeperdown` (OG3), `kind` (OG8), `bandlow`, `bandhigh`, `clamp`
  (OG10). Each exits 1 with "as it must".
- `scripts/lib/ownGoalBeforeBuild.mjs` is the one edit behind the walk's control ogbefore, so it runs from the repo.
- OWN_DIGEST was taken again: c648618c, was 669ef935. What moved it is the keeper's own goal alone (6 of the 16
  recorded variants, 132 of 352 frames). Proof, r1216-fx-p: with the corner line and the get up put back the first
  recording replays green; with either one put back alone it does not (0e31fa9b, eddb7f1d). RUE_DIGEST did not move.

### Not done in the fix pass, and why

- The test helpers are still copies (seeded, walkClub, overlapping, the FNV digest, step, mount). Lifting them
  means editing `src/test/liveSimMotion.test.tsx`, which is not on this round's file list, and proving its printed
  R lines the same before and after. The header of the test no longer promises that its clubs and seeds equal that
  file's: nothing needs them to.
- "Facing his own net" is not drawn: a figure is upright and has no face. The lead's to accept or rule on.
- After the touch the man's `kick` is the sine of pi, a number that is not quite 0, so his `data-cm-actor-pose`
  reads "strike" while he holds his head (a keeper's reads "dive" until the last frame). Nothing reads that
  attribute for him, the plain striker has the same artefact on the base, and changing it would move the recorded
  frames of a back's own goal for nothing a player can see.
- `off` could in principle send two team mates to one spot (reasoned by the reviewer, 0 seen on 3,000 own goals;
  OG4 and the older R2 would catch it). A goal that waited behind another chance is delivered by the first
  outfield man in list order, as on the base. The twin's "man who leaves" case is still run only when the search
  meets one, as the brief allows (met on attempt 325 of 4,000).
