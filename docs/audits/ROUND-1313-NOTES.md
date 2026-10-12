# Round 1313 notes: the US rival Round B

Branch r1313-us-rival-b, base origin/main b6eb78e7 (Release AX). Brief:
C:/Users/antho/dukb-handoff/2026-10-10/briefs/brief-1313.md. A later session finishes from this file.

## Unit one: steps 0 and 1 (the pure move of the fact beats)

### Step 0, measured on the base (head ecbdab63, harness prints only, no src edit)

Runner results r1313-s0a, r1313-s0b and r1313-s0w, all on ecbdab63:

- tsc exit 0. simUsBoardParity exit 0 (the board replay green on the committed recording). The truth digest
  (vitest src/test/usCareerTruthDigest.test.ts, plain) exit 0. simCareerRivalryEvents exit 0.
- The three receipts on the base: law, seam and lay compares each exit 0, "11 digests, 0 moved". So each
  committed record IS the base's print.
- simUsSeasonLedger exit 0 (3043 checks). E8's counts (US_LEDGER_MEASURE=1): NHL 6000 paired seasons, 5418
  awards in the full ones, the year mine 4119 and his 1881; MLB 6000 paired seasons, 6269 awards, mine 1900 and
  his 4100. E8c: NHL 0 wrong comebacks; MLB 0 wrong comebacks, 104 lost years before, 79 comebacks off them.
- The static closure walker (scripts/lib/staticClosure.mjs on src/pages/SoccerCareer.tsx, 167 modules):
  careerRivalryEvents.ts is IN the flagship's closure; none of the four US rivalry files and not careerRival.ts.
- Weight on a served build of ecbdab63 (r1313-s0w): simFlagshipWeight 2650 KB raw, 2,713,384 bytes, 43 chunks;
  the chunk careerRivalryChoices-MJgJuT1K.js is 9,017 bytes. sweepWeight green: /soccer-career 822.9K (budget
  824K), /nfl-my-career 483.3K (budget 485K). /nba-my-career, /mlb-my-career and /nhl-my-career have NO row in
  BUDGETS (none added).

### Step 1, the move

src/lib/careerFactBeats.ts (new) holds lines 82 to 326 of the base's careerRivalryEvents.ts character for
character under a header and ONE import line, `import type { RivalryEventDef } from './careerRivalryEvents';`
(the draft named RivalryEvent too; the block uses only RivalryEventDef, so only that is imported).
careerRivalryEvents.ts lost the block (246 lines with its trailing blank line) and gained one header paragraph
(two lines and a blank line); it imports nothing and re exports nothing. The four US rivalry files split their
import in two, and the five comments of advice 12 now say careerFactBeats.ts.

Harnesses: simCareerRivalryEvents (HOMES in section 1 with controls homeimport and homeback; MOVE as section 1m
under RIVALRY_PROVE with control movedrift; owndealt206, coin306 and oldcard repointed; deaf and RIVALRY_SRC
not repointed), simFlagshipWeight (section 1c with control rosterlink, section 3b with control allchunks, raw
bytes and chunk list printed), simFightCareer (FIGHT_PROVE), simNbaAwardsSense and simUsRivalSense (anchors
repointed, the new module in the bundle).

Local light checks on this PC (not gates): MOVE (i) and (ii) ok against ecbdab63; movedrift, homeimport and
homeback each turn their own check red; rosterlink turns 1c red; FIGHT_PROVE=ecbdab63 equal text (122,652
characters; careerRivalryEvents.ts the only differing source file).

## Owed (not this round)

- The "?" on the rival card for MLB and the NHL, with the rule sentences, the dead heat sentence of advice 13
  and the worked examples 76.8, 80.85 and 97.2: the first round after this one, all four sports at once.
