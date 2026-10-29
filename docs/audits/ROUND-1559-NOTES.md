# Round 1559 notes: the GM career's shared lift, proven equal on the NFL, plus the NHL's library (dark)

Branch r1559-gm-career-nhl, from 115c68092 (Round 1566's closed head, which holds origin/main 601435944 with Releases
BQ, BR and BS). Builders: session K lane (three runs; a restart reads .tmp-fx/NOTES.md and carries on).
Brief: C:/Users/antho/dukb-handoff/2026-10-10/briefs/brief-1559.md (section 0 binds), critic-1559.md (1 to 11 bind).
The lead's base ruling of 2026-10-29 11:55 EDT overrides the brief's R2. origin/main merged twice: dfb2720d7 (34139e137)
and 485f2740c (59a6f90db), board commits only, never a bot commit.

DARK: nothing a player sees changes. FrontOfficeBoard.tsx, NhlFrontOfficeBoard.tsx, every MLB and NBA board file and
every page are byte equal to BASE (`git diff --quiet 115c68092 HEAD -- <those paths>` exits 0). The only copy change is
Round 1533's finding 8 in football.ts (lead R4), with its frozen guide row and keyword index refreshed.

## What the round holds

1. THE LIFT, the NFL's names and signatures kept (step 1, 42cdd71d9):
   - src/lib/gmCareerBind.ts: careerLegacy and careerTakeSeat over a GmCareerSport spec (the outcome reader, the desk
     opener and its pick sync, the block rows, what the old club gets back). nflLegacy and nflTakeSeat are one line
     each over nflCareer().
   - gmCareerFace.ts: hostSeasonCounted (finding 11; nflSeasonCounted is a live re-export) and
     hostCareerRules(sport), the five "?" sentences, the books word read from gmSport's cap model (critic 12).
   - gmDeskHost.ts: hostOfferGoneLine, hostTakeoverLine, hostSatOutLine (the three feed lines of the NFL board).
   - src/components/front-office-shared/careerKitLoader.ts (makeCareerKitLoader, careerKitNeeded; a leaf, critic 15)
     and gmCareerKitCore.ts (the list every kit re-exports). nflCareerKitLoad.ts and nflCareerKit.ts built on them,
     the literal import('./nflCareerKit') kept in the NFL file (simFoLazyDesk reads that edge).
   - gmTradePackage.ts: keepRetainedOverSummer, and both desk summers (nhlGmDesk.ts, mlbGmDesk.ts) call it.
   - src/lib/gmCareerRules.test.ts holds every lifted piece equal to the NFL copy it came from: hostCareerRules('nfl')
     equals FrontOffice.tsx's five sentences evaluated from source, the three feed lines equal the board's templates,
     careerKitNeeded equals the board's kitNeeded expression on a 100 row table, the loader fetches once and forgets a
     failure (critic 13).
