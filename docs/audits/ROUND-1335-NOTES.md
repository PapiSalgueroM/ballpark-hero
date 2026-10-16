# Round 1335 notes: the board reads the season you had, and the job market

Branch r1335-cm-board, cut from origin/main d4f2c6f6 (src equal to Release BG, bd3b6244). BOARD_BASE is a
worktree of d4f2c6f6 (on a runner: `git worktree add .claude/worktrees/r1335-base-a d4f2c6f6`, inside the repo so
node_modules resolves by walk up). Harness: scripts/simCmBoardVerdict.mjs.

## Step 0: the measurement (remote check r1335-s0, head 1b8a13ed, every line on CM_BOARD_BASE)

- falls (34 s): 3200 fresh careers, four clubs a tier in each of era2005, era2010, era2015, era2020 and the
  modern world, 40 seeds each; every opening seen was 60; 990 first competitive matches were lost (all league).
  The board's fall on a lost opener, p95: tier 1 8.5, tier 2 8.5, tier 3 7.2, tier 4 5.5; by era 7.5 to 8.5;
  pooled median 5.5, p90 7.5, p95 8.5. **BOARD_FRESH = 60 + 8.5 rounded up = 69** (under the 72 stop line).
  A tier 1 opener lost at the 95th percentile lands at 60.5 (just Safe), a tier 4 one near 63.5.
- rollover (375 s): the title fleet (12 clubs, seeds 0 to 9, three seasons, two policies) is 240 careers; 145
  were sacked before their third summer (base behaviour of a quick sim fleet that never trades), 461 season
  ends, 408 stays, 53 moves.
  - A or B stays that opened the next season under Safe: **239 of 298**; grade B: **83 of 86**; title seasons:
    **129 of 153** (cm M6 measured).
  - promotions 12, graded C or worse **6** (first: West Ham, 2nd, C, seed 2: cm M8).
  - the promotion sub fleet (every 2026-27 second tier club expected in its top four, five seeds, one season):
    45 promotions, 4 graded C or worse; 8 of 57 A or B stays opened under Safe.
  - the flat allocation over the club's budget, staying rollovers of both fleets: tier 1 median 1.08, p99 1.68
    (n 281); tier 2 median 1.11, p99 1.66 (n 17); tier 3 median 1.2, p99 3.22 (n 56); tier 4 median 1.92,
    p90 6.5, p99 7.0 (n 137). **KITTY_TOP_SHARE = 1.7** (the smallest multiple of 0.05 at or above the tier 1
    and 2 p99 1.68). At 1.7 the band binds 0 of 281 tier 1, 0 of 17 tier 2, 25 of 56 tier 3 (10 with a
    trophy) and 77 of 137 tier 4 rollovers (39 with a trophy).
