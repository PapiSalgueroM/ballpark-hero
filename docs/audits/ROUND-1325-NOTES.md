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

## Owed
- ClubManagerHelp.tsx line 53, "Every player is on a real deal.", is owed to Round F8a. Proposed words: "Every player
  is on a deal."