2. THE NHL'S LIBRARY, imported by nothing yet (step 2a, da78cbc70; 3cff6f38a):
   - nhlOffseason(league, rng, userTeam, { noUserClub }) trims every club to NHL_ROSTER_MAX with none skipped; without
     the option the summer is BASE's to the byte (every caller unedited and green). The option is read at the top of
     the function, so simNhlCpuRosters' earlyAge control (which moves the cut block) reads a declared name.
   - src/lib/nhlGmCareer.ts: nhlCareer (the spec), nhlOutcome, nhlDeskBlockRules, nhlLegacy, nhlTakeSeat, nhlAwayHost
     (the year out in the board's own call order).
   - nhlGmDesk.ts exports freshStaff and gains NHL_XP_LIVE (ownership, media) and NHL_XP_SOURCES.
   - src/components/nhl-front-office/nhlCareerKit.ts and nhlCareerKitLoad.ts (nhlCareerKitLoader). No route imports
     them: the weight run shows no nhlCareerKit chunk on /nhl-front-office.
3. ROUND 1533's FINDINGS: 8 (simGmCareer 2t, control thumbfalse; football.ts says the rule of thumb is on the grades
   alone), 11 (hostSeasonCounted), 12 (FrontOfficeGmCareer.test 'nfl board: a title watched at the club he took', and
   controlFrontOfficeBoard's donenow names caWatched among the tests it must turn red).
4. scripts/simGmCareer.mjs generalised: sections 2 to 8 read the DRIVE row; the 'nhl' row bound; 2t the guide's rule
   of thumb; 9 the bands seed by seed (R5); 10 the lift (the shared bind, the season counted rule and the retained step
   equal the NFL copies). Section 1's nhl recording from BASE: 10 seeds, 48 seasons, digest 838cdddf, recorded twice
   in two runner processes (r1559-s0); the nfl fixture text byte equal (digest 01d932fd).

## Section 9, calibrated (R5: the seed is the unit; three sets and a held out fourth; r1559-s2c on 5ce4d870c)

| stat | nfl (sets of 20) | band | nhl (sets of 40) | band |
|---|---|---|---|---|
| fireRate | .0618 / .0600 / .0581, held .0613 | [.0524, .0675] | .0366 / .0355 / .0351, held .0364 | [.0321, .0396] |
| twoPlus | .0366 / .0361 / .0464, held .0488 | [.0058, .0767] | .0488 / .0568 / .0475, held .0441 | [.0175, .0868] |
| meanOffers | 1.0366 / 1.0361 / 1.0464, held 1.0488 | [1.0058, 1.0767] | 1.0503 / 1.0568 / 1.0516, held 1.0441 | [1.0176, 1.0895] |
| closedNext | .5082 / .5504 / .5404, held .5297 | [.4329, .6257] | .4993 / .5523 / .4943, held .5300 | [.4241, .6225] |
| xpMean | 111.81 / 112.02 / 112.23, held 112.37 | [110.69, 113.35] | 121.73 / 121.55 / 121.56, held 121.87 | [120.98, 122.29] |

hired3 is 1 on every seed of every set of both rows: an invariant with its control (nooffers), never a band. The pace,
one band for every sport: median graded season XP over the 110 XP of hostXpHelp's .500 season, nfl .864 / .864 / .918
held .864, nhl .945 x3 held .945, band [.824, .985]; simGmDeskHost's 95 to 106 XP sits inside it. The NHL fires 0.036 of
its club seasons, so its row reads forty leagues (measureSeeds) to hold section 4's floor; more careers, never a lower
floor. Section 6's nhl draft ratio: .987 / .993 / .990, held .997, band [0.95, 1.01] (the NFL's).

## Steps and their runner results (every one read: the summary line and the exit code)

