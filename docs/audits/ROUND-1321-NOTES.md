# Round 1321: the NBA Front Office's earned draft, part A (the engine and the libraries, nothing a player sees)

Branch `r1321-nba-draft-earned-a`, base `48cb9d4b` (origin/main, Release AY). Written by the round's builder,
2026-10-12, and kept current at every push. Brief: `dukb-handoff/2026-10-10/briefs/brief-1321.md`.

## Where it stands

This run is the brief's split at step (d) (advice 19): steps (a) to (c) are built, pushed and proven on runners,
with sections 1 to 4, 6, 8, 9 and the sport neutral section 10 on the quick walk, and the OLD arm measured on the
full fleet. **The NEW arm (section 5, section 7's two arm table, the tuning) is NOT built: it waits for the lead's
word on the stop lines and the fleet, and the OLD arm's numbers below say two of the lines need that word.**

Nothing in `src` calls the new code but its own tests. No screen, no copy, no What's New, no guide edit.

## Files

- `src/lib/nbaFrontOffice.ts`: added lines only (0 removed, runner `r1321-b1` line `diffproof`):
  `NBA_EARNED_CLASS_CURVE` (13 to 30 at 72 to 80, 31 to 45 at 69 to 76, 46 to 70 at 66 to 72, the draft's
  starting shape, untuned), `nbaEarnedDraftClass`, `NBA_DRAFT_NEED_WEIGHT` (2), `nbaDraftNeed`,
  `nbaConsumeDraftRound`. No anchor of simNbaDraftCapital is repeated.
- `src/lib/gmEarnedDraft.ts` (new, sport neutral): `earnedContinue`, `earnedPick`, `earnedByStaff` over any
  `GmDraftHost`, each answering `done` exactly when no slot is left; `earnedDraftHeading` (lines from the slots and
  a `labelOf`); `lotteryRangeLine` (the worked example from the saved field and draws); `lotteryChancesLine`;
  `earnedDraftHelp` (the lottery's own blocks, the chances, then the sport's blocks). It re-exports what a bind and
  its tests need from the lift, so neither names a lift module.
- `src/lib/nbaEarnedDraft.ts` (new, the NBA's half): `NBA_DRAFT_BLOCK = 'draft'`, `nbaDraftSeason`,
  `nbaDraftOrder`, `nbaDraftNightOf`, `openNbaDraftNight`, `nbaDraftHost`, `nbaDraftContinue`, `nbaDraftPick`,
  `nbaDraftByStaff`, `nbaDraftRun`, `nbaDraftLabel`, `nbaDraftHeading`, `nbaDraftHelp`, plus re-exports for part
  B's board (`nbaEarnedDraftClass`, `lotteryNight`, `lotteryNightRule`, `ordinal`, `slotsLeftFor`, the types).
- `src/lib/gmEarnedDraft.test.ts` (9 tests) and `src/lib/nbaEarnedDraft.test.ts` (11 tests).
- `scripts/simNbaEarnedDraft.mjs` (new) and `scripts/data/nbaEarnedDraftFixture.json` (recorded from `48cb9d4b`).
- `scripts/simGmDraftOrder.mjs`: the two libraries added to `MOUNT_ALLOW`, nothing else.
- `src/lib/nbaGmDesk.ts`: UNCHANGED (correction 11). The block key lives in nbaEarnedDraft.ts.

## Expected and NOT to be cleaned

After a summer the season has rolled, so the `draft` block a night leaves on the desk (about 8 KB: the order and 60
slots) is never current again. It stays on the save on purpose (advice 25); nobody should "clean" it.

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

### What the lead must decide before the NEW arm (STOP)

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

## Gates on runners (each a `git show origin/rc-results/<name>:logs/<label>.log`)

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
- `r1321-c2` on c001004a: see the closing report (sent, read after this file was written).

The reader list: `git grep -l -E "nbaFrontOffice|gmDraftNight|gmDraftOrder|gmLotteryNight|simGmDraftOrder" -- scripts src`.

## For a round allowed to edit scripts/data/gmDraftOrderSources.json (advice 21, a line, never an edit here)

The `realSpan` fact (the 2019 to 2026 lottery, a new one from the 2027 draft) has two reads on one publisher
(pr.nba.com and nba.com). The critic read it again on independent publishers on 2026-10-12 (dunkest.com, 29 May
2026, and thescore.com); a round allowed to edit the ledger should add one of them as the second read.
