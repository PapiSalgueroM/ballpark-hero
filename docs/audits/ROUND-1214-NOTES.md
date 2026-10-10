# Round 1214 notes: Club Manager ratings and ages, part one of four

Written 2026-10-10 by the builder of Round 1214 (desktop Claude lane, session G).
Branch `r1214-cm-ratings-libs`, base `origin/main` faf0a5f3. Brief:
`C:/Users/antho/dukb-handoff/2026-10-10/briefs/brief-1214.md`.

## What this round is

Round 1102 gave Club Manager ratings that read a man's age as well as his price. It could not ship
(the past seasons' stretch multiplied the age points, nine balance harnesses went red, both daily
games re-dealt). The redesign was cut in four parts so that nothing a player sees moves until
everything under it is proven. This is part one: the rule as two script libraries, the ledgers the
ages stand on, a typed door for the app, and one vitest that proves all of it. NOTHING SHIPPED
READS ANY OF IT. No rating, age, squad, save, daily or screen moves.

## What is in it

| File | What it is | Where it came from |
|---|---|---|
| `scripts/lib/cmValueCurve.mjs` | The value curve, untouched, plus the age read: `agePoints`, `ageRead`, `levelFrom`, `readInWorld`, `rateFrom`, `ratingOf` with an age | main's file, the age points ported from 043424c8 of `origin/r1102-cm-ratings` and changed as below |
| `scripts/lib/cmAges.mjs` | Ages for 1 August 2026: `ageOn`, `buildBirths`, `tableAugustAge`, `augustAge2026`, `ERA_RATING_AGE_SHIFT` | 78b679e2 of the old branch, three changes |
| `scripts/data/cmBirthDates2026.json` | 105 birth dates, two publishers of two kinds a man | 78b679e2, three lines changed |
| `scripts/data/finalTables2025.json` | The real 2025-26 final tables of 27 leagues | 78b679e2, 28 lines changed, no figure moved |
| `scripts/data/cmAgesBasis2026.json` | What each of the 4,401 August ages stands on, and each man's value rating | the old branch's bake output plus the value rating from main's squads file |
| `src/lib/cmAgeRead.ts` | The typed door the engine will import. Imported by nothing | new |
| `src/test/cmValueCurve.test.ts` and `src/test/fixtures/cmValueCurve.json` | The proof | the fixture is the old branch's blob caf9a34f, recorded from the module blob main ships (000633ba) and never re recorded; the test is ported and more than doubled |

## The rule, as the library has it

    ageRead(level, age, top) = clamp(level + agePoints(level, age, top), 48, top)
    agePoints: under 24   minus min(24 - age, 6, max(0, floor((top - level) / 2)))
               24 to 29   0
               30 to 37   +1, +2, +2, +3, +4, +5, +6, +7     38 and over  +8
    level  2026: the value rating.  A past season: eraUpliftRating(era, value rating).
    age    2026: the age on 1 August 2026.  A past season: the file age plus ERA_RATING_AGE_SHIFT (1).
    top    2026: 94.  2005-06: 96.  2010-11: 97.  2015-16: 98.  2020-21: 94.

What differs from the old branch, each by the brief or its critic:

1. Both limits read `top` (the half distance and the upper clamp), never the constant 94.
2. `levelFrom` is TOTAL: the smallest level from 48 to the top whose age read is at least the rating,
   and the top when there is none. The read skips numbers for a young man (at top 94 an 18 year old is
   never shown 77, 80, 83, 86, 89 or 92), and a created club's founders are rated on exactly such
   numbers, so the old definition (the level whose read IS the rating) had no answer for them.
3. `readInWorld(valueRating, fileAge, { stretch, top, ageShift })` writes the order down once: the
   stretch first, then the points. Round 1102 had the points under the stretch.
4. The three reads throw a RangeError on anything that is not a whole number (level or rating, age,
   top from 48 to 99). They take ANY whole age and any whole level; only `rateFrom`, the generators'
   entry, holds the age to 14 to 45 and the value rating to 48 to 94.
5. `agePoints` never gives a young man a gain: a level above the top reads as no points off. (With the
   old formula a level over the top turned the youth term positive.)
6. `ratingOf(usd)` with ONE argument still answers with the value rating, so every generator on main
   writes the bytes it wrote before. Any call with a second argument is held to the whole rule and
   throws on a missing age or position. Part four removes the one argument form.
7. `buildBirths` leaves out a row of the birth date ledger marked `thin`.

## What a later part must know