| step | commit | runner | result |
|---|---|---|---|
| 0 nhl DRIVE row, section 1 | 8b7b4cc94 | r1559-s0 | nhlrec1 0, nhlrec2 0, one digest 838cdddf98d5 (files byte equal); nflfull 0 (205 s); tsc 0; simGmDeskHost 0, simNhlGmDesk 0, simFoLazyDesk 0, simMlbGmDesk 0, simGmReload 0, vitest SeasonClose, GmCareer, LazyDesk 0; simGmStaff 1 (base red, Club Manager's) |
| 0b recording merged | 90d80903e | | the nfl text of the fixture byte equal |
| 1 the lift | 42cdd71d9 | r1559-s1a, s1b | tsc 2 (replaceAll in the new test, fixed 50623550e); nflfull 0 (fixture equal); vitest lift and fo 0; simGmDeskHost 1,2,3 / 4,5,6 / 7,8,9 0; emptyfeed FIRED; simFoLazyDesk 0 with eager 12, hostimport 3, tiertile 14904, boxseasons 20736; rostermove, depthstays 487 and hubcounted 2 on head AND base (equal); simNhlGmDesk, simMlbGmDesk, simNflGmDesk, simGmReload, simGmTradePackage (210), simGmXp, simGmSeat, simSessionMarks, simCollegeSeat, simNoInventedQuotes, simNoInventedConduct, simNoRivalNames (0 findings), simHarnessAnchors, controlFrontOfficeBoard check 0 |
| 2a the NHL library | da78cbc70 | r1559-s2a | tsc 0 |
| 2b simGmCareer generalised | 8e471ce98 | r1559-s2a | nflfull red in section 9 only (no bands yet, expected); nhlfull red in 4, 5, 6, 9 (floors and bands, fixed by 5ce4d870c and 8f68e9a7b) |
| finding 8 copy | 3e0cca688, 5d6a080ef | r1559-s2g | simGuideHeadings --refresh, simGuideHeadings 0, simSiteSearch 0 |
| 2c calibration | 5ce4d870c | r1559-s2c | bands computed from the logs (above) |
| bands + finding 12 | 8f68e9a7b, 5fe01e32b | r1559-s3a, s3b | tsc 0; vitest FrontOfficeGmCareer 0 (16 tests); donenow 1 of 1 FIRED; check 0; nhlfull 0; nflfull 0; every control of both rows FIRED (below) |
| merge main | 34139e137 | r1559-w, s4a, s4b | weight (below); the NHL engine list, the desks, the fences: all 0 but the base reds and simHarnessAnchors 1 (fixed 3cff6f38a) and simNhlCpuRosters 1 (its anchor, fixed 106260429) |
| anchors | 106260429 | r1559-s5 | simNhlCpuRosters 0; its all mode red on earlyAge (fixed 3cff6f38a); 16 more NHL harnesses 0 |
| final | 59a6f90db | r1559-f1, f2, f3 | see "The final run" |

## The controls of simGmCareer, both rows (r1559-s3a nhl, r1559-s3b nfl, on 5fe01e32b; each exit 1 and FIRED)

nfl: epoch 11, addkey 1, deskoffblock 1152, paytwice 384, lateseat 384, flatowner 2741, flatmedia 30, extradraw 1,
thumbfalse 1, firedclub 2, unkeyed 615, staffrides 487, ledgerrides 487, rostermove 487, depthstays 487, askrebuilt 269,
halfseason 60, notrim 17, awayxp 60, lastcall 20, noawaydraft 1, overlap 55, firedlost 27, hubcounted 2, emptytile 659,
nameinline 128, firenever 5, xpflat 2, nooffers 4, nevershut 1, legacyleak 768, retainedlift 12.
nhl: epoch 15, addkey 1, deskoffblock 1152, paytwice 384, lateseat 384, flatowner 2341, thumbfalse 1, flatmedia 30,
unkeyed 702, firedclub 1, ledgerrides 584, staffrides 584, rostermove 584, contribstays 491, askrebuilt 401,
halfseason 60, notrim 105, awayxp 60, lastcall 20, noawaydraft 1, retainedrolled 101, awaycontrib 63, overlap 94,
firedlost 19, hubcounted 2, emptytile 695, nameinline 128, firenever 5, nooffers 4, xpflat 2, nevershut 1,
legacyleak 768, retainedlift 12.
Against the NFL's recorded counts (r1533 and r1550-fc): staffrides, rostermove, depthstays, ledgerrides 487,
askrebuilt 269, notrim 17, halfseason 60, noawaydraft 1, emptytile 659, flatmedia 30, extradraw 1, deskoffblock 1152,
paytwice 384, lateseat 384, flatowner 2741, firedclub 2, overlap 55, firedlost 27, nameinline 128, awayxp 60,
lastcall 20, addkey 1: equal. Two moved, explained in "The final run": epoch (12 at r1533-s0c, 11 here) and unkeyed
(580 on BASE 115c68092, measured on the runner, 615 here). samesport was dropped (critic 5): section 1's NHL digest
from BASE proves the row drives the NHL engine.

## The weight (R6; r1559-w on 34139e137, base and head built on one runner, SWEEP_OFFLINE=1)

| route | BASE 115c68092 | head | rule |
|---|---|---|---|
| /front-office (sweepWeight) | 387.5K | 387.6K | within 0.3K: yes |
| /nba-front-office (sweepWeight) | 396.4K | 396.5K | within 0.1K: yes |
| /club-manager, /manager-hot-seat, /deadline-day | 636.1K, 650.2K, 660.1K | equal | within 0.2K: yes |
| /front-office route-own (analyze) | 126.1K, 39 files | 126.2K, 39 files | |
| /nhl-front-office route-own | 108.3K, 36 files | 108.4K, 36 files | within 0.1K: yes |
| /mlb-front-office route-own | 109.3K | 109.4K | within 0.1K: yes |
| /nba-front-office route-own | 128.8K | 128.8K | within 0.1K: yes |

Changed modules by rendered bytes (.tmp-fx/chunkDiff.mjs over the two chunk listings): /front-office +553
(gmCareerFace +233, nflCareerKitLoad -190, nflGmDesk -232, FrontOfficeBoard +4 from minified names only, its source
byte equal, gmTradePackage +241, careerKitLoader +497 new), the kit chunk nflCareerKit 6467 to 7052 (dynamic, 2.8K to
2.9K gz); /nhl-front-office +101 (nhlFrontOffice +6, nhlGmDesk -146, gmTradePackage +241); /mlb-front-office +95
(mlbGmDesk -146, gmTradePackage +241); /nba-front-office +241 (gmTradePackage only). No nhlCareerKit chunk is reachable
from any route (dark). The commits after 34139e137 move no shipped byte but nhlFrontOffice.ts's one declaration (moved,
not added). sweepWeight.mjs is not edited; the NHL and MLB rows are the lead's (open question 3).

