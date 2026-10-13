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

## Unit two: steps 2 to 7 (the MLB and NHL rival on the player's own line)

### Steps 2 to 4 (nothing moves)

- Step 2, 4425a941 (the MLB cut: mlbStatLineFor, mlbFullWorkload, mlbLineOnSlate) and step 3, bdf47e2e (the NHL
  cut: nhlStatLineFor, nhlFullWorkload, nhlLineOnSlate): r1313-s23a, simUsRivalSense under RIVAL_PROVE against
  each step's parent with RIVAL_MOVED=none RIVAL_CARDS=none exit 0; cutdrawmlb and cutdrawnhl FIRED; r1313-s23b
  and r1313-s23c green (tsc, the board replay and the digest with no retake, mlbcarry and nhlcarry still red at
  E8b). The key order test of src/test/usRivalLine.test.ts was shown failing once on two swapped keys (1 failed
  of 14, each sport).
- Step 4, 0c2f1d7b (the two hooks, mlbRivalSeason and nhlRivalSeason, total, called by nothing): r1313-s4a
  rivalProve4 exit 0 (59 checks); r1313-s4b the 19 controls of M.U1 to U5, U7 and H.U1 to U5, U7 FIRED;
  r1313-s4c green. src/test/fixtures/usRivalOldSavesB.json recorded from b6eb78e7 by the base code (r1313-s4a
  recordOldB), committed as 8fde50f0 after the merge of origin/main (Release AY) 5232debf.

### Step 5a and 5b, the switches

- 5a, ee33f3a6 (MLB): r1313-s5aa rivalProve5a (RIVAL_PROVE=8fde50f0 RIVAL_MOVED=mlb RIVAL_CARDS=mlb) exit 0, 64
  checks: P1 byte equal in the NFL, the NBA and the NHL; in MLB the player's lines, counters, beat seasons and
  every note that is not the rival's own byte equal, the rival's trail moved; P2 1,000 of 1,000 whole saves byte
  equal in the three other sports, and in MLB 107 of 107 careers that part (of the first 300 stepped) hold every
  season line to the parting season (first keys off the rival: lastRivalryEventId 105, fanbase 80,
  rivalryIntensity 63, morale 62, netWorth 12). r1313-s5ab: siteslatemlb, sitekindmlb, fullscoremlb,
  lastyearmlb, verdictswap, rostergate, owndealt, oldscalemlb, offshapemlb, wrongposmlb FIRED. r1313-s5ac: tsc 0,
  vitest 0, senseC 0, simCareerRivalryEvents 0 (owndealt206, coin306, oldcard, deaf FIRED), simUsSeasonLedger 0
  (fullslatemlb, mlbgates, nhlgates, nhlhead, mlbawards FIRED at E8a, mlbcarry at E8b), the four career sims 0,
  the fences 0, simHarnessAnchors 0, lawCmp 0; the board replay red in MLB alone (64 steps) and the digest red on
  mlb keys alone, both by design.
- 5b, b6a861b6 (the NHL): r1313-s5ba rivalProve5b (RIVAL_PROVE=ee33f3a6 RIVAL_MOVED=nhl RIVAL_CARDS=nhl) exit 0,
  70 checks: B saw 138,942 old lines off shape on the tree before; P2 1,000 of 1,000 byte equal in the NFL, MLB
  and the NBA, and in the NHL 91 of 91 parting careers hold their lines (first keys: lastRivalryEventId 91, morale
  59, rivalryIntensity 58, fanbase 57, netWorth 9). r1313-s5bb: siteslatenhl, lastyearnhl, soldascoin,
  oldscalenhl, offshapenhl, wrongposnhl, verdictswap, rostergate, owndealt, workloadnhl FIRED. r1313-s5bc: tsc 0,
  vitest 0, senseC 0 (167 checks), rivalryEvents 0 with its four controls FIRED, ledger 0 (fullslatenhl,
  fullslatemlb, nhlgates, mlbgates, nhlawards at E8a, nhlcarry at E8b FIRED), the four career sims, simUsCareerWeight,
  the fences, simLiveScores, anchors, and the three receipt compares 0 (0 moved); the board replay red in MLB and
  the NHL alone (128 steps, "passed [nfl, nba]") and the digest on mlb and nhl keys alone, by design.