- offers (202 s, with takeover):
  - title fleet: 118 seasons with offers, 168 offers; **49 seasons and 56 offers two or more tiers up**
    (Celtic, tier 4, offered Aston Villa and Manchester United, tier 2).
  - tier 4 fleet (the weakest club of each of the 27 leagues, seeds 0 to 7, two seasons): 331 season ends, 265
    with offers, 403 offers; **131 seasons and 151 offers two or more tiers up** (Frosinone offered Manchester
    City; cm M13).
  - takeover: 180 startMidSeason handovers (twelve clubs of 2005-06, 2015-16 and 2026-27, autumn, new year
    and run in, seeds 0 to 4): **103 carry a failed objective** (Everton 2005-06: "Reach the FA Cup
    semi-finals"; cm m7).

Measurement note: the first run picked the promotion fleet after earlier careers had registered their
summers, so three clubs a previous career had relegated were picked as second tier clubs (its "relegations 3").
The fleet picks now reset the registry first (promoFleet, tier4Fleet); the figures above are otherwise
unaffected (the kitty and the A or B counts come from the title fleet's own careers).

## The step order and the recordings carried red (correction 6, option A)

Two recordings move with this round and are retaken ONCE, last: scripts/data/cmLeagueRulesDigest.json and the
Round 1081 pin (scripts/fixtures/managerAppealIsolation1081/manifest.json). From step 2 to step 9 both are red
on every head, and this round is shown to be their only cause on every step: the forced leg (a runner only copy
of the head with legacySeason answering true and startCareer's opening put back to 60, .tmp-fx/forceLegacy.mjs)
runs simCmLeagueRules green against the committed digest (r1335-s2, s3, s4, s5, s6: "all checks passed (modern,
eras, pure)"), and the head's own first failing lines are the digest rows the new grade and line reach (s2: laliga,
bundesliga2, serieb, ligue2, segunda, era2010 bundesliga2010, era2005 bundesliga2005, "differs in summary") and the
pin's sha at simManagerAppealIsolation.mjs:142 (80ee99e7 against 7a89018d on step 2).

## Engine hunks (named for the other rounds)

- src/lib/clubManager.ts: the import after the board asks import (one line plus a re-export of BOARD_FRESH for the
  two harnesses that read the opening); SeasonRecord.fate; SeasonSummary.fate; the matchRules doc's first five
  lines (now seven; the last two doc lines and `matchRules?: 'base';` byte equal); openObjectives directly under
  objectiveStatuses; startCareer's `boardConfidence: BOARD_FRESH`; legacySeason directly under matchRuleOf;
  maybeApproach's pick line; finishSeason's grade (the ladder kept as the legacy arm), its line, the offers' filter
  (`big` and `suitors`) and the two `fate` spreads; fateRead and seasonFate directly under runPromotionRelegation;
  startNextSeason: `legacy`, `cardIds` and `opening` right after promiseNet, the literal's `boardConfidence:
  opening`, and the allocation's new arm (one named expression each, for Round 1501 to wrap).
- src/lib/clubManagerCalendar.ts: the engine import (legacySeason, openObjectives), the module import, playRunIn's
  pin to 60, and in each takeover's return the opening line and one `boardObjectives` line directly above the
  Round 633 comment.
- src/lib/managerHotSeat.ts: the module import, `s.boardConfidence = LEGACY_BOARD_START` with its comment right after
  the startCareer call, and the Round 1331 comment's lines 527 and 528 (526 byte equal). Round 1341 rebases its
  comment edit on this one (correction 7, option 1, the order Q7 already gives).

## Step results (remote checks)

- Step 2 (r1335-s2, r1335-s2b on 00cd9362): the grade fleet (the title fleet with both policies, the 2026-27 second
  tier clubs expected in their top four and the bottom four of every paired top flight, ten seeds, two seasons):
  831 season ends, 197 promotions, 88 relegations, 46 escapes, 153 A seasons by a title or two trophies and 77 by
  overshoot alone, every check green. On the base ladder the same seasons graded 23 promotions C or worse, and the
  relegation cap changes 49 grades (Q3: those are clubs expected even lower that went down above their slot).
  finishSeason draws as the base on every season end. Legacy: 110 careers byte and draw equal. Controls nofate,
  statues, fateflip, fatecount, legacyleak all fired.
- Step 3 (r1335-s3 on d837ac8e): 776 summer offers, every one within the step (13 two tiers up after a big season);
  709 mid season approaches within one tier; all 794 tier 2 to 4 clubs of every world have a club one tier up. The
  tier 4 fleet's same season ends were dealt 150 offers two or more tiers up in 128 seasons on the base. Hot Seat:
  80 dates, 77 identical, 3 differ only in a suitor's name, none moved, 6 raised an approach; 30 Deadline Day dates
  equal; simDailyDeals green unedited. Controls nostep and prefilter fired.
- Step 4 (r1335-s4, r1335-s4b on d64314de): fleet B, 2173 lost openers on three seed bases, every one left Safe
  (FRESH_FLOOR 1, structural: an opener under the wage cap costs at most 8.5). 200 takeovers (20 by joinClubNow)
  open at 69 and equal the base but for the opening. Without the Hot Seat line one date of 60 moves (2026-10-25,
  the press question id), so the line has a demonstrated need. Controls start60, noband, hotstart fired.
  simMidSeasonStart, simCmApplications, simManagerHotSeat, simDailyDeals, simDeadlineDay, simDailyClubPool,
  simClubManagerCalendar and the Hot Seat and calendar unit files green.
- Openings by fate and grade (the title fleet, base mean against head mean): A 55.7 to 57.9 against 69 to 71; B
  48.6 to 51.8 against 69; C 43 to 44 against 41 to 42; D 37 to 40 against 36 to 39; a promotion 78.6 to 80.3
  against 69 (the old sum read the club's rank in the league it was promoted INTO; the new one reads the league it
  played in, Round 513's playedExpectation); a relegation 35 against 42 (one case); an escape 56.5 against 69.
- Step 5 (r1335-s5 on 80709114): the band at 1.7 bound 0 tier 1 and 0 tier 2 rollovers, 20 of 56 tier 3 (5 with a
  trophy) and 287 of 402 tier 4 (36 with a trophy); a tier 4 club's next budget over its usual one, median 4 to 5
  and p90 7 to 8 on the base, 3.25 on the head (the carry is capped by the cheque, so it shrinks with it). Control
  nokitty fired; simClubManagerBudget, simClubManagerFinances, simBoardAsks, simBoard green.
- Step 6 (r1335-s6 on 5f64a3df): 200 takeovers, 109 carried a failed objective on the base and none on the head; the
  card is exactly the base card less its failed lines; the season score at the final whistle is equal with and
  without them on 99 cases. Controls keepfailed and scoredone fired.

## Residuals named, not this round's

- promiseNet (startNextSeason) and the XP's objectivesMet read objectiveStatuses after the summer's swap (correction 5).
- An inherited done objective counts for the new manager at the first summer (Q10).
- The takeovers' run in plays maybeApproach, so since step 3 a run in's suitor can differ by name from the base
  (masked in section takeover, as in section dailies). Correction 2's "equal by construction" holds with that mask.
- applyForJob draws unseeded in a harness that does not wrap it (simCmApplications does not); section takeover seeds it.
- Hot Seat's own takeover still inherits failed objectives (advice 17): owed, a one line openObjectives in
  handoverState would close it without moving a date.
