# Round 1216 notes: an own goal is drawn as one in Club Manager's live match

Written 2026-10-10 by the desktop Claude lane (session G), builder of Round 1216.
Branch `r1216-own-goal-motion`, base origin/release-at-gate 46e4231c (Release AT as it went to its gate).

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
  LiveSimScreen.tsx) must carry both anchors, and `simHarnessAnchors` will say so.
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
