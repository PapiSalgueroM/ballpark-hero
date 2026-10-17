# Round 1337 notes: Soccer Career's screens say true things (the screens half of plan round F16)

Branch r1337-sc-screens, started on origin/main e814c2de (Release BH live, plus its record and the board claims).
Brief: C:/Users/antho/dukb-handoff/2026-10-10/briefs/brief-1337.md (the critic's "1337b"). No byte of
src/lib/soccerCareerEngine.ts moves. Every heavy check runs on a GitHub runner (rc.sh); result names are
origin/rc-results/<name>.

## What changed, step by step
1. Week by week's words. The 📺 button's aria-label reads "Week by week: watch your season match by match" (the
   "Week by week" prefix and data-week-by-week stay, harnesses find the button by both). The Season Centre help's
   intro[0] and intro[1] (src/components/soccer-career/SoccerSeasonCentre.tsx) say the season was played the moment
   you pressed Next Season or 📺 Week by week, that here you watch it one matchday at a time, and that only a season
   with a saved league world runs on simulated clubs. The Spanish pool sentence left the general intro; the season
   note pushed for a 'simulated-partial' world stays. Nothing else in HELP moved, and the shared SeasonCentre.tsx and
   SeasonCentreHelp.tsx are untouched, so the help still opens by itself once per viewer: POLISH 24 is PART for the
   Season Centre, owed to S15.

2. The Ballon d'Or night. While `career.phase === "ballon_dor" && ballonDorAwaitingReveal(career) !== null`, the Full
   attributes button is disabled, drops its chevron (so the dimmed row does not look like a door), and its second
   line (the same element, so nothing moves) reads "Opens once the Ballon d'Or result is in" (the button opens at the
   reveal, while the card with Continue is still up, so "the night is over" was a shade early; changed after the
   reviews). No remount during the countdown, so the countdown never starts again; no save write; no file of S18's
   touched. Every other phase is as before, season_summary with the night pending among them.
3. The Squad sheet. The first open lands on home with "New here? Tap ? for how your rank, the eleven and the
   manager's trust work." (data-squad-first-hint), above the tiles. The flag keeps the key soccerSquad:help but now
   means "the pointer was shown": read before the first paint (a pure read in a useState initialiser), written in an
   effect after mount (never in an initialiser). initialScreen skips the read, the write and the pointer. The help's
   first rule (src/lib/soccerClubSquadSheet.ts, the one string) reads "This is where you stand at the club right now.
   It explains your games, it does not change them."
4. Training. On the menu [data-practice-rules] holds one paragraph, the bank rule with its worked example; the drill
   list and the pause rule join it behind the ?; aria-expanded stays `showRules || screen === "menu"` (the shared
   TrainingGround's shape); the second copy of the bank rule under the drills is gone; the ? during a drill is as it was.
5. The attributes screen. The title wraps instead of truncating; each attribute label may take two lines.
6. What's New: one entry, newest first.

## Named edits to existing checks
- scripts/playCareerSquad.mjs: sections 3 (the first open lands on home with the pointer; ? opens the help; a viewer
  shown the pointer sees none), 4 (the walk reaches the help through ?; a new check that both fresh contexts show the
  pointer) and 7b (save A's first open is home with the pointer; Back is measured on the help reached through ?).
  No assertion removed or loosened. Check 7 already measured the help reached through ?.
- scripts/playCareerProgramme.mjs:120 (the other lane's walk, one line): waits for home, presses "How the squad works",
  then waits for the help; everything after it is as it was.
- scripts/simStorageWrites.mjs: the SquadSheet entry is `keys: ['write:markHintShown']` with the why "the hint seen
  flag: a browser that refuses storage sees the one line pointer again" (markHintShown answers false when storage
  refuses; the old helpSeen's keeps: key went with the function that kept its answer).
- scripts/simSoccerOpponentLabels.mjs: two REVERSE pairs put the help's old intro words back before the legacy page is
  hashed against ORIGINAL_COMPONENT_SHA (b553b627), the way Release BH reversed PR278's hunks. After the reviews, a
  pair whose current side is no longer found exactly once fails with "FAIL component reverse anchor: REVERSE pair N
  of M ..." and the first words of the stale side, instead of a bare esbuild "Build failed with 1 error".

## Proof (GitHub runners; result names are origin/rc-results/<name>)
- Type gate 0 on every step (r1337-s1, r1337-s2, r1337-s3; 178 to 203 s). `git diff --name-only e814c2de...HEAD --
  src/lib` prints only src/lib/soccerClubSquadSheet.ts and the engine is byte equal to the base (r1337-s3 srclib).
- src/test/soccerScreenTruths.test.tsx: 11 of 11 on the head (r1337-s3, with the practice and squad unit files: 10
  files, 181 tests). Base control (the five edited files checked out from e814c2de in a scratch worktree, r1337-f1
  unit-base): 7 failed, 4 passed; the 4 that pass are the guards that today's behaviour stays (S1 revealed night
  opens, S1 season_summary with the night pending opens, S2 the partial world note still names the Spanish pool, S4
  the ? during a drill), and they must pass on both.
- scripts/playSoccerScreenTruths.mjs on the head with the base build as its control (r1337-v1 on b21f1c4a): "green,
  W4 W4r W5 W6 W7 W8 pass on the head and every control section is red on the base". Head W4 13/13, W4r 6/6, W5
  12/12, W6 21/21, W7 12/12, W8 8/8; base W4 8/13, W4r 6/6 (a no regression half: reduced motion completes the card
  at mount on the base too), W5 6/12, W6 12/21, W7 6/12, W8 4/8. Base W4 measured the bug: nominee rows
  "0 -1 0 1 2 ... 10 10" and the result "waiting > gone > waiting > revealed" after a press of Full attributes.
  Pictures: C:/Users/antho/dukb-handoff/2026-10-10/review-shots/r1337 (head-* and base-*, 34 files).
- Reported, not fixed (the lead rules): during the night's countdown, 25 other hub controls were pressed on fresh
  loads; two unmount the card so it would count down again: "Go back" (the navbar's back, which leaves the page) and
  "Cookie choices" (the footer's cookie settings).
- Weight: /soccer-career 832.4K on the head (r1337-s3) and on the base (r1337-b0a), against the 834K row: +0.0K to the
  tenth (budget +0.2K). simFlagshipWeight green on both.
- After the reviews (fixer, head c1b49890; r1337-fix-ga and r1337-fix-gb): the walk "green, W4 W4r W5 W6 W7 W8 pass
  on the head and every control section is red on the base" with W4 now 15/15 on the head and 9/15 on the base (the
  new night line and the chevron checks fail there), W4r 6/6 both, W5 12/12 and 6/12, W6 21/21 and 12/21, W7 12/12
  and 6/12, W8 8/8 and 4/8. Weight /soccer-career 832.5K to the tenth against the 834K row (+0.1K of the +0.2K
  budget), simFlagshipWeight green. Type gate 0; the unit file and four neighbours 57 of 57; simStorageWrites green
  and its gone control fired; simHarnessAnchors and simNoRivalNames green; simSoccerOpponentLabels green with every
  control arm exact; qa/soccerPotentialProgressBrowser PASS; the PR278 proof PASS at its new pin.
- The rule fences (r1337-f5 head, r1337-b0f base, the same 24): 19 PASS on both; simCompletionSlugs,
  simDailySaveHardening, simLeaderboardCaps and simReportRelay FAIL and simSchemaNames SKIPs on BOTH, each for the
  live database the runner blocks. simPrerender section 16: "2125 source files scanned, 23 raw random initialiser(s),
  22 file(s) on the frozen baseline, 0 new". simPrerender as a whole is red on the head only for "/whats-new drops the
  entry Soccer Career: screens that say what they are.": the saved /whats-new page is the lead's build:seo at the
  release (builders never write public/); green on the base.
- Page readers on the head: every src/test file that renders the page (28 files) green (r1337-f1); the 50 sims of the three lists that
  read SoccerCareer.tsx green but simSoccerCareerDocumentaryReview, simSoccerCareerSavedLoan (both "Only ... may differ
  from the whole held parent app") and simTransferBriefPageControl (EMPTY), which are the same on the base (r1337-b0d);
  walks green: playCareerSquad (190), playCareerProgramme (1154), playSeasonCentre (41), playSeasonMoments (117),
  playCareerLeagueWorld (39), playCareerMoments (34), playSoccerCareerAwardReveal (26), soccerPotentialProgressBrowser,
  careerPractice1076, playSoccerLanding (head only), playSoccerCareerCompetitions (52), playSoccerCareerContracts
  (201), playTranslatedPage (447), playTwoTabs, career992, playSoccerOfferReview1082, playSoccerFarewell (1343),
  playSoccerAgentReview (1904), playSoccerInternationalReturn (854, green on a lone rerun after one ECONNRESET),
  playSoccerEventCards, playReducedMotion. playSoccerCareer (check 6, the database) and playStartingXi (2 failures:
  "an international tournament arrived while playing on") are red with the same first lines on the base (r1337-b0b).
- Expected at the release's build:seo: /soccer-career's saved page does not change (every screen here is drawn in
  the browser); /whats-new's moves (the entry).

## Owed, for the lead's board note
- To the other lane: this round edited ONE line of their walk scripts/playCareerProgramme.mjs (line 120): it waits
  for home, presses "How the squad works", then waits for the help (the Squad sheet no longer opens on the help).
  Proven green on r1337-s3 (1154 checks, 21/21 journeys).
- To the other lane, POLISH 24's other half on their screens, words offered only: the Programme's "Choices for your
  simulated career. Check the context before choosing." (src/components/soccer-career/SoccerCareerProgramme.tsx:83)
  could read "Big calls for your season. Read what each one does before you pick."; the Press room's "This is your
  simulation's media reputation." (src/components/soccer-career/PressRoom.tsx:63) could read "This is how the press
  sees you right now."
- To the other lane: scripts/qa/soccerHistoricalOpponentDisplayProof.mjs line 31 and
  .github/workflows/career-historical-opponent-labels.yml (lines 45 to 59) pin SoccerSeasonCentre.tsx at 31506 bytes,
  sha f65e0f08. This round's two help strings change the file, so that proof is red on the head at its pin and green
  on the base (r1337-s2b hist-head 1, hist-base 0). With only the two old strings put back in a scratch copy
  (.rc/x/introBack.mjs, the file then equals the base byte for byte) the proof passes, 3/3 arms and 2/2 controls
  (r1337-s2b hist-introback 0): the pin is its only red. RE-PINNED on this branch after the reviews (c1b49890): the
  component is 31496 bytes, sha 94c3c55e, in the proof's line 31 and the workflow's lines 53 and 140; the proof file
  is then 26837 bytes, sha 0346ebbe, in the workflow's line 53 and its HELPER hash at line 145. The fixer reproduced
  the attribution first (r1337-fix-repro2, #!serial: introback 0 twice, base 0) and proved the head after it
  (r1337-fix-gb hist-head 0, 3/3 arms, 2/2 controls; a pin probe reads all 19 pins equal to the tree, and 3 differ
  on b712a7ad). Run the proof alone: the same introback line run beside another copy of it went red at its
  comparisons (r1337-fix-repro) and passed alone twice. The workflow itself only runs on its codex branch, and its
  scope step (line 47, a diff against 4a5f759a) cannot pass on any later main, so the proof script is what gates run.
- No guide sentence moves: soccer2.ts:1788 ("The 📺 Week by week button plays the same season match by match ...")
  stays true.
- To S15: the shared Season Centre help still opens by itself before the season (POLISH 24 is PART for that screen).
- To the other lane: this round also edited scripts/simSoccerOpponentLabels.mjs (theirs, b5868c81, kept by this
  lane's releases since): two REVERSE pairs and an intro1337 map limited to the two new help strings, and after the
  reviews a stale pair names itself when it fails. Not in the brief's owned list; name it beside the line 120 edit.
- To S18: the night card replays its taps and sting on any remount (AwardsNightCard.tsx 74 to 80, useSoundPlan's per
  mount memory). During the countdown Full attributes no longer causes one. After the reveal it still does: the
  phase is still ballon_dor and the card is still up (Continue, and the speech for a winner), the button is enabled
  (ballonDorAwaitingReveal answers null once revealed), opening it unmounts the card (the attrsOpen early return) and
  Back mounts it again complete, replaying the ten taps and the sting over a finished card. That is base behaviour,
  not a regression of this round, and stays S18's. "Go back" and "Cookie choices" (above) still cause one during the
  countdown.
- Residual of the shared shape (ruling 2e, not a defect of this round): Training's ? keeps aria-expanded true on the
  menu whether one paragraph or three show (as TrainingGround does), so a screen reader hears no change when ? is
  pressed there. Whoever next touches the shared TrainingGround shape should give the expanded state its own meaning.
- For whoever lifts soccer onto TrainingGround: src/test/fixtures/TrainingGroundSoccerBinding.tsx line 30 still binds
  the menu rule this round removed ("One session per season. Score 50+ for a +1, 80+ ..."), and
  src/test/careerTrainingGround.fixture.json records it in 8 menu rows. Nothing is red (that test renders the fixture,
  not TrainingPanel), but a lift through that binding would bring the removed line back: bind "One bank per season
  ..." instead and re-record the fixture then.
