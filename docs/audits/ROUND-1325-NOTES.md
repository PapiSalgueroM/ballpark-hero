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

## Owed
- ClubManagerHelp.tsx line 53, "Every player is on a real deal.", is owed to Round F8a. Proposed words: "Every player
  is on a deal."
