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
