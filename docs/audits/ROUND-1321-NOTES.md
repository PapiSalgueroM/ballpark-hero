# Round 1321: the NBA Front Office's earned draft, part A (the engine and the libraries, nothing a player sees)

Branch `r1321-nba-draft-earned-a`, base `48cb9d4b` (origin/main, Release AY). Written by the round's builder,
2026-10-12, and kept current at every push. Brief: `dukb-handoff/2026-10-10/briefs/brief-1321.md`.

## Where it stands

2026-10-21 (session J): step (d) is built and measured. origin/main (85a76241) was merged first with no conflict
and the old gates rerun green on it (runner `r1321-j1`). The NEW arm runs through the libraries' own presses, the
curve and the two knobs are tuned, section 5 (the incentive) is in the quick lane, and section 7's two arm table
judges the lead's stop lines of 2026-10-13. **The table is a STOP: see "Step (d)" below.** Before that the round was
split at step (d) (advice 19) and stopped for the lead's ruling on S4 and S6 (the OLD arm section below).

Nothing in `src` calls the new code but its own tests. No screen, no copy, no What's New, no guide edit.

## Files

- `src/lib/nbaFrontOffice.ts`: added lines only (0 removed, runner `r1321-b1` line `diffproof`):
  `NBA_EARNED_CLASS_CURVE` (TUNED in step (d): 13 to 30 at 67 to 72, 31 to 45 at 66 to 69, 46 to 70 at 66 to 68;
  the draft's starting shape was 72 to 80, 69 to 76 and 66 to 72), `nbaEarnedDraftClass`, `NBA_DRAFT_NEED_WEIGHT` (2), `nbaDraftNeed`,
  `nbaConsumeDraftRound`, and since the fix pass `nbaEarnedClassSize` (the class size rule, one place, read by the
  class and by the help). No anchor of simNbaDraftCapital is repeated.
- `src/lib/gmEarnedDraft.ts` (new, sport neutral): `earnedContinue`, `earnedPick`, `earnedByStaff` over any
  `GmDraftHost`, each answering `done` exactly when no slot is left; `earnedDraftHeading` (lines from the slots and
  a `labelOf`); `lotteryRangeLine` (the worked example from the saved field and draws); `lotteryChancesLine`;
  `earnedDraftHelp` (the lottery's own blocks, the chances, then the sport's blocks). It re-exports what a bind and
  its tests need from the lift, so neither names a lift module.
- `src/lib/nbaEarnedDraft.ts` (new, the NBA's half): `NBA_DRAFT_BLOCK = 'draft'`, `nbaDraftSeason`,
  `nbaDraftOrder`, `nbaDraftNightOf`, `openNbaDraftNight`, `nbaDraftHost`, `nbaDraftContinue`, `nbaDraftPick`,
  `nbaDraftByStaff`, `nbaDraftRun`, `nbaDraftLabel`, `nbaDraftHeading`, `nbaDraftHelp`, plus re-exports for part
  B's board (`nbaEarnedDraftClass`, `draftRulesFor`, `lotteryNight`, `lotteryNightRule`, `ordinal`,
  `slotsLeftFor`, the types, `GmDraftOrderRules` and `GmLotteryRules` among them). `openNbaDraftNight` answers a
  night already open for the season as it stands (fix pass). Step (d) adds `NBA_DRAFT_KNOBS`, the class's two
  knobs of A4 in the host, on a RIVAL's man only and drawing no number: `rivalSecondOnMin: true` (a rival's second
  round man signs one season at `nbaMinContract`) and `latePot: { from: 13, cap: 66 }` (a rival's man from pick 13
  on has his ceiling capped at 66, never under his own rating, so he stays the player he was drafted as).
- `src/lib/gmEarnedDraft.test.ts` (10 tests) and `src/lib/nbaEarnedDraft.test.ts` (15 tests since step (d), which added the knobs test); both reach the lift,
  the pick ledger of gmPicks included, only through gmEarnedDraft's re-exports (`movePicks`, `newLedger`, `pickKey`).