- THE TOPS ARE NOT IN THE LIBRARY. They are derived in the test (each is `eraUpliftRating` of the
  highest rating in that season's file: raw 86, 90, 91, 93 give 96, 97, 98, 94). Part two adds them to
  `ERA_RATING_UPLIFT` and its harness holds each to the same derivation.
- THE DOOR THROWS on a rating that is not a whole number. If any engine path holds a fractional
  rating, round it before the call; do not loosen the library.
- THE "NOTHING IMPORTS IT" TEST in `src/test/cmValueCurve.test.ts` (the last one) must be deleted in
  the commit that adds the first shipped import of `src/lib/cmAgeRead.ts`. It exists so that an import
  cannot arrive before part two's own proofs.
- THE BASIS FILE'S VALUE RATING CHECK compares the file's last item with the squads file's rating,
  which is right only while the squads file is on curve 1 (the test asserts that first). At the flip
  the comparison becomes the level.
- TWO COUNTS RESTATE DATA and move for an honest reason when the data does: the rows each past season
  holds and how many the age read changes (the four era files), and how each 2026 age is known (the
  value table as pulled on 2026-10-07). Recount, never widen.
- `scripts/data/cmRatingShapeSample.json` was NOT ported: it belongs to `simCmRatingShape`, part four.

## Numbers measured

All from the committed files, by the vitest on a runner unless a line says otherwise.

THE BRIEF'S TABLE. All 29 rows come out of the library from the files main ships, row for row:
2005-06 Ronaldinho 96, Henry 96, Nedved 88, Keane 83, Rooney 89, Cristiano Ronaldo 84, Ramos 84,
Messi 67; 2010-11 Messi 97, Cristiano Ronaldo 97, Xavi 95, Drogba 91, Fabregas 91; 2015-16 Cristiano
Ronaldo 98, Messi 98, Neymar 95, Pogba 89; 2020-21 Messi 94, Mbappe 94, Cristiano Ronaldo 92, Haaland
90; 2026-27 van Dijk 85, Salah 87, Messi 86, Modric 80, Kane 91, Yamal 94, Kayode 82, Nwaneri 81.

| Past season | Rows | Rows the age read changes | Swing | Top (from raw) | On the top |
|---|---|---|---|---|---|
| 2005-06 | 1,727 | 829 | minus 6 to plus 8 | 96 (86) | Ronaldinho, Thierry Henry |
| 2010-11 | 1,751 | 890 | minus 6 to plus 8 | 97 (90) | Cristiano Ronaldo, Lionel Messi |
| 2015-16 | 1,659 | 738 | minus 6 to plus 8 | 98 (91) | Cristiano Ronaldo, Lionel Messi |
| 2020-21 | 1,774 | 862 | minus 6 to plus 8 | 94 (93) | Kylian Mbappe, Lionel Messi |

These equal the scout's and the critic's figures to the digit (two other people's arithmetic on the
same files), which is the independent check of the implementation.

levelFrom. Ratings the read skips at top 94: 77, 80, 83, 86, 89, 92 at 14 to 18; 80, 83, 86, 89, 92
at 19; 83, 86, 89, 92 at 20; 86, 89, 92 at 21; 89, 92 at 22; 92 at 23 (the critic's list). Round trip
over 52 levels by 32 ages a top: the cells where it does not return the level are 299 at top 94, 235
at 96, 203 at 97, 171 at 98, every one of them a read sitting on 48 or on the top, and the count is
the one worked out by hand (45 under the floor, 94 on the top, 32 for each level above the top).

2026 AGES. How each is known: born 423, moved 3,974, written 4, unknown 0. Against the age main ships
today the August age is one over for 4,221 men, the same for 176 and one under for 4. Of the 105
ledger rows 82 sit on a bulk table row and every one of the 82 holds exactly the age on 1 January of
its year, which is what the "moved" rule stands on; 23 sit on hand written rows.

2026 AT THE FLIP (what part four will move, measured here, shipped by nobody): 2,078 of 4,401
ratings change. By points: +1 230, +2 324, +3 110, +4 76, +5 44, +6 20, +7 11, +8 13; minus 1 379,
minus 2 306, minus 3 245, minus 4 182, minus 5 88, minus 6 50; unchanged 2,323.

THE PORT'S PROOF, AHEAD OF TIME (a one off local read, not a test, because the old branch is not on
main): main's squads file, this round's basis file and the two libraries give the Round 1102 bake's
2026 row (name, position, value, age, rating) for 4,401 of 4,401 men of
`origin/r1102-cm-ratings:src/data/clubManagerRosters.ts`. So the bake of part four has nothing new
to discover in the 2026 file.

FINAL TABLES. 27 leagues, 2 to 5 table publishers each (97 table pages, 5 results files, 34 detail
pages). The fold agrees with `src/data/clubManagerFinalTables2025_26.ts` (Round 612, a separate
research run read on 2026-09-15) on 145 of 145 places across its 15 leagues.

## Sources read in this round (2026-10-10)

- Mohamed Salah, born 1992-06-15. Already on file from ESPN and Soccerbase, both statistics sites.
  Added: `https://www.bundesliga.com/en/player/mohamed-salah`, the league's site, which carries a page
  for him as an Egypt player (shirt 10, striker, 175 cm) and prints "15.06.1992" beside "34 years".
- Joao Pedro of Chelsea, born 2001-09-26. Already on file from Soccerbase and ESPN. Added:
  `https://www.chelseafc.com/en/teams/profile/joao-pedro`, the club's own page, which prints
  "DOB: 26 September, 2001 (age 25)". It was read in a browser: a plain fetch of that site is sent to
  a sign in redirect. UEFA's pages for him answered 404 and the Premier League's article about his
  move prints only his age.
- NOT CLOSED: Willian Jose, Saul Niguez, Hulk and Stefan Savic (hand written table rows; one
  publisher each was found in Round 1102). They have no ledger row, so nothing reads a date of
  theirs, and they stand on the age as written. The ledger's header says so. Two independent
  publishers a man would close it.
- No table figure was read again in this round. The final tables stand on the lead's research run of
  2026-10-07 and its checker; this round added the role of each cited page from that run's own
  description, and the cross check against the shipped Round 612 file.
- Tried and not found for the four men above: laliga.com answers "We don't have any data on this
  player" for Saul and for Savic and 404 for Willian Jose.

## Proof (GitHub runners; each result is the branch `origin/rc-results/<name>`)

| Step | Commit | Runner result | What ran, with exit codes |
|---|---|---|---|
| 1 the curve | fa1b7c70 | r1214-s1 | tsc 0; vitest 0 (25 tests); gen-freeagents 0; gen-russia 0; gen-aleague 0; simFreeAgents 0; simClubManagerALeague 0; simClubManagerGathered 0; simEraBakeExtend 0; simNoRivalNames 0 |
| 2 the ages | ab300325 | r1214-s2 | tsc 0; vitest 0 (38 tests); simNoRivalNames 0 |
| 3 the ledgers | b4635fab | r1214-s3 | tsc 0; vitest 0 (48 tests); simNoRivalNames 0; simNoInventedQuotes 0; simHarnessAnchors 0 |
| 4 the door | d6924122 | r1214-s4 | tsc 0; vitest 0 (51 tests); bundle 0; simNoRivalNames 0; simNoInventedQuotes 0; simCmDataOnDemand 0; simHarnessAnchors 0 |
| mutations | d6924122 | r1214-mut | clean-before 0; twenty mutations, each exit 1; clean-after 0 |
| inert | d6924122 | r1214-inert | build-base 0; build-head 0; build-head2 0; compare 0 |

INERT, three ways.
1. The base (faf0a5f3) and the head (d6924122) were built the same way on one runner, the head
   twice. All three hold 749 files under dist, the same names and the same bytes: 0 names apart, 0
   files with other bytes, base against head and head against head. The entry is
   `assets/index-BtFEINEG.js` in all three, the 13 Club Manager chunks carry the same names, and no
   built file mentions the new library. So the hashed names are stable on that runner and the round
   changes none of them.
2. Every generator that imports the curve writes the bytes it wrote: the free agents (`--check`), the
   Russian league (`--check`) and the A-League (a fresh generation, `git diff --exit-code`) on runner
   r1214-s1; and the 2026 roster bake, run once on the owner's PC offline from the lead's dump
   (`node scripts/bakeClubManagerRosters.mjs --dump=...cm-values-2025-2026.json`), wrote main's
   `src/data/clubManagerRosters.ts` byte for byte but for its two date lines.
3. No file under src imports the door or either script library (the last test of the vitest, with
   the mutation `imported` beside it).

THE MUTATIONS (runner r1214-mut, one at a time, the tree restored after each and proven clean at the
end). Every log shows "MUTATION <id> APPLIED" and the count of tests it turned red, of 51:

| Mutation | The rule it breaks | Tests red |
|---|---|---|
| halftop | the half distance reads the world's own top (made to read 94) | 5 |
| clamptop | the upper clamp reads the world's own top (made to read 94) | 9 |
| youthgain | a young man never gains points (the guard at zero removed) | 1 |
| pointsfirst | the age points are added after the stretch (put under it, as Round 1102 had it) | 4 |
| noshift | a past season is rated at the file age plus the shift (the shift ignored) | 4 |
| shiftzero | ERA_RATING_AGE_SHIFT is 1 (made 0) | 3 |
| nototal | levelFrom is total (made to answer only for a rating the read can produce) | 4 |
| curve | the value curve does not move (12.851 made 12.9) | 2 |
| oneargthrows | ratingOf with one argument still answers (made to throw) | 1 |
| veteran | the age table (33 made worth four points) | 9 |
| thinread | a thin ledger row is left out (read anyway) | 1 |
| impure | the libraries import nothing (an import planted in cmAges.mjs) | 1 |
| doorcopy | the door is the script's own function (ageRead made a second function) | 1 |
| imported | nothing shipped imports the door (an import planted in src/lib/utils.ts) | 1 |
| ledgerkind | two publishers of two kinds (Salah put back on two statistics sites) | 1 |
| ledgerdate | the date typed is the date printed (Kayode's moved a day) | 2 |
| tablerole | two table publishers a league (La Liga left with one) | 1 |
| tablerow | the fold agrees with the shipped tables (the Premier League's top two swapped) | 1 |
| basisline | a basis line is what the rule resolves (a born line made moved) | 1 |
| basisvalue | the basis value rating is the squads file's (one moved by a point) | 1 |

The mutation script, the two probes and the scratch generators were never committed. They are in the
builder's worktree under `.tmp-fx/` (mut1214.mjs, doorProbe.mjs, cmpAssets.mjs, mkLedger.mjs,
mkTables.mjs, mkBasis.mjs) and each was sent to the runner as an extra file.

## Not run, and why

- The live database: nothing in this round reads it, and no check that does was run.
- The balance harnesses, the era harnesses, simEras, the dailies, the browser walk, the full sim
  suite, build:seo: none reads a file this round changes (the built site is byte identical to the
  base), and they belong to parts two to four with their own baselines.
- `scripts/bakeEra2005.mjs`, `bakeEra2010.mjs`, `bakeEra2015.mjs`, `bakeEra2020.mjs`: they need a pull
  of the database. They call `ratingOf(usd)` with one argument, which the vitest holds to the
  recorded value curve for 1,098 dollar values.

## Owed by the later parts (never written by this round; the guides and the help are the other lane's)

1. Help, the rule: "A player's rating starts from his real market value. Then age is read the way a
   scout reads it: a young player's price has his future in it, so he gives a point back for every
   year under 24 (six at most, and less the nearer he is to the very top); from 30 a player's price
   falls faster than he does, so he gets points back, one at 30 rising to eight at 38."
2. Help, the worked example: "Take two defenders in August 2026. Liverpool's is 35 and worth 14.3m,
   Brentford's is 22 and worth 28.5m. On price alone the 22 year old was rated higher, 84 to 80. Read
   with their ages it is 85 to 82 the other way." (Still the files' numbers: this round's test holds
   van Dijk 80 to 85 at 35 and Kayode 84 to 82 at 22.)
3. Help, the ages: say what they are, not "exact". 423 of 4,401 are exact (a birth date is held);
   3,974 are the table's age plus one, which is the age the man turns in 2026 and a year over on
   1 August for a man born from August to December; 4 are as written.
4. Help, the past seasons: "In a past season the same points are added on top of that season's own
   scale, and nobody is lifted past the best players of his day." And it must say that a past
   season's rating reads the file's age plus one, which is the man's age on 1 August only if he was
   born from January to July (the squad screen will show 2010 Messi "22" beside a rating read at 23).
5. `src/pages/ClubManager.tsx`: the line "Squads, ratings and values from market data plus the
   verified summer window" will no longer describe the rating, and the line that says the past
   seasons carry "their real ages" is about 1 January ages.
6. What's New at the flip may not say "the best of each era stand exactly where they stood": this
   round's table has 2010 Xavi 94 to 95, 2020 Messi 92 to 94 and Cristiano Ronaldo 87 to 92, 2015
   Neymar 96 to 95. What is true: the top of each season's scale does not move, and the two best men
   of 2005, 2010 and 2015 keep their number.
7. The flip's release is held until the owed help is merged in the same train (critic correction 19).
