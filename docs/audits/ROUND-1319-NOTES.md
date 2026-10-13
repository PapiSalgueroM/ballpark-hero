# Round 1319: the combine you run, part A (the engine, nothing a player sees)

Branch `r1319-us-combine-a`, base `origin/main` 48cb9d4b (Release AY). Built 2026-10-12 by the desktop
Claude lane (session H's workflow). Brief: dukb-handoff/2026-10-10/briefs/brief-1319.md (its section 1
binds, the critic's corrections in its section 2 bind where section 1 says so).

This is ROUND A of the critic's split (its item 18): the showcase grade lifted so that a number from a
player's own hands can feed it, the stations each sport offers (plain names, plus the NHL `now` pair
audit row 65 backs), the played path (open, resolve, settle, the cuts, the curves), the reload rule that
hands an unfinished attempt to the scouts' keyed draw, and the measurement of what hands are worth
against that draw. Nothing in the product can open an attempt yet: the guard in preDraftShowcase and
the settle in the loader are new code that runs on every load but is INERT, because no screen writes
`combine`. Round B (the next number) puts the tile, the stations dialog and the walk on this head.

## Step table

| Step | What | Head | Runner result | Read |
|---|---|---|---|---|
| 0 | notes, collision diff, readers, baseline on the base | 48cb9d4b (base) | `r1319-s0`, `r1319-s0loop` | below |
| 1 | the lift: preDraftShowcaseGradeFrom(u, s), the scouts path hands it rng() | 67b8d0e8 | `r1319-s1` | tsc 0; seed sets a to e ALL GREEN (section 9's 80 digests equal); gradeshift and extradraw exit 1 with 8 FAILURE(S), section 9 only; the 14 loop passes; vitest (6 files) green |
| 2 | the stations data: PreDraftStation, `stations` on the four descriptors, preDraftStations, vitest | 42ebbd0e | `r1319-s2` | tsc 0; a to e ALL GREEN; vitest 66 passed; the loop passes; weight +0.1K on each route |
| 3a | the engine (curves, open, resolve, settle, cuts, the guard, the loader) and harness sections 10 and 11, seven controls, the engine vitest | dd31f2f9 | `r1319-s3a` | tsc 0; a to e ALL GREEN; every control exit 1 in its sections (table below); the loop passes in 216 s; vitest exit 1 on a test of mine that read the keys curve the wrong way round, fixed in 626996f8 |
| 3b | harness section 12 and controls flathands, curveflip, keyscurve; the bands | 626996f8 | `r1319-s3b` | tsc 0; a to e ALL GREEN; vitest careerPreDraft green; the three controls exit 1 in sections 10 and 12. BOTH STOP CONDITIONS OF THE BRIEF FIRE: see "For the lead" |
| R | the two reviews' fixes, harness, vitest and notes only (no engine or descriptor change): see "Review fixes" | 3e09e9d1 to the head | `r1319-x1`, `r1319-x2`, `r1319-x2b`, final in `results-g/fix-1319.md` | below |

## Review fixes (2026-10-12, after review-run-1319 and review-read-1319)

No file under src/lib changed, so section 9's 80 digests and the scouts' path cannot move.
- 3e09e9d1, the read review's MAJOR (decision 3b) and the run review's mE: section 11(d) round trips
  every road (2,000 a pair, not 200) at every phase (the start, every season and every card, the
  showcase, the scouts' result, the draft, the played block and its draft) with and without the
  descriptor, and drops an attempt put on any season or card state (never vacuous: it fails if either
  phase is never reached). On seed set a that is 49,536 to 60,000 round trips and 36,672 to 57,600 drop
  cases a pair (`r1319-x1`). The vitest adds the same drop case (37 tests). Mutation mE, replayed with
  the run review's own script: CAUGHT, harness a and c exit 1 (section 11, 8 pairs), vitest exit 1.
- f7be2fb5, the run review's minor 2: sections 10, 11 and 12 check each pair in its own try.
- 78d9bcb9, the header's squeeze count: 32 in sections 2, 3, 9 and 13.
- 32ddb05b, the control plugin refuses a needle that is not exactly once.
- eaa7eff4, five new controls (table below) for the checks that had none: 10(0), 11(c), 11(d) at a
  season or card, 11(e), and the "no scouts path state carries either key" line.
- ec5256df, the critic's advice 10 copied in full under the Owed list.
- NOT FIXED, recorded for the lead: the scouts' drill is drawn from the sport's whole list whatever the
  position (a center fielder graded on a "Bullpen session"), careerPreDraft.ts line 500 on this head,
  line 470 on the base. It is pre-existing and decision 1 forbids touching `desc.drills` or the draw here.
- The section 12 floors for the expert and the novice are half their measured extremes: measured and
  stated, but wide (only `flathands` reaches them). Recorded by the read review, not changed.


## For the lead: two rulings owed before Round B (step 3 stopped here, as the brief orders)

Measured on GitHub runners (`r1319-s3b`, Node 24, seed sets a to e, 2,000 roads a pair, 4 replicates a
road), with the curves as the draft started them (pointer burst 15 to 50 taps, pointer cones 6,200 to
2,600 ms with 8 points a slip; keys burst 22 to 58, keys cones 2,900 to 900 ms). No tuning was needed:
both medians sat inside T = 0.75 on the first measurement. The local runs (Node 24.14) printed the same
numbers to the hundredth.

1. OPEN QUESTION 1, LEAVING EARLY: ABOVE 1.0 STOCK. The optimal leaver (correction 5: perfect foresight
   of his own hands, keeps them only when their move beats the draw's exact expectation for that road
   and approach, otherwise leaves and gets the keyed draw) gains, over an honest bot with the same hands:
   ALL OUT +1.10 to +1.64 (pointer median) and +1.08 to +1.58 (keyboard median) in EVERY pair, every seed
   set; SAFE +0.50 to +0.75 and +0.49 to +0.72 (under 1.0 everywhere). By starting rating third the gain
   is largest at the bottom (all out about +1.5 to +2.0 for ratings 58 to 64, +0.2 to +0.9 for 72 to
   78): a weak prospect's steady hands land a C (-3) most of the time, while the draw's exact mean there
   is about -0.4 to +0.6 (it still hands out the odd B), so leaving every C is worth about 3 stock each
   time he does it. The brief: "Above it anywhere: stop step 3
   at that point, push, put the table in the notes and the lead rules. Never switch to keeping a
   finished station in this round." Done: nothing in the engine changed for it. Note for the ruling:
   keeping a finished station narrows the option only between stations (the live tap count and
   stopwatch still let him bail inside one), so it may not bring the all out number under 1.0 either;
   the harness's leaver arm is where to measure any rule the lead picks.
2. OPEN QUESTION 3, THE TWO THUMB BOT IS ABOVE THE EXPERT in nhl:y2006 (one station, the burst) in both
   approaches on all five sets: all out +7.40 to +7.53 against +7.15 to +7.29, safe +3.50 to +3.55
   against +3.37 to +3.43. Everywhere else it is well under (the cone run is aim bound, so two thumbs do
   not help there). This follows from the brief's own bot table and no anchor can undo it: two thumbs at
   about ten taps a second (50, sd 5) against the expert's 9.6 (48, sd 4) on a burst only station score
   higher on any curve that rises with taps, unless both are pinned at 100. The brief: "stop and report:
   the lead rules on the anchors." Reported; the anchors are untouched.
3. ALSO FOR THE RULING ON Q3, THE SENSITIVITY (printed, never asserted): the median bot at 0.75 times its
   speed loses -4.37 to -5.82 stock all out against the draw (-2.04 to -2.65 safe), and at 1.25 times
   gains +4.34 to +4.72 (+1.98 to +2.14). So whether a real median player gains or loses by running the
   drills himself rests almost wholly on the bot assumption (33 taps, 4,300 ms). The critic's finger
   tapping survey (MRC National Survey of Health and Development, age 68 to 70, a search result that was
   not read in full) suggests one finger nearer 5 a second than 6.6; if the lead believes it, the pointer
   burst anchors move down (the critic's fallback, zeroAt 10, fullAt 45), and that is a tuning of
   COMBINE_CURVES plus a re-measure of section 12's bands, nothing else.

What this round chose for section 12 under the stop (my call, said so here): the honest bots' checks
(both medians within T and their bands, the expert gains, the novice loses, the three means in order)
ARE asserted with bands from the five sets, so the section and its three controls are real proofs on
this head; the leaver and the two thumbs are PRINTED for the lead and asserted nowhere, so neither open
ruling is baked into a green line. If the lead re-anchors, whoever does it re-measures the bands.

## What the engine does now (src/lib/careerPreDraft.ts and the four descriptors)

- THE LIFT. `preDraftShowcaseGradeFrom(u, s)` holds the cut: `u + (rating - 70) * 0.02 - (100 - health)
  * 0.003`, then A over 0.8, B over 0.5, C over 0.2. `preDraftShowcaseGrade(s, rng)` is now
  `preDraftShowcaseGradeFrom(rng(), s)`: the same expression in the same order with u where rng() was,
  so every float is the same float (section 9: all 80 digests equal on a to e at every step).
- THE STATIONS. `PreDraftStation { name, kind }` with kind `burst` (the shared burst tap) or `cones` (the
  shared cone run); `stations?(pos)` on the descriptor beside pickOffset; `preDraftStations(desc, s)`
  keeps one or two stations of those kinds with distinct non empty names, anything else is none. NFL and
  NBA (both eras) and MLB hitters (both eras): "Burst test" then "Agility run". MLB SP and RP: "Hit your
  spots" (cones) alone. NHL `now`: "Bike test" (burst) then "Pro agility" (cones), the real tests' names
  that audit row 65 backs twice (NHL.com 2022-06-14 and Topend Sports, both read 2026-10-03). NHL 2006:
  "Burst test" alone (critic correction 7: the 2006 list did not confirm twice). Plain names claim no
  real test. `drills` is untouched in all four. No skin and no blurb (Round B adds both).
- THE CURVES. `COMBINE_CURVES` holds a pointer and a keys curve per kind, and
  `preDraftStationScore(kind, raw, input)` is whole and held to 0 to 100. Game numbers anchored on the
  harness's stated bot assumptions, never a real performance: nothing converts a tap or a millisecond
  into a time, a height or a count of anything real.
- THE PLAYED PATH. `preDraftCombineOpen(desc, s, approach)` writes `combine: { approach }` (all out or
  safe only, at phase showcase, once, with at least one station), else returns the same object.
  `preDraftCombineResolve(desc, s, scores)` takes one whole score 0 to 100 a station: the mean over 100
  is u, cut by the lifted function, moved by SHOWCASE_DELTAS through preDraftShowcaseMove, the station
  names joined by " and " into the saved `drill` (advice 14, engine side), the scores into `played`,
  phase `draft`. `preDraftCombineCuts(s, n)` walks every total through the same expression, so the
  printed cut and the grade cannot disagree (rating 74, health 90, two stations: A from 75.5, B from
  45.5, C from 15.5, as the critic computed).
- THE GUARD. One new line in preDraftShowcase: an opened attempt returns the same object, so no scouts'
  button can be pressed through the engine while an attempt is open.
- THE LOADER. `combine` is kept only as `{ approach: allout or steady }` at phase showcase with no
  result; `played` only as one or two whole numbers 0 to 100 on a graded, not skipped result. Anything
  else drops THAT KEY ALONE. With the descriptor, a state at phase showcase that carries `combine` loads
  as `preDraftCombineSettle`, which is `preDraftShowcase(desc, state without the key, approach)`: the
  scouts' button, byte for byte. Without the descriptor a good `combine` is kept.
- INERT IN THE PRODUCT. Nothing a player can press opens an attempt yet (no screen calls open), so the
  guard never fires and the loader never meets a `combine` on a real save. Both run on every load and
  showcase press, and change nothing for any state the site can make today (sections 9 and 11, and the
  other lane's 36 outcomes, prove it). Until the review fixes, section 11(d) proved the old block round
  trip on 200 of each pair's 2,000 roads and at phases showcase, draft and done only, and these notes did
  not say so; since the review fix (3e09e9d1) it runs on every road at every phase (the start, every
  season and every card, the showcase, the scouts' result, the draft, and the played block and its
  draft, with and without the descriptor), and drops an attempt put on any season or card block.

## The reload rule and critic correction 2 (in the loader's comment too)

The loader settles an opened attempt IN MEMORY. The board never writes on load (UsCareerBoard.tsx 312 to
322), so the disk keeps `combine` at phase showcase until the road's next write ("Draft day"). Until
then the grade is worked out from today's descriptor on every load, exactly as an unpressed showcase's
would be. Any later round that renames `desc.drills` (which re-deals the scouts path's drill draw and so
its grade stream) moves the grade of an attempt left sitting at the showcase, and must name that case.

## Controls, measured on runners on the final head (`r1319-f1` at e430dba6, seed set a)

| Control | What it breaks | Exit, FAILURE(S), sections red |
|---|---|---|
| combinewords | the resolve reads the safe table | 1, 10, sections 10 and 12 |
| combinemean | u from the first station only | 1, 7, section 10 (every pair with two stations) |
| combinemono | a slip adds points | 1, 2, sections 10 (the grid) and 12 |
| combinecut | the cuts one step high | 1, 8, section 10 |
| reroll | the loader drops the attempt instead of settling it | 1, 8, section 11 |
| wayback | the guard in preDraftShowcase removed | 1, 8, section 11 |
| combinegone | open returns a copy without the key | 1, 18, sections 10, 11 and 12 |
| flathands | the resolve uses 0.5 for the hands' mean | 1, 10, sections 10 and 12 |
| curveflip | the burst curve reversed | 1, 2, sections 10 and 12 |
| keyscurve | the keys curve read as the pointer one | 1, 2, sections 10 and 12 (the keyboard median +3 to +6.5) |
| gradeshift | the A line at 0.79 | 1, 16, sections 9 AND 10 (correction 1: one cut, two paths) |
| extradraw | one extra draw before the grade | 1, 8, section 9 only |
| nightoffbyone, nightlottery, nightopen, nightdedup, nightdraw, projection | Round 1220's six | each 1, section 13 only (8, 2, 8, 8, 1, 8) |
| combinephase (review fix) | the loader keeps an attempt at any phase whose showcase is empty (the run review's mutation mE) | 1, 8, section 11 (`r1319-x2`, eaa7eff4) |
| attemptbare (review fix) | the loader keeps an attempt only with the descriptor | 1, 8, section 11 |
| combineloose (review fix) | the resolve takes any score under 101 | 1, 8, section 11 (it took 50.5 and -1) |
| scoutskeys (review fix) | the scouts' button puts `played: undefined` on its result (JSON hides it from section 9) | 1, 8, section 11 |
| combinedraw (review fix) | the station score reads the clock, behaviour unchanged | 1, 1, section 10 (the code read) |

Review fixes (`r1319-x2`, eaa7eff4, seed set a): every one of the 37 controls exits 1 with "mutated" and
the same counts and sections as above and as the run review's r1319-run-h, except `mathrandom`, now 18
(sections 5: 2, 9: 8, 11: 8) because sections 10 to 12 check each pair in its own try. The control
plugin now refuses a needle that is not exactly once (`r1319-x2b` label dupe: a second copy appended to
the engine, then `keyscurve`: exit 2, "the needle is in src/lib/careerPreDraft.ts 2 times, not exactly
once. Refusing to run.").

The other lane's 14 (the loop of prospect-journey.yml, run as written in `r1319-s3a`): every one exits 1
with "control X: mutated" and "FAILURE(S)". Three now count more failures than on the base, each for a
real reason in a new section, never hidden: `mathrandom` 11 (was 10; section 11 runs preDraftRunDraft
with Math.random made to throw; 18 since the review fix that runs each pair in its own try, one
section 11 line a pair), `cardwords` 24 (was 16; the mutated choice leaves the stock past the
meter, the loader clamps it, so a reload of an opened attempt is not that button's bytes: section 11),
`ceiling` 24 (was 16; the mutated growth passes the ceiling, the loader refuses a block with the rating
over the potential, so the reload is null: section 11). The loop took 216 s on the runner (84 s on the
base), against the job's 60 minutes; the default run takes 8 to 21 s.

## Section 12 on runners: the tables (`r1319-s3b`, seed sets a to e)

Fleet gap = mean over a pair's 2,000 roads and 4 replicates of (the bot's stock move minus the scouts' EXACT expected move for that road and approach). Ranges are over the five seed sets. The bots are stated assumptions (BOTS in the harness): novice 22 taps and 6,200 ms, median 33 and 4,300, expert 48 and 3,000, keyboard 40 and 1,900 with no slip, two thumbs 50 taps and the median's cone run.

| Pair | Approach | draw exact mean | median gap | keys gap | expert | novice | thumbs | leaver, pointer | leaver, keys | median 0.75x | median 1.25x |
|---|---|---|---|---|---|---|---|---|---|---|---|
| nfl:now | allout | +2.19 to +2.32 | -0.06 to +0.03 | -0.12 to -0.06 | +6.82 to +6.97 | -6.74 to -6.64 | +4.20 to +4.23 | +1.19 to +1.32 | +1.08 to +1.34 | -5.47 to -5.38 | +4.57 to +4.59 |
| nfl:now | steady | +1.30 to +1.36 | -0.09 to -0.05 | -0.13 to -0.10 | +3.24 to +3.31 | -3.09 to -3.05 | +1.94 to +1.95 | +0.55 to +0.63 | +0.50 to +0.65 | -2.55 to -2.51 | +2.12 to +2.13 |
| nfl:y2005 | allout | +2.29 to +2.39 | -0.07 to +0.02 | -0.12 to -0.05 | +6.78 to +6.89 | -6.69 to -6.61 | +4.20 to +4.24 | +1.17 to +1.36 | +1.09 to +1.33 | -5.48 to -5.35 | +4.53 to +4.60 |
| nfl:y2005 | steady | +1.34 to +1.39 | -0.10 to -0.06 | -0.13 to -0.10 | +3.23 to +3.28 | -3.06 to -3.04 | +1.94 to +1.96 | +0.52 to +0.64 | +0.49 to +0.63 | -2.54 to -2.50 | +2.11 to +2.13 |
| nba:now | allout | +1.69 to +1.77 | -0.18 to -0.11 | -0.25 to -0.20 | +7.07 to +7.12 | -6.65 to -6.60 | +4.22 to +4.30 | +1.19 to +1.42 | +1.15 to +1.35 | -5.51 to -5.42 | +4.57 to +4.62 |
| nba:now | steady | +1.07 to +1.10 | -0.15 to -0.12 | -0.18 to -0.15 | +3.32 to +3.34 | -3.00 to -2.98 | +1.92 to +1.96 | +0.54 to +0.67 | +0.52 to +0.63 | -2.52 to -2.49 | +2.09 to +2.11 |
| nba:y2004 | allout | +1.33 to +1.50 | -0.26 to -0.16 | -0.31 to -0.23 | +7.19 to +7.22 | -6.70 to -6.56 | +4.15 to +4.31 | +1.23 to +1.43 | +1.14 to +1.33 | -5.58 to -5.43 | +4.59 to +4.72 |
| nba:y2004 | steady | +0.90 to +0.99 | -0.18 to -0.15 | -0.20 to -0.18 | +3.35 to +3.37 | -3.00 to -2.94 | +1.87 to +1.94 | +0.56 to +0.65 | +0.52 to +0.61 | -2.53 to -2.47 | +2.08 to +2.14 |
| mlb:now | allout | +1.68 to +1.75 | -0.34 to -0.23 | -0.27 to -0.22 | +6.88 to +6.95 | -6.95 to -6.83 | +2.31 to +2.49 | +1.38 to +1.64 | +1.24 to +1.47 | -5.81 to -5.73 | +4.34 to +4.44 |
| mlb:now | steady | +1.05 to +1.09 | -0.21 to -0.16 | -0.19 to -0.16 | +3.24 to +3.27 | -3.13 to -3.08 | +1.03 to +1.12 | +0.64 to +0.75 | +0.57 to +0.68 | -2.64 to -2.62 | +1.98 to +2.04 |
| mlb:y2004 | allout | +1.74 to +1.79 | -0.30 to -0.19 | -0.21 to -0.14 | +6.88 to +6.92 | -7.00 to -6.84 | +2.38 to +2.43 | +1.44 to +1.62 | +1.18 to +1.45 | -5.82 to -5.72 | +4.38 to +4.51 |
| mlb:y2004 | steady | +1.09 to +1.11 | -0.20 to -0.15 | -0.16 to -0.13 | +3.23 to +3.25 | -3.14 to -3.09 | +1.05 to +1.09 | +0.63 to +0.75 | +0.52 to +0.67 | -2.65 to -2.61 | +2.01 to +2.06 |
| nhl:now | allout | +1.78 to +1.90 | -0.20 to -0.13 | -0.30 to -0.20 | +7.00 to +7.14 | -6.68 to -6.64 | +4.24 to +4.27 | +1.15 to +1.42 | +1.09 to +1.37 | -5.53 to -5.48 | +4.60 to +4.66 |
| nhl:now | steady | +1.10 to +1.16 | -0.16 to -0.13 | -0.21 to -0.17 | +3.29 to +3.35 | -3.01 to -3.00 | +1.92 to +1.94 | +0.52 to +0.67 | +0.49 to +0.63 | -2.53 to -2.51 | +2.10 to +2.13 |
| nhl:y2006 | allout | +1.77 to +1.91 | +0.04 to +0.09 | -0.25 to -0.19 | +7.15 to +7.29 | -5.75 to -5.68 | +7.40 to +7.53 | +1.10 to +1.42 | +1.23 to +1.58 | -4.44 to -4.37 | +4.58 to +4.64 |
| nhl:y2006 | steady | +1.09 to +1.16 | -0.05 to -0.02 | -0.18 to -0.15 | +3.37 to +3.43 | -2.63 to -2.60 | +3.50 to +3.55 | +0.50 to +0.64 | +0.57 to +0.72 | -2.06 to -2.04 | +2.10 to +2.13 |

Advice 15's numbers and the leaver by starting rating third, seed set a (the draw's exact mean in brackets): steady hands compress the spread, so the median loses about 1.1 all out at the bottom third and gains about 0.4 to 0.95 at the top, while the fleet gap nets near 0.

| Pair | Approach | median gap [draw exact mean], thirds 58 to 64, 65 to 71, 72 to 78 | keys gap, thirds | leaver pointer, thirds | leaver keys, thirds |
|---|---|---|---|---|---|
| nfl:now | allout | -1.15 [+0.57], +0.27 [+2.08], +0.73 [+4.30] | -1.24, +0.43, +0.62 | +1.92, +1.18, +0.46 | +1.97, +0.91, +0.36 |
| nfl:now | steady | -0.49 [+0.42], -0.01 [+1.31], +0.24 [+2.34] | -0.51, +0.05, +0.16 | +0.83, +0.53, +0.29 | +0.84, +0.40, +0.26 |
| nfl:y2005 | allout | -1.12 [+0.64], +0.25 [+2.06], +0.87 [+4.25] | -1.31, +0.44, +0.67 | +1.85, +1.04, +0.62 | +1.88, +0.90, +0.50 |
| nfl:y2005 | steady | -0.46 [+0.42], -0.02 [+1.31], +0.30 [+2.31] | -0.54, +0.06, +0.19 | +0.77, +0.47, +0.33 | +0.77, +0.41, +0.30 |
| nba:now | allout | -1.16 [-0.06], +0.07 [+1.37], +0.58 [+3.83] | -1.34, +0.05, +0.55 | +1.81, +1.53, +0.26 | +1.91, +1.38, +0.19 |
| nba:now | steady | -0.49 [+0.12], -0.09 [+1.00], +0.15 [+2.10] | -0.56, -0.10, +0.12 | +0.78, +0.69, +0.16 | +0.81, +0.62, +0.14 |
| nba:y2004 | allout | -1.11 [-0.43], +0.00 [+1.24], +0.56 [+3.60] | -1.25, -0.11, +0.61 | +1.69, +1.46, +0.55 | +1.61, +1.39, +0.44 |
| nba:y2004 | steady | -0.47 [-0.01], -0.12 [+0.94], +0.13 [+1.99] | -0.53, -0.17, +0.14 | +0.74, +0.67, +0.28 | +0.71, +0.64, +0.23 |
| mlb:now | allout | -1.11 [+0.04], -0.09 [+1.40], +0.42 [+3.67] | -1.23, +0.02, +0.57 | +1.79, +1.70, +0.69 | +1.79, +1.53, +0.43 |
| mlb:now | steady | -0.48 [+0.15], -0.15 [+1.01], +0.09 [+2.03] | -0.52, -0.11, +0.14 | +0.79, +0.76, +0.38 | +0.76, +0.70, +0.28 |
| mlb:y2004 | allout | -1.05 [+0.01], -0.13 [+1.35], +0.39 [+3.76] | -1.23, +0.03, +0.63 | +1.96, +1.56, +0.85 | +1.84, +1.30, +0.47 |
| mlb:y2004 | steady | -0.47 [+0.17], -0.16 [+0.99], +0.07 [+2.09] | -0.54, -0.10, +0.16 | +0.85, +0.70, +0.36 | +0.78, +0.60, +0.19 |
| nhl:now | allout | -1.17 [+0.08], +0.05 [+1.47], +0.68 [+3.88] | -1.51, +0.14, +0.58 | +1.68, +1.32, +0.42 | +1.67, +1.28, +0.30 |
| nhl:now | steady | -0.49 [+0.19], -0.10 [+1.04], +0.20 [+2.12] | -0.63, -0.06, +0.14 | +0.71, +0.61, +0.25 | +0.69, +0.59, +0.18 |
| nhl:y2006 | allout | -0.96 [+0.10], +0.24 [+1.54], +0.95 [+3.95] | -1.07, -0.05, +0.43 | +1.48, +1.35, +0.52 | +1.53, +1.45, +0.75 |
| nhl:y2006 | steady | -0.41 [+0.20], -0.01 [+1.07], +0.33 [+2.15] | -0.47, -0.14, +0.08 | +0.62, +0.62, +0.29 | +0.64, +0.66, +0.43 |

Picks per stock point at the fleet median (seed set a): nfl:now 3.5, nfl:y2005 3.5, nba:now 1, nba:y2004 0.5, mlb:now 9, mlb:y2004 22.5, nhl:now 3.5, nhl:y2006 3

## Step 0: the baseline on the base (48cb9d4b), measured on GitHub runners

- `simCareerPreDraft` seed sets a to e (remote check `r1319-s0`, three at a time): each ALL GREEN,
  exit 0, 2 s each on the runner.
- The two pre draft steps of `.github/workflows/prospect-journey.yml` copied as written and timed
  (`r1319-s0loop`, one at a time): `simUsCareerProspect` 36 outcomes and its 15 controls each
  "4 named assertion failures and 4 independent legacy passes", 60 s in all; the vitest
  `careerPreDraft.test.tsx` 26 passed, the default run ALL GREEN in about 1 s, and the 14 controls each
  exit 1 with "control X: mutated" and "FAILURE(S)" (randomteam 24, flatstock 24, flatlottery 4,
  mathrandom 10, cardwords 16, showcasewords 16, erarule 2, ceiling 16, ladderskip 4, undraftedtop 6,
  squeeze 32, laterlottery 4, flatlater 4, loadershallow 1), 24 s in all. The whole of both steps:
  84 s, against the job's 60 minute limit.
- The three receipts of `simUsSeasonCentre` (US_SEASON_DIGEST=compare, receipts law, lay and seam):
  each exit 0, "11 digests, 0 moved" on the base. They are in no gate. This round edits the NBA and NFL
  descriptors, so a compare on this head is expected to exit 3 ("inputs moved under the digest"):
  never re-recorded here.
- Weight on the base, a served build (`r1319-s0`, the probe measures the way sweepWeight's section 1
  does: iPhone 13, load plus 1.5 s, gzipped): /nfl-my-career 483.4K over 47 files (sweepWeight: 483K
  against its 485K row, green), /nba-my-career 568.9K, /mlb-my-career 556.8K, /nhl-my-career 559.3K.
  The engine and the descriptors ride in the shared chunk usCareerSeasonReview (147.6K) on all four.

## The collision diff and the readers (at 48cb9d4b)

- `git diff --name-only origin/main...<branch>` over the round's files, on all 274 origin branches named
  r13*, release-a*, release-b* and codex/*: none touches a file of this round.
- Readers of the five lib files and of the harness in scripts, src/test and .github:
  prospect-journey.yml; scripts/data/careerPreDraftDigest.json and the three usSeason*Digest.json
  receipts; playDraftNight.mjs; qa/career993.mjs; qa/usCareerSaveRecovery1084.mjs; simCareerPreDraft;
  simNflTruth; simUsCareerProspect; careerDraftNight.test; careerPreDraft.test;
  usCareerDraftNightBoard.test; usCareerProspect.test; usCareerSaveRetry.test.

## Gates on the final head (e430dba6, the code head; later commits are comments and notes)

Remote checks `r1319-f1` (the head, a served build), `r1319-f2` (the head's walks) and `r1319-f3` (the
base 48cb9d4b checked out on the same kind of runner, for the same closing lines). Green means the
harness's own closing line and exit 0.

| Gate | Head | Base |
|---|---|---|
| tsc (tsconfig.app.json) | exit 0 | (Release AY's gate) |
| vitest careerPreDraft, careerDraftNight, usCareerDraftNightBoard, usCareerProspect, usCareerSaveRetry, usBoardFixture | exit 0, 5 files passed, 1 skipped (usBoardFixture without US_BOARD_FIXTURE=replay); again on bc4114b1 (`r1319-f4`) | exit 0, 5 files passed, 1 skipped (`r1319-f4`, the base checked out on the runner) |
| simCareerPreDraft seed sets a to e | each exit 0, ALL GREEN, 9 to 14 s | each exit 0 (`r1319-s0`) |
| its 32 controls (the other lane's 14 in the loop, gradeshift, extradraw, the six night controls, this round's ten) | each exit 1, "mutated", in the sections the controls table names | |
| the two pre draft steps of prospect-journey.yml, as written | pass, 215 s | pass, 84 s |
| simUsCareerProspect, 36 outcomes, 15 controls | pass (in the loop) | pass |
| simUsBoardParity | exit 0, "green. Four sports replayed click for click, save for save and screen for screen." | the same line, exit 0 |
| simNflTruth | exit 0, the same closing line as the base | exit 0 |
| simUsSeasonCentre (default) | exit 0, "158 checks, 0 failed" | |
| simUsSeasonCentre receipts law, lay, seam (compare) | exit 3 each, "NOT COMPARED": nbaCareerPreDraft.ts and nflCareerPreDraft.ts moved under the digests. Receipts in no gate, never re-recorded | exit 0 each, "11 digests, 0 moved" |
| playDraftNight | exit 0, "ALL GREEN, 49 nights walked" | the same line, exit 0 |
| usCareerSaveRecovery1084 (CI, xvfb, offline transport) | exit 0; report complete, 12 cases, 4 deletions, 9 controls, 0 forwarded writes | the same, exit 0 |
| simHarnessAnchors | exit 0, green | |
| simNoRivalNames | exit 0, 0 findings | |
| sweepWeight | exit 0, green; /nfl-my-career 484K (483.6K) against its 485K row | green, 483K (483.4K) |

Weight, the four routes on a served build, the way sweepWeight's section 1 measures (gzipped):

| Route | Base 48cb9d4b | After step 2 (42ebbd0e) | Head e430dba6 |
|---|---|---|---|
| /nfl-my-career | 483.4K, 47 files | 483.5K | 483.6K (row 485K, 1.4K left) |
| /nba-my-career | 568.9K, 48 files | 569.0K | 569.1K |
| /mlb-my-career | 556.8K, 48 files | 556.9K | 557.0K |
| /nhl-my-career | 559.3K, 48 files | 559.4K | 559.5K |

The engine and the descriptors ride in the shared chunk usCareerSeasonReview on all four (147.6K on the
base). The round adds about 0.2K to each route. No budget row was touched.

## What a later session must not trust

- The leaver and the two thumb lines of section 12 are PRINTED, not asserted: a green run says nothing
  about them. Read the "for the lead" lines.
- The bands of section 12 are for the curves as they stand. A change to COMBINE_CURVES or to BOTS means
  re-measuring all five seed sets and rewriting the header's numbers.
- The guard and the loader's settle run in the product but are inert until Round B lets a player open
  an attempt; nothing a player does today can reach them.
- The plain station names are placeholders until the data guardian job's audit rows: only the NHL `now`
  pair is a real test's name (audit row 65).


## Owed to Round B (by number, in full)

Round B (the next number) is the draft's steps 4 to 6 on this head: the host core, the stations dialog,
the tile on the showcase card, the journey's wiring, the "?" with COMBINE_EXAMPLE and its worked example,
the board test, scripts/playCombine.mjs, What's New, and the four guide sentences owed to the other lane.
It starts only after the lead's two rulings above. From the critic (its numbers):

- Correction 2, the board test and walk wording: the reload checks assert (a) the card shows the scouts'
  line, (b) loadUsCareerProspect of the disk bytes gives a state JSON equal to the scouts' button for that
  approach, (c) the disk bytes are unchanged by each reload, and (d) "Draft day" then writes
  preDraftRunDraft of the settled state. Never "the save bytes equal preDraftShowcase": on a correct build
  the disk keeps `combine` at phase showcase until "Draft day" (see the reload rule above).
- Correction 3, ruled now by the lead as its option (a): while the stations dialog is open the journey
  renders the card from the state it captured at the press AND is inert. In the critic's words: a scouts
  press on it makes preDraftShowcase return the captured object, which is not `prospect.state`, so
  advanceProspect (UsCareerBoard 453 to 457) would SAVE THE OPENED STATE BACK over the resolve, and the
  next load would settle it to the scouts' draw, erasing a played result. Section 11(a) proves the engine
  half (the same object back). The board test adds the case "a scouts press during the dialog writes
  nothing".
- Correction 6: the journey asks for the dialog exactly as it asks for the night kit,
  `import('@/components/career/CombineStations')` in an effect into state (ProspectJourney 44 to 49). A
  relative dynamic import or `lazy(() => import('./...'))` is not rewritten by the other lane's `rules`
  control (simUsCareerProspect.mjs 50 to 58) and breaks it. That also tells the tile the chunk arrived.
- Correction 8: playCombine arrives at the showcase and reloads at once on every route and asserts no
  failed local request and no page error; the notes give career993's first failing step on base and
  head (it must be the same "joined" step, six times).
- Correction 9: freeze what the host scores at the first accepted finish: snapshot (ms, slips) or taps
  in the commit of the first accepted finish and never read the hook again for that station; the
  lifecycle vitest adds "a second tap on the last marker, and a wrong marker, after the end change
  nothing on screen or on disk".
- Advice 10, the real names: the parallel data guardian job (two sources read in full per name and
  era); Round B swaps in what the audit backs by then, through `stations` only (names are in no digest).
  The critic's advice 10 in full, as it recorded what it could read on 2026-10-12 (a fetched page is
  "read"; a search result is not). Round B and the data job start from this, not from a summary:
  - NBA, now, "Lane agility" and "Max vertical": topendsports.com/sport/basketball/testing-draft-results-2024.htm
    ("Lane Agility Drill", "Vertical Jump - max", from official NBA documents) and cbssports.com 2023-05-17,
    2023-nba-draft-combine-measurements-results-purdues-zach-edey-stands-tall-with-victor-wembanyama-in-france
    ("LANE AGILITY TIME", "MAX VERTICAL LEAP"). Two. nba.com's 2026 overview calls the test "pro lane drill"
    (search result, and the earlier critic read it), so the audit row should say the name is the common one
    through 2024, not the league's 2026 label.
  - NBA, 2003: topendsports.com/sport/basketball/testing-draft-results-2003.htm ("Lane Agility Drill",
    "Vertical Jump - max", "based on official league documents"). One; plain names unless a second is read.
  - NFL, 2005, "40 yard dash": topendsports.com/sport/gridiron/nfl-draft-results-2005.htm ("Fastest 40 Yard
    Times", citing ESPN Draft Tracker) and cbssports.com 2017-02-23,
    look-aaron-rodgers-dubs-his-nfl-combine-40-yard-dash-time-fakenews ("a 4.71 40-yard dash at the 2005
    #NFLCombine"). Two.
  - NFL, "Position drills": philadelphiaeagles.com 2010-02-26, combine-preview-ot-and-te-drills-3565838
    ("position-specific drills where NFL personnel can evaluate prospects"). One, and from neither era.
    behindthesteelcurtain.com (2014) refused the fetch; pff.com and acmepackingcompany.com 2026 schedules (search
    results only) describe on field drills by position group. NOT YET for both eras.
  - MLB: mlb.com refused the fetch again (406). Search results only: mlb.com's 2025 combine preview (batting
    practice, infield and outfield drills, bullpen sessions) and Perfect Game schedules (a 60 yard dash at its
    showcases). Nothing I read describes what a 2004 pre draft showcase ran, so that era needs its own reading.
    NOT YET; plain names.
  - NHL, now, "Bike test" and "Pro agility": the audit row 65 stands (two sources, read 2026-10-03).
- Advice 11: `desc` is rebuilt every render, so memoize the stations on (sport, eraId, pos) before they
  reach the dialog, and never list them in an effect's dependencies (a host effect keyed on them would
  reset a station mid run).
- Advice 12, ruled now (its second option): Round B adds `skin` and `blurb` to a station, and
  preDraftStations then returns none when `skin.kind` disagrees with `kind`.
- Advice 13: the dialog sets `touch-action: manipulation` and `overscroll-behavior: contain` on its own
  overlay (no drill edit); the notes record WebKit's double tap zoom as unproven (Chromium only walks).
- Advice 14, screen side: print a played result's names from the saved `drill` string, never from
  today's descriptor; under a real test's name print the time as "on the game clock" after the station
  score, so "3.9 seconds" never reads as a real pro agility time.
- Advice 17: the failure line ("The drills did not load") sits in a box already reserved, so the chunk
  failing moves nothing.
- Correction 4, the host side, ruled now: the host scores a station on the keys curve if ANY accepted
  press in it was a click with `event.detail === 0` (read in the dialog's capture phase; the drills are
  not edited), so mixing inputs cannot dodge it. The engine half (the curve and `input`) is here.
- Q6: no hold on the site's own reload. Q7: two hooks (burst and cones), the guard and the reset written
  so a hook is registered rather than hard coded. Q8: the lead moves a weight row at the release with the
  measurement; the tile is not made lazy.
