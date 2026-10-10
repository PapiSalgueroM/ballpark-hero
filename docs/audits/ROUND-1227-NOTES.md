# Round 1227 notes: the NFL rival plays your position on your own stat line, with the shared rival lift

Written 2026-10-10 by the builder (desktop Claude lane, session G). Branch `r1227-us-rival-nfl`, base
`origin/release-at-gate` at 980654fa. This is Round A of the critic's split: the shared lift and the NFL. MLB and
the NHL (Round B) follow on Round 1226's closed head and are not started here.

## What the round does
- `src/lib/careerRival.ts`: `rivalSeasonDraws` (the draw count law), `rivalSeasonStream` (the keyed stream a
  rival's season draws on), `rivalKindOf` (his kind by a hash of his name and position). The NBA binds to all three.
- `src/lib/careerRivalryEvents.ts`: `rosterFacts`, `rosterBeat` (the NBA's three cards as one builder, with an
  optional `own` pair for cards an older release dealt), `ALL_STAR_ROSTER` (the shared words), `ownRosterCards`
  cut out of `ownRosterBeat` unchanged. The NBA's beat 306 is `rosterBeat` now.
- `src/lib/usCareerStatLine.ts`: `nflLineAsPrinted`, `mlbLineAsPrinted`, `nhlLineAsPrinted` (the numbers a line
  prints and nothing else) and `NFL_RB_PRINTED_YARDS_A_CATCH = 8`.
- `src/lib/nflMyCareer.ts`: `nflStatLineFor` (the stat block of `simSeason`, cut by line number with no draw
  moved), `nflHeadToHeadScore` (both sides of the verdict), `nflRivalSeason` (the hook), the call site.
- `src/lib/careerAwards.ts`: `awardSlots`, a reader of the slot count already in the award tables (no table changed).
- `src/lib/nflCareerRivalryEvents.ts`: beat 206 on `rosterBeat` with its two old cards as `own`; beat 221 reworded.

## Decisions taken by the builder (the brief left them open, or the code forced them)
1. THE HEAD TO HEAD SCORE IS NAMED `nflHeadToHeadScore`, not `nflRivalScore` (critic's advice 17): it scores both sides.
2. THE PRINTERS' PARAMETER TYPES WERE NOT LOOSENED. The hook builds a whole season line for the rival (his year,
   club, age, rating, the season's games) and hands that to the player's printer and to `nflAwardPaceLine`, so no
   signature in the engine or the printer file changed.
3. THE ONE PLACE RULE (critic's correction 2) reads the slot count through `awardSlots('nfl', 'allPro', pos)`. His
   All-Pro draw is always taken on his keyed stream; at a one place position the answer is then refused in a
   season the player is on the first team. So the draw count on his stream never depends on the player.
4. `BuiltInRivalSport` no longer includes `'nfl'`: a call to `judgeRivalSeason` for the NFL without a hook does not
   compile. The NFL lines inside `simRivalSeason` are dead code now and stay until Round B deletes the three
   built in lines together (the draft's step i, outside this round's scope).
5. BEAT 221 is "The Charity Weekend" with a new emoji (the critic's two edits: the hibiscus was the mark of the
   all star week, and a charity game is a day where the card spends longer). Same id, gate, promise and apply.
6. A FLOOR AT ZERO in `nflStatLineFor` for seven counts (see "Found on the way").
7. P2 steps only the first 300 careers of a named sport season by season (each step is a whole drive on both
   trees), by halving; all 1,000 are still compared as whole saves.

## Found on the way
- A PLAYER'S OWN LINE COULD PRINT A NEGATIVE NUMBER. The stat block had no floor on a running back's rushing yards
  (below zero under a form of 56.35 with a low draw), on his, a receiver's or a tight end's catches, on a corner's
  passes defended, on a linebacker's tackles or on passing yards. The built in rival line had floors of its own
  (80 rushing yards, 400 passing yards, 4 catches), so binding the rival to the player's function would have
  shown a rival that defect too. Seen once: control `drawsnfl` shifts every stream and one of 107,396 judged
  seasons printed a player line the harness could not read. On the real seeds 1 to 5 none is seen before or
  after. The seven counts are floored at zero in the one function, in a commit of its own.
- THE STEP a TYPE ERROR. `rosterFacts` inferred its season type from the wrong argument for the NBA call; fixed in
  c1bd2e07 by naming the type. The type gate is green from that commit on (runner r1227-c3).

## The measured numbers (five seeds of 1,500 careers a sport, 2026-10-10)
My share of the head to head years, percent. Before is the base 980654fa (runner r1227-s0). After is the NFL bind
at 96c3f64d (runner r1227-c1). The full tables are in the header of scripts/simUsRivalSense.mjs.

| NFL | QB | RB | WR | TE | LB | CB | EDGE | K | all |
|---|---|---|---|---|---|---|---|---|---|
| before | 38.8 | 22.9 | 30.3 | 18.8 | 0.2 | 0.0 | 0.4 | 10.1 | 15.10 |
| after | 42.9 | 25.1 | 35.6 | 37.5 | 34.3 | 30.6 | 38.0 | 63.7 | 38.94 |
| after, as a healthy starter | 66.4 | 45.9 | 55.9 | 59.0 | 56.5 | 51.0 | 59.2 | 63.9 | |
| after, careers whose rival retired behind me | 38.2 | 0.0 | 22.2 | 26.6 | 19.9 | 10.7 | 27.2 | 78.7 | |

Before, a corner's, an edge rusher's and a kicker's rival line could not be read as his position's at all, and
where a line could be read the verdict disagreed with the two printed lines in 0.4 to 8.7 percent of judged years.
After: 0 of 107,618 rival lines off the player's shape, 0 unread, 0 judged years where the verdict disagrees.
MLB before 41.55 (SP 9.4, RP 8.3, DH 69.7) and NHL before 58.03 (D 39.4, G 62.7) are Round B's baseline.

NOTHING WAS TUNED. Two positions stand out and the cause is not the line: a running back takes 25.1 percent and no
career ends with the rival retired behind him, a kicker takes 63.7 percent and 78.7 percent of careers end that way.
The player ages on his position (a back falls off at 28, a kicker at 39) and every rival ages on one curve (from
31): the round after this one that the critic names. This table is its baseline.

## How each step was proven (GitHub runners; the result names are branches rc-results/<name> on origin)
- Step 0 (6779cfad): r1227-s0. The table before; simNbaAwardsSense with SENSE_PROVE_OTHERS=1 green on the base.
- Step a (ac7c22f9): r1227-a1 and r1227-a2. P1, L and P2 byte equal in all four sports against 6779cfad at full
  size. Controls tickdraws, liftkey and liftcard fired. The four anchors the lift moved in simNbaAwardsSense
  (rivaldraws, oldgate306, oldgateown, droppedanyyear) each fired "red in its section and nowhere else".
- Step b (dd3896ac): r1227-b1. The moved block is identical to the old one line for line apart from `c.pos`
  becoming `pos` (diffed before the commit). P1 and P2 byte equal against ac7c22f9; control cutdraw fired; the
  board recording before replays green and the truth digest passes with nothing allowed.
- Step c (96c3f64d): r1227-c1 and r1227-c2. P1 with RIVAL_MOVED=nfl: the player's lines, counters, the seasons a
  beat is dealt in and his own notes byte equal in all four sports, the NFL rival's trail moved, the other three
  byte equal, the NBA's cards word for word. P2: 1,000 of 1,000 NFL saves moved; 311 part off the rival and each
  holds every season line up to that season; 689 differ under the rival alone. Eight controls fired in their
  sections (verdictswap, oldscalenfl, fullscorenfl, offshapenfl, drawsnfl, bridge, oneslot, workload17).
- The recordings for step c (44c2e4d2, 83d42fec): their commit messages carry the attribution, and r1227-c4 found
  that head green (the type gate, the board replay, the digest).
- The floor (55339449) and the NFL third of step h (5bdd0a9c): r1227-h1 and r1227-h2. P1 against 83d42fec: the
  player's lines AND the rival's trail byte equal, so the floor moved no season of 107,618 judged years. N.F5: 0
  of 64 All-Pro cards wrong (only you 43, only him 21, both 0 over five seeds). N.O: the five old saves. P2: 53 of
  1,000 NFL saves differ and every stepped career that parts holds its season lines. Controls rostergate,
  owndealt, lastyearnfl (N.F5) and owndead (N.O) fired at full size; simCareerRivalryEvents green with its
  controls allstar221, owndealt206, coin306 and oldcard red; simNbaAwardsSense green (172 checks) with oldgateown,
  droppedanyyear and oldgate306 red.
- The recordings for step h (110c3f64, 2be3775c): one fixed save's screen walk in the NFL ("negNet", step 52) and
  8 digest leaves, all nfl.
- The browser walk scripts/playUsRivalLines.mjs: its `cards` stretch was green on its first run (r1227-w1); the
  closing report says how the full walk ended.

## Owed, and for whom
- THE OTHER LANE'S GUIDE (src/data/gameContent/football.ts, about line 562): "He plays his own seasons on the same
  scale you do" is TRUE for the NFL from this round on. Nothing must be written for the round to be true. A
  sentence that would help a player and is NOT written anywhere yet: how "the better year" is decided (the season
  score of the parts the two lines print; a back's catches at eight yards each; a receiver's or a tight end's
  catches and a kicker's attempts are printed and do not count; a linebacker's and a corner's forced fumbles are
  not printed and do not count).
- THE RULES AND A WORKED EXAMPLE BEHIND A "?" ON THE RIVAL CARD are owed by the house rule and were ruled out of
  this round (they need src/components/us-career/SocialPanel.tsx, the other lane's ground). The NFL's sentences,
  for the round that builds it: "Who had the better year is read off the two season lines you can see. A
  quarterback is read on yards, touchdowns and interceptions. A back on rushing yards, touchdowns and catches,
  each catch counted as eight yards. A receiver or a tight end on yards and touchdowns (his catches are on the
  line and do not count). A linebacker on tackles, sacks and interceptions. A corner on interceptions, passes
  defended and tackles. An edge rusher on sacks, tackles and forced fumbles. A kicker on his makes and his longest
  (his attempts are on the line and do not count). Inside six percent of his number it is a near tie, and a dead
  heat is his year." (For whoever writes the "?": a near tie still goes on the head to head, to whoever had the
  higher number; only the season note reads differently. src/lib/careerRival.ts, judgeRivalSeason.) Worked example: "You: 3,654 yds, 22 TD, 14 INT. Him: 2,664 yds, 12 TD, 21 INT. Yours is the
  better year." (Corrected by the fixer on 2026-10-10: the first writing said a receiver is read on his catches.
  The code is src/lib/careerAwards.ts nflSeasonScore, which reads a receiver's yards and touchdowns only.)
- A RIVAL WHO HAD ALREADY RETIRED ON AN OLD SAVE keeps his old shape last line for good (the critic's advice 16):
  he is never judged again, and the Rival screen prints the line the save holds. Known leftover; the "?" step can
  hide a last line that has no lastYear.
- THE LEAD AT RELEASE: the saved page /whats-new changes (one entry); the gate list gains
  scripts/simUsRivalSense.mjs with its controls and scripts/playUsRivalLines.mjs with its two, and loses
  SENSE_PROVE_1149 and simNbaAwardsSense's `lastyearnfl`.
- ROUND B (MLB and the NHL): binds to rivalSeasonStream, rivalSeasonDraws, rivalKindOf, rosterBeat (with `own`),
  ALL_STAR_ROSTER, mlbLineAsPrinted and nhlLineAsPrinted; adds its sports to BOUND, ROSTER and SHAPES-driven
  sections of simUsRivalSense; deletes ownRosterBeat and the two built in lines left in simRivalSeason (MLB's and
  the NHL's; the NFL's went in this round's closing fix) when its last caller goes; moves the anchors of
  oldgateown and droppedanyyear with them.

## The fix pass after the two reviews (2026-10-10, the fixer)
The reviews are review-run-1227.md and review-read-1227.md, the closing report is fix-1227.md, all in
C:/Users/antho/dukb-handoff/2026-10-10/results-g/. What changed on the branch after 32b58c72:
- origin/main at f78037dc merged (Release AT live; no file of this round, no conflict).
- WHAT'S NEW TOLD THE RULE WRONGLY TWICE. A receiver or a tight end is read on yards and touchdowns (his catches
  are printed and carry no weight), and a kicker on his makes and his long (his attempts are printed and not
  read). The entry, the rule text above and the comment over `nflHeadToHeadScore` now say so.
- THE ONE PLACE RULE IS THE GAME'S TABLE, NOT A CLAIM ABOUT A REAL SEASON. The award table is the first team as
  it is picked today (the 2025 team: NFL.com, and the AP roster as Fox Sports carried it) and the engine uses it
  in every era. The real 2005 and 2015 first teams named two running backs, and the AP's 2016 revamp left one
  and added a flex. The sources are in the comment above `NFL_ALL_PRO` in src/lib/careerAwards.ts. What's New
  now says "the way the real one is picked today, in every era". A slot count that knows its year would move
  the player's own award odds in every 2005 career: a round of its own, NOT done.
- THE HARNESS (scripts/simUsRivalSense.mjs, 14 checks now): N.U6 plays the real `simSeason` on boosted careers
  and holds the one place rule at its call site (control `oneslotsite`); N.F5 judges the fleet's own count of
  both seasons at a one place position; N.U7 holds the floor at zero on a grid (control `nofloor`); N.U3 has a
  control (`impure`). A note beside `HELD_TOL`: when a later round moves an NFL draw, measure and retype, never
  widen.
- THE WALK (scripts/playUsRivalLines.mjs) plays seasons at all four size and motion pairs, and walks the old
  saves and the roster cards at 390 with motion on and at 1280 with reduced motion (all four since the closing
  fix, below).
- THE STEP h RECORDINGS HAVE THEIR SINGLE INPUT NOW. On 55339449 alone (the floor) step c's recordings replay
  green and the digest passes plain; on 5bdd0a9c (the cards) both are red, the board at fixed save "negNet"
  steps 52 to 54. Runners r1227-x1 and r1227-x2; written in the header of scripts/simUsBoardParity.mjs.
- SEEN WHILE PROVING IT, not this round's: the board replay's screen read at NFL fixed save "noCoachKey" step 38
  races the lazy farewell banner. One replay of six was red there with the save equal. Reported to the lead.

NOT FIXED, and why (each is in the closing report for the lead):
- A kicker's long field goal has no cap (older than this round; the rival prints one now). A cap needs the real
  record sourced twice and moves the player's own line and the recordings: a small round of its own.
- Beat 204 ("you had the better box score", dealt in any year), THE BALLOT CAMPAIGN choice card, the dead NFL
  lines inside `simRivalSeason`, and the old shape line of a rival who had already retired on an old save: each
  deferred by the critic or by the lead's decision 1, each still open (the dead NFL lines are gone since the
  closing fix, below; the other three stand).
- The weight row: /nfl-my-career measures just over its budget in scripts/sweepWeight.mjs (the closing report
  has the measured size). The budget number is the lead's. (Inside its budget since the closing fix, below.)
- A slot count that knows its year (two running backs through the 2015 season), as said above.

THE RECORDINGS AFTER THE FIX PASS: the board recording was taken again from 4c010129 on runner r1227-x6 and came
back byte equal in all four sports (only `recordedFrom` moved, commit a727c460); the truth digest taken again
with the nfl keys allowed came back byte equal and has no commit.

FOR WHOEVER MERGES ROUND 1226 WITH THIS ROUND (read only trial, `git merge-tree`, against 4bcfa116, and again
against 573ea1ff in the closing fix): the only
conflicts are scripts/data/usBoardFixture.json and src/pages/WhatsNew.tsx. src/lib/careerRival.ts and the truth
digest merge by themselves, and that is exactly why the second lander must still run the type gate, P1, the
board replay and the digest plain on the merged tree, and take the NFL section of both recordings again from the
merged head: a recording that merged without a conflict is still a recording nobody took.

## The closing fix (2026-10-10, the second fixer, after the closing check)
The closing check listed nine things. The closing report is fix2-1227.md in
C:/Users/antho/dukb-handoff/2026-10-10/results-g/. What changed on the branch after 5cc880b0:
- THE NFL'S BUILT IN RIVAL LINES ARE GONE from `simRivalSeason` in src/lib/careerRival.ts (commit d26bd8da). This
  round bound the NFL rival, so no caller could reach them (`BuiltInRivalSport` has not admitted 'nfl' since step
  c and `judgeRivalSeason` cannot be called for the NFL without a play). 41 lines out, no draw and no live line
  moved: the proof is P1 and P2 of scripts/simUsRivalSense.mjs against 5cc880b0 with nothing named as moved
  (runner r1227-y1; the closing report has how it ended). MLB's and the NHL's built in lines stay until Round B.
- THE WEIGHT ROW IS INSIDE ITS BUDGET, by a little. With those lines gone /nfl-my-career measures 469.4K of
  gzipped JavaScript over 47 files against 469K (it was 469.7K; runner r1227-y0). scripts/sweepWeight.mjs rounds
  to the kilobyte and fails above the budget, so the row is green with about a tenth of a kilobyte to spare. No
  budget number was touched. The next thing that adds weight to that page needs the lead's number.
- THE WALK reads the old saves and the roster cards at all four size and motion pairs, as it already did for the
  stretch that plays seasons (commit fffdcd06). `SIDE_SIZES` is gone.
- THE TRIAL MERGE WITH ROUND 1226 was read again after the edit to src/lib/careerRival.ts (`git merge-tree`,
  against its head 573ea1ff): still only scripts/data/usBoardFixture.json and src/pages/WhatsNew.tsx conflict,
  and the merged careerRival.ts reads right (Round 1226's `cut` on the NHL and MLB lines, no NFL lines).

STILL NOT FIXED after the closing fix, each on purpose, each in the closing report with its reason:
- A kicker's long field goal has no cap. A cap moves the player's own line (the lead's decision 5 says his path
  does not move in this round), his All-Pro odds, the kicker rows of every typed table and the recordings. A
  small round of its own, with the record as data by era (68 yards since 2 November 2025, 66 from 26 September
  2021, 64 before: the sources are in fix-1227.md).
- The slot count does not know its year (two running backs on the real first team through the 2015 season). An
  award table change the brief forbids here; it moves the player's own odds. The words claim nothing else.
- Beat 204 and THE BALLOT CAMPAIGN choice card: the critic's answers 4 and 8, one small round for all four
  sports at once.
- A rival who had already retired on an old save keeps his old shape last line, and the rules behind a "?" on
  the rival card: both need src/components/us-career/SocialPanel.tsx, the other lane's ground.
- The floor at zero in `nflStatLineFor` is kept: a model choice for the lead, held by N.U7 and its control.
- The board replay's timing race at NFL fixed save "noCoachKey" step 38 is not this round's and is not fixed
  here: making the read wait for the lazy banner changes what every sport's recording shows at that step, so it
  is one retake at integration, by whoever owns src/test/usBoardFixture.test.tsx.

## What a later session must not trust
- Anything below marked NOT RUN.
- The AFTER numbers move if the rival's aging, his job or his form is ever changed: they are the baseline for
  that round, not a target. No share was tuned.
