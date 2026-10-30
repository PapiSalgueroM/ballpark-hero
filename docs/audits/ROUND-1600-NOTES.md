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

DEVIATION 3. `customFounderValue` is unchanged. A created club's founder has no price; his rating is the number
made up, and Round 640 prices that number off the market's line, with the money bands simCustomClubValues holds.
Pricing him through the read run backwards would move every created club's money for nothing in the owner's ask.

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
