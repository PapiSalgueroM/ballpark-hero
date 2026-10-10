# Round 1215 notes: the live match walk can be replayed

Written 2026-10-10 by the desktop Claude lane (session G), builder of Round 1215.
Branch `r1215-live-walk-replay`, base origin/main 074a9054. Files: `scripts/lib/pageSeed.mjs` (new),
`scripts/playLiveMatchFit.mjs`, this file. Nothing under `src` was touched: no engine, no rule, no save, no screen.

## Why

Release AR's gate found a bug that had been live since Round 1101 (a goal lost its net and its scorer card when the
other side changed a man in the same minute) only because `scripts/playLiveMatchFit.mjs` happened to be dealt that
match. The walk never called `Math.random` itself. The PAGE does (Club Manager's engine draws from the ambient
`Math.random`), and three fresh browser contexts were dealt three matches nobody could ask for again. A red could
not be played a second time and a green proved little.

## What changed

1. `scripts/lib/pageSeed.mjs`: a helper a walk CALLS. `pageSeedOf(scriptPath, raw)` reads the seed (a whole number,
   the word `fresh`, or undefined for the FNV hash of the walk's file name; an empty or malformed value throws,
   because `Number('')` is 0). `seedPages(target, seed)` adds one init script to a context or a page that installs
   the mulberry32 of `scripts/lib/seedRandom.mjs` and keeps `window.__pageSeed = { seed, draws }`.
   `pageDraws(page)` reads the count. It is deliberately NOT in `playwrightLoader.mjs`: `playRenderStability` and
   `playSnapshotDrift` exist to see what an unseeded page does.
2. `playLiveMatchFit` prints its seed and the command that replays the run as its FIRST line. Its three contexts
   (phone, reduced motion phone, wide screen) take seed, seed + 1 and seed + 2. Each prints the match it opened:
   the page's draw count at kick off and a digest of everything the engine drew for it.
3. The digest is an FNV hash of the save's whole `live` object (every shot, corner, foul and throw in of the half,
   the goals, the cards, the share of the ball, the other eleven), keys sorted, with two things taken out because a
   clock writes them and no draw does: `live.minute`, and the squad's ids (turned into the man's place in the squad
   and his name, since an academy player's id carries `Date.now()`, clubManager.ts line 4702).
4. `LIVE_FIT_REPLAY=1` is the proof of the seed: four fresh contexts open the first match, A, B and C on the seed
   and D on the next. A, B and C must print one digest and one draw count, D another digest, and the page must
   draw nothing in five idle seconds. `LIVE_FIT_CONTROL=noseed` (replay mode only) leaves the helper out: three
   contexts must then open three different matches (exit 1 as it must, 3 otherwise).
5. A red hands back its match. The save is kept as stored when a goal is picked to be watched. On a red in
   section 1, 2 or 7 it is written to `LIVE_FIT_SHOTS`, `RC_OUT` or the temp folder as
   `[control-]live-fit-save-<phone|calm|wide>.json` with the goal that was watched, and two lines are printed:
   `RED TO REPLAY: section N (view), match digest X, the goal watched ...` and the path, the size and the command.
