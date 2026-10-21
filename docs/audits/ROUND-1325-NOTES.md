# Round 1325 notes: Club Manager squad, roles and contract tables tell the truth

Branch r1325-cm-tables, cut from origin/main 8fea14e2 (Release AY). Brief:
C:/Users/antho/dukb-handoff/2026-10-10/briefs/brief-1325.md. Everything heavy ran on GitHub runners through the
lane's rc.sh kit; the request names are listed per step.

## Findings this round closes
- cm M9: a real man's wage and years left were this game's numbers (a wage formula, a hash of his name, or the deal
  you renewed him on) printed like facts on the contracts desk, the squad list and the dressing room.
- cm p2: the worst defeat printed the stored score, which the engine keeps as the other side's goals first.
- cm m14: the squad list's sorted heads cut at 1280 ("O..." for OVR, "M..." for MOOD).
- cm m15: the contracts desk cut its second final year row in half at 390, inside a 256 px box.
- cm p6, the dressing room half: lines cut at 320 ("0 starts, 1 off th...", "ONE FOR THE FUTU...").

## Steps
1. cm p2. `lowFirst` in ClubManagerCareerPanel.tsx prints the two numbers low first; the career lines go from 10 to
   12 px. New src/test/cmTablesTruth.test.tsx (the fleet and section 4) and scripts/simCmTablesTruth.mjs.

2. cm M9. `isRealPlayer` in SquadScreen.tsx beside MadeUpTag (`!p.generated && !p.isYouth && !p.academyGrad`, the
   rule Release AZ's world roster uses for its own made up flag). Labels, each element carrying
   `data-cm-deal-label`, every note `data-cm-deal-note`:
   a. the desk note "A real player's wage and years left here are this game's numbers, not his real contract.",
      shown when the Final year list or the Let somebody go list holds a real man (the two lists that print a wage
      and years; the clause rows print neither, the free agent rows print the terms he asks of you);
   b. the Final year sub line "22y · this game's deal: 44k a week, final year" for a real man, "19y · 13k a week,
      final year" for a made up one;
   c. the Let somebody go sub line "91 rated, this game's deal: 91k a week, 4 years left";
   d. a line under the squad row detail's eight tiles, real men only, "His wage and years left are this game's
      numbers, not his real contract." (not a ninth tile);
   e. the squad foot "Wages and deal lengths are this game's numbers. No real player's real contract is in the game.";
   f. the dressing room player view "CB · 34y · rated 85 · this game's wage 44k a week", wrapping, not truncating.
   Not labelled, on purpose: the forecast boxes and Renew buttons, the clause rows, the free agent rows, the squad
   list's Wage and Deal cells. Test sections 1, 2, 3, 5 and 6; controls nomark, markall, drawinrender.

4. cm m15, the desk. The Final year list and the granted clauses list lose their 256 px inner scroller: three rows
   sit whole in the page and a 44 px, 12 px "Show the other N" (Final year: "Show the other N in their final year")
   puts the rest in place where it stood, one way, never saved. The Let somebody go and free agent lists keep their
   scrollers (simFreeAgents section 15 reads every button), now max-h-80 so three whole rows show at 320 and 390 with
   44 px buttons. Release, Sign, "Release him" and "Keep him" are 44 px and 12 px; the wage bar stops animating under
   reduced motion.
5. cm m14, the squad list. The desktop grid is 2.5/1fr/2.5/2.5/3.25/3/3.25/3/3.75/3/3.25/1 rem, so every head's
   10 px word and its sort arrow fit with any sort on; the head word's class is untouched. The phone sort picker, its
   direction button and the row button are 44 px; a name that truncates carries the whole name as its title. The
   desktop sort heads stay 32 px: they show only from 768 up, which is mouse width.
6. cm p6, the dressing room half, and the career card. The "Needs a word" window line, the rung tiles' label and
   foot and the player view's header wrap at 12 px instead of truncating; the rung grid keeps equal heights
   (auto-rows-fr) and the tiles do not lift under reduced motion; both back buttons, the player rows, the ladder
   buttons and the career card's Edit, "Name your manager", nation and approach buttons are 44 px.
7. The "?" paragraph (data-cm-help="game-deals", after the free agents paragraph), the What's New entry, and
   scripts/playCmTablesFit.mjs (Part 1, the four components at 320, 390, 768 and 1280, base against head, with the
   controls oldgrid, scrollbox, truncate and smalltap; Part 2, the real page on a build of the base and of this tree).
   The walk draws the base with the base build's own stylesheet (Tailwind writes no rule for a class this tree no
   longer holds) and the oldgrid control with the old grid's one rule written by hand.

## Runner results
- r1325-fit3-c on 83bd388a: every fit control fired with findings of its own kind only. oldgrid exit 1, 41 heads
  findings at 1280 ("OVR" is cut, 24 of 18 px); scrollbox exit 1, 5 deskclip findings at 390 (the Milos Kerkez row
  cut by a 256 px box); truncate exit 1, 11 cut findings at 320 ("0 starts, 2 off the bench in last 6 · star man",
  261 of 116 px); smalltap exit 1, 69 tap findings at 390 (Release is 147.6 by 28 px).
- r1325-final-fit on d9879cb0: Part 1 BASE 428 findings (cut 125, tap 252, deskclip 20, motion 2, heads 82), HEAD
  0. Part 2: Liverpool 2026-27 at 390 and the Hertha book save at 320 played with the same presses (three Quick Sims
  each) on a build of 8fea14e2 and of this tree: saves byte equal (82312 and 105186 chars), random draws equal (4901
  and 4015); Everton's worst defeat "1-5 vs Newcastle" here, "5-1 vs Newcastle" on the base; nothing animating under
  reduced motion; the engine chunks byte equal once the hashed chunk names they import are set aside (their names
  differ because every chunk importing the entry is renamed by any page change).
- r1325-final-a on d9879cb0: tsc, the six unit files, simCmTablesTruth and all four of its controls (nomark 30 red,
  markall 21, defeatraw 7, drawinrender 10, none elsewhere), every reader sim of the four files with its controls,
  simClubManagerSaveSize, simClubManagerSlots, simDailyDeals, simStorageWrites: all as designed.
- r1325-final-w on d9879cb0: playReleaseClause, playCmDataOnDemand, playClubManager (0 findings), simRevealScroll,
  sweepWeight, playGames and sweepGames (0 findings) green; playCmRealFixtures red exactly as on the base (it needs a
  local artifact folder the runner lacks).
- r1325-qa2 on d9879cb0: ten saves (the four old saves at four sizes and six hostile edits) through the four screens on
  a served build: nothing drawn wrong, labels on real men only, defeats low first, anything else left as saved.
- Weight, r1325-fit2 on e8bd574a (the base measured inside its own build): /club-manager 588.8K on the base and on
  this tree, /manager-hot-seat 606.1K on both, /deadline-day 616.2K on both. Every chunk is renamed between the two
  builds (a changed page renames the entry and so every chunk importing it); over all chunks the tree grows 1.17K gz.

## Owed
- ClubManagerHelp.tsx line 53, "Every player is on a real deal.", is owed to Round F8a. Proposed words: "Every player
  is on a deal."
