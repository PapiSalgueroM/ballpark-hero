# Round 618 contract: the finance projection expects the crowd the engine expects

Written 2026-09-16 by the Claude desktop lane (block 610 to 619), from the Ajax trace and the
two finance re-measurements of 2026-09-15. Build contract for the round: the desk change, the
fence change, and the reasons.

## 1. The defect, with proof

`projectFinances` in `src/lib/clubManagerFinances.ts` projects the income still to come as the
certain home games left times one gate. Until this round that gate was the average of the
gates banked so far once three had been banked, and a stature estimate before that
(`expectedHomeCrowd` times the price a head). The engine draws every home crowd from a uniform
band by the host's tier (`matchAttendance`, `clubManager.ts`: 56,000 to 78,000 for tier 1 down
to 9,000 to 21,000 for tier 4, times the ticket tier's crowd multiplier, the ground upgrades and
the fans' mood multiplier; a custom club draws 0.74 to 1.0 of its capacity), and
`expectedHomeCrowd` estimated that same draw. A mean over three to seven banked gates is a
noisier estimate of the same number: the spread of one tier 4 gate is 23 percent of its mean,
15 percent at tier 3, 13 at tier 2, 9.5 at tier 1.

The estimate itself was also slightly wrong, which the review of this round caught and which is
fixed here. It scaled the band's midpoint and then clipped the result at the ground's ceiling,
while the engine clips every draw, and the mean of a clipped draw sits below the clipped mean.
Measured against the engine's own draw over 400,000 samples per cell: the old line read up to
5.8 percent high on a tier 2 gate at the top of the reachable multiplier range, 3.0 percent high
at tier 1, and 2.1 percent high on a custom ground, while tiers 3 and 4 never clip and were
exact. The closed form now used tracks the draw's mean everywhere.

Measured. The Ajax trace (2026-09-15, tier 4): the projection read 6.16 against a closed 6.12 at
week 2 on the prior, then 7.08 at week 3 the moment the third gate switched it to the sample
mean, 7.29 at week 5 (19 percent over) and 6.76 at week 30 (10 percent over), every projected
game arriving and the whole gap the average of a few high early draws. After Round 617 made the
fixture list alternate, most clubs bank three gates by week 5 and the week 5 error of the
finance fence grew from a p90 of 11.2 to 14.0 percent to 13.3 to 18.3 (36 runs, five seeds).

One factor the prior lacked: the finance tree's gate edge (`gateEdge` in `clubManagerXp.ts`,
1.00 to 1.10), which the gate applies and the sample mean therefore carried. With it, the prior
is the gate's own expectation to the pound, and it also follows a change of ticket tier, a
ground upgrade or a mood swing at once, where the banked average keeps mixing in gates taken
under the old conditions.

## 2. The rule

`perHome = expectedHomeCrowd(state) * gatePricePerFan(state) * gateEdge(state) / 1e6` at every
week, the banked gates never enter it. `gateEdge` is imported from `@/lib/clubManagerXp` (which
imports only a type from the engine, so there is no cycle).

Two things the review changed before this shipped:

- `expectedHomeCrowd` is rewritten to return the mean of the clipped draw rather than the
  clipped midpoint (`cappedDrawMean`), for the real club path and the custom ground path alike.
  It reads the bands, the ceiling and the custom floor from the engine's own
  `CROWD_BANDS`, `CROWD_CAP` and `CUSTOM_CROWD_FLOOR` exports, which `matchAttendance` now reads
  too, so the desk holds no second copy of the crowd model to drift away from the draw.
- The tickets and food split no longer divides one gate by the food's share of the price. The
  ledger banks food at the food rate with no tree edge and puts the whole edge in the ticket
  line (`noteHomeGate`), so the projection does the same: food from the food rate, tickets the
  rest of the gate. The totals never disagreed; the two rows now agree as well.

The header of the desk and the doc comment on `expectedHomeCrowd` say what the projection reads.

What this does not touch: actual income to date (the ledger), the certain fixtures count, the
spend side, the sponsor desk, prices and the fans.

## 3. The fence

`scripts/simClubManagerFinances.mjs`:

- Section 3 is re-measured over SIM_SEED 0 to 4 (36 runs each) on the Round 617 list with this
  estimator, and the income bands are set by the header's recipe (roughly twice the mean and 1.6
  to 2.2 times the worst seed) on that measurement; the header records the numbers beside the
  post 617 ones, so the improvement is on file. The spend bands are unchanged.
- A new negative control, `CM_FINANCES_CONTROL=samplemean`, bundles a copy of the desk with the
  old three gate switch back in. Section 3 must go red on the week 5 income bands. It refuses to
  run if the new line is not found.
- The header paragraph that says the income side "leans on the average gate" says what it
  reads now, and why the banked gates were the wrong estimator for this engine.

## 4. Gates

tsc at zero, the finance fence plain and under all four controls (output read), the Club
Manager family that reads the desk (`simClubManagerBudget`, `simClubManagerFacilities`,
`simClubManagerStaff`, `simSponsors`, `simBoardAsks`, `simClubManagerMeters`, `simClubManagerSave`,
`simMatchScreen`), `simNoRivalNames`, `simNoInventedQuotes`, the production build, a browser play
of `/club-manager`, an adversarial review of the diff, and the full suite before the merge.

## 5. Records

The LIVE section in `docs/PROJECT-STATE.md` with the measurement before and after, the board's
618 line to LIVE, and the finance header's post 618 numbers.