6. `LIVE_FIT_SAVE=<file>` starts EVERY context from that save instead of taking a job (put into storage through
   the context's `storageState`, before any page loads). The match is paused as soon as its stage is up and let
   run when the goal is picked, so a goal in the first minutes is still to come. A dump pins the goal that was
   watched; a plain stored save (what localStorage holds under `dukb-club-manager-save`) is accepted too, and
   then the walk picks its goal by its own rule. Every context checks that the match that opened has the digest
   the file was dumped with.
7. `goalsOfHalf` names an own goal by the man who put it in (the name on the card) and marks it. A goal of mine
   that went in off one of theirs keeps the scorer it was drawn for in `name` and carries the man in `og.n`; the
   old line printed the wrong man. "the goal watched" is now printed on every run, with the half's count of own
   goals.

Every assertion the walk made before is still made, on the same frames. The default run is as strict as it was.

## What Round 1216 can rely on (the interface)

- `LIVE_FIT_SEED=<n>`: one knob. Unset is 3208792607, the hash of `playLiveMatchFit.mjs`. `fresh` draws one from
  the clock and prints it first.
- `LIVE_FIT_REPLAY=1`, and with it `LIVE_FIT_CONTROL=noseed`: section 8 of the walk today. A new section of the
  walk should take the next free number (9), or the replay moves; the dump reads its view off `VIEW_OF`
  (section 1 phone, 2 calm, 7 wide), so a new watching section adds its own row there.
- `LIVE_FIT_SAVE=<file>`: either a dump of the walk or a plain stored save with a match in flight. The envelope is
  `{ liveFitSave: 1, walk, seed, view, section, control, digest, target, bytes, raw }`, where `raw` is the stored
  string byte for byte and `target` is `{ minute, plus, place, side: 'me' | 'opp', own, name }` with `name` the
  man on the card. A save an engine search found in node can be handed over the same way: write
  `{ liveFitSave: 1, raw: JSON.stringify(cm.trimCareer(career)), target }` and the walk watches that very goal at
  the three sizes, held until it is picked. Leave `digest` out when the file is made by hand and the check is
  skipped.
- In the walk: `matchDigest(save)`, `goalsOfHalf(page)` (goals with `side`, `own`, `name`, and `raw`),
  `opening(page, label, seed)`, `seededContext(options, seed)`, `holdIfSaved(page)`, `dumpSave()`, and
  `watchAGoal(page, { tapCard, onTick, view })`.
- What the seed promises: the opening match of each context. A reload starts the stream again from the top.
  Later halves are drawn from the same stream when the walk reaches them, so two runs on one seed watched the
  same three goals in every run so far, but a goal picked right at the edge of the rule (two minutes ahead of
  the clock) can fall either way with the runner's timing. The file replay has no such edge.

## The proof, on GitHub runners (head 33efc2ce, the commit that made the change)

Result names are branches `rc-results/<name>` on origin; a log is
`git show origin/rc-results/<name>:logs/<label>.log`.

| What | Result, label | Exit | What it printed |
|---|---|---|---|
| The clean walk, twice, one seed | r1215-b1 clean-1, clean-2 | 0, 0 | all green, 97 s each; the same three digests (421656fa, e14582e9, 50a7cae5) and the same three goals watched (28' against me, 57' against me, 5' own goal for me) |
| Another seed, a fresh seed | r1215-b1 seed-7, fresh | 0, 0 | all green; seed 7 gave 8ef206aa, d319e98e, 92caa5c6; fresh drew 636123010 and printed it first |
| An empty seed is refused | r1215-b1 badseed | 2 | "a page seed must be a whole number ... and this one reads """ |
| One seed, one match, three runs in a row | r1215-b2 replay-1, replay-2, replay-3 | 0, 0, 0 | each: seed 3208792607 gave digest 421656fa in A, B and C with 1869 draws at kick off; seed 3208792608 gave e14582e9 |
| Two seeds, two matches | the same three, r1215-b2 replay-7, r1215-og (12 seeds) | 0 | 15 seeds in all, 15 pairs of different digests, no seed ever gave two digests |
| The control goes red for its own reason | r1215-b2 noseed | 1 | "control noseed turned the replay red on the line it must (with no seed, three contexts opened three different matches: 2cacae82, 394d4f60, e8b04a58)" |
| The control alone is refused | r1215-b2 noseed-alone | 2 | it is the replay mode's control |
| A forced red dumps its save and the file replays it | r1215-b3 forced-nocard | 0 | both runs exit 1 on "no scorer card was ever on screen", both print `RED TO REPLAY: section 7 (wide), match digest 50a7cae5, the goal watched 5' Lewis Hall (own goal), for me` |
| The same with another assertion | r1215-b3 forced-earlyscore | 0 | both runs exit 1 on "the score changed before the ball was in", the same RED TO REPLAY line twice |
| A plain stored save | r1215-b3 plain-save | 0 | the whole walk from the stored string alone, all green |
| The old controls and the measuring pass | r1215-b4 bar, silentlist, report | 1, 1, 0 | each as it must; the two section 7 controls are the first runs of the forced reds above |
| Type gate, rival names, harness anchors | r1215-b4 tsc, rivals, anchors | 0, 0, 0 | 0 findings, every harness parses |

The draw counts of one context on the walk's own seed: 7 once the page had settled, 7 after 2.5 seconds
untouched, 736 with the job taken, 1869 at kick off, 1869 after 2.5 seconds of the match. So nothing on
/club-manager draws on a timer, before the job or while a match plays, which was the one thing the design could
not rule out by reading. A dumped save is 70,855 bytes as stored and 85,510 in its envelope.

`forced.sh` (the request's extra file) runs a control, then runs it again from the dumped file, and passes only
when both exits are 1 and the two `RED TO REPLAY` lines are equal.

The same again after origin/main (faf0a5f3) was merged in, on head 4bdb64f3, result r1215-m1: clean exit 0,
replay exit 0 with the same digest 421656fa and 1869 draws, noseed exit 1 as it must (5fecfd1a, 20df1d6a,
bd2c8e33), forced-nocard exit 0 (replayed), bar and silentlist exit 1 as they must, type gate 0, rival names 0
findings, harness anchors green.

And on the build of origin/release-at-int dfe9f2c1 with this round's scripts (its `src`, `public` and
`index.html` laid over the checkout), result r1215-atw: the clean walk twice exit 0 with the same three digests
(8cc933c5, 5f163ea3, a89c21b0) and the same three goals both times, the replay mode twice exit 0 (8cc933c5,
1864 draws), noseed exit 1 as it must, a forced red replayed from its file (exit 0), a fresh seed exit 0, and
the save dumped on main (an own goal for me at 5') replayed there at the three sizes, all green (oldsave-at).
So the walk holds on the tree Release AT brings, VAR and the real fixture list included.

An aside the proof turned up: on main the walk's own seed opens the wide screen's match with an own goal for me
at 5' and watches it. In the browser 6 of 49 first half goals of 36 opening matches were own goals, which looked
far above the rule's one in 32, so the engine was asked directly in node (result r1215-ograte, 1,200 first matches
a club): Crystal Palace one eligible goal in 33.3, Aston Villa 33.7, Real Madrid 35.5, Lyon 38.6, Ajax 83.8 (thin
opposing elevens have nobody to name). The rule is right; the walk's six were luck.

## Base readings (step a), before any edit

| Reading | origin/main 074a9054 (r1215-base) | origin/release-at-int ca780b9c (r1215-at) |
|---|---|---|
| `playLiveMatchFit` as it was, unseeded, twice | green, 100 s and 95 s | green, 88 s and 111 s (VAR on) |
| The part alone (`LIVE_MOTION_ONLY=bundle`) | 19,526 bytes minified, 8,179 gzipped | the same |
| Its ceiling, and what the harness records | 23,133 and 9,693; BUNDLE_MEASURED says 19,277 and 8,077 | the same |
| `[AR held cast] the half found on attempt` | 2 | 71 |
| `[1101 R6] chances staged` | 2,150 | 2,053 |
| `vitest run src/test/liveSimMotion.test.tsx` | 1 file passed | 3 failed, 52 passed (see below) |
| `/club-manager` in sweepWeight (SWEEP_OFFLINE=1) | 577.6K of a 578K budget | 581.7K, over |
| `/soccer-career` | 786.3K of 786K | 796.1K, over |
| `scripts/play*.mjs` | 92 | 100 |

On release-at-int the reading was taken by laying its `src`, `scripts`, `public` and `index.html` over the runner's
checkout (nothing else differs from main but workflow files) and building that. Two things there are Release AT's
and not this round's:

- `src/test/liveSimMotion.test.tsx` is red: "the material is 200 half feeds from five clubs in five leagues"
  expected `[15, 20, 20, 20, 20]` to equal `[20, 20, 20, 20, 20]` (Aston Villa on seed 110101 gives 15 matches, not
  20), and R7 and R8 then read 190 halves where they want 200.
- sweepWeight has four rows over budget: /club-manager 582K of 578K, /soccer-career 796K of 786K,
  /manager-hot-seat 600K of 596K, /deadline-day 610K of 606K.

For Round 1216: the part has 3,607 bytes minified and 1,514 gzipped under its ceiling; the Release AR search needs
71 attempts on the base, so a twin that also wants an own goal (one eligible goal in 32) would want about 2,300
attempts against a cap of 4,000, which is too close to trust on the real engine (the critic's correction 9).

## Every walk of the base, and where its pages get their random numbers

Re-taken on origin/release-at-int (ca780b9c, then dfe9f2c1), which has 100 `scripts/play*.mjs` where origin/main
has 92. NOTHING HERE WAS EDITED: no other walk, no fence. The fence over unseeded walks is its own round, after
the other lane's PR216 is on main and after a note on the board (the critic's correction 11): PR216 adds two
walks and this lane's ratings round adds one, so a ratchet built today would go red on the next walk anybody adds.

How the two columns were made:

- "Contexts, pages" is a grep of the file with comments stripped (`.newContext(` and `.newPage(` call sites). It
  is a reading, not a run.
- "Draws" is MEASURED on a GitHub runner (results r1215-d1 to r1215-d5, on this branch's tree, which is main's 92
  walks): each unedited walk was run under a counter that wraps `Math.random` in every page through one init
  script, SEEDS NOTHING, and prints the total when the walk exits
  (`node --import ./.rc/x/drawcount.mjs scripts/<walk>.mjs`, the counter is the request's extra file and is not in
  the repo). The count is a floor: a page reports twice a second, so draws in the last half second before a
  navigation can be missed. Calibration: the live match walk's own control noseed gave 5,498 draws in 3 page
  loads, 1,833 a context, against 1,782 to 1,883 counted by the helper at kick off.
- The site's own shell draws 7 numbers on every load of a game route and 4 on a plain page. So a walk whose count
  is about 7 times its page loads draws nothing of its own.
- 18 walks exited non zero under the counter. They were run again WITHOUT it (result r1215-dx) to see whether the
  counter did that: see the list under the tables.

100 walks on the base: 26 assign Math.random somewhere, 36 play an engine through the page with no seed (the scout's reading), 38 draw nothing that decides what they assert (the scout's reading, plus playCareerStoryRole).

### A. Already assign Math.random (no change now; each can move to the shared helper when next touched)

playBoxingShowForecast1086, playCareerHallLine, playCareerLeagueWorld, playCareerSquad, playCareerTrophyRuns (new on the base), playCmQuickSubs, playCmRealFixtures (new on the base), playCmVar (new on the base), playDerbyHistory1195 (new on the base), playDraftDetectiveReports (new on the base), playHomeSearchRecovery1088, playReducedMotion, playRenderStability, playSeasonCentre, playSeasonCentreMotion, playSeasonMoments, playSoccerCareer, playSoccerCareerDepth (new on the base), playSoccerCareerDevelopment (new on the base), playSoccerHubGrid1089, playSoccerOfferReview1082, playSoundGate, playTranslatedPage, playTycoonSaleReview1083, playTycoonSetPieceFit, playUsSeasonCentre.

### B. Play an engine through the page with no seed

| Walk | Contexts, pages (grep) | Draws its pages made, counted with nothing seeded |
|---|---|---|
| playCareerHub | 1, 1 | 22 in 2 page loads (/nfl-my-career 22); the walk itself exited 1 |
| playCareerPress | 0, 1 | 70 in 2 page loads (/nfl-my-career 70) |
| playClubManager | 1, 0 | 16,949 in 1 page loads (/club-manager 16949); the walk itself exited 1 |
| playClubManagerNewCountries | 1, 1 | 6,223 in 5 page loads (/club-manager 6223) |
| playClubManagerSaveLeave | 1, 1 | 3,408 in 4 page loads (/club-manager 3404, / 4) |
| playClubManagerSlots | 1, 1 | 1,913 in 3 page loads (/club-manager 1909, / 4) |
| playCmDataOnDemand | 1, 1 | 105 in 15 page loads (/club-manager 56, /manager-hot-seat 14, /deadline-day 14) |
| playConquestScenes | 1, 0 | 7,736 in 4 page loads (/soccer-conquest 4836, /conquest 2900) |
| playDealDesk | 1, 3 | 748 in 2 page loads (/club-manager 748) |
| playDepthChart | 0, 4 | 120 in 8 page loads (/nfl-my-career 56, /nba-my-career 23, /nhl-my-career 23) |
| playEra2005 | 0, 2 | 14 in 2 page loads (/club-manager 14); the walk itself exited 1 |
| playEra2010 | 0, 1 | 7 in 1 page loads (/club-manager 7); the walk itself exited 1 |
| playEra2015 | 0, 3 | 14 in 2 page loads (/club-manager 14); the walk itself exited 1 |
| playEra2020 | 0, 1 | 14 in 2 page loads (/club-manager 14); the walk itself exited 1 |
| playExtension | 3, 3 | 209 in 12 page loads (/nfl-my-career 132, /nba-my-career 26, /nhl-my-career 26) |
| playFoHub | 1, 1 | 2,124 in 12 page loads (/front-office 1220, /nba-front-office 483, /mlb-front-office 233); the walk itself exited 1 |
| playFoOneRating | 1, 1 | 28 in 4 page loads (/front-office 18, /nfl-gauntlet-draft 10) |
| playFreeAgency | 0, 2 | 130 in 4 page loads (/nfl-my-career 66, /nhl-my-career 64) |
| playGames | 2, 1 | not measured |
| playGmPress | 0, 2 | 31,198 in 6 page loads (/front-office 30333, /nba-front-office 474, /mlb-front-office 218); the walk itself exited 1 |
| playIphone | 2, 2 | 71 in 14 page loads (/leaderboard 18, / 11, /stadium-tycoon 10); the walk itself exited 1 |
| playLegacy | 1, 2 | 73 in 3 page loads (/stadium-tycoon 73) |
| playLiveMatchFit | 3, 1 | SEEDED BY THIS ROUND: 1,869 at kick off on its own seed, about 1,833 a context unseeded (5,498 in 3) |
| playNationJob | 1, 3 | 7 in 1 page loads (/club-manager 7); the walk itself exited 1 |
| playNationalities | 0, 2 | 7 in 1 page loads (/club-manager 7); the walk itself exited 1 |
| playNbaNumbers | 1, 1 | 395 in 6 page loads (/nba-my-career 395) |
| playNflTruth | 1, 1 | 526 in 20 page loads (/nfl-my-career 526) |
| playOwnerMandate | 0, 2 | 30,896 in 6 page loads (/front-office 30030, /nba-front-office 475, /mlb-front-office 218) |
| playReleaseClause | 0, 1 | 7 in 1 page loads (/club-manager 7); the walk itself exited 1 |
| playSeasonReveal | 0, 2 | 46 in 1 page loads (/nfl-my-career 46); the walk itself exited 1 |
| playSessionMarks | 0, 3 | 4,756 in 4 page loads (/front-office 4658, /stadium-tycoon 52, /nfl-my-career 46) |
| playSponsors | 0, 1 | 7 in 1 page loads (/club-manager 7); the walk itself exited 1 |
| playStartingXi | 1, 5 | 1,069 in 2 page loads (/soccer-career 1069); the walk itself exited 143 |
| playStorageBlocked | 1, 2 | 10,328 in 176 page loads (/front-office 7277, /build-your-xi 1520, /stadium-tycoon 407) |
| playTradeTalks | 0, 2 | 1,691 in 3 page loads (/front-office 1216, /nba-front-office 475) |
| playWilderness | 1, 3 | 7 in 1 page loads (/club-manager 7); the walk itself exited 1 |

### C. Draw nothing that decides what they assert, by the scout's reading

| Walk | Contexts, pages (grep) | Draws its pages made, counted with nothing seeded |
|---|---|---|
| playAdRoutes | 1, 9 | 173 in 29 page loads (/footle 64, / 15, /football-timeline 11) |
| playArcadeHelp | 1, 1 | 56 in 8 page loads (/free-kick 28, /buzzer-beater 28) |
| playAutocompleteRace | 1, 1 | 652 in 26 page loads (/build-your-xi 500, /football-connect-4 138, /missing-xi 14) |
| playBootShift | 1, 1 | 32 in 5 page loads (/football-grid 7, /nba-grid 7, /pro-football 7) |
| playCareerMoments | 1, 1 | 44 in 8 page loads (/soccer-career 44) |
| playCareerStoryRole (new on the base) | 2, 2 | not measured |
| playChainTimelineMotion | 1, 1 | 48 in 24 page loads (/ 48) |
| playCollegeGridFirstTap | 1, 1 | 83 in 14 page loads (/college-grid 83) |
| playCorruptSaves | 1, 0 | 458 in 67 page loads (/nfl-my-career 33, /nba-my-career 33, /mlb-my-career 33) |
| playFirstTeamFit | 0, 1 | 0 in 0 page loads (none) |
| playFlagshipLazy | 1, 1 | 14 in 2 page loads (/soccer-career 14) |
| playFootballConnect4Failures | 1, 1 | 45 in 5 page loads (/football-connect-4 45) |
| playGridCellGeometry | 1, 1 | 2 in 1 page loads (/ 2); the walk itself exited 1 |
| playGridCls | 1, 1 | 42 in 6 page loads (/soccer-grid 7, /football-grid 7, /college-grid 7) |
| playHomeFold | 4, 4 | 88 in 13 page loads (/ 84, /about 4) |
| playHomeReveal | 0, 2 | 15 in 2 page loads (/ 14, /cage-clash 1) |
| playHowTo | 1, 1 | 1,302 in 133 page loads (/teammates 601, /nba-starting-5 112, /stadium-tycoon 10) |
| playInboxCard | 1, 1 | 16 in 8 page loads (/ 16) |
| playIndexing | 0, 1 | 61 in 13 page loads (/stadium-tycoon 10, / 7, /club-manager 4) |
| playLeagueTableFit | 0, 1 | 0 in 1 page loads (blank 0) |
| playLightMode | 1, 2 | 55 in 12 page loads (/ 15, /higher-lower 8, /soccer 4) |
| playLineupValidator | 1, 1 | 2,725 in 11 page loads (/build-your-xi 2725) |
| playLiveRenderedAudit | 2, 1 | 145 in 25 page loads (/leaderboard 7, /leaderboard/ 7, / 7) |
| playLiveTicker | 4, 4 | 35 in 5 page loads (/ 35); the walk itself exited 1 |
| playRelatedGames | 0, 1 | 14 in 2 page loads (/footle 7, /golf-higher-lower 5, /guess-the-golfer 2) |
| playSnapshotDrift | 1, 1 | not measured |
| playSoccerCareerAwardReveal | 1, 1 | 22 in 4 page loads (/soccer-career 22) |
| playSoccerCareerCompetitions | 1, 1 | 14 in 2 page loads (/soccer-career 14) |
| playSoccerCareerContracts | 1, 1 | 56 in 8 page loads (/soccer-career 56) |
| playSoccerCareerDiscipline | 1, 1 | 14 in 2 page loads (/soccer-career 14) |
| playSoccerCareerFamily | 1, 1 | 110 in 20 page loads (/soccer-career 110) |
| playSoccerCareerLeagueWorld | 1, 1 | 42 in 6 page loads (/soccer-career 42) |
| playSoccerCareerOpponents | 1, 1 | 28 in 4 page loads (/soccer-career 28) |
| playSoftFourOhFour | 0, 1 | 0 in 1 page loads (/ 0) |
| playTycoonGearFit | 2, 1 | 16 in 4 page loads (/ 16) |
| playUsCareerSaveSeam | 2, 0 | 119 in 15 page loads (/nba-my-career 40, /nfl-my-career 24, /mlb-my-career 24) |
| playWc2026Reset | 1, 1 | 702 in 4 page loads (/world-cup-bracket 702, blank 0) |
| playWorldXiReportFit | 0, 1 | 0 in 0 page loads (none) |

The 18 walks that exited non zero under the counter, and the same walks without it (result r1215-dx):

- 17 of the 18 are red the same way without the counter, so they are red on a GitHub runner as they stand, for
  reasons of their own that this round did not chase (none of them is in this round's files):
  playCareerHub (a timeout waiting for a button reading "Hub"), playEra2005, playEra2010, playEra2015, playEra2020
  (a timeout waiting for a club's button), playNationJob, playNationalities, playReleaseClause, playSeasonReveal,
  playSponsors, playWilderness (timeouts on the way in, each after about 35 seconds), playGridCellGeometry (an
  assertion in its first second), playFoHub (26 failures, the first "NFL: the hub opens on five boxes (saw 9)"),
  playGmPress (2 failures), playIphone (1), playLiveTicker (2), and playStartingXi (still running at the 300
  second cap both times). Their draw counts above are what their pages drew before they stopped.
- playClubManager is the one that differed: exit 1 after 99 seconds under the counter ("SHALLOW 16 transfer
  window(s) opened and not one signing completed", 1 finding) and exit 0 after 267 seconds without it (0
  findings). It is an unseeded walk through a whole career, so each run plays another career. Whether the counter
  or the draw made the difference was put to three more runs each way (results r1215-pc1 and r1215-pc2):
  under the counter exit 0, 0 and 0 (48,082, 26,546 and 41,097 draws in 279, 158 and 231 seconds), without it
  exit 0, 0 and 0. So one run in eight was red, and its own log says why: "ending: was sacked, which is a real
  ending" with 0 signings in 16 windows. The counter hands back the page's own numbers, so the likelier reading
  is the career that run was dealt, which is the coin toss a seed would end; eight runs do not prove a rate.

What the counts say that the reading could not:

- Group B is confirmed for the walks that reach their engine: playGmPress 31,198 draws, playOwnerMandate 30,896,
  playClubManager 16,949, playStorageBlocked 10,328, playConquestScenes 7,736, playClubManagerNewCountries 6,223,
  playSessionMarks 4,756, playClubManagerSaveLeave 3,408, playFoHub 2,124, playClubManagerSlots 1,913,
  playTradeTalks 1,691, playStartingXi 1,069 before its cap, playDealDesk 748, playNflTruth 526, playNbaNumbers
  395. These are the ones a seed changes most, the Club Manager and front office walks first.
- Two of group B draw nothing of their own and could move to group C: playCmDataOnDemand (105 in 15 loads) and
  playFoOneRating (28 in 4 loads).
- Four of group C draw far more than the shell and belong in group B until somebody reads what the draws
  decide: playLineupValidator (2,725 on /build-your-xi), playWc2026Reset (702 in 4 loads of
  /world-cup-bracket), playAutocompleteRace (652, of them 500 on /build-your-xi and 138 on
  /football-connect-4) and playHowTo (1,302 in 133 loads, of them 601 on /teammates).
- The change each walk of group B needs is the same two lines: import the helper, and call `seedPages` on each
  context (or page) before its first goto, printing the seed. playGames plays every route, so its seed should be
  keyed on the route as well. Each conversion changes what a walk meets and needs its own runner proof, which is
  why none was made here.
- playSnapshotDrift and playRenderStability must never be handed a blanket seed: seeing what an untouched or
  re-clocked page does is their job.

`scripts/qa` on the base: 54 entries, 48 of them `.mjs` (51 and 45 on main; the three new ones are
derbyHistory1195, playSeasonHistory1193 and seasonHistory1193). 17 of the `.mjs` assign Math.random. 34 drive a
browser, and 21 of those do not assign it, plus revealScrollOffline1089.cjs. By their headers ten of the 22 play an
engine on the built site and want the same two lines (buzzerShotLab997, cageClash1063, career992,
careerPractice1076, freeKickLab1070, managerMatchPlans1079, managerWorldBrowser1077, mmaPromotion1062,
soccerCareerSaveRetry1078, tycoonTicketPolicy1080) and twelve run on frozen fixtures and want nothing
(careerLook996, footle995, footleClueDesk1001, footleUnlimited1006, gamePicks1005, home991, hubs994,
rankEmCircuit999, rugbyLeague998, rugbyLeagueReview1007, soccerCreateTranslation1096,
revealScrollOffline1089.cjs). They are the other lane's files: listed, owed to that lane, never edited here, and
not measured.

## What a later session must not trust

- A digest is the same between runs on one browser build. The drawn match holds floating point numbers (the
  expected goals of each stretch), so a new Chromium could print another digest for the same football. Compare
  digests of one run with digests of the same runner image, not with a number copied from these notes.
- The seed's matches are the build's: on release-at-int the real 2026/27 fixture list sends every Crystal Palace
  context to Everton first, so the three digests there are 8cc933c5, 5f163ea3 and a89c21b0, not main's.
- A fixed seed makes the walk replayable and also blind: Release AR's bug was met because each run dealt other
  matches. The release gate's second run of this walk should be `LIVE_FIT_SEED=fresh`, whose first line is the seed
  to replay it with.
- The own goals the walk met are luck, not a rate: see the engine's own count in the closing report (one eligible
  goal in 33.3 over 1,200 first matches of Crystal Palace).
