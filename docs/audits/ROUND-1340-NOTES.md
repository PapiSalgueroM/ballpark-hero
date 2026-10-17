# Round 1340 notes: Club Manager match day screens

Branch r1340-cm-matchday, started from d8aaa4cb (release-bi-gate after part one, by the lead's base override).
The brief is C:/Users/antho/dukb-handoff/2026-10-10/briefs/brief-1340.md. This file is kept current at every push.

## Steps

- a1. src/lib/cmMatchDisplay.ts with the order helpers only (myClubFirst, inFixtureOrder, mineFirstOfReport) and
  src/lib/cmMatchDisplay.test.ts. No caller yet.
