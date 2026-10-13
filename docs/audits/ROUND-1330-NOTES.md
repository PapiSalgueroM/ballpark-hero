# Round 1330 notes: the Soccer Career page lands on your player, the save fence bound, toasts and the action bar

Branch r1330-sc-landing, started on origin/release-bc-gate c5fc5470 (Release BB plus the Release BC join).
Brief: C:/Users/antho/dukb-handoff/2026-10-10/briefs/brief-1330.md. Every heavy check ran on a GitHub runner
(rc.sh); the result names are given beside each number.

## Base measurements (c5fc5470)
- Weight (r1330-s1): /soccer-career 828.2K of gzipped JavaScript over 47 files against its 829K row. sweepWeight
  exits 1 on the base for three rows that are not this round's (/club-manager 602.2K of 593K, /manager-hot-seat
  620.6K of 613K, /deadline-day 630.6K of 623K). simFlagshipWeight green. Type gate 0.
- Harnesses that read SoccerCareer.tsx (r1330-s1b): simCreation exits 1 on the base with "a full career save is
  73.8 KB, over the budget" (known red, save size); simActivityNotCompletion green on the gate;
  simSoccerCareerSaveRetry all green (8 outcomes, 16 faults); simSoccerCareerSaveRecovery all green;
  simSaveFence green; simStorageWrites green.

## Steps
1. Base weight measured (above).
2. src/hooks/useSaveFenceWatch.ts and src/test/useSaveFenceWatch.test.tsx (a9a24714, r1330-s2): type gate 0; the
   unit file and the fence and notice files 25 of 25; two source mutations of the hook (the storage listener
   ignoring the fence key; the storage listener left behind at unmount) each turn the unit file red on an
   assertion.
3. The fence bound on the page (in progress).
