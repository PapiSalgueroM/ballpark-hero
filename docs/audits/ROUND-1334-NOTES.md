# Round 1334 notes: Soccer Career's binding of the shared deck, dark

Branch r1334-soccer-deck, SC_BASE e814c2de (origin/main on 2026-10-16: Release BH ae14cf97 plus its record and
the board's claims, docs only over 1027b08c). Nothing a player sees: the page never loads the deck, so the live
game is the base's by construction. Round 1504 makes it visible.

## Step 1: the gate, the module, the words, an empty pack

- src/lib/soccerDeckGate.ts (eager, no runtime import): loadSoccerDeck (a plain `import('./soccerDeck')` with a
  literal specifier, behind a loader seam the unit test replaces), soccerDeckReady, soccerDeckPending,
  soccerDeckSlot, isSoccerDeckId (700 to 999), setSoccerDeckLoader (the tests' seam). Fails closed: a load that
  resolves without the deck's two functions (what freshBuild.ts's cancelled preload error hands a dynamic import)
  or rejects leaves the deck not ready and the slot [], and clears the in flight promise so a retry can land it.
- src/lib/soccerDeck.ts (lazy): soccerDeckFacts, SOCCER_FX, soccerDeckProblems (memoised per pack on first use,
  never at module scope), deckToRandomEvents, dealFromPack and pendingFromPack (any pack), dealSoccerDeck and
  pendingSoccerDeck (the shipped pack, what the gate calls).
- src/data/soccerDeck/words.ts: SOCCER_FX_WORDS and SOCCER_TRAINING_KEYS, data only, so the kit never bundles the
  engine through soccerDeck.ts (ruling 2(h)).
- src/data/soccerDeck/index.ts and starter.ts: the pack with `events: []` and no `pressure`.
- src/lib/gmInbox.ts: `export` on gmTake, nothing else.
- scripts/simEventDeck.mjs: one appended line puts src/lib/soccerDeck.ts on LAZY_IMPORTERS.
- src/lib/soccerDeck.test.ts over a two card fixture pack (716 and 724) that lives in the test.

### The keeper words (ruling 2(a))

Thirteen training keys plus `integrity`. Outfield, "<Word> next season": t_pace Pace, t_shooting Shooting,
t_passing Passing, t_dribbling Dribbling, t_defending Defending, t_physical Physical. Keeper, each writing the stat
its GK_TREE family holds: gk_reflexes Reflexes (reflexes), gk_shot_stopping Shot Stopping (shooting),
gk_positioning Positioning (defending), gk_aerial_command Aerial Command (physical), gk_distribution Distribution
(passing), gk_penalty_saving Penalty Saving (dribbling), gk_sweeping_speed Sweeping Speed (pace). The unit test
reads attrTreeFor('GK') and attrTreeFor('ST') and holds every label to the family of the stat it writes.

### The ceiling (ruling 2(b))

A training key never lands past momentsRoom (season/soccerMoments.ts), which counts queued boosts; the drills'
room (careerDrills.ts applyDrillResult, drillHeadroom minus momentsPaid) does not. OWED to the drills: that rule.

### The facts (ruling 2(e))

contractYear is `contractYearsLeft === 1`; seniorSeasons counts rows of type 'playing'; sameClub is
`last.club === state.currentClub`; derbies counts the derby meetings he played last season (readSeasonDerbies of
the last row, meetings with `played`). Facts are null unless the career is live, at least 17, at a club whose name
is not blank, and the last row is a playing season.

### The S15 key (open question 6, cut)

Proposed week key for S15: `identity|seasonKey|md<n>|week` (identity the engine's soccerDeckIdentity, seasonKey
season/soccer.ts's soccerSeasonKey). Nothing writes it in this round.

### The colours (ruling 2(f))

Training bg-blue-600, other moves bg-emerald-600, the option that moves nothing bg-gray-800 (all compiled on
SC_BASE; counts to be pasted at step 5).

## Step 2: the engine's three lines, the ninth inverse, simSoccerDeck 1, 2, 3 and 10

- src/lib/soccerCareerEngine.ts, three lines and their comments: the gate's import after the milestone import, the
  spread `...soccerDeckPending(state),` after the getBootEvents spread at the end of getAllEvents, and
  `picked.unshift(...soccerDeckSlot(state, season, `${soccerDeckIdentity(state)}|${season}|deckslot`, picked));` after
  the boot's block and before the stamp. Nothing else in the engine.
- scripts/lib/careerSoccerDeck1334.mjs, the ninth inverse: three rows, head sha256 0b3d35bc (the engine of this
  branch, LF), base sha256 e37b73f2 (SC_BASE's engine, which is the eighth inverse's head pin). The chain was checked
  by hand: the ninth gives e37b73f2, the eighth then gives d21d2f55 (the seventh's head pin), the seventh then gives
  201f0361 (its base pin).
  Recipe (regenerate after ANY engine change, yours or a merge's, never hand edit): from the worktree root,
  `node .tmp-fx/gen-inverse-1334.mjs <SC_BASE sha>` then `node .tmp-fx/write-inverse-1334.mjs`. Both are Round 1329's
  tools (results-g/r1329-tools) with the file list cut to the engine and the names changed; copies live in
  C:/Users/antho/dukb-handoff/2026-10-10/results-g/r1334-tools/.
- The ninth is wired in front of the eighth in all seventeen importers of careerWorldTruth1329.mjs (the seven
  scripts/qa kits, simCareerAwardsNight, simCareerLeagueFinish, simCareerLeagueSeasons, simCareerProgramme,
  simCareerSocialBrands, simCareerStoryRole, simCareerTrophyRuns, simSoccerCareerDevelopment, simSoccerDeckFairness
  section 8, simSoccerWorldTruth section 6), each with a receipt check that every row came off once, in order, where
  the file already checks the eighth's. simSoccerDeckFairness takes the ninth off only in section 8 (its other
  bundles compare behaviour, which three inert lines cannot move), as ruling 1(g) says.
- scripts/simSoccerDeck.mjs sections 1, 2, 3 and the static half of 10 with controls bindopen, leak, last, pool, eager
  and caller. While the shipped pack is empty, sections 1 and 3 deal from a one card fixture pack made in memory.
- The engine workflows' substance lines (18 workflows name the engine on this base, two more than the draft's 16:
  career-historical-opponent-labels and career-rival-veteran-pay) are run once, at step 5, on the final head and
  SC_BASE, rather than at every step.

## Step 3: the starter pack, 28 cards

The board's between seasons rule is on main (docs/WORKBOARD.md, the 2026-10-16 12:45 claims block): ids 700 to 999,
at most one deck card a summer, dealt first, about the pitch and the training ground only.

| id | group, gate (besides a playing row at a club) | title | voice | options (effects) | cd | nearest routine, and why this is not it |
|---|---|---|---|---|---|---|
| 701 | keeper | Crosses into a crowded box | Your keeper coach | extra hour (Morale -1, Aerial Command +1); N | 3 | 604 keeper catching (reflexes): ours is claiming crosses |
| 702 | keeper | Playing it out from the back | The analyst | short passing (Distribution +1); N | 3 | none for keepers; 600 is outfield passing reps |
| 703 | keeper | The penalty file | Your keeper coach | study it (Penalty Saving +1); N | 4 | 604: ours is penalties |
| 704 | keeper | Sweeping behind a high line | The coaching staff | sprint work (Morale -1, Sweeping Speed +1); N | 4 | 603 sprint workshop (any position, pace): ours is a keeper's sweeping |
| 705 | keeper, apps < 15, sameClub | Fighting for the shirt | Your keeper coach | one on ones (Shot Stopping +1); rest up (Morale +2); N | 3 | 615 a frustrating year (low morale, physical): ours is a keeper's fight for the shirt |
| 706 | defender | A new way to defend corners | Your set piece coach | learn it (Morale -1, Defending +1); N | 3 | 610 defensive details: ours is a zonal set piece setup |
| 707 | defender | Playing out under a press | The coaching staff | passing work (Passing +1); N | 3 | 600 passing reps: ours is a defender on the ball under a press |
| 708 | defender | Recovery runs | Your fitness coach | sprint work (Morale -1, Pace +1); N | 4 | 603 sprint workshop: ours is a defender's recovery pace |
| 709 | defender, yellows >= 7 | Timing your tackles | The analyst | the clips (Defending +1); N | 4 | 601 and 610 defensive clips: ours is his own bookings |
| 710 | defender, age >= 26 | Organising the defence | The coaching staff | walkthroughs (Morale -1, Defending +1); N | 3 | 617 helping a training partner: ours leads the defensive walkthroughs |
| 711 | midfielder | When to press | The analyst | triggers (Morale -1, Physical +1); N | 3 | 613 receiving between the lines (passing): ours is pressing |
| 712 | midfielder | Set piece delivery | Your set piece coach | delivery (Passing +1); N | 3 | 613: ours is dead ball delivery |
| 713 | midfielder | First touch under pressure | The coaching staff | rondos (Dribbling +1); N | 3 | 602 first touch homework (any position): ours is a midfielder in the rondos |
| 714 | midfielder, goals >= 4 | Shooting from distance | The coaching staff | stay late (Shooting +1); N | 4 | 616 finishing homework (forwards): ours is a scoring midfielder's range |
| 715 | midfielder | Covering the space | The analyst | shape work (Defending +1); N | 4 | 601 video notebook (defending, any position): ours is a midfielder's shape |
| 716 | forward | Penalty duty | The coaching staff | name down (Shooting +1); N | 4 | 616 finishing homework: ours is penalty duty |
| 717 | forward | Your weaker foot | Your finishing coach | weaker foot (Shooting +1); N | 3 | 616: ours is the weaker foot |
| 718 | forward | Pressing from the front | Your fitness coach | sprint work (Morale -1, Pace +1); N | 4 | 603 sprint workshop: ours is a forward's press |
| 719 | forward, goals <= 3, apps >= 15 | A quiet season in front of goal | Your finishing coach | extra finishing (Morale -1, Shooting +1); clear your head (Morale +2); N | 3 | 615 (few apps, low morale) and 616: ours is plenty of games and few goals |
| 720 | forward | Beating your man | The coaching staff | one on ones (Dribbling +1); N | 3 | 627 reviewing your touch (dribbling, any): ours is taking defenders on |
| 721 | seniorSeasons < 2 | Learning from the senior players | The first team coach | go in early (Morale +1); N | 99 | none: a once a career card |
| 722 | age >= 31 | Managing the miles | The sports science staff | load plan (Morale +2); N | 3 | 626 a veteran's warm up (physical work): ours is the load plan, rest |
| 723 | contractYear (exactly one year left) | The last year of your deal | Your fitness coach | full break (Morale +2); N | 2 | none: words about the summer's rest only, never talks, offers, wages or a renewal |
| 724 | capped (last row's intApps > 0) | Back from international duty | The medical staff | whole break (Morale +2); N | 2 | none |
| 725 | captain at his present club | Setting the standard | The coaching staff | set the tone (Morale +1); N | 3 | 614 and 619 captain's afternoon and media duty: ours is preseason's first week |
| 726 | injuryWeeks >= 8 | The return plan | The physio | ease back in (Morale +2); N | 2 | 625 looking back at an injury year (passing work): ours is the physio's plan |
| 727 | tier < 2, age <= 22 | Training with the best | The first team coach | go in early (Morale +1); N | 3 | none |
| 728 | derbies >= 1 (derby meetings he played last season) | Derby clips | The analyst | watch them all (Morale +1); N | 3 | none: only the derbies he played last season, never next season's |

The table is the pack as it ships. Two changes after step 3 (step 4, ruling 2(j), and the self review): every
integrity effect is gone (706 lost its teach it option, 710 trains Defending instead, 721, 725 and 727 lift morale,
723, 724 and 726 lost their come back early options), and four wordings no save can make false (702 and 715 named last
season's clips, which a season with no games does not have; 717 said defenders had started showing him onto his weaker
foot; 708's goal side read two ways) were rewritten. The frozen words were recorded again on top of SC_BASE's file each
time: no soccer row has shipped, so no recorded row was ever changed.

Training labels print "<Word> next season +1"; N is the option that moves nothing ("Nothing changes"). Kinds: 705,
709, 719 and 726 are 'negative' (the card reads Challenge), 724 'international', the rest 'positive'.

sameClub (ruling 2(e)): only 705 puts last season at his present club ("You did not get many games here last
season"), so only 705 gates on it. 725 says "You wear the armband here", which the captain fact itself holds (the
armband at the present club). No other card names a club.

### Card by code (advice 19): every card's words true for every code of its group

The groups are the drills' (careerDrills.ts drillForPosition): GK keeper; CB, LB, RB, CDM defender; CM, CAM
midfielder; LW, RW, ST forward. The doubtful pairs, one line each:
- 706 for LB, RB, CDM: worded "wants every defender to know it inside out" (not "at the heart of it"), true for all four.
- 707 for CDM: a holding midfielder on the ball under a press is the card; true.
- 708 for CDM: "more pace in your recovery runs, so a quick winger who gets in behind you does not stay there", a holding midfielder tracks runners too; true enough, no position named.
- 710 for LB, RB, CDM: "the defensive walkthroughs", not "the back line"; true for all four.
- 712 for CAM and CM: set piece delivery; true.
- 715 for CAM: defensive shape work for an attacking midfielder is the point of the card; true.
- 716 to 720 for LW and RW: penalty duty, weaker foot, pressing from the front ("the press starts with the forwards"), a quiet season in front of goal and beating your man (worded "taking defenders on", not "your full back") are all true of a winger.

## Step 4: the kit's lines, the frozen words, simSoccerDeck 4, 7, 8 and 9

- scripts/simEventDeck.mjs: PACK_INDEXES gains `['src/data/soccerDeck/index.ts', 'SOCCER_DECK_PACKS',
  'src/pages/SoccerCareer.tsx']`; the entry exports SOCCER_FX_WORDS from src/data/soccerDeck/words.ts (never from
  soccerDeck.ts, ruling 2(h)); PACK_BINDS.soccer binds every soccer key over the kit's desk (a number in a bag made on
  first write, the real words); CEILING.soccer 0.131 over section 10's soccer drive of 5,000 seasons (REACH_DESKS, the
  closing check's fix below: the top card is 726 at every seed 1 to 10, 9.82 to 11.04 percent, plus 2 points, rc
  r1334-fx2a and again r1334-fx3a; over the old 1,000 seasons it read 9.00 to 11.70 and the ceiling was 0.137).
- TWO ONE LINE EDITS that are not appends, both needed the moment an index pack moves fx keys, which no index pack did
  before: section 8 called `gmPackProblems(p)` with no registry (every soccer key would read as unregistered), now
  `gmPackProblems(p, PACK_BINDS[k]?.fx)`; section 10 drove every index pack through runDesk with no bind (bindGmInbox
  throws on an unregistered key), now `{ observe, bind: PACK_BINDS[tag] }`. For the seven GM packs PACK_BINDS[k] is
  undefined, so both lines do exactly what they did (section 1's 84 replay rows, section 8 and section 10 are green with
  the GM numbers unchanged). Round 1333 rewrites sections 8 and 10: keep both arguments when it lands. The closing
  check's fix adds three more changed lines in section 10 (listed under "The kit lines Round 1333 must keep" below).
- The pack's `pressure`: morale 2 and each of the eleven training keys it moves 1. At most one card is dealt a summer,
  so a season's push can never pass the largest single option; the kit's section 15 reads BEST and WORST far under them
  (rc r1334-s4a measure-15: morale +0.57 to +0.62 and -0.43 to -0.47 a season, every training key 0.13 or less).
- scripts/data/eventDeckWords.json: the 28 soccer rows by `SIM_EVENT_DECK_WORDS=append SIM_EVENT_DECK_SECTIONS=14` only,
  each time on top of SC_BASE's file.

### Ruling 2(j): the pack dropped integrity

simSoccerDeck section 8 on the pack as first written (rc r1334-s4b, five seeds of 100 whole careers): the BEST arm moved
the legacy score +2.26 points against the deck off, past the seed to seed spread of 1.21, and the share of careers ever
at integrity 40 (the other lane's Clean Hands Award) +0.09. So every integrity effect left the pack (commit 1a5fc775).
Measured again (rc r1334-s4e): legacy BEST +1.66, WORST +1.56, NEUTRAL -0.09, clean40 at most +0.04. What still moves
the legacy score is the training the cards offer, which lands under the ceiling (no season start past it in any arm)
and lifts the peak overall about 0.4. That is the design (training that lands with next season's growth), and it moves
a recorded score by about a point and a half over a career: THE LEAD'S CALL whether that stands.

### The economy readings (rc r1334-s4e, each arm's mean against the deck off, OFF's seed to seed sd)

| metric | off | BEST | WORST | NEUTRAL | sd | band |
|---|---|---|---|---|---|---|
| morale at 25 | 85.71 | +1.62 | -0.04 | +0.71 | 1.77 | 5.5 |
| morale at 30 | 90.58 | +0.45 | -1.33 | -0.07 | 1.13 | 4 |
| integrity at 25 | 21.43 | -0.22 | -0.14 | +0.44 | 1.44 | 3.5 |
| integrity at 30 | 33.15 | +0.14 | -0.14 | -1.10 | 3.49 | 8.5 |
| overall at 30 | 80.37 | +0.12 | +0.11 | -0.12 | 0.36 | 1 |
| peak overall | 78.29 | +0.42 | +0.44 | +0.03 | 0.12 | 0.75 |
| legacy score | 52.43 | +1.66 | +1.56 | -0.09 | 1.21 | 4.5 |
| ever at integrity 40 | 0.50 | -0.01 | -0.00 | +0.04 | 0.05 | 0.15 |
| season starts past the ceiling | 0.00 | 0 | 0 | 0 | 0 | 0.01 |
| boosts the deck queued a career | 0 | 7.93 | 7.94 | 0 | | |

Each band is the largest arm's reading plus two of OFF's sd, rounded up. 19,268 deck answers, none queued more than
momentsRoom allowed just before it. The pressure control (every deck move times ten) reads morale at 25 +9.33 and at 30
+5.76 and fires.

### Section 6, the share of summers a deck card was dealt (correction 15, for Round 1504's words)

Keepers 90.3, defenders 90.7, midfielders 94.3, forwards 92.9 percent (rc r1334-f1 on 82088d35, the pack as it ships,
400 careers of 18 seasons; the first reading, 89.2, 93.0, 94.7 and 92.6 on rc r1334-s3b, was the pack before ruling
2(j)). Over half for every group, so "most summers" is true; "every summer" is not. Round 1504 quotes these.

### The drill rule owed (correction 6(c))

Over the loaded fleet (section 5, rc r1334-f1 on 82088d35, the pack as it ships): 1,196 deck training answers, 0
landed less than they printed (the card is answered first), and with a full drill banked after each, 190 (15.9 percent)
would pass the ceiling only because of the deck's boost (the first reading, 1,163 and 172 or 14.8 percent on rc
r1334-s3b, was the pack before ruling 2(j)): careerDrills.ts applyDrillResult counts its room as drillHeadroom minus momentsPaid and never counts queued
boosts. Owed to the drills, not this round's (careerDrills.ts is read only here).

## Step 5: the final proof (code 82088d35, then ca88eaef for two retargeted controls)

- tsc 0; vitest 0 (34 files, 620 tests); simSoccerDeck in its three gate lines 0 (112 s, 69 s, 98 s; whole 188 s);
  sixteen controls each exit 1 FIRED on its own section (silent and drop retargeted at the outfield training keys in
  ca88eaef: their first form aimed at integrity, which the pack stopped moving, and changed nothing); the kit whole 0 and
  its 41 controls fired; simGmInbox seeds 1 to 3 byte equal to SC_BASE; the seventeen importers 0; the release gate's
  rc-BFa lines 0; the 24 rule fences 0 but the two that read the live database and simWritesAreSent (the same on base).
  Full list with result branch names: C:/Users/antho/dukb-handoff/2026-10-10/results-g/finish-1334.md.
- runAllSims on runners, six shards, 768 harnesses: 99 not green on the head, 7 of them killed at the 25 minute cap
  (simEras, simOpposition, simFootleKitNumbers, simCareerHall, simUsCareerSummer, simPress, simRoles; none reads this
  round's files but simUsCareerSummer, whose section 8 on the engine's deck ran alone green: 10,000 cases, 0 disagree).
  Every other one was rerun on the head and on SC_BASE on one runner (cmp.sh): the same exit and the same last line.
- The weight (r1334-w): no route of sweepWeight's table moves over 0.1K; /soccer-career +61 B at 832.4K. No built chunk
  holds the deck: nothing calls loadSoccerDeck, so Rollup drops the loader and its import; Round 1504 measures the chunk.
  (Round 1504: the page calls it now and the deck is a lazy chunk; see ROUND-1504-NOTES.md.)
- `git diff --quiet e814c2de -- src/pages src/components src/hooks` exits 0; `git diff --name-only e814c2de` is exactly
  the files this round owns; the dailies grep lists only Soccer Career's own files (both pasted under "Review fixes").
- Colours (`git grep -c`, summed): bg-blue-600 131 to 133, bg-emerald-600 265 to 267, bg-gray-800 8 to 10, bg-slate-600 0;
  the built CSS 56,553 B gzipped on both sides.

## Review fixes (2026-10-16, after the run and read reviews; the fixer's report is results-g/fix-1334.md)

### The two pastes decision 5 orders (on the fixed head)

`git diff --name-only e814c2de` (30 files, exactly "Files this round owns"):

```
docs/audits/ROUND-1334-NOTES.md
scripts/data/eventDeckWords.json
scripts/lib/careerSoccerDeck1334.mjs
scripts/qa/careerPressMarketKit.mjs
scripts/qa/careerTransferBriefKit.mjs
scripts/qa/derbyHistory1195.mjs
scripts/qa/seasonHistory1193.mjs
scripts/qa/soccerAgentReviewKit.mjs
scripts/qa/soccerFarewellKit.mjs
scripts/qa/soccerInternationalReturnKit.mjs
scripts/simCareerAwardsNight.mjs
scripts/simCareerLeagueFinish.mjs
scripts/simCareerLeagueSeasons.mjs
scripts/simCareerProgramme.mjs
scripts/simCareerSocialBrands.mjs
scripts/simCareerStoryRole.mjs
scripts/simCareerTrophyRuns.mjs
scripts/simEventDeck.mjs
scripts/simSoccerCareerDevelopment.mjs
scripts/simSoccerDeck.mjs
scripts/simSoccerDeckFairness.mjs
scripts/simSoccerWorldTruth.mjs
src/data/soccerDeck/index.ts
src/data/soccerDeck/starter.ts
src/data/soccerDeck/words.ts
src/lib/gmInbox.ts
src/lib/soccerCareerEngine.ts
src/lib/soccerDeck.test.ts
src/lib/soccerDeck.ts
src/lib/soccerDeckGate.ts
```

`git grep -l soccerCareerEngine -- src/pages src/components src/hooks` (35 files: the page plus 34 under
src/components/soccer-career, Soccer Career's own files only; the finish's "35 files under src/components/soccer-career"
miscounted by one):

```
src/pages/SoccerCareer.tsx
src/components/soccer-career/ AgentBrief.tsx AgentReviewCard.tsx CareerMentorTile.tsx CareerRecordsSheet.tsx
  CareerRecordsTile.tsx CareerStory.tsx DrillBoard.tsx FarewellSeasonCard.tsx FirstTouchBoard.tsx InternationalPanel.tsx
  InternationalReturnCard.tsx MoneyScreens.tsx PhonePanel.tsx PreseasonPlanTile.tsx PressRoom.tsx PressRoomTile.tsx
  ReducedRoleNote.tsx SeasonAmbitionTile.tsx SeasonCompetitionPanel.tsx SeasonRatings.tsx SeasonResumeChip.tsx
  SignedSlip.tsx SoccerCareerProgramme.tsx SoccerMomentBoard.tsx SoccerSeasonCentre.tsx SoccerSeasonHistory.tsx
  SquadSheet.tsx SquadTile.tsx ThroughBallBoard.tsx TrainingPanel.tsx TrophyCabinet.tsx careerMilestones.ts
  careerMoments.ts useSoccerMoments.tsx
```

### What the reviews changed (each its own commit)

- The unit test now deals every gated card on its side of each bound and never one step past it: 709 (yellows 7 and
  6), 710 (age 26 and 25), 714 (goals 4 and 3), 719 (goals 3 and 4 at apps 15, apps 14 at goals 3), 722 (age 31 and
  30), 724 (intApps 1 and 0), 726 (injuryWeeks 8 and 7), 727 (tier 1 and 2 at age 22, age 23 at tier 1). Eleven
  mutations, each moving one of those bounds one step or dropping 724's gate, each turn it red (rc r1334-fx1a, line
  muts: 11 of 11 caught, "1 failed | 27 passed" each). Before it, a data edit making 726's words false shipped green.
- Card 718 now reads "wants you quicker off the mark when the trigger comes" (Pace, what its option pays) instead of
  "able to keep it up for ninety minutes" (Stamina, a Physical line). Its frozen words row was recorded again on top of
  SC_BASE's file by the append mode (rc r1334-fx1b, line words); only soccer/718's text hash moved, so the file is still
  SC_BASE's plus appended rows.
- The gate's test seam bumps a load generation, so a load in flight when the seam resets can never write the deck or
  clear a newer load (unit tested both ways). The game never calls the seam.
- simSoccerDeck section 3 counts a deal, and a head fleet batch, holding a deck card wherever it sits, so the `last`
  control no longer prints "dealt no card" lines that are untrue under it; the header and section 8's pastCeiling comment
  now say what the code does.

### What the closing check changed (commit 627af305)

The kit's reach check over the soccer pack (section 10) was a coin toss: over its 1,000 seasons it was red at SEED 4 and
28 of seeds 1 to 30 (719 never dealt), green at the gate's default SEED 1, and its "all 28 cards reached" line printed
right after the FAIL (the ok branch ignored the unreached list, Round 1332's code). The pack has four rare cards (705,
719, 721, 727). Narrowing the goals spec did not cure it (goals 0 to 12 still red at SEED 16), and the specs are the
brief's list, so none moved. The fix drives the pack longer instead:

- `REACH_DESKS = { soccer: 500 }` in section 10: the soccer pack runs 500 desks of ten seasons (5,000), every other pack
  keeps the FLEET drive's 100. Over 5,000 seasons 719 was dealt 5 to 19 times at every seed 1 to 30 (rc r1334-fx2a), and
  section 10 is green at all 30 seeds on the commit (rc r1334-fx3a, line reach30).
- The reach FAIL prints the pack's real seasons ("over 5,000 seasons" for soccer, "over 1,000 seasons" for a GM pack as
  before), and the "all cards reached" line prints only when nothing is unreached.
- CEILING.soccer 0.131 from the 5,000 season measurement (above).
- A new control, `EVENT_DECK_CONTROL=unreach`: soccer's 719 is gated on goals below 0 in memory; section 10 exits 1 with
  "FAIL soccer: 1 cards never dealt over 5,000 seasons (719)" and no "soccer: all" line (rc r1334-fx3a, line ctl, with
  heavy and neutral firing as before).
- The GM packs read as before: sections 8 and 10 on SC_BASE and on the commit print the same lines but the two pack
  counts that include the soccer pack (rc r1334-fx3a, line gmequal: 23 lines each side, the only differences
  "7 packs" to "8 packs" in the banner and "ok 9 packs" to "ok 10 packs" in section 8). The kit's NFL measurement at
  seeds 1 to 10 is unchanged (19.38 to 20.39).

### The kit lines Round 1333 must keep

Decision 1(f) allowed appended lines only. These lines of Round 1332's kit are changed, not appended, each needed by the
soccer pack and each a no op for the GM packs (PACK_BINDS[k] and REACH_DESKS[k] are undefined for them):

1. Section 8: `E.gmPackProblems(p, PACK_BINDS[k]?.fx)` (was `E.gmPackProblems(p)`): without it every soccer key reads
   as unregistered.
2. Section 10's drive loop: `d < (REACH_DESKS[tag] ?? DRIVES.FLEET.desks)` and `{ observe, bind: PACK_BINDS[tag] }`
   (was `d < DRIVES.FLEET.desks` and `{ observe }`): without the bind, bindGmInbox throws on the soccer keys; without
   the desks, the reach check is the coin toss above.
3. Section 10's title line: "reached over at least 1,000 seasons".
4. Section 10's reach FAIL: the pack's own seasons in place of the fixed "1,000".
5. Section 10's ok line: `else if (!unreached.length) ok(...)` (was `else ok(...)`).

Appended, not changed: `CONTROLS.push('unreach')`, the control's header lines, REACH_DESKS and the control's block in
section 10, CEILING.soccer, PACK_BINDS.soccer, the PACK_INDEXES line, the words export and LAZY_IMPORTERS' push. If
Round 1333 drops 1 or the bind of 2, the kit goes red on the soccer pack by itself; if it drops the desks of 2, 4 or 5
nothing goes red at SEED 1, so its rewrite must carry them by hand and rerun section 10 at SEED 1 to 30. The kit's banner
line (Round 1332's) counts every pack but names only the GM seats ("8 packs (nfl, ..., afl)"); left as it is.

### Not changed, for the lead

- The non append kit lines above: the lead accepts them (they are the minimum the soccer index line of 1(f) and an
  honest reach check need) or rejects them.
- Ruling 2(j)'s residue: training still moves legacy +1.66 (BEST) and +1.56 (WORST) against an OFF spread of 1.21.
  (Round 1504: every training option now pays a time cost, held by a bind rule; see ROUND-1504-NOTES.md.)
- Round 1504 and the rollback plan: a save holding a pending deck card on a build where the deck is not loaded loses the
  card through Round 667's skip while the page's toast still promises its effect. The toast is the page's (Round
  1504's file); on this round's build no deck card can be dealt, since nothing calls loadSoccerDeck.
  (Round 1504 fixed the toast in the commit that deals the cards; its rollback plan is in ROUND-1504-NOTES.md.)

### The kit's two gate lines, seconds before and after (ruling 2(h))

Measured on one runner in one #!serial request (rc r1334-fx2a, line kit-time-1 base first, kit-time-2 head first), SC_BASE
e814c2de checked out beside the head at .rcbase, the head 8cbca428 (the pack as it ships plus the review fixes):

| line | SC_BASE | head |
|---|---|---|
| `SIM_EVENT_DECK_SECTIONS=1,2,3,4,5,6,7,8,9,10,11,12 node scripts/simEventDeck.mjs` | 48 s, 48 s | 48 s, 49 s |
| `SIM_EVENT_DECK_SECTIONS=13,14,15,16 node scripts/simEventDeck.mjs` | 103 s, 102 s | 104 s, 103 s |

Every run exit 0 and green. The soccer pack adds about a second to the kit; both lines stay under 150 s, so no third
line is owed by time (the finish's three way split, 13 alone and 14,15,16, also stands: 75 s and 25 s on rc r1334-fx2b).

After the closing check's 5,000 season soccer drive (627af305), line a again, one #!serial request (rc r1334-fx3b, base
first then head first, a slower runner than fx2a's): SC_BASE 57 s and 57 s, head 59 s and 59 s; section 10 alone 2.9 s
on SC_BASE (no soccer pack) and 3.2 s on the head. Line b is untouched by that commit (sections 13 to 16).

### The reach check, measured (the evidence behind commit 627af305)

rc r1334-fx1b and r1334-fx2a, a runner-only patch printing the least dealt cards of section 10, SEED 1 to 30 each:
the kit as the builder left it red at SEED 4 and 28 (719 at 0); with the soccer pack driven over five times the seasons
(5,000) green at all 30 seeds, the least dealt card 719 at 5 to 19 deals, the top card 726 at 9.82 to 11.04 percent over
seeds 1 to 10. The patch was `DRIVES.FLEET.desks * (tag === 'soccer' ? 5 : 1)`, the same 500 desks REACH_DESKS gives
(each desk keyed by its index, so the same deals); rc r1334-fx3a on 627af305 read the same ten top card shares to two
decimals and section 10 green at every seed 1 to 30.
