# Round 1600 notes: Club Manager rates veterans by their level, not by a price that falls with age

Written 2026-10-30 by the builder of Round 1600 (desktop Claude lane, session K). Branch `r1600-cm-veteran-level`,
base `origin/main` 14a9af704. Brief: `C:/Users/antho/dukb-handoff/2026-10-10/briefs/brief-1600.md`, design
`proposals-cm-veteran-ratings.md` proposals 1 to 4, with the corrections of `critic-cm-ratings.md`.

## What a player sees

A new 2026-27 career: Lionel Messi 86 (was 78), Cristiano Ronaldo 86 (78), Luka Modric 80 (72), Virgil van Dijk 85
(80), Harry Kane 91 (88), Lamine Yamal 94 (94). Every man of every modern squad is read by one rule, Round 1214's:

    shown rating = clamp(level + agePoints(level, age, top), 48, top)
    level  the value rating (2026), or that season's stretch of it (a past season)
    age    the age on 1 August of the season (a past season: the file's age plus 1)
    points under 24 one off a year (six at most, never more than half way down from the top); 24 to 29 none;
           30 to 37 +1, 2, 2, 3, 4, 5, 6, 7; 38 and over +8

The past seasons read the same way on their own tops (96, 97, 98, 94): 2020-21 Ronaldo 92, Modric 83; 2015-16
Modric 92; 2005-06 Messi 67 at 18; the two best of 2005, 2010 and 2015 keep their number. Money is the market's
(values and wages unchanged). Ages are each man's age on 1 August 2026 (4,225 of 4,401 moved).

## The design as built, and where it differs from the proposals

ONE ORDER FOR EVERY WORLD: the file holds the price, the load adds the age. A modern squads file stamped
`curve: 2` keeps the value rating (the level) in `r` and the August age in `a`; `src/data/clubManagerWorldRosters.ts`
shows the read at load and keeps the level beside it as `lv` where the two differ. A past season is read at load in
`eraRosters` (`src/lib/clubManagerEras.ts`): the stretch first, then the points. `levelOf(row) = row.lv ?? row.r`.

DEVIATION 1 (Proposal 3 said the bake writes `ratingOf(usd, age, pos)` into the file). The file keeps the level and
the load adds the points. Reasons: the level is then exact for every man (the read run backwards, `levelFrom`, is not
exact under the floor clamp: an 18 year old priced at 48 to 54 shows 48), the 2026 world and the past seasons read in
one order, the file's ratings do not move a byte, and the dailies' curve 1 view only has to hold the old ages. So
`ratingOf` keeps its one argument form (every generator writes the value rating; the read is the engine's).

DEVIATION 2. `rosterXIAvg`, `projectedXIAvg` and `genClubStrengths` stay on the shown rating: they are how good a
club is on the pitch this season (the seeded and unseeded twins of one read), which the proposal itself says moves
on purpose. Stature reads the level: `bakedXIAvg` (tier, budget, expected finish, title gaps, the club picker),
`eraXIAvgFrom` (past season title gaps and cup seeding), `projectClub`'s anchor, `valueScaleFor`, `worldRosterFor`'s
anchor.

A CREATED CLUB'S FOUNDER is priced off the level his shown rating stands on at his age (`customFounderValue(rating,
era, age)` through `levelForShown`, the read run backwards, total), because simCustomClubValues section 1 holds a
founder to the real men of his era, rating and age band, and on the read a real man shown 84 at 21 is priced like
level 88 and one shown 84 at 33 like level 81. A club's money ceiling (no age) still reads its rating as the level.
A save already on CUSTOM_VALUES_VERSION 1 keeps its values.

THE FUTURE OF A MAN reads the higher of the two (critic correction 5): the world exit (`ageOne`, `futureRead`) and
the ceiling roll (`ceilingBase`, both call sites), so a boy shown under his price does not leave sooner or get a lower
ceiling, and a veteran shown over his price retires less (on purpose). The level rides onto the squad and the market
(`bakedToCMPlayer`, `marketBase`, a signing, the summer top up, `worldRosterFor`), critic correction 7.

## The dailies (Proposal 2)

Manager Hot Seat and Deadline Day deal a day dated before `CM_DAILY_NEW_NUMBERS_FROM` (`src/lib/managerHotSeat.ts`,
'2026-11-16' as committed; THE LEAD SETS IT AT THE RELEASE to the second Eastern day after it is live) on the curve 1
view: no age read, and the main file's ages as 14a9af704 held them (`src/data/clubManagerCurve1View.ts`, written and
checked by `scripts/genCmCurve1View.mjs`). One holder of the modern world (`cmWorld`, `cmWorldTag`, `onCurve1View`);
the projection, market and call up bar caches carry the world tag; the real free agents are read with age on the live
world only. `onStaticWorld(fn, daily)`; every Deadline Day stretch passes its date. The boards' render time reads
(hotSeatMeters, upcoming, carryOnSummary, deskRead, bidMeter, termsWanted, termsMeter) read the run's saved state;
openRefusal and carryOnSummary pass the date; preMatchRead (imported by ManagerHotSeatBoard.tsx) reads the career
state and no world row.

Deadline Day, the critic's rule (b): on the world that reads age the desk deals men of 29 or under (`dealtAgeMax`):
with 33 the desk's edge went (score gap 1.77, value gap 2.33 against floors 2.5 and 3.5), because a man of 30 or more
asks 0.9 of his value and the read put more of them over each need's line. A day on the view keeps 33.

Known break (critic correction 23): an unfinished free play run of either daily is replayed on the live world.

## Old saves (R2)

A running career keeps its own squad's saved numbers (no `lv`, its men's ratings as saved); the other clubs and the
market read the new files. Loading `scripts/data/cmOldSave1052Fixture.json` gives the same squad on the base and the
head (runner r1600-s8, probe). The loan guard reads the age with a year either side (`sameManNearAge`, ported from
Round 1102's fix 2e8715bf), since an old save's men now sit a year off the world's rows for them.

The world ledger (the fixer's round, both reviews' MAJOR 1). The ledger names a man by the birth year his age gave,
and the flip moved most of today's ages a year on, so a save written before it put the men its ledger had moved back
at the club they left as well (Gyokeres at Arsenal and PSG, Kane at Bayern Munich and Roma, Haaland at Manchester
City and Real Madrid). The rule for those saves, one holder (`nearAges` and `bornNear` in
`src/lib/clubManagerWorldRoster.ts`): a ledger of today's world without the stamp reads the projected world a year
either side of the birth year it recorded, wherever a projected row meets a record (worldRosterClub, pruneWorldRoster,
recordActualRosterTransfer's source, adoptLivingWorld, the released free agent). A new seeded career on the age
world opens a stamped ledger (`curve: 2`, a named block before startCareer's last line) and keeps the exact year.
Past seasons never moved their ages and stay exact. Nothing in an old save is rewritten. The one cost, a namesake of
the same club and position born a year apart going unlisted, has no case in today's files (simCmOldLedger section
1: 454 clubs, 0 pairs). `scripts/simCmOldLedger.mjs` builds the base engine (14a9af704) from git, writes saves on it
at Everton, AC Milan and Bayern Munich, and holds them on this tree: every moved man at his owner once and gone from
the club he left, on load and after the summer; the load saves back what the base's own load saves; a day one man
whose age moved can be sold and lands at his buyer; a new career is stamped. Control `CM_OLD_LEDGER_CONTROL=exact`.

## The drop out table and the August ages (simEras section 6, the draft's cause two)

dropOutChance's table (`src/lib/clubManagerEras.ts`) was fitted to the bake's age column, the 1 January age. The
flip moved 4,225 of 4,401 men a year on. The column read both ways (a local read of the shipped file and of the
curve 1 view, `.tmp-fx/ageColumn.mjs`, never committed), share of the 4,401 men at each age and the loss from one
age to the next, the curve 1 column at k against the August column at k + 1:

    age k   share before   share after   loss before k to k+1   loss after k+1 to k+2
    27      8.27           8.41          0.058                  0.034
    28      7.79           8.11          0.315                  0.333
    29      5.34           7.84          0.226                  0.200
    30      4.14           5.23          0.214                  0.239
    31      3.25           4.18          0.245                  0.214
    32      2.45           3.18          0.259                  0.309
    33      1.82           2.50          0.450                  0.421
    34      1.00           1.73          0.477                  0.545

The refit is the old table one year later, so today's world on curve 2 hands the table its age less one
(`dropShift` in projectClub); the past seasons and the curve 1 view hand it the age as it is; retireChance and
ageDriftBand read the age as it is everywhere. Before this, runner r1600-s7 had simEras section 6 at 43.7 percent of
first teams real five years on (floor 45) and 11.3 ten years on (floor 12).

## The balance harnesses after the flip (draft 3.6), each with its route

Base 14a9af704 on the runner (r1600-base, r1600-s11b, r1600-s12) against the head named.

- simCreateClub: red on the BASE as well (season two league has 24 clubs, r1600-s11b), not this round's.
- simCustomClubValues section 2 (a founder above the ceiling sold on p10 0.48 of the same man at the ceiling):
  the same man at the ceiling is the same age, so his price there reads his age (buildCustomSquad). Back to 1.00.
- simBoardAsks section 7 (a word kept or broken moves nothing): the fixture walk skipped only seasons on 35 or 82,
  and Round 1335's grade band is a clamp too (an A or a B opens at least on BOARD_FRESH 69, a D or an F under 60).
  On the age read all five clubs land on a clamp (Everton 69 A, Napoli 35 F, Brentford nothing both hit and
  missed, Sevilla 69 B, Wolfsburg 69 A), so the walk skips the band as it skips the clamp and goes on through ten
  more clubs in a fixed order. New control BOARD_ASKS_CONTROL=nopromise.
- simCmDifficulty section 3 (B2 and M1 floors, only 5 season ends): sample floors. Section 0 over 20 seeds a club,
  the steady driver for one season (r1600-s12): mid and small clubs sacked 45 of 120 on the base and 57 of 120
  here (1.6 standard errors), points a game mid 1.34 to 1.21, small 0.71 to 0.61, big 2.01 to 2.02. The money
  dials are read on three times the seasons; no floor moved.
- simCmLeagueRules: the modern digest moves by design at the flip (27 of 27), the eras digest at the era flip;
  pure (drop zones, European places, board demands) is unchanged. Re-taken with --write on the runner, with the
  inert steps shown unchanged first.

### STOPS for the lead (each measured, none edited to pass)

1. simCustomClubValues section 1 (draft 3.6 item 3; the critic: read the whole harness). The founder is priced off
   the level his shown rating stands on at his age. Against real men of his era, rating and AGE BAND: p10 0.87,
   p50 0.98, p90 1.33 (band p90 1.15). By band (now): 21 or under p90 1.67, 22 to 24 1.26, 25 to 28 1.05, 29 to 31
   1.20; past seasons 21 or under 1.50. Against real men of his EXACT AGE (8 or more, 6,554 men): p10 0.87, p50 0.96,
   p90 1.03, inside all three bands. The bands were cut to the raw curve's own age bands; the age read prices by
   the year, so a band four years wide holds men priced up to six levels apart. Recommended ruling: the assertion
   reads the year grain (the band numbers unchanged). Not done here.
2. simCmInternationals section 3 (draft 3.6 item 7, critic 13). Resting wins back 0.42 of a break's cost (floor
   0.50; base 0.56). LEGS_LATER_WEIGHT refit, set A the six the fit was made on, set B six it never saw
   (Barcelona, PSG, Inter Milan, Juventus, Atletico Madrid, Borussia Dortmund), share (rest now, next):

       weight   set A here          set B here          base A 0.56 (0.37, 1.21)   base B 0.51 (0.17, 1.00)
       0.25     0.42 (0.27, 0.87)   0.56 (0.37, 0.98)
       0.50     0.42 (0.11, 1.04)   0.56 (0.20, 1.15)
       0.75     0.38 (-0.15, 1.18)  0.53 (0.04, 1.23)
       1        0.35 (-0.37, 1.32)  0.49 (-0.12, 1.29)

   No weight clears set A, so the weight stays 0.5. The cause is who is called up (nationBars reads the shown
   rating): set A now loses Alisson, Virgil van Dijk, Thibaut Courtois, Emiliano Martinez, Phil Foden and Serge
   Gnabry to breaks where the base lost Endrick, Geovany Quenda, Jorrel Hato, Nico O'Reilly and Tom Bischof, and a
   rested veteran's deputy is a younger man the read now shows lower.
3. simRoles section 10 (critic 7): a do nothing Everton season, 60 unseeded seasons, base 48.8 points (2se 2.4),
   here 55.3 (2se 2.6, runner r1600-s11h) and 52.6 (2se 2.4, r1600-s16b at e8eab9e5e, green), band 36 to 54: a coin
   toss at the top. The written test (head within three points of base) fails by about 5. Everton's eleven carries
   veterans the read lifts; the band is a pin of one club's level. simPress (the same season) is green on 53.05
   (r1600-s6b, r1600-s16b).

## The fixer's round (after the two reviews, 2026-10-30)

The run review (review-run-1600.md) and the read review (review-read-1600.md) found three majors and five minors.
What changed, and what did not:

- The world ledger of an old save (both reviews' MAJOR 1): see "Old saves (R2)" above.
- R1's whole population proof (read MAJOR 2, run MINOR 1): `scripts/simCmLevelReads.mjs` section 5 holds today's
  world row by row (5,113 modern rows, each shows ageRead(level, age), its level the rating curve 1 showed, 0 off)
  and the main file's age band table as a recorded baseline, the run reviewer's popProbe numbers on cd95e82f4,
  matched exactly on runner r1600-fix2: 14 to 20, 327 men, level 74.63, shown 70.09; 21 to 23, 924, 74.55, 72.70;
  24 to 29, 2,322, 74.62, 74.62; 30 to 32, 553, 72.94, 74.52; 33 to 35, 230, 70.94, 74.66; 36 and over, 44,
  68.64, 75.48; 4,400 men (Ryan Fraser leaves Southampton at join time, on the base too), 2,077 rows the read
  changes, 827 veterans at 72.16 shown 74.61, 394 shown 75 and up, 118 at 80, 17 at 85, 7 in the top 100. The
  control `CM_LEVEL_READS_CONTROL=youth` (the 2026 load skips the read under 24) turns section 5 red on its own
  checks (1,504 rows off the read, two bands, two veteran lines).
- Proposal 3's proof set, what was run and what was dropped: simCmRatingShape was not ported; section 5 above holds
  what it held (the table's 2026 rows are section 3, the band table is section 5). playCmRatings was not ported;
  the walks at 390 and 1280 were run on runners (the builder's r1600-walk2, the run reviewer's r1600-run3) and no
  committed walk holds them. Of the three old save fixtures, cmOldSave1052Fixture.json (an old squad) is the
  builder's probe and simCmOldLedger writes its saves on the base engine at run time; a third was not made.
- The ages (read MAJOR 3): 3,974 of the 4,401 men of the main file stand on rule 2 of scripts/lib/cmAges.mjs (the
  table's 1 January age plus one), which is a year over for a man born after 1 August, about three in ten of them
  (about 1,190 men); 427 stand on a birth date. What's New and the squads header now say so instead of calling every
  age exact. The read reviewer found two of nine verified rows a year over (Jordan Carrillo, Ousseynou Niang, both
  born in late 2001 by two sources each). Taking birth dates for the 2,080 moved men at a rating sensitive age is
  the lead's to rule.
- Deadline Day's desk (read MINOR 2): What's New now says new days deal targets of 29 and under.
- A man's level is his day one level (both reviews' minor): the comments now say so; the behaviour is not changed,
  because refreshing it as he ages moves every projected world and every recorded digest. The lead's to rule.
- The drop out shift on the other files (read MINOR 4): not changed, because reading their generators says it fits
  them. projectClub hands every club of today's world its age less one at the drop out table (dropShift). The
  A-League file (Round 1035, scripts/genClubManagerALeague.mjs) and the Russia file (Round 1052,
  scripts/genClubManagerGathered.mjs) carry each man's age as two hosts showed it when the squads were gathered in
  autumn 2026, and the real free agents carry "Age in August 2026": all three stand on the August basis or a few weeks
  after it, like the main file now, not on the 1 January age the table was fitted to. The one residual is the made up
  men, whose entry ages (ENTRY_AGE_WEIGHTS) were read off the 1 January bake and who then get the shift too; not
  measured, small (they enter at 17 to 26), the lead's to rule.
- Difficulty (read MINOR 3): the builder's 20 seeds (runner r1600-s12, seeds 0 to 19, one season, steady driver)
  read mid clubs 1.34 to 1.21 points a game, small 0.71 to 0.61, sacks 45 to 57 of 120, and the move was let through
  on non significance. The fixer measured 60 more seeds (runner r1600-rr2, seeds 20 to 79, the same nine clubs, the
  base 14a9af704 against the head 178a1fd8c, rows pooled and paired by club and seed): mid 1.263 to 1.200 (paired
  0.063 down, 1.9 standard errors), small 0.594 to 0.581 (0.013 down, 0.5), big 1.940 to 1.987 (0.047 up), sacks at
  mid and small clubs 154 to 158 of 360 and at big ones 22 to 10 of 180. Pooled over all 80 seeds: mid 1.28 to 1.20
  (about three points a season harder for a mid club), small 0.62 to 0.59, sacks at mid and small clubs 199 to 215 of 480. So the mid
  club drop is real and smaller than the first 20 seeds said, the small club drop mostly was not, and the sack jump
  did not repeat. The floors are green; whether three points a season is acceptable is the lead's to rule.

## The lead's rulings on the three stops and the sack rate (fix3, 2026-10-30)

### The steady driver's sack rate (R4): noise, recorded and stopped

The builder's 20 seeds (simCmDifficulty section 0, runner r1600-s12) read the steady driver's sack rate up at every
tier: mid 0.25 to 0.38, small 0.50 to 0.58, big 0.07 to 0.12. Measured again on 60 seeds (0 to 59) x the same nine
clubs, one season, normal, steady, base 14a9af704 and head 4950135f6 (the engine of 752c5fe50) on the same runner
kit (runner r1600-f3a, lines sack-head-0 to 2 and sack-base-0 to 2, all exit 0; base on a runner worktree with its
own harness), rows pooled and paired by club and seed (`.tmp-fx/run-1793387141/pool.mjs`, not committed):

    tier        sacked head          sacked base          shift (se)              points a game, paired
    big         15/180 0.083 (0.021)  21/180 0.117 (0.024)  -0.033 (0.032), -1.05 se  1.964 vs 1.956, +0.008 (0.028)
    mid         62/180 0.344 (0.036)  52/180 0.289 (0.034)  +0.056 (0.049), +1.13 se  1.173 vs 1.271, -0.099 (0.036)
    small      102/180 0.567 (0.037) 100/180 0.556 (0.037)  +0.011 (0.052), +0.21 se  0.590 vs 0.614, -0.024 (0.025)
    mid+small  164/360 0.456 (0.026) 152/360 0.422 (0.026)  +0.033 (0.037), +0.90 se  0.881 vs 0.942, -0.061 (0.022)

(paired by club and seed the mid plus small shift is 0.98 standard errors). The mid plus small shift is under 2
standard errors, so by the ruling it is noise and nothing was changed for it. The cause the ruling feared (the board
expecting more of a squad the read rates higher) is not what the rows show: each club's expected finish is the same
on both arms (1, 11 and 20 by tier), and the top eleven by shown rating at the start is lower on the head at eight
of the nine clubs (by 0.3 to 1.3; equal at Arsenal), so a steady manager is not asked for more. What does move is
the points: mid clubs take 0.099 fewer points a game (2.7 standard errors paired; Brentford 1.486 to 1.343, Espanyol
1.172 to 1.025, Torino 1.155 to 1.150), the move the first fixer measured at 0.063 (1.9 se) on seeds 20 to 79. It is
a result moving with a weaker shown eleven, not a scoring mismatch, and it stays the lead's to rule (about three
points a season for a mid club). The board's lowest confidence at mid clubs is 32.0 against 37.2.