## Known red on BASE, the same first line on BASE and head (each measured on a runner)

- simGmStaff: 40 failures, first "Arsenal natural: line 5 of 81 differs" (Club Manager's; BASE r1559-s4b base-three).
- simGmCalendar: 6 failures, first "Everton seasonDays: hash 158dee13... != recorded 4f6e77bb..." (Club Manager's; BASE
  r1559-s5 base-two).
- simSchemaNames and simLeaderboardCaps: the runner has no database by design.

## Owed

- To Round 1561 (R1): the NHL board (3.5's step 4 and 5 rows), useGmCareerKit, GmCareerKitHolding, careerBinding born
  with the NHL board as consumer, finding 9's floors, the lazy kit on /nhl-front-office, the walks (playGmCareer's NHL
  row with its four controls, playFoHub's NHL list), What's New, the weight of the bind, and the hockey guide lines.
- FrontOfficeGmCareer.test's NHL row is DONE in 1559 (the closing fix pass, 2026-10-29): the default path (seeds 1 to
  3, desk on and off, 13 to 16 checkpoints a case) and the three saves the base board wrote (fired desk on, fired desk
  off, the hub after round 9 desk on) were RECORDED from 115c68092 on runner request r1559-cf1 and replayed green on
  115c68092 and on the head in that request. The row runs the default path and the saves block only (BoardRow.career
  false); 1561 turns its career on with the bind, adds where each planted save lands (the out of work screen for the
  fired two), and uses a sibling NhlLazyDesk.test.tsx. controlFrontOfficeBoard's career titles are already scoped by
  the "nfl board:" prefix (critic 2); 1561 gives its NHL controls the "nhl board:" prefix.
- Guide sentences (R4: they turn false only when the NHL board ships the career, so they go with 1561):
  hockey.ts 1144 "... and at zero you are fired and the save ends." and 1213 "... at zero the save ends and you take
  another chair."; Part B baseball.ts 1168 and 1217; Part C basketball.ts 1898 and 1947. Each needs
  simGuideHeadings --refresh on a runner and genSearchKeywords after it lands.
- The NFL board onto the shared pieces (R3): a hard gate before Part B ships, and ROUND 1561's own job, its first step.
  Round 1542 is already in this round's base (`git merge-base --is-ancestor f80edfb3f 115c68092` is true: f80edfb3f is
  Release BR m7, which carries Round 1542), so R3's "if Round 1542 has closed when 1561 starts" holds, and there is no
  later 1542 merge that could move simGmCareer's nfl section 1 digest (it replays green on the head). In that step 1561
  re-aims the NFL's fifty board controls of controlFrontOfficeBoard.mjs and shows each FIRED. Until then
  gmCareerRules.test.ts holds the two copies equal (the feed lines, the kitNeeded truth table, the five "?" sentences).

## The final run (head 59a6f90db, origin/main 485f2740c merged; every summary line and exit code read)