- `scripts/simNbaEarnedDraft.mjs` (new) and `scripts/data/nbaEarnedDraftFixture.json` (recorded from `48cb9d4b`).
- `scripts/simGmDraftOrder.mjs`: the two libraries added to `MOUNT_ALLOW`, nothing else.
- `src/lib/nbaGmDesk.ts`: UNCHANGED (correction 11). The block key lives in nbaEarnedDraft.ts.

## Expected and NOT to be cleaned

After a summer the season has rolled, so the `draft` block a night leaves on the desk (about 8 KB: the order and 60
slots) is never current again. It stays on the save on purpose (advice 25); nobody should "clean" it.

## Step (d), 2026-10-21 (session J): the NEW arm, the tuning, the two arm table. A STOP.

The lines are the lead's of 2026-10-13 (`dukb-handoff/2026-10-10/briefs/lead-rulings-1319-1320-1321.md`), fixed
before the NEW arm ran: S1 the mean nbaStrength at seasons 5 and 10 within 0.5; S2 men rated 85 or more at season
10 within 20 percent; S3 the two weakest starts' playoff seasons, seasons 2 to 5, at most 10 points under; S4 (the
ruling's) the two strongest starts' PLAYOFF seasons, seasons 2 to 10, at most 10 points under, their title share
printed and never asserted; S5 section 5's rise at every band in every set; S6 (the ruling's) CPU dead money a
season under 1.0 $M and tax payers a season within 0.5 of the OLD arm. Resolution: the per set differences are the
replicates, the error of the pooled difference is their sd over root k, under a third of the margin, and the two
runs within two errors of each other. 12 sets of ten seeds, run twice; nothing needed the fleet to grow.

### The tuning (sets 1 and 2, run 1; each variant minus the OLD arm on the same sets; runners `r1321-j2`, `r1321-j3`)

