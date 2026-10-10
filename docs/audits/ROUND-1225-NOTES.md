# Round 1225 notes: Club Manager plays the real 2026/27 fixture list in nine more leagues

Written 2026-10-10 by the builder (session G of the desktop Claude lane). Branch `r1225-cm-fixtures-bind`,
base `origin/release-at-gate` at `46e4231c`. This is the round that BINDS the ledgers Round 1213 wrote
(`docs/audits/ROUND-1213-NOTES.md`). No data file and no receipt of Rounds 1184 or 1213 was edited.

## What a player gets

A new 2026/27 career in the EFL Championship, La Liga, Serie A, the Bundesliga, the Eredivisie, the Primeira
Liga, the Süper Lig, the 2. Bundesliga or Ligue 2 opens on the real fixture list, as the Premier League did
since Release AT: the real opponent on every matchday and the real ground. Dates, kick off times and results
stay the game's own. The Calendar's line names the league, says what is real and what is simulated, says
what the order is the order of (the list as first published in a month, or the list as it stood on 10
October 2026) and links the two sources. Help names the ten leagues, read off the registry.

## The design, and why it is this one

`src/lib/clubManagerFixtures.ts` is a registry, `REAL_LEAGUE_FIXTURES`: ONE LINE a league.

- The Premier League's list rides with the engine (`ledger:`), exactly as Release AT ships it.
- Every other list is in a file of its own (`load:`), one small chunk a league, fetched by the page:
  when a club is tapped in the picker (`chooseClub` in `src/hooks/useClubManager.ts`), again at the start if
  it has not arrived (`confirmClub` waits on the loading screen; a fetch that fails starts the career on
  generated fixtures and the Calendar then claims nothing), and at boot for a saved career that holds a key
  (`savedCareerFixtureKey` is read without opening the save, and the list is fetched in the same wait as an
  era's squads; a list that will not load shows the retry notice, never a generated season).
- `startCareer` gives a new career a key ONLY when that league's list is already here. A caller that fetched
  nothing gets the generated list and no key, exactly as before this round.
- A save that holds a registered key whose list has not arrived THROWS on its first fixture read
  (`fixture list is not loaded yet`). A key the registry does not know reads generated fixtures, as Round 1184
  treated any key but its own.

Why the Premier League is not lazy too, and why a new key is not given without its list: both are forced by
`scripts/simDailyDeals.mjs`, which this round may run and may not edit. Its bundle awaits nothing, and its
two controls take a daily's strip of the key out and must then see exactly the Premier League dates go red.
So the Premier League key has to be given synchronously, with its list in the engine's own file. And the
window of that harness holds Athletic Club, Celta Vigo and Osasuna (La Liga), Borussia Dortmund (Bundesliga)
and Atalanta (Serie A) on dates that are NOT marked Premier League: a bind that gave their key without a
fetch would turn those dates red under the control, and the control would then report that it did not fire.
With "a key only when the list is here" the dailies never see a new key at all, with or without their strip,
and the strip (Release AT) is what holds them when a player has fetched a list earlier in the same visit.

What this buys beyond the dailies: NO harness and NO test in the repo can carry a new key, because none of
them fetches a list. So the brief's step "every generated cohort deletes the key" was not needed for the
nine leagues and was NOT done: no harness of another round or lane was edited for it. It is held instead by
`scripts/simCmFixtureFleet.mjs` section nofetch (every league of the game, the four past seasons, founded
clubs, edited worlds: equal to the base with no field taken out) and by its control prefetch, which shows
the fleet going red for exactly the lazy leagues the moment something does fetch.

## The engine's hunks in `src/lib/clubManager.ts` (for the rounds beside this one)

1. The import line from `@/lib/clubManagerFixtures`.
2. The field `realLeagueFixtures?: string` and its comment (it was the type of the one Premier key).
3. `careerRoundPairs`: the call is `realLeagueFixturePairs(...)`.
4. `careerFixtureCoverage`: passes the league's name to `realLeagueFixtureCoverage`.
5. The bind lines in `startCareer` (`const realList = realLeagueFixtureKeyForStart(...)`).
6. A new function `savedCareerFixtureKey()` beside `savedCareerEraId()`.
`LiveSimScreen.tsx`, `clubManagerVar.ts`, `managerHotSeat.ts`, `deadlineDay.ts`, `CalendarCard.tsx` and
`CalendarScreen.tsx` are untouched (the Calendar already maps whatever label and sources it is handed).

## To hold a league back before it ships

Three places, one commit: its line in `REAL_LEAGUE_FIXTURES` (`src/lib/clubManagerFixtures.ts`), its key in
`BOUND_KEYS` (`scripts/simCmLeagueFixtures.mjs`), and its id and name in the What's New entry
(`data-cm-fixture-leagues` in `src/pages/WhatsNew.tsx`, with the count word in the title). The data harness is
red until all three agree, on purpose. Help follows the registry by itself. Lower
`CM_LEAGUE_FIXTURES_EXPECT_BOUND` by one in the gate line. Once a key has shipped in a release it never
leaves the registry: a save that holds it would read a generated season (section H says so).

## The harnesses

- `scripts/simCmLeagueFixtures.mjs` (data): the Premier League's line is frozen (digest `2a0b44638bbb042c`,
  from Round 1184's untouched file). New section H (the registry: keys equal `BOUND_KEYS`, each line hands
  out the list with its frozen digest, what the line says the order is the order of is what the receipt
  bears out), new section J (Help is read off the registry, holds no link, its one worked example is worked
  out again from the ledger; the What's New entry names exactly the lazy leagues). Six new controls:
  unregistered, unlisted, wrongasof, helpdrift, helplink, newsdrift. A third gate count,
  `CM_LEAGUE_FIXTURES_EXPECT_BOUND`.
- `scripts/simCmRealFixtures.mjs` (engine): takes `CM_REAL_FIXTURE_LEAGUE` and `CM_FIXTURE_BASE`. The base is
  the base commit's WHOLE src tree bundled on its own. Without a base the groups legacy, baseline and
  uncopied are NOT RUN and the run says so; a control needs the base. New group unloaded and new fault
  silent (the throw taken out). The neutral-only probe (group bye and its fault) stands only in the Premier
  League: it damages a save so its club is in no league, and the engine reads an unknown club as the game's
  first league. `.github/workflows/cm-real-fixtures.yml` (pull requests and manual runs only) passes no base,
  so its "all" step now stops with exit 2: the lead retires it or gives it a base.
- `scripts/simCmFixtureFleet.mjs` (new): sections nofetch, oldsaves, dailies; controls prefetch, keyless,
  nostrip. Needs `CM_FIXTURE_BASE` for the first two.
- `scripts/playCmLeagueFixtures.mjs` (new walk, needs a served build): three leagues of three sizes at 390
  and 1280, and three pages that must fetch no list.
- `scripts/simFixtureBalance.mjs`: four anchors follow the renamed functions.

A trap met three times in one day, for whoever writes the next comparison: the engine keeps counters in its
module (generated ids). Two engines are only comparable when BOTH are fresh copies that made the same calls.

## What was proven, and where (GitHub runners, the lane's remote check kit)

Read a log with `git show origin/rc-results/<name>:logs/<label>.log | tail -60`; files a run kept are under
`files/`. The base of every comparison is `46e4231cc82b6c047da6e0b4bdb5dfae5628a928` (origin/release-at-gate).

- `r1225-base` (the base itself): the type gate 0; simDailyDeals 0 and both controls fire; the weight rows
  BEFORE (below); the clubs the daily window deals (`files/daily-base.log`).
- `r1225-s1` (the lift, Premier League alone, `b3a9752f`): the type gate 0; simFixtureBalance 0 and all eight
  of its controls fire; simCmRealFixtures normal and its nine faults; simDailyDeals 0, both controls fire.
- `r1225-fleet2` (`7953ea48`, still the Premier League alone): the fleet green, 250 careers in every league of
  the game equal to the base with no field taken out. So the lift moved nothing.
- `r1225-bind-<league>` (nine results, one a bind commit): the type gate 0, simDailyDeals 0 with both controls
  firing, the data harness green with the bound count that commit expects (2 to 10), the Premier League's
  engine proof 0, simFixtureBalance 0, in every one. The engine proof of the league itself was RED in eight
  of the nine for a fault of the HARNESS (its new group compared a copy of the engine that had already
  played with a fresh one; the engine keeps counters in its module), fixed in `90f0e063` and green for all
  nine at that head in `r1225-final-b1`.
- `r1225-final-b1` (`90f0e063`): the type gate 0. The engine proof with every fault: premier (12 groups, 760
  fixture reads, 9 faults), championship (11 groups, 1,104 reads, 9 faults), bundesliga (11 groups, 612
  reads, 9 faults). The engine proof for the other seven leagues, each 11 groups against the base. The fleet:
  nofetch 250 careers, oldsaves 132 saves, dailies 11 clubs; prefetch fired for exactly the nine lazy
  leagues, keyless and nostrip for all ten. simDailyDeals 0, both controls fire. The data harness: 10 ledgers,
  10 frozen, 10 bound, 236 of 236 controls; a bound count of 9 is exit 1.
- `r1225-final-a` (`fd9cbc9b`, a served build): nine list chunks in the build; the weight rows AFTER; the
  Premier League walk green; simCmDataOnDemand green; and two builds mutated on the runner whose walk must
  fail and does: the boot no longer waiting for a saved key's list (every journey stops after its reload),
  and a start that neither fetches nor waits (no save holds a key).
- `r1225-confirm` (`03160800`): the type gate 0; the three league walk green, 6 journeys, 90 checks, 3 pages
  that fetch no list; the suite runner calls all five fixture harnesses green; no en or em dash on any line
  the round added.

## Weight (gzipped JavaScript, `SWEEP_OFFLINE=1 node scripts/sweepWeight.mjs` on a served build)

| route | before (base) | after | budget row today |
|---|---|---|---|
| /club-manager | 581.7K | 582.9K | 578 |
| /manager-hot-seat | 599.6K | 600.6K | 596 |
| /deadline-day | 609.7K | 610.7K | 606 |

None of the growth is a list: the nine lists are nine chunks of their own (1,649 to 2,851 bytes gzipped,
17,290 in all) that these pages do not fetch, which the walk checks request by request. The 1.0K to 1.2K is
the registry itself in the engine's chunk: ten lines, nine loaders with their chunk names, and the rules
around them. All three rows were already over their budget on the base (the lead is setting them for
Release AT); each needs one more K than the base did. The budget numbers are the lead's.

## A measurement the lead should read: outcomes on a real list (not a gate)

`r1225-f4`: 20 seeded full seasons on the real list beside the same 20 seeds with the key taken out, league
wide, against a yardstick of ten disjoint pairs of generated fleets (the "null sd").

| league | goals a match, real minus generated | in null sd | home win share, real minus generated | in null sd |
|---|---|---|---|---|
| championship (24) | 2.6188 - 2.6314 = -0.0126 | -0.92 | 0.4442 - 0.4454 = -0.0012 | -0.20 |
| laliga (20) | 2.6445 - 2.6399 = +0.0046 | +0.28 | 0.4554 - 0.4374 = +0.0180 | +3.83 |
| bundesliga (18) | 2.6536 - 2.6619 = -0.0083 | -0.23 | 0.4577 - 0.4384 = +0.0193 | +1.90 |

Goals a match do not move. On that one pair of fleets the home win share read about two points higher on the
real list in two of the three leagues, and in La Liga well outside the yardstick. One pair is one draw, so the
same comparison was run on five more sets of seeds, with the Premier League added (`r1225-f4b`, six pairs of
20 seasons a league, 32,360 real list matches):

| league | home win share, real minus generated, six pairs | mean | goals a match, mean of six |
|---|---|---|---|
| premier (20) | -0.0026 +0.0053 +0.0055 -0.0004 -0.0047 -0.0017 | +0.0002 | -0.0070 |
| championship (24) | -0.0012 +0.0043 +0.0088 -0.0019 -0.0074 -0.0103 | -0.0013 | -0.0031 |
| laliga (20) | +0.0180 +0.0030 -0.0001 +0.0012 +0.0086 -0.0026 | +0.0047 | +0.0102 |
| bundesliga (18) | +0.0193 -0.0026 +0.0008 +0.0142 -0.0172 -0.0054 | +0.0015 | +0.0056 |

So the two points of the first pair were its own draw: the other five pairs of La Liga and of the Bundesliga
sit on both sides of zero. What is left is La Liga's mean of about half a point (+0.0047), which is as large
as the yardstick for ONE pair (0.0047) and so about 2.4 times the yardstick for a mean of six. That is the
one number here worth another look, in a round of its own with more seasons. Nothing was tuned, and nothing
is asserted on these numbers by any harness: a band set from one measurement would be a coin toss.