- r1559-f1: tsc 0 (98 s). simGmCareer nfl 0 (273 s; section 1 digest 01d932fd, 0 of 95 checkpoints moved; section 4
  equal to BASE to the unit: 475 firings, raw first screens 192 / 228 / 55, last calls 87 of 475, re hired 377 of 377,
  311 straight after a badly season; 5: 487 taken, 475 followed; 6: 60 years out, draft ratio 0.984; 7: 21 firings,
  14 seats, 15 years out, 6 closed; 9 every band held; 10: 1536 legacy reads equal, 950 moves, 475 refusals) and BASE
  nfl 0 (227 s). simGmCareer nhl 0. Controls FIRED (exit 1, last line read): nfl unkeyed 615, epoch 11, flatmedia 30,
  extradraw 1; nhl flatmedia 30, notrim 105. simNhlCpuRosters 0 and its all mode 0 (11 modes; BASE all 0). Exit 0:
  simNhlGmDesk, simNhlDraftCapital, simNhlRosterLimit, simNhlWaiverReceipt, simNhlContributors,
  simNhlContributorsBoard, simNhlOpeningRatings, simNhlRatingEvidence, simGmReload, simFoHub, simGmDesk, simGmBooks,
  simGmInbox, simGmPress, simOwnerMandate, simDraftNight, simGmDraftOrder, simMlbGmDesk, simMlbFullRosters,
  simGmTradePackage (210), simNflGmDesk, simGmDeskHost on 1,2,3 / 4,5,6 / 7,8,9, simFoLazyDesk, simGmSeat, simGmXp,
  simBooks, simEngineIds, simFrontOfficeCuts (1187), simFrontOfficeSchedule, simGmContracts, simGmFarm, simGmLineup,
  simHomeFront, simLeagueCaps, simTradeFinder, simTradeTalks, simStorageWrites (owed 12); vitest nhl (nine files),
  mlb, lift (gmCareerRules, gmDeskHost, gmXp, gmSeat, GmCareerDesk) and fo (SeasonClose, GmCareer, LazyDesk, OnePress,
  frontOfficeSaveRecovery) all 0. Red: simGmCalendar 6 and simGmStaff 40, the BASE reds above.
- WHY TWO CONTROL COUNTS MOVED. epoch draws the id epoch from crypto.randomInt, so its count changes run to run: 12
  (r1533-s0c), 13 on BASE and 11 on the head in the same request (r1559-f1). unkeyed hands the market the harness's
  seeded Math.random, so its count follows every draw section 4 makes; section 9 reads the market once more for each
  man who passes. r1559-f4, one seed (SIM_SEED 3251579268, the stream seedRandom gives simGmCareer.mjs): head 615, the
  head with that one read removed (.rc/x/mutUnkeyed.mjs) 580, BASE 580. A copy without SIM_SEED read 565 (r1559-f1):
  seedRandom seeds by file name, so that number is a different stream and proves nothing.
- r1559-f3 (served build): playGmCareer 0 (468 s, walks A to D at 320, 390 and 1280, the slow kit walk at 390 and
  1280), eagerkit 2 of 2 guarded checks fired, playFoHub 0, playOwnerMandate 0, playDraftNight 0 (49 nights),
  sweepGames 0 findings (it ignores ONLY: 184 routes x 3 viewports, 552 checks). playGmPress 1, two failures, "the
  offseason set a new mandate" and "the feed credits the press answer for the softer bar", the pair finish-1550.md
  records red; BASE measured in r1559-f5.
- r1559-f5: BASE 115c68092 built and served on a second port: playGmPress exit 1 with the same two lines.
- r1559-f2: the 24 rule fences: 0 each (simHarnessAnchors 0 after 3cff6f38a, simNoRivalNames 0 findings,
  simResultMoment 0, simGuideHeadings 0 over 131 guides) but simSchemaNames and simLeaderboardCaps (no database on the
  runner) and simWritesAreSent ("no dist to serve"; served in f6). controlFrontOfficeBoard check 0 (every string of the
  50 controls once) and all 0: 49 of 49 FIRED (1444 s), so the finding 12 test disarmed none of the NFL's controls.
- r1559-f6 (served, dcd1272f7: src and scripts equal to 59a6f90db): controlFrontOfficeBoard blank exit 1, NOT FIRED,
  as it must; simWritesAreSent exit 1, 2 failures, first "the harness could not drive Guess the Nation to a finish"
  (finish-1533.md item 5 records the pair red on its base; this round touches no Guess the Nation file). BASE
  115c68092 built on the runner (r1559-f7): the same two failures, the same first line.

The lead's checklist, the NOT RUN list and what Round 1561 must know are in
C:/Users/antho/dukb-handoff/2026-10-10/results-g/finish-1559.md.