Every variant draws exactly the numbers the untuned one draws (the knobs only rewrite a signed man). "second" is
knob (i), a rival's second round man on one season at the minimum; "late" is knob (ii), a rival's man from that
pick on capped at that ceiling (66 is the class's floor, so he never grows).

| variant | S1 at 5 | S1 at 10 | S2 | S3 | S4 | S6 dead ($M) | S6 payers |
|---|---|---|---|---|---|---|---|
| untuned (curve 72-80, 69-76, 66-72; no knob) | +1.87 | +4.07 | +31.9 | -42.5 | -26.1 | 3.90 | +9.62 |
| k1: second | +1.81 | +4.08 | +32.4 | -41.3 | -27.8 | 1.55 | +8.19 |
| k2: second, late from 13 at 70 | +0.92 | +2.43 | +4.8 | -32.5 | -16.1 | 1.91 | +2.21 |
| k3: second, late from 13 at 66 | +0.92 | +2.42 | +5.0 | -33.1 | -13.6 | 1.97 | +2.17 |
| k4: k3 and curve 68-76, 66-72, 66-69 | +0.50 | +1.54 | +1.9 | -37.5 | -27.2 | 2.43 | +0.27 |
| **k5: k3 and curve 67-72, 66-69, 66-68 (CHOSEN)** | +0.29 | +1.07 | +3.1 | -38.8 | -30.3 | 2.46 | -0.17 |
| k6: second, late from pick 1 at 66 (outside knob (ii): not a late pick) | -0.68 | -1.88 | -48.5 | -31.9 | -15.8 | 2.53 | -1.03 |

k5 is committed (`NBA_EARNED_CLASS_CURVE`, `NBA_DRAFT_KNOBS`): it is the variant nearest every line the knobs can
reach. What the tuning shows: the curve and the late ceiling move S1, S2 and the payers; nothing they can reach
moves S3, S4, S1 at season 10 or the dead money far enough (why, below).

### The two arm table, 12 sets, two runs (fleet runners `r1321-j4` and `r1321-j5` on 311f2cb0)

Printed by `SIM_NBA_EARNED_DRAFT_COMBINE=<the 48 old and new files> node scripts/simNbaEarnedDraft.mjs` (section 7,
between TABLE BEGIN and TABLE END; exit 1, "RED in section 7": the STOP). The OLD arm's numbers are the same as
`r1321-a1`'s on the base 48cb9d4b to the last printed digit, so merging main moved nothing on the old path.

| line | old (run 1 / run 2) | new | new minus old, run by run (error) | band | sets | verdict |
|---|---|---|---|---|---|---|
| S1 at 5: mean nbaStrength of the 30 clubs, season 5 tip off | 83.11 / 83.11 | 83.38 / 83.37 | +0.27 (0.01) / +0.26 (0.01) | within 0.50 | 12 / 12 | PASS |
| S1 at 10: the same, season 10 tip off | 82.20 / 82.19 | 83.23 / 83.23 | +1.03 (0.01) / +1.04 (0.01) | within 0.50 | 12 / 12 | **OUTSIDE by 0.54 (42 errors)** |
| S2: men rated 85 or more, season 10 tip off | 105.9 / 106.0 | 108.2 / 108.3 | +2.4 (0.3) / +2.3 (0.2) | within 21.2 | 12 / 12 | PASS |
| S3: two weakest starts' playoff seasons, seasons 2 to 5, per season (n 80 a set) | 81.8 / 80.9 | 47.5 / 45.9 | -34.3 (1.3) / -35.0 (1.4) | at most 10 under | 12 / 12 | **OUTSIDE by 24.6 (17 errors)** |
| S4: two strongest starts' playoff seasons, seasons 2 to 10, per season (n 180 a set) | 100.0 / 100.0 | 73.2 / 71.9 | -26.8 (1.1) / -28.1 (0.8) | at most 10 under | 12 / 12 | **OUTSIDE by 17.5 (16 errors)** |
| S6 dead: CPU dead money a season ($M), seasons 2 to 10 (n 540 a set) | 0.13 / 0.13 | 2.49 / 2.49 | (the arm's own) 2.49 (0.02) / 2.49 (0.03) | under 1.00 | 12 / 12 | **OUTSIDE by 1.49 (57 errors)** |
| S6 payers: tax payers a season, seasons 2 to 10 | 2.29 / 2.29 | 2.08 / 2.07 | -0.21 (0.02) / -0.22 (0.02) | within 0.50 | 12 / 12 | PASS |
| S5: his first selection later and worse at every band of finish, in every set | flat (pick 1) | 24 of 24 sets | | every set | 24 | PASS |

S4's title share, printed for the lead and never asserted: OLD 78.3 percent of the strong starts' seasons 2 to 10,
NEW 7.6. Every line is resolved: each error is far under a third of its margin, and the two runs agree within two
errors on every line, so the fleet did not grow. Four lines are OUTSIDE.

### The controls on a reduced fleet (sets 1 to 4, run 1; advice 20), each miss against its error

Each control's own fleet is `SIM_NBA_EARNED_DRAFT_FLEET=full SIM_NBA_EARNED_DRAFT_CONTROL=<name>` (the new arm only,
files `new-<name>-...`), judged by a COMBINE with `SIM_NBA_EARNED_DRAFT_VS=new-<name>`, which exits 1 and says FIRED
when the arm lands outside a line. Both FIRED (exit 1). Errors are over four sets, so wider than the table's.

| control | what it does | outside (miss, in errors) | against the plain new arm |
|---|---|---|---|
| fatclass | every man after today's twelve drawn 70 to 87, as the old class | S1 at 5 by 2.31 (189), S1 at 10 by 5.01 (397), S2 by 42.3 (108), S6 payers by 10.98 (366), S6 dead by 0.36 (32), S3 by 1.6 (0.6) | S1 at 10 +5.51 against +1.04, S2 +63.5 against +2.3, payers +11.48 against -0.21 |
| bestfirst | the order drawn best record first (records swapped) | S3 by 60.0 (33), S4 by 11.9 (7), S5 in all 4 sets, S1 at 10 by 0.37 (13), S6 dead by 1.45 (181) | S3 -70.0 against -34.6; the bottom three back in the sixteen within three seasons 28.2 percent against 84.1 |

So the table can go red for the two reasons it exists to catch: a class too rich for the league (fatclass) and an
order that does not earn (bestfirst). fatclass's S3 miss (0.6 errors) is not a resolved miss; its S1, S2 and payers
misses are.

### The arbitrage arm (sets 1 to 4, run 1): a CEILING (advice 24), never a price

A GM who, on opening day of every season, takes the weakest club's first for his own, FORCED (movePicks then
syncNbaPicks, no club asked): 579 swaps over 240 careers. His first selection moves from pick 20.6 to 3.8 (strong
starts), 18.1 to 3.8 (middle), 18.4 to 4.1 (weak); the strong starts' titles go from 8.0 to 61.4 percent of seasons
and their playoff seasons from 74.8 to 99.6; weak starts' playoff seasons 71.5 against 64.3 plain. This is what a
first is worth at most to a GM who could always get the worst club's: part B and the pricing of a pick by its slot
(pair 2, out of scope here) must make that trade cost what it is worth, or the earned draft becomes the old
draft by another door.