### Step 5c, the recordings, the old saves test and What's New

- 560a3f85: src/test/usRivalOldSavesB.test.ts; M.O and H.O in simUsRivalSense (controls owndead, retiredlinemlb,
  retiredlinenhl, oldtallymlb, oldtallynhl); the --rival mode of scripts/qa/compareUsBoardFixture.mjs (its default
  mode prints byte for byte what main's prints on the AX pair 934c29d9 to c4a91cdc: 37 lines, ATTRIBUTION HOLDS;
  the rival mode on that pair STOPs on phase and contractTalk, as it must); the comments of the brief's 3.4; the
  What's New entry. r1313-s5c2: tsc 0, vitest 31 passed, rivalPlain 0, the five O controls FIRED, simTrustCopy 0.
- a8a25af7, the board recording, recorded on r1313-s5c1 from 560a3f85 (blob d4d53cc0, 2,298,730 bytes).
  Attribution (i) r1313-s5pre on 8fde50f0: the recorder gave the committed recording back byte for byte, the
  header aside; (ii) red in MLB alone after 5a, MLB and the NHL alone after 5b; (iii) --rival mlb,nhl: RIVAL
  ATTRIBUTION HOLDS. The NFL and NBA sections byte equal; the first saved career that differs is the first season
  played (step 10 in MLB, 12 in the NHL), in c.rival alone; no click path parts; clicks 455 and 421, seasons 24,
  screen steps 886 and 900, rival beats 10 and 12, rival choices 4 and 4, all as before; 18 of 19 fixed saves a
  sport moved, 19 of 19 screen walks. The replay of the new recording is green with section A whole (the same
  wheel, talk and free agency counts as before).
- a4a45ced, the truth digest, recorded on r1313-s5c1 (blob ad42ca26) with DIGEST_ALLOW='mlb|*,nhl|*': 32 of 58
  keys moved (all 22 mlb and 10 nhl keys, 256 of 464 careers), 0 outside; DIGEST_ALLOW='mlb|*' refused with 80
  careers outside, every one under an nhl key; the plain run on the new fixture green.

### Steps 5d and 5e, the fence and the walk

- 84dbe448 prints every F3 cell, the F5 floor counts and the measuring swap; db953596 types them from r1313-s5d1
  rivalFull (the table is in the header of scripts/simUsRivalSense.mjs). Fresh seeds 6 to 10: MLB 12 of 12 cells
  inside their band, NHL 5 of 6 (LW 40.86 against 39.09 within 1.66): the recipe stands, nothing retyped.
  r1313-s5d2: rivalFull 0 (43 checks), rivalFresh red on H.F3 (LW) by design, verdictswap, oldscalemlb,
  oldscalenhl, onlyhimshut, workloadmlb and workloadnhl FIRED, tsc 0, vitest 124 passed, the digest, the board
  replay, rivalryEvents, ledger, anchors and senseC 0.
- 3cf2dfa2: scripts/playUsRivalLines.mjs walks three sports from one table (see its header).

### Step 6, the dead code

- 31648047: simRivalSeason's two built in branches, the cut, RivalLineCut, BuiltInRivalSport and the overloads
  of judgeRivalSeason are gone (a play is required); ownRosterBeat is deleted (ownRosterCards stays). Its proof
  and the three receipts follow below.

### Step 6 and step 7, proven

