# Round 1533 notes: NFL Front Office, fired is a chapter and not the end

Branch r1533-fo-gm-career, from origin/main 6d2d7a7d (BASE, Release BO recorded). Builder: session J.
Brief: C:/Users/antho/dukb-handoff/2026-10-10/briefs/brief-1533.md (section 0 binds), critic-1533.md.
Step order (critic correction 4, lead R1): 0, 0b, 1, 4, 5, 2, 3, 6. Steps 4 and 5 were landed together (the brief
allows it): the market panel draws its stay out button whenever next year is open, so a step 4 without the year out
would have drawn a button that did nothing.

## Step 0: the base run (no src file outside the new test and its fixture)

Runner result r1533-s0a on BASE 6d2d7a7d: tsc 0; simGmXp, simGmDeskHost (1,2,3), simGmSeat, simNflGmDesk,
simGmReload, simCollegeSeat, the two 1223 vitest files, FrontOfficeOnePress, FrontOfficeSeasonClose + gmXp,
simSessionMarks, simHarnessAnchors all 0. simGmStaff 1 on the base: 40 failures, first "Arsenal natural: line 5 of
81 differs" (recorded red on main, Club Manager's). Recordings r1533-s0b on eda10277: simGmCareer section 1 twice in
two processes, one digest 01d932fd8b0b7c3df6ef50b600d6f0359f3e72c9 (scripts/data/gmCareerFixture.json); the board
test's default path twice, byte equal (FrontOfficeGmCareer.fixture.json).

THE MEASURING RUN on BASE (simGmCareer section 4, 20 seeds x 12 seasons, every club graded as a GM's club): 475
firings; first screens offers 192 (40.4%), quiet 228 (48.0%), closed 55 (11.6%); last calls 32 of 192; re hired
within three feeds 209 of 377 (55.4%). With the first call (step 0b, lead R3): offers 475 (100%), first calls 283,
last calls 87 of 475 (18.3%), re hired within three feeds 377 of 377.

## Steps and their runner results (every one read: summary line and exit code)

| step | commit | runner | result |
|---|---|---|---|
| 0b first call | 709e5131 | r1533-s0c | green; nofirstcall fired (638), simGmDeskHost re-measured |
| 1 verdict, blocks, XP, hub boxes, GmXpPanel | 6739047a | r1533-s1a, s1b | all 0; deskoffblock 1152, paytwice 384, lateseat 384, emptytile 659, earns, thirdkey fired; blank did not fire (right) |
| 4+5 source | 7fd4e8b9 | r1533-s4a | tsc 0, vitest board and shared 0, deskhost, career, nflgmdesk, gmreload, sessionmarks, fob-check 0 |
| 4+5 proof | 8a1fdbcb | r1533-s4b | 15 of 16 controls fired; notrim did not (fixed below); career red in section 5 (fixed below) |
| board test career block | 1ad38fab | r1533-s4c | vitest career 0; tsc 2 on two seat literals (fixed) |
| 2 Ownership | 3fb851a0 | r1533-s2a | (with the fixes) |
| fixes | 37876c81 | r1533-s2a, s2b | tsc 0, vitest career, board, shared 0, career 0 (205 s), gmxp, nflgmdesk, gmreload 0; flatowner 2741, noawaydraft, depthstays fired; notrim crashed (fixed in 78869a69); resetbutton, arrivaltitle, thirdkey fired, blank not |
| 3 Media | 9e68f16f | r1533-s3a | tsc 0, career 0, vitest 0, deskhost 0, anchors 0, fob-check 0; flatmedia 30, extradraw 1 fired |
| guide refresh | d75ebc39 | r1533-s6g | --refresh /front-office then simGuideHeadings green, simSiteSearch green |

Measured on the runner (simGmCareer, 37876c81): Ownership from trust 60, a season costs badly 28, 26, 24, 22, 20,
18 and missed 16, 15, 14, 13, 12, 10 at levels 0 to 5; trust 16 and a missed season: fired at level 0, kept on
trust 1 at level 1. 211 losing and 173 winning club seasons walked. The median club earns 111 XP a season on the NFL
fleet (hostXpHelp's sentence holds). Media: each gamble lands exactly 30 more times in 1000 a level.
Section 5: 487 offers taken, 475 followed through the draft and the summer, 0 refused. Section 6: 60 years out on
each of three seed sets, drafted ratio 0.987, 0.981, 0.985 (and 0.984 on 37876c81), band [0.95, 1.01].

## Step 6 and the final proof

| request (head) | result |
|---|---|
| r1533-s2c (37876c81) | every harness and test naming an edited file: 42 lines, all exit 0 |
| r1533-s7b (fb3d5eb5) | 24 rule fences: 20 green; simSchemaNames and simLeaderboardCaps red for want of the database (by design on a runner); simWritesAreSent and simResultMoment needed Playwright (rerun in s8w) |
| r1533-s6w (460d9a06) | playGmCareer 0, playOwnerMandate 0, playFrontOfficeGameDay 0 (386 checks), playDraftNight 0, sweepGames 0 (183 routes); playFoHub 1 (two NBA lines recorded red before this round: roster box names Nikola Jokic, a fit squad puts the dot out); playGmPress 1 with the same two lines as the base build (r1533-s6c base-gmpress); simGmStaff 1 with the base's first line |
| r1533-s8a (3192dbf9) | tsc 0, simGmCareer 0 (228 s), notrim FIRED (17), vitest board, career, shared 0, simGmDeskHost, simNflGmDesk, simGmReload, simGmXp, simSessionMarks, simHarnessAnchors, controlFrontOfficeBoard check, simGuideHeadings, simSiteSearch, simNoRivalNames, simNoInventedQuotes 0 |
| r1533-s8w (3192dbf9) | playGmCareer controls wipebutton, nofallback, eagerpanel all FIRED; simResultMoment 0; simWritesAreSent 1, and 1 on the base build too (r1533-s9b: Guess the Nation's click times out, not this round's); weight below |
| r1533-s9w (3f417564) | playGmCareer 0 at 320, 390 and 1280 (233 s); chunk listings of head and base |

Measured in the browser: the holding box 220 px for a landed market of 224 to 285 px, the page not moving; the GM
level panel 722 to 775 px tall (one and a half phone screens is 1266); a year out 117 to 158 ms from the second tap
to the save (well under two seconds, so no "Playing the season..." state was built).

THE WEIGHT (R5: sweepWeight.mjs not edited; the lead sets the rows). sweepWeight, SWEEP_OFFLINE=1, on a runner:
/front-office 389.3K on the head (42 files) against 372.9K on the base (38 files), budget 374K. The head also goes
over on /club-manager 632K (budget 630K), /manager-hot-seat 646K (645K) and /deadline-day 656K (655K); the base build
is green on all of them. The cause, by gzipped chunk (head less base): the FrontOffice chunk +8.8K (the board, the
desk host, nflGmDesk's additions), a new shared seat packs chunk 3.7K (CollegeDynastyBoard 3.0K lighter for it), a
new shared gmXp chunk 2.3K (clubManager 0.3K lighter), the Phone icon 0.4K. The three career panels are lazy chunks
(GmXpDeskPanel 2.5K, GmJobMarketPanel 2.1K, GmCareerPanel 1.4K) and are not on the route.

## What a later session must not trust
- runAllSims (r1533-s7a, sent on fb3d5eb5) was still running when this was written; read it before the release.
- The adversarial review the brief asks for has not run.