### Beside the lines (pooled over every set and run; printed, never asserted)

| | old | new |
|---|---|---|
| strong starts: playoff / title seasons / mean wins (seasons 1 to 10) | 99.5 / 71.7 / 64.6 | 74.8 / 8.0 / 44.2 |
| middle starts: playoff / title / wins | 94.7 / 63.6 / 61.5 | 65.5 / 4.6 / 42.2 |
| weak starts: playoff / title / wins | 82.6 / 60.3 / 58.7 | 64.3 / 9.0 / 42.1 |
| his first selection, pick number (strong, middle, weak) | 1.0, 1.0, 1.0 | 20.6, 18.1, 18.4 |
| his first selection, true rating (strong, middle, weak) | 85.9, 85.9, 85.9 | 73.0, 73.9, 74.8 |
| the bottom three: in the sixteen within three seasons (percent) | 89.5 | 84.1 |
| the bottom three: change in win share after three seasons (points) | 18.8 | 15.2 |
| spread of nbaStrength over the 30 clubs, season 5 / season 10 | 2.11 / 2.75 | 1.29 / 1.37 |
| the free agent pool's best ten at tip off, seasons 2 to 10 | 78.66 | 77.94 |
| his own dead money a season ($M), seasons 2 to 10 | 16.03 | 2.15 |
| men signed on a draft night | 12.0 | 60.0 |

Section 5 on the quick walk (every club the GM in turn, 2,700 nights, the tuned curve): his first selection by
finish, worst first, is pick 4.2, 7.5, 13.1, 17.4, 22.9, 27.9 at true rating 85.0, 82.6, 75.2, 71.1, 70.5, 70.1,
against pick 1 at about 85.8 in every band today. The steps past the lottery are small (0.60 and 0.38 rating, errors
0.14 and 0.07): with the tuned curve a late first is close to a minimum man, which PART B's words must not oversell.

### Why it is a STOP, and what the lead can choose

PASS: S1 at season 5, S2, the payers and S5 (24 of 24 sets). The knobs earn that: the untuned class put 9.6 more
tax payers a season and 32 more men of 85 or better on the league; tuned, -0.2 and +2.3. OUTSIDE, all resolved:

1. **S3 and S4 measure today's draft's gift to the user, the same artifact the lead ruled on for S4's titles.** In
   the OLD arm the user picks first in every batch, so every start converges on a dynasty: weak starts make the
   playoffs in 82.6 percent of seasons and win 60.3 percent of titles, strong starts 99.5 and 71.7. In the NEW arm
   his club is an ordinary club after season 1 (about 42 to 44 wins at every tier). No variant of the tuning moved
   S3 better than -31.9 or S4 better than -13.6 (table above): the knobs reach the league, not the user's edge.
   Choice for the lead: rule S3 and S4 as the title line was ruled (contention protected against a rebuild that
   cannot climb, not the old dominance). The earned draft's own climb is measured: the bottom three are back in the
   sixteen within three seasons 84.1 percent of the time (OLD 89.5, where one of them is usually the user).
