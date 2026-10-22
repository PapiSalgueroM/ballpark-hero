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

## What a later session must not trust
- The browser walks (playGmCareer and its three controls, playOwnerMandate, playFoHub, playFrontOfficeGameDay,
  playGmPress against the base, playDraftNight, sweepGames) are sent as r1533-s6w and r1533-s6c on 460d9a06; read
  them before calling step 6 done.
