# Round 1313 notes: the US rival Round B

UNIT ONE 8c98dae1 (steps 0 and 1, pushed and green on runners, the three receipts taken again). The commit
after it that adds these lines is docs only.

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

- The BEFORE table (scripts/simUsRivalSense.mjs at full size, five seeds of 1,500 careers a sport, runner
  r1313-s0a rivalT, exit 0) is typed into that harness's header. My share of the head to head years: MLB 41.20
  (SP 9.5, RP 8.3, C 25.4, 1B 61.7, 2B 29.0, 3B 56.0, SS 43.0, LF 53.4, CF 42.2, RF 56.0, DH 68.9), NHL 58.03
  (C 64.3, LW 59.5, RW 64.2, D 39.4, G 62.7). Every MLB and NHL rival line off the player's shape.
- P2 base against base (RIVAL_PROVE=b6eb78e7 on ecbdab63, runner r1313-s0a rivalP2base): 1,000 of 1,000 whole
  saves byte equal in all four sports, cards answered 7,501 (NFL), 8,519 (MLB), 9,619 (NHL), 8,728 (NBA). Its
  one red is by design: P1's "the tree before is not this tree" (0 src files differ between the two).
- Section C of simNbaAwardsSense (SENSE_PROVE_OTHERS=1): exit 0, 172 checks (r1313-s0a senseC).

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

Weight on a served build of a064a170 (runner r1313-s1w): the flagship's first download 2,710,355 bytes (2647
KB), 3,029 bytes under the base's 2,713,384, all of it in careerRivalryChoices-*.js (9,017 to 5,988 bytes).
Section 3b green there ("are both on them" and "It goes down as one more line in the argument" in no chunk of
the first download, both in usCareerSeasonReview-*.js); the SAME harness on a build of ecbdab63
(step0build3b) is red on 3b, 3 failures (the words in careerRivalryChoices-MJgJuT1K.js); control allchunks red
(4 failures); control rosterlink red (1c, 1 failure). sweepWeight green: /soccer-career 822.9K to 822.1K
(budget 824K), /nfl-my-career 483.3K to 483.2K (budget 485K), 47 files before and after (no extra request).
The ceiling comment of simFlagshipWeight now says the split is done, with both measurements; CEILING_KB stays
2700.

Proof of step 1 (src at a064a170; the later commits of the step touch no src):
- r1313-s1a: simUsRivalSense RIVAL_PROVE=ecbdab63 RIVAL_MOVED=none RIVAL_CARDS=none exit 0 (47 checks: P1 and L
  in all four sports, P2 1,000 of 1,000 whole saves byte equal in each). liftcard and rostergate FIRED.
- r1313-s1c: owndealt and owndead FIRED; simNbaAwardsSense SENSE_PROVE_OTHERS=1 exit 0; oldgate306 (R),
  oldgateown (S) and droppedanyyear (S) FIRED in their own sections and nowhere else.
- r1313-s1b: tsc 0; simCareerRivalryEvents RIVALRY_PROVE=ecbdab63 0; movedrift, homeimport, homeback,
  owndealt206, coin306, oldcard and deaf each red in their own check; FIGHT_PROVE=ecbdab63 0 (bundle text equal);
  board replay 0 and truth digest 0 with no retake; simUsSeasonLedger 0; the four career sims, simUsCareerWeight
  and the five fences (rival names, quotes, conduct, invented names, live scores) 0; simHarnessAnchors 1 on
  FIGHT_PROVE's raw reads, fixed in b01bf476 and green on r1313-s1z.
- The three receipts: printed on 1b4f0a73 (r1313-s1r), 0 of 42 values moved against each committed record (the
  base's print), committed as 38dda01a (law), 1c16e220 (seam), 8c98dae1 (lay). On 8c98dae1 (r1313-s1z) the three
  compares are exit 0 (11 digests, 0 moved) and the controls lawdrift, seam and lay are red at their named check.

## Owed (not this round)

- The "?" on the rival card for MLB and the NHL, with the rule sentences, the dead heat sentence of advice 13
  and the worked examples 76.8, 80.85 and 97.2: the first round after this one, all four sports at once.
