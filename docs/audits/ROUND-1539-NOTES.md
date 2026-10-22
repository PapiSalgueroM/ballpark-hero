# Round 1539 notes: Stadium Tycoon after the new law (parts A and C)

Brief: dukb-handoff/2026-10-10/briefs/brief-1539.md (section 0 binds), critic-1539.md beside it. This round is parts
A and C only; part B, the goal, win and streak badge ladder, is Round 1543 (brief-1543.md). Full record:
dukb-handoff/2026-10-10/results-g/finish-1539.md, proof lines in results-g/rc-1539.txt.

## Status

Branch r1539-tycoon-after-law, from origin/r1532-tycoon-scorelines c50eb038, with origin/r1536-dialogs-over-banner
ae2c9f05 (0d22beb0) and origin/main 30d123fd (268e3b97) merged in step 0. 268e3b97 is the round's starting commit
(the base of every base against head comparison, sweepWeight included).

## Part A: the away clock

`AWAY_MATCHDAY_SEC` 1800 became 1680 (28 minutes): an 8 hour night plays an 18 matchday season from its first matchday
right up to its final (floor(28800 / 1680) = 17), and the final still never plays away. Whole hour trips of 1 to 6
hours play what they did; 7 hours 15 (14); the 8 hour cap 17 (16). Contract section 22 of
docs/design/round-580-tycoon-merge.md holds the ruling and its arithmetic.

Fenced: simTycoonAwayMatchdays S2 (0s, 29s, 1,679s, 1,680s, 1,799s, 3h, 7h, 8h play 0, 0, 0, 1, 1, 6, 15, 17 for a
division 6 club at matchday 0, and 8h plays 13 for a division 3 club; the finale control now turns S2 red as well, 14
against 13), tycoonAway.test 7 (the real hook: 1,679 s 0, 1,680 s 1, 1,799 s 1, 3 h 6, 8 h stops ON the final
matchday, 8 h in a 14 matchday league 13), and simTycoonHelp's claim for the guide sentence ("one for every 28 minutes
of the trip"). The rules modal reads the constant ("one every 28 minutes") with no edit.

Measured (remote checks r1539-s0 on the base 268e3b97, r1539-s2 and r1539-s2c on c904ec9b):
- The clock's own negative control (clock1800, the head lib with 1800 written back on the runner): simTycoonAwayMatchdays
  exit 1 (S2 red at 1,680 s), tycoonAway.test exit 1 (test 7 red at 1,680 s, the other 7 pass), simTycoonHelp exit 1
  (the 28 minute claim red: 0, 0, 2, 16, 16).
- The away match leg (decision 4): 200 seeded trips of 0 to 13 hours, divisions 0 to 9, a fifth with a leftover
  friendly, perk levels 0 to 2: 200 of 200 play exactly min(floor(capped / 1680), playable), and their first k results
  and their state after k equal the 1800 lib's on the same rolls. 184 trips play the same count, 16 play one more.
- simTycoonPackPace: its log is byte identical base against head (both policies; the 4x price control still breaks
  every check: Scout by day 2 0 of 100 and 12 of 100, Club by day 5 0 of 100). Its visitor never reaches a ten club
  division in ten visits (the season's hold binds first), so the clock does not touch it.
- The share of pack pace returns (visits 2 to 10, 100 seeds, both policies) that find the final matchday waiting: 900
  of 900 under 1800 and under 1680, mean away matchdays a return 2.58 (immediate) and 2.89 (afterFinal) under both.
- simTycoonAwayMatchdays S5 mean 10.10 unchanged (its trips are held by their seasons first), all 6 controls on their
  sets.

Owed, not written here: useStadiumTycoon.ts' settleAway comment "a matchday for every half hour" is stale (the hook is
untouched this round; nothing reads that comment); the saved pages /stadium-tycoon and /whats-new (build:seo).

## Part C: the While you were away card walked above a pending banner

scripts/playFirstVisitDialogs.mjs gained a SCENES table with one scene (/stadium-tycoon#away), walked in the shard that
holds its route (1/3) and under ONLY=/stadium-tycoon; the tycoon lib is bundled only then. The plant is built in node
from the lib's own functions: the first ten club division (6) at matchday 0 with a leftover friendly named by
legacyOpponentName (the loader keeps it), the Away Day Deal at level 2 (12 hours), Squad at par plus 72 levels (144),
totalWins and totalGoals one under the lowest milestone that counts them (found by probing MILESTONES' hit functions:
0 and 24 today), and `ach` and `claimed` settled once with settleFirsts. Before any page opens it must round trip
(carryover, ach, claimed kept, 18 playable) and draw the full card on 200 of 200 seeded streams in node. The page
writes it 13 hours old and serves a seeded stream for 5,000 Math.random calls, then 0.999.

The card drew 18 results (the friendly and 17 league wins), "Milestones reached on the road: +$13.7K", "Away wins
earned 18 gems" and "You are 1st of 10, and the final matchday is waiting for you." (screenshots looked at, r1539-c1).
Measured (r1539-c1 and r1539-c2 on f968a135, r1539-c3 for the mutation):
- 320x640: box 16 to 319 (at its cap, scrolling inside), "Back to work" 250 to 294, 41 px above the banner from 335.
- 390x844: box 73 to 538, button 469 to 513, 98 px above the banner from 611.
- 1280x900: box 143 to 592, button 523 to 567, 168 px above the banner from 735.
- The page held: scrollY 0 and heights 13251, 10896, 7493, the same open and closed.
- pf1 to pf3 0: 402 route widths (399 plus 3 seeded), 126 dialogs, 0 red. Controls: cover 18 of 18, ratchet 15, abort
  exit 2, expected 24 of 24, edge 21 of 21, lift 24 of 24, nobanner 27 of 27, NEW stale 3 of 3, NEW jump 3 of 3, stale
  with no seeded line in the run exit 2 (ABORTED).
- Mutation leg (the card's OVERLAY_ABOVE_BANNER and boxInsideOverlay taken out, a vite build of a copy of the head):
  320 red (centre on the banner, the button 407 to 451 wholly under it, the box 141 px under it), 390 red (18 of the
  button's 44 px and 43 px of the box under the banner), 1280 green.

## Final gates (on 941a1a62, remote checks r1539-f1 to r1539-f7)

tsc 0; vitest 0 (13 tycoon files, 101 tests); every tycoon sim 0 (simTycoonScorelines' log identical to the base's);
retake-head 0 (12 of 12 histories reproduce, 0 differ); the walks 0 (pf1 to pf3, playTycoonScorelines, the fit walks,
playHomeFold, checkTycoonGroundGrowth, qaFreeKickRange, playTycoonSaleReview1083 alone); every control on its exit code;
the rule fences 0 except the database blocked pair; sweepWeight 0 (/stadium-tycoon 303.4K against 303.3K on 268e3b97).
Red on head and base alike, the same first line: simWritesAreSent, simTycoonGoalFlight, simSetPiecePresentation,
simTycoonSeasonReview. Not checked: simPrerender (needs build:seo). Details: results-g/finish-1539.md section 5.

Choices made: the "answered banner" line is not in the permanent walk (the walk refuses a line with no banner on screen;
critic item 6), and Round 1536's probe measured it once. The page-must-not-jump check has its own control (jump), as
critic item 18 asked. scripts/lib/answerConsent.mjs (Round 1535) is not in this tree, so BANNER stays.
