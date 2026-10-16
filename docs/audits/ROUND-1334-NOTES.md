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
| 706 | defender | A new way to defend corners | Your set piece coach | learn it (Morale -1, Defending +1); teach it (Integrity +1); N | 3 | 610 defensive details: ours is a zonal set piece setup |
| 707 | defender | Playing out under a press | The coaching staff | passing work (Passing +1); N | 3 | 600 passing reps: ours is a defender on the ball under a press |
| 708 | defender | Recovery runs | Your fitness coach | sprint work (Morale -1, Pace +1); N | 4 | 603 sprint workshop: ours is a defender's recovery pace |
| 709 | defender, yellows >= 7 | Timing your tackles | The analyst | the clips (Defending +1); N | 4 | 601 and 610 defensive clips: ours is his own bookings |
| 710 | defender, age >= 26 | Organising the defence | The coaching staff | walkthroughs (Morale -1, Integrity +1); N | 3 | 617 helping a training partner: ours leads the defensive walkthroughs |
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
| 721 | seniorSeasons < 2 | Learning from the senior players | The first team coach | go in early (Morale -1, Integrity +1); N | 99 | none: a once a career card |
| 722 | age >= 31 | Managing the miles | The sports science staff | load plan (Morale +2); N | 3 | 626 a veteran's warm up (physical work): ours is the load plan, rest |
| 723 | contractYear (exactly one year left) | The last year of your deal | Your fitness coach | cut the summer short (Morale -1, Integrity +1); full break (Morale +2); N | 2 | none: words about the summer's training only, never talks, offers, wages or a renewal |
| 724 | capped (last row's intApps > 0) | Back from international duty | The medical staff | whole break (Morale +2); come back early (Morale -1, Integrity +1); N | 2 | none |
| 725 | captain at his present club | Setting the standard | The coaching staff | set the tone (Morale +1, Integrity +1); N | 3 | 614 and 619 captain's afternoon and media duty: ours is preseason's first week |
| 726 | injuryWeeks >= 8 | The return plan | The physio | strength block (Morale -1, Integrity +1); ease back in (Morale +2); N | 2 | 625 looking back at an injury year (passing work): ours is the physio's plan |
| 727 | tier < 2, age <= 22 | Training with the best | The first team coach | go in early (Morale -1, Integrity +1); N | 3 | none |
| 728 | derbies >= 1 (derby meetings he played last season) | Derby clips | The analyst | watch them all (Morale +1); N | 3 | none: only the derbies he played last season, never next season's |

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
