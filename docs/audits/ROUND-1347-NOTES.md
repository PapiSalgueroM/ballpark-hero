# Round 1347 notes: the world competition engine and its era format ledger (dark, E0 and E1 only)

Branch r1347-cm-world-ucl, started from origin/main d4f2c6f6 on 2026-10-16 (desktop Claude lane, session I), merged
with origin/main 1027b08c (Release BH) at 8a4ba167. Every heavy gate ran on a GitHub runner (remote checks named
r1347-*). Nothing in the game calls the engine: no save byte, no screen and no daily moves. The builder's full finish
report is C:/Users/antho/dukb-handoff/2026-10-10/results-g/finish-1347.md and the fixer's is fix-1347.md beside it.

## Scope delivered, and the stop

- E0, the ledger: `scripts/data/cmWorldCompFormats.json` and its receipt. 20 rows (14 verified, 4 one publisher,
  2 to verify), each with the pages it was read from and the lines quoted. The dukb-data-guardian skill was invoked
  by the fixer before the fix round's data edits on 2026-10-16; the builder's notes do not record whether it was
  invoked for the first reading, which the read review flagged (its m6).
- E1, the engine: `src/lib/worldCompetition.ts` (pure; binds Round 1228's library by import, never copied), its
  unit file `src/lib/worldCompetition.test.ts`, the golden tie table `scripts/data/worldTieGolden1347.json` (44
  ties recorded from d4f2c6f6 by `scripts/recordWorldTieGolden1347.mjs`), and `scripts/simWorldUcl.mjs` section 0
  (the ledger and the constants that stand on it, ten controls).
- STOPPED before E2 by brief section 1, decision 3: binding the engine grows every engine route by more than 6.0K
  (r1347-weigh2: /club-manager +6.52K, /manager-hot-seat +6.50K, /deadline-day +6.05K gzipped; r1347-weigh3: of
  that, Round 1228's library is +4.01K, +3.99K and +3.55K). The lead rules on the weight before E2 starts.

## One engine file of another owner is touched

`src/lib/clubManagerUclGroups.ts` was on the draft's Must NOT touch list. Correction 1, option (a), adds ONE
optional comparator parameter `byName` to `sortedUclGroupTable`; its default `byLocale` is the call it always made,
so every existing caller (clubManager.ts, soccerCareerContinental.ts) is byte equal. Section 1 makes correction 1
binding but never lifts the ban in words: the lead acknowledges this file at the release join (read review m7).

## RECORDED DEBT until E2 (do not merge this branch without E2 or the lead's written acceptance)

- `settleTie` in worldCompetition.ts is a second writing of advanceUclBracket's AI tie (clubManager.ts). It is held
  to d4f2c6f6 by the golden table, and to any later engine by
  `node scripts/recordWorldTieGolden1347.mjs --ref <commit> --check`, which records that commit's engine and
  compares the cases only (SAME exit 0, DIFFERENT exit 1). Never compare two whole golden files of different refs
  (the ref is in the file) and never re-record the golden from the function under test.
- `groupFixtures` exists in both files. The unit file holds the two matchday tables to the same code text until E2
  deletes clubManager.ts's copy and imports the module's.

## The fix round of 2026-10-16 (two adversarial reviews: run lens and read lens)

- The prefix test now reads the knockout ties: a tie shows its first leg only after that night, and its second
  leg, aggregate, winner, extra time, penalties and away goals only after its last night. The review's two
  surviving mutations (tieleg1, tieagg) were green before this.
- checkSeason holds the eras' default round of 16 to row G4-late: a runner-up at home to a winner of another
  group, all sixteen once (the review's r16same mutation).
- The final's legs come from the binding like every other round's. The module forced a one match final itself
  while row G8 has one publisher; `nightsOf` now takes the legs as a required argument and a unit test proves a two
  legged final binds.
- The recorder gained `--check` (above). The header no longer claims any sport.
- Ledger: G3-2005's Liverpool clause and G6's extra time clause rested on fewer than two recorded publishers and
  are now periodNotes; G5-2020-ko no longer states a result it never read; G4-late's UEFA 2020-21 page date is the
  date the page prints (2020-08-01). New receipt hash 6c2d3bfc...
- The night placement test also reads every league size of REAL_LEAGUES and ERA_LEAGUES and prints them.

## Gates (run on a runner, never on the owner's PC)

    tsc: node_modules/.bin/tsc --noEmit -p tsconfig.app.json
    vitest: node_modules/.bin/vitest run src/lib/worldCompetition.test.ts
    simWorldUcl: node scripts/simWorldUcl.mjs                      (green, 369 checks)
    controls: WORLD_UCL_CONTROL=<onesource|wiki|thinused|figure|receipt|cover|const|partial|ban|order>, each exit 1
              with "FIRED (1 failures, all its own)"
    golden: node scripts/recordWorldTieGolden1347.mjs --ref d4f2c6f6 --check   (SAME)

## Owed to E2, Round 1502 (the binding) and Round 1503 (the screen)

- E2 must bridge scripts/simExtraTime.mjs (its AI_EDITS anchor on advanceUclBracket's tie lines) and
  scripts/simSeasonLaw.mjs (it reads poisson's body and its `p *= Math.random()`) in the same commit as the lift,
  and prove the lift with the recorder's `--check` against the pushed head plus the whole save compared as JSON
  text over both fleets (the run review's byte probe shape: head against main, participant and watcher careers,
  old saves loaded and played on).
- drawG8's search starts at the association floor, which does not count the Russia and Ukraine ban, and climbs a
  clash level at a time with six tries of up to 4,000 steps each: in the worst case about 1.1 million steps. On
  the four real era fields it found 0 clashes in every one of 1,600 keyed draws (0.08 to 0.23 ms a draw, run
  review r1347-run-b) and on crafted ban heavy fields it stayed under 60 ms. Time it on the real pools and on an
  edited world before it runs inside startCareer. It finds the fewest clashes its search finds, not a proven
  minimum (the commit title of 8e602f8a says more than that).
- The two legs of every tie at least seven days apart needs the calendar's dates: Round 1502 (correction 9).
- The knockout ban (correction 17): G5-2015-ko has one publisher and G5-2020-ko was not read, so the watched round
  of 16 does not apply the ban and the ? must say so, or a new optional parameter on drawUclRoundOf16 after a
  second source. The participant's own draws not applying it is owed and moves the participant if fixed.
- The engine serves football competitions of these two shapes. The Conference League's six pots and a sport
  without draws need more than a binding (points, tiebreaks and the l36 bracket are built in).
- The other corrections the builder carried forward are listed in the finish report's last section.