2. **S1 at season 10 is +1.04 and the knobs are spent.** Freezing every rival man from pick 13 and the curve at the
   minimum man's band (k5) leaves +1.0; capping every rival pick from 1 (k6, outside knob (ii), since pick 1 is no
   late pick) overshoots to -1.9. So the rest comes from today's twelve, the same men in both arms. A reading, not
   measured on its own: in the OLD arm the user takes two of the best every year and cannot play them all (his own
   dead money is 16.0 $M a season, he waives to fit fifteen, and the league's spread of strength is 2.75 against
   1.37), while in the NEW arm the twelve go to twelve clubs and all play and grow. S1 is the mean of all thirty, and
   nbaWinProb reads the gap between two clubs, so a league one point stronger everywhere moves no game's chance; it
   moves the league against the free agent pool (its best ten at tip off: 78.7 OLD, 77.9 NEW) and the opening ratings.
   Choice: accept +1.0 at season 10, or widen knob (ii) to the lottery's later picks (somewhere between pick 1 and
   13; measure it), or a line on the spread instead.
3. **S6's dead money is 2.49 $M a season against a band of 1.0.** CPU clubs waive draftees at tip off to fit
   fifteen. Knob (i) already puts every rival second rounder on one season at the minimum (k1 alone took the dead
   money from 3.90 to 1.55); the rest is first rounders 13 to 30, who sign the rookie deal of four seasons
   (nbaProspectToPlayer: years 4, at least 3 $M scaled), which no allowed knob can touch, and the lower the curve
   the more of them are waived (k1 1.55, k5 2.46). Across 29 CPU clubs 2.49 $M is about 0.09 $M a club a season;
   the user's own dead money falls from 16.0 $M to 2.2. Choice: raise the band, or allow a third knob (a rival's
   first rounder from pick 13 on signs a shorter deal), which is the pricing of a pick by its slot that A8 put out of
   scope.

4. **Not a line, but the lead should know it:** both knobs touch a RIVAL's man only (brief 3.3, "for a rival the two
   knobs"), so his own late picks keep their ceiling and his second rounders the four season deal while a CPU club's
   do not. The fleet measured the round with that edge in it. PART B's words must not hide it, or the lead may
   prefer the knobs on every club (one line in the host; the fleet would have to run again).

Nothing here is argued past its line: the four OUTSIDE lines are the STOP, and PART B waits for the lead's word.

## The OLD arm (today's draft, desk on), 12 sets of ten seeds, two runs (runner `r1321-a1`)

Six user clubs by opening strength: BOS and CLE (strong), POR and CHI (middle), MIL and BKN (weak); 60 careers of
ten seasons a set, the auto GM on his scout's read with the staff's rule on every contract.

| line | run 1 mean (per set sd) | run 2 mean (per set sd) | n a set |
|---|---|---|---|
| S1 mean strength, season 5 tip off | 83.11 (0.01) | 83.11 (0.03) | 60 leagues |
| S1 mean strength, season 10 tip off | 82.20 (0.02) | 82.19 (0.03) | 60 leagues |
| S2 men rated 85 or more, season 10 | 105.9 (0.5) | 106.0 (0.4) | 60 leagues |
| S3 weak starts' playoff seasons, 2 to 5, per season | 81.8 (2.4) | 80.9 (2.7) | 80 seasons |
| S4 strong starts' titles, 2 to 10, per season | 78.8 (2.9) | 77.8 (2.1) | 180 seasons |
| S6 CPU dead money a season ($M), 2 to 10 | 0.1 (0.0) | 0.1 (0.0) | 540 seasons |
| S6 tax payers a season, 2 to 10 | 2.29 (0.04) | 2.29 (0.05) | 540 seasons |

S5 (his first selection by finish band) in the OLD arm is flat at pick 1 in every band, true rating 85 to 86.

