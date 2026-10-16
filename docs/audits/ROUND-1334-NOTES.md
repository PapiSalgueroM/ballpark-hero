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
- 708 for CDM: "a quick winger cannot get away from you once he is goal side", a holding midfielder tracks runners too; true enough, no position named.
- 710 for LB, RB, CDM: "the defensive walkthroughs", not "the back line"; true for all four.
- 712 for CAM and CM: set piece delivery; true.
- 715 for CAM: defensive shape work for an attacking midfielder is the point of the card; true.
- 716 to 720 for LW and RW: penalty duty, weaker foot, pressing from the front ("the press starts with the forwards"), a quiet season in front of goal and beating your man (worded "taking defenders on", not "your full back") are all true of a winger.

## Step 4: the kit's lines, the frozen words, simSoccerDeck 4, 7, 8 and 9

- scripts/simEventDeck.mjs: PACK_INDEXES gains `['src/data/soccerDeck/index.ts', 'SOCCER_DECK_PACKS',
  'src/pages/SoccerCareer.tsx']`; the entry exports SOCCER_FX_WORDS from src/data/soccerDeck/words.ts (never from
  soccerDeck.ts, ruling 2(h)); PACK_BINDS.soccer binds every soccer key over the kit's desk (a number in a bag made on
  first write, the real words); CEILING.soccer 0.137 (measured at seeds 1 to 10 on rc r1334-s4a and again on r1334-s4e:
  the top card is 726 every time, 9.00 to 11.70 percent, plus 2 points).
- TWO ONE LINE EDITS that are not appends, both needed the moment an index pack moves fx keys, which no index pack did
  before: section 8 called `gmPackProblems(p)` with no registry (every soccer key would read as unregistered), now
  `gmPackProblems(p, PACK_BINDS[k]?.fx)`; section 10 drove every index pack through runDesk with no bind (bindGmInbox
  throws on an unregistered key), now `{ observe, bind: PACK_BINDS[tag] }`. For the seven GM packs PACK_BINDS[k] is
  undefined, so both lines do exactly what they did (section 1's 84 replay rows, section 8 and section 10 are green with
  the GM numbers unchanged). Round 1333 rewrites sections 8 and 10: keep both arguments when it lands.
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

Keepers 89.2, defenders 93.0, midfielders 94.7, forwards 92.6 percent (rc r1334-s3b, 400 careers of 18 seasons). Over
half for every group, so "most summers" is true; "every summer" is not.

### The drill rule owed (correction 6(c))

Over the loaded fleet (section 5): 1,163 deck training answers, 0 landed less than they printed (the card is answered
first), and with a full drill banked after each, 172 (14.8 percent) would pass the ceiling only because of the deck's
boost: careerDrills.ts applyDrillResult counts its room as drillHeadroom minus momentsPaid and never counts queued
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
- `git diff --quiet e814c2de -- src/pages src/components src/hooks` exits 0; `git diff --name-only e814c2de` is exactly
  the files this round owns; the dailies grep lists only Soccer Career's own files.
- Colours (`git grep -c`, summed): bg-blue-600 131 to 133, bg-emerald-600 265 to 267, bg-gray-800 8 to 10, bg-slate-600 0;
  the built CSS 56,553 B gzipped on both sides.