- Step 6: r1313-s6b rivalProve6 (RIVAL_PROVE=3cf2dfa2 RIVAL_MOVED=none RIVAL_CARDS=none) exit 0, 76 checks, P2
  1,000 of 1,000 byte equal in all four sports. r1313-s6a: the three receipts printed on 31648047, 0 of 42 values
  moved in each, only careerFactBeats.ts, careerRival.ts and nflCareerRivalryEvents.ts differ among their
  bundled files; committed as fd16c83d (law), c6a9b785 (seam), 52fce2c6 (lay). The 5c and 5d src edits were
  proven moving nothing too: r1313-s5d3 rivalProve5c (RIVAL_PROVE=b6a861b6, none) exit 0, 76 checks.
- Step 7 on cd86810f (origin/main merged, docs only): r1313-s7a all exit 0 (tsc; the whole vitest suite, 477
  files and 7,308 tests passed; simUsRivalSense; senseC; rivalryEvents; the board replay; the digest; the
  ledger; the four career sims; simUsCareerWeight; simUsSeasonCentre 158 checks; the three compares, 0 moved;
  simFightCareer). r1313-s7c: the 46 non prove controls of simUsRivalSense FIRED. r1313-s7d: the rivalry and
  receipt controls FIRED, and the ledger's mlbtyped and nhltyped MISFIRED (E8a no longer red under a typed
  length), fixed in 00e42677 and proven on r1313-s7g (21 of 21 FIRED exactly, 3043 checks, anchors 0).
  r1313-s7e and r1313-s7h: the simNbaAwardsSense controls FIRED (othersport under SENSE_PROVE_OTHERS=1;
  tickdraws needs SENSE_PROVE_1149, stale by design, not run). r1313-s7f, a served build: simFlagshipWeight 0
  (2,710,409 bytes raw, careerRivalryChoices 5,988), rosterlink and allchunks FIRED, sweepWeight 0
  (/soccer-career 822.1K of 824K, /nfl-my-career 483.2K of 485K), playUsMarketTalk, playUsSeasonCentre,
  playNbaNumbers, playCareerHallLine and playGames on the five routes all 0.
- The walk, r1313-s5e3 on e4a99fbf: NFL 821 checks, MLB 862, NHL 598, all passed; rivalflip and oldline FIRED
  in MLB and the NHL. Its first runs (r1313-s5e1, r1313-s5e2) found the walk itself lost on the retirement talk
  and on the free agency window's Compare view, fixed in b8750b57 and e4a99fbf (no src edit).

### What's New, sentence by sentence (advice 14)

- "drafted at your position, but his season line never was": draftRival(pos, ...) at mlbMyCareer.ts line 382
  (and the NHL's sibling); the base's built in lines in careerRival.ts simRivalSeason (deleted at step 6).
- "A starting pitcher's rival printed a batting average and home runs, a goalie's rival printed goals and
  assists": the base's built in lines (`${avg}, ${hr} HR` and `${g}G ${a}A ${g + a}P`), every MLB and NHL line
  off the player's shape on the base (r1313-s0a).
- "made by the same thing that makes yours, at his position, over as many games as your season really had, and
  printed the way yours is": mlbRivalSeason (mlbMyCareer.ts line 819: mlbStatLineFor, mlbFullWorkload,
  mlbLineOnSlate(full, mlbWorkSlate(pos, mine.slate)) at line 829, mlbStatLine) and nhlRivalSeason (nhlMyCareer.ts
  line 712, the line carried at line 722); held by M.U2, H.U2, M.U6, H.U6 and M.F1, H.F1.
- The parts that count: mlbHeadToHeadScore (line 804) and nhlHeadToHeadScore (line 698) score
  mlbLineAsPrinted and nhlLineAsPrinted (usCareerStatLine.ts lines 117 to 127: a starter's wins, ERA and
  strikeouts, no losses; a reliever's saves, holds, ERA and strikeouts; a hitter's average, home runs and RBI, no
  steals; a skater's points; a goalie's wins and save percentage) by careerAwards.ts lines 111 to 123.