**The fleet by decision 2's rule: 12 sets** (S3 and S4 both need 12, the floor). One set takes about 57 s on a
runner (73 s on the owner's PC): a shard of three sets about 170 s.

### What the lead had to decide before the NEW arm (STOP of 2026-10-12, ruled on 2026-10-13)

1. **The OLD arm is not a level field: the user wins almost everything.** Picking first in every batch, his club
   finishes in the league's top five in 523 of 600 seasons (set 1, run 1), where strong starts won 75.5 percent
   of their ten seasons' titles, middle starts 64.5 and weak starts 61.5. S4 as written ("titles of the two strongest starts at most 5 points
   under the OLD arm") asks the earned draft to keep a strong start at 74 percent titles or more while it moves him
   to pick about 20th to 30th. I expect S4 to fail by far on any curve, which would be the earned draft working,
   not a defect. The line is the lead's to keep, reset or replace before the NEW arm is measured.
2. **S6's dead money line is degenerate.** CPU dead money in the OLD arm is 0.1 $M a season, so "within 25
   percent" is a 0.025 $M band: one CPU waiver of a single rookie breaks it. With about 60 rookies a year instead of
   12, CPU clubs will waive more. A line in $M (or a count of CPU waivers) is needed instead.
3. S1, S2 and S3 resolve easily on 12 sets (the per set sd is far under a third of each margin).

## Fix pass, 2026-10-12 evening (two adversarial reviews of d4755bcb: the run lens and the read lens)

Every finding was fixed, each in its own commit. Report: `dukb-handoff/2026-10-10/results-g/fix-1321.md`.

1. MAJOR, rivals choose on the engine's grade, now held. Section 9 used to read the best man and the gap through
   `host.read` itself, so `read: scout` for rivals (the run lens's mutation m1) stayed green. Section 9 now works
   out every rival choice without the host: the engine's grade plus the pinned weight (2) a whole point of the
   engine's `nbaDraftNeed`, ties to the lower id, and holds the host's choice to it (1,754 of 1,754 on the quick
   walk). Control `rivalscout` (m1); a unit test holds `host.read` for rivals and for him, and `host.shown`.
2. The weight is pinned in the harness (`NEED_WEIGHT = 2`), checked against the engine's constant; control
   `bigneed` (the engine's weight at 20, m5).
3. The heading tests hold the whole heading with `toEqual`, so the clock line is his alone (m4).
4. His second round man is held to the plain draft deal, never the first round scale (m3).
5. `openNbaDraftNight` over a night already open for the season answers it as it stands and writes nothing (it
   used to hand back a fresh night with made 0 over spent markers). Unit test; section 4 opens again after Continue
   in every draft; control `reopen`. The unit tests that move picks now move them before the night opens.
   PART B's board still sets its guard before it opens (correction 12); this only makes a second open harmless.
6. Section 1b PRINTS whether the four desk off files moved since the base and is no longer a failing check, as
   brief 3.4 asks ("printed, not re-proven here"). As a check it would go red by construction in PART B (which edits
   nbaGmDesk.ts and simNbaGmDesk.mjs) and on any clone without 48cb9d4b. The proof of decision 3 (a) is the gate's
   own `git diff --quiet 48cb9d4b -- ...` line (`diffproof`) and simNbaGmDesk check 1.
7. The help reads the class size from `nbaEarnedClassSize` instead of retyping the rule; control `shortclass` moved
   with the rule to its new line; a unit test holds the help's number to the class drawn.
8. `draftRulesFor`, `GmDraftOrderRules` and `GmLotteryRules` come through nbaEarnedDraft.ts, so PART B's board can
   hand the lottery card its rules without naming the rules file (which the LIFT regex matches).
9. Controls for checks that had none: `elevenhead` (section 6's today's twelve, m7) and `foreignimport` (section
   10's import allowlist). Section 4's JSON round trip and swapped table get none on purpose: nothing outside the
   lift can make either fail today (the harness header says so); they stay as tripwires for PART B.
10. Both test files reach `movePicks`, `newLedger` and `pickKey` through gmEarnedDraft's re-exports and the lottery
   table through the NBA desk's `nbaGamePickRules`, never gmPicks itself (advice 17's letter, not only its purpose).

## Gates on runners (each a `git show origin/rc-results/<name>:logs/<label>.log`)

Step (d), 2026-10-21 (session J), newest first:

- `r1321-j9` on f9f28256 (#!serial): a bounded review of the knobs, four mutations of src/lib/nbaEarnedDraft.ts
  (`.rc/x/mut.mjs`), all four CAUGHT by real assertion failures: allclubs (the knobs on his men too: 2 tests),
  latefrom (the cap from pick 1: "expected 87 to be greater than 87"), firsttoo (first rounders on the minimum:
  "expected 1 to be 4"), underown (a cap under his own rating: "expected 65 to be 68"); `after`: 25 of 25 pass.
- `r1321-j8` on f9f28256 (#!serve, #!playwright, #!serial): weight, both routes equal to 85a76241 (below);
  simWritesAreSent exit 1 with 2 failures ("could not drive Guess the Nation to a finish", "no guess was ever
  submitted") on this head AND on a worktree of 85a76241 built in the same job; simGmCalendar exit 1 with 6
  failures (the Everton seasonDays and monthGrid hashes) on both. Neither is this round's.
- `r1321-j7` on f9f28256 (#!serve, #!playwright): readers1 (12) and readers2 (11) exit 0; fences exit 1 only on
  simWritesAreSent (above), the other 16 exit 0 (with simNoRivalNames, simInventedNames and simHarnessAnchors in
  j6: 20 of the 24 rule fences); simGmXp exit 0 (Round 1314's fix is on main); fleetget exit 0: the COMBINE of the
  60 fleet files on the runner itself, "RED in section 7." (the STOP), fatclass and bestfirst "FIRED on the fleet".
- `r1321-j6` on f9f28256: tsc exit 0; vitest exit 0, 22 files, 237 tests; earned exit 0 "simNbaEarnedDraft:
  green." (9 sections, 1a "315516 draws held to the base 48cb9d4b"); earned-ctl exit 0 "all 20 fired, each in
  exactly its own sections"; nbadesk exit 0 and its 18 controls fired; capital-ctl exit 0, 21 controls with their
  own failed indices; draftorder exit 0 and draftorder-all "all 40 fired"; singles exit 0 (simGmPicks,
  simDraftNight, simEngineIds, simInventedNames, simHarnessAnchors, simNoRivalNames "0 findings",
  simStorageWrites); diffproof exit 0 "diffproof-ok" (no removed engine line against 85a76241, no growth shape,
  the four desk off files equal to 48cb9d4b, src lists nbaFrontOffice.ts and the four new files, 876 insertions).
- `r1321-j4` and `r1321-j5` on 311f2cb0: the fleet (every shard exit 0), the two fleet controls and the arbitrage
  arm; j4's earned-ctl had flatodds and flatclass landing on section 5's old floors (fixed in f9f28256).
- `r1321-j2` and `r1321-j3` on e7bdbb40: the untuned new arm and the six tuning variants on sets 1 and 2.
- `r1321-j1` on the merge 2f0a9447: every line of the old gate exit 0.

Before step (d):

- `r1321-a1` on eca5bd25: simNbaEarnedDraft quick exit 0, all controls exit 0 (1 of 1), 8 fleet shards exit 0.
- `r1321-b1` on 4635d88d: tsc exit 0; simNbaEarnedDraft exit 0 and its 4 controls fired; simNbaGmDesk exit 0 and
  all 18 controls fired in their own checks (that harness exits 0 when a control fires); simNbaDraftCapital exit 0
  and all 21 controls exit 0 with their own failed indices; simGmDraftOrder exit 0 and all 40 controls fired;
  simGmPicks, simDraftNight, simEngineIds, simInventedNames exit 0; the diff proof (decision 3 a, c, d) ok.
- `r1321-b2` on 4635d88d: vitest of src/components/nba-front-office, src/components/front-office-shared and every
  src reader of a touched file, 23 files and 251 tests pass; 23 reader harnesses exit 0; simGmXp and
  simGmCalendar exit 1 with the same first line on this head and on 48cb9d4b (Rounds 1314 and 1316, not this one).
- `r1321-c1` on 5ba00f45: tsc exit 0; vitest of the two new test files, 20 tests pass; simGmDraftOrder exit 0 and
  control `mounted` FIRED (section 9); simNbaEarnedDraft exit 0.
- `r1321-c2` on c001004a: simNbaEarnedDraft exit 0 and all 14 controls fired; simGmDraftOrder all 40 fired; rule
  fences exit 0 except simHarnessAnchors (one anchor a CRLF checkout could miss in section 10's raw read: fixed in
  af5d7a3a) and two browser fences that had no Chromium in that request (rerun in `r1321-f2`).
- `r1321-w1`: weight, see below.
- FINAL, `r1321-f1` on af5d7a3a: tsc 0; vitest 21 files and 214 tests pass; simNbaEarnedDraft 0, all 14 controls
  fired, FLEET=full shard 0/12 green (90 seasons, 40,000 keyed lotteries on 20, worst 2.82 standard errors);
  simNbaGmDesk 0 and its 18 controls fired; simNbaDraftCapital and its 21 controls exit 0; simGmDraftOrder 0 and all
  40 controls fired; simGmPicks, simDraftNight, simEngineIds, simInventedNames, simHarnessAnchors, simNoRivalNames
  and simStorageWrites 0; the diff proof of decision 3 ok.
- FINAL, `r1321-f2` on af5d7a3a: 23 reader harnesses 0; the rule fences 0 except simWritesAreSent (2 failures);
  four fences that read the live database were not run (production).
- `r1321-f3`: simWritesAreSent on a plain build of this head and of 48cb9d4b in the same job: the same 2 failures
  on both ("could not drive Guess the Nation to a finish: locator.click timeout", then "no guess was ever
  submitted"). Not this round's.
- origin/main was still 48cb9d4b at the end of this run (no Release BB yet), so nothing was merged.
- FIX PASS, `r1321-fix-a` on 2d488765: tsc 0, the two test files 0, simNbaEarnedDraft 0, controls rivalscout
  (section 9, 2), bigneed (9, 3), reopen (4, 30) and noneed (9, 4) each exit 1 FIRED.
- FIX PASS, `r1321-fix-b` on 267cd6a6 (#!serve): build 0; tsc 0; vitest 21 files, 218 tests 0; simNbaEarnedDraft
  0; simNbaGmDesk 0 and its 18 controls fired; simNbaDraftCapital and its 21 controls exit 0 with their own failed
  indices; simGmDraftOrder 0 and all 40 controls fired; simGmPicks, simDraftNight, simEngineIds, simInventedNames,
  simHarnessAnchors, simNoRivalNames (0 findings) and simStorageWrites 0; diffproof ok; the 23 reader harnesses 0.
  Its all controls line exited 1: trustblock went red in sections 3 and 8, not 8 alone (below).
- FIX PASS, `r1321-fix-c` on 267cd6a6 (#!serial): the run lens's mutations, each applied and restored in its own
  line, all CAUGHT: m1 (section 9 and the host read test), m3 (the staff press test), m4 (the clock line test), m5
  (section 9, 3 failures), m7 (section 6); the tree clean and the harness green after them.
- FIX PASS, `r1321-fix-d` on 3568f30f: control trustblock FIRED in 3 and 8 (284 and 100); all 19 controls fired,
  each in exactly its own sections; simNbaEarnedDraft 0. Why 3 now: opening asks nbaDraftNightOf first, so a
  validator that trusts any block hands season 2 the spent night of season 1 (its order disagrees with the season).
- FIX PASS FINAL: see `dukb-handoff/2026-10-10/results-g/fix-1321.md` for the closing head's request.

## Weight (decision 6)

Step (d), runner `r1321-j8` on f9f28256 against a build of 85a76241 in the same job: `/nba-front-office` 378.9K
gzipped JavaScript in 38 files on both, `/front-office` 372.0K in 38 files on both (main grew both routes since the
base; this round moves neither). Before step (d): `/nba-front-office` 375.3K gzipped JavaScript in 37 files on
this branch and on 48cb9d4b; `/front-office` 363.4K in 36 files on both, the chunk lists the same file for file
(runner `r1321-w1`, a plain build served like the host, iPhone 13, the database blocked). No budget row added or
edited.

The reader list: `git grep -l -E "nbaFrontOffice|gmDraftNight|gmDraftOrder|gmLotteryNight|simGmDraftOrder" -- scripts src`.

## For a round allowed to edit scripts/data/gmDraftOrderSources.json (advice 21, a line, never an edit here)

The `realSpan` fact (the 2019 to 2026 lottery, a new one from the 2027 draft) has two reads on one publisher
(pr.nba.com and nba.com). The critic read it again on independent publishers on 2026-10-12 (dunkest.com, 29 May
2026, and thescore.com); a round allowed to edit the ledger should add one of them as the second read.