- "A reliever's rival has your job in the bullpen": `kind = pos === 'RP' ? mine.kind` (line 823) with
  `kind: c.archetype.id` at the call site (line 690); held by M.U4 and M.U6 (sitekindmlb).
- "In a short season the head to head now reads the two short lines you see": the call sites score the saved
  `line` (mlbMyCareer.ts line 690, nhlMyCareer.ts line 614) and the hook carries his line to the same slate;
  E8a of simUsSeasonLedger reads both saved lines (fullslatemlb, fullslatenhl).
- "The All-Star card knows both seasons now": beat 206 (mlbCareerRivalryEvents.ts line 113) and 306
  (nhlCareerRivalryEvents.ts line 105) on rosterBeat with ALL_STAR_ROSTER; held by M.F5 and H.F5.
- "On a save you already have, the head to head record stays as it is, his old line stays on show until his next
  season": no save field and no migration; judgeRivalSeason writes lastLine only when he is judged and adds one
  year to one side; SocialPanel.tsx line 88 prints rival.lastLine. Held by src/test/usRivalOldSavesB.test.ts and
  M.O, H.O.

## Owed (not this round)

- The "?" on the rival card for MLB and the NHL, with the rule sentences, the dead heat sentence of advice 13
  and the worked examples 76.8, 80.85 and 97.2: the first round after this one, all four sports at once.
  The words, ready for that round (true of careerAwards.ts lines 111 to 123 and usCareerStatLine.ts lines 117
  to 127 on this branch):
  - MLB: "Your rival plays your position, and who had the better year is read off the two lines on the card. A
    starter scores his strikeouts divided by 5, his wins times 2.2, and 22 for every run his ERA is under 3.80
    (his losses are on the line but do not count). A reliever scores saves times 1.5, holds times 1.1,
    strikeouts divided by 4, and 26 for every run his ERA is under 3.60. A hitter scores home runs times 1.6,
    RBI divided by 3, and 0.32 for every point his average is over .240, so .281 (41 points over) is worth
    13.12 (steals are not on the line, so they do not count)."
  - NHL: "Your rival plays your position, and who had the better year is read off the two lines on the card. A
    skater is read on his points. A goalie scores his wins times 1.8, and 2.4 for every point his save
    percentage is over .900, so .915 (15 points over) is worth 36."
  - Fix pass (review finding 5 of the read lens): these sentences first said "320 for every point" and "2,400
    for every point", which a reader who counts a point of average or of save percentage as .001 takes 1,000
    times too big. The code and the worked examples were always right (0.041 times 320 is 13.12; 0.015 times
    2,400 is 36). The brief's section 3.4 table carries the old words: the "?" round copies from here, not
    from there.
  - The dead heat (advice 13): "If the two lines come out exactly level, the year goes to him." Whether a level
    year should go to nobody, or to goals in hockey, is the lead's (the rule is shared by all four sports).
  - Worked examples: a starter at 14-9, 3.41 ERA, 187 K scores 37.4 + 30.8 + 8.6 = 76.8; a hitter at .281, 24
    HR, 88 RBI scores 38.4 + 29.33 + 13.12 = 80.85; a goalie at 34 W, .915 SV% scores 61.2 + 36.0 = 97.2.
- The lead's rulings this round leaves open: open question 1's fallback (score both printed lines with their
  counts read back at full pace), with the measuring swap's numbers in the header of scripts/simUsRivalSense.mjs;
  whether a defenseman's kind should follow the player (Q2; the kind pairing table is printed); the dead heat.
- Later rounds named by the brief: the engine comment at nhlMyCareer.ts (the "Twelve players make it a year"
  lines) and a second source that is not a wiki for the 44 of the hockey table (Q6); the rival's aging by
  position (Q7; this round's by age and by job tables are its baseline); beats 204, 304 and MLB 219 (Q8).
