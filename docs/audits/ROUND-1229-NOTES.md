# Round 1229 notes: Club Manager, the league keeps its book (part one, the book is kept)

Branch `r1229-cm-league-book`, base `origin/release-at-gate` at 980654fa. Written by the builder, 2026-10-10.
This is ROUND A of the two the critic cut the scout's draft into: the book is KEPT in the save. Nothing reads
it for a screen yet, so the site looks exactly as it did. Round B (the Stats card, the awards, the team of the
season, What's New) starts after the lead has ruled on the numbers at the end of this file.

## What shipped

1. `src/lib/clubManagerGoalWeight.ts`: the scorer weight table, once. `scorerWeight` (my squad) and
   `oppShotWeight` (the opposition in a match I play) in `src/lib/clubManager.ts` both call it, and the 0.7
   assist share has a name (`ASSIST_SHARE`). A pure lift: the same doubles, term for term.
2. `src/lib/clubManagerLeagueBook.ts`: the book, pure. A row is `[goals, assists, cleanSheets, gen]`, always
   four numbers; a club entry is `{ m, og, u }` (rows, own goals, unnamed goals); the book is `{ s, c, my }`
   (stamp, clubs, and my men's league clean sheets as a list of [player id, count]). Every roll is `keyedRng` on a key of the match
   and the goal. `liveBook` is the match week's cheap reader (stamp and types), `readBook` the full walk.
3. The binding in `src/lib/clubManager.ts` (one block under `creditRaceGoals`, and five one line hunks):
   `openLeagueBook` in `startCareer` and `startNextSeason`; `noteBookMine` beside my league match's
   `applyResult`; `noteBookResult` beside the two `creditRaceGoals` pairs (the week's close and my bye week).
   Exported for the round that reads it and for the harness: `leagueBookOf`, `leagueBookEleven`,
   `CM_BOOK_TAKER`. `CareerState.leagueBook?` sits after `resultLog?`.
4. `src/lib/managerHotSeat.ts` and `src/lib/deadlineDay.ts`: one `delete ...leagueBook` each, beside the
   strip of the fixture key Release AT put there.
5. `scripts/simCmLeagueBook.mjs`: seven sections and, since the review fixes, 21 controls (its header says
   what each holds; the section "After the adversarial reviews" below says what was added and why).
6. `scripts/simClubManagerSaveSize.mjs`: `SIZE_BUDGET` 196,000 to 203,000, with the measurement in its header.

The old race (`initScorerRace`, `ensureScorerRace`, `creditRaceGoals`, lines 273 to 309 of the base) is not
edited: it is still seeded and credited, draws and all, and `goldenBootTable`, the awards and the Stats screen
still read it. `src/lib/clubManagerCalendar.ts` is not edited either (see "the stamp" below).

## The hunks in src/lib/clubManager.ts, for the merge with Rounds 1216, 1218 and 1225

| where (by function) | what |
|---|---|
| imports, directly under the `keyedRng` import | two import statements (the weight module, the book module) |
| under `creditRaceGoals`, above `goldenBootTable` | the whole glue block (about 150 lines, new) |
| `CareerState`, after `resultLog?` | `leagueBook?: LeagueBook` and its comment |
| `scorerWeight` | body replaced by one call of `goalWeight` |
| `creditMyScorers` | `0.7` becomes `ASSIST_SHARE` |
| `oppShotWeight` | body replaced by one call of `goalWeight` |
| `playMyMatch`, the league branch, after `notePair` of my own match | `noteBookMine(...)` |
| `playMyMatch`, the league branch, after the two `creditRaceGoals` | `noteBookResult(...)` |
| `startCareer`, after `state.scorerRace = initScorerRace(state)` | `openLeagueBook(state)` |
| `playNextEntry`, my bye week, after the two `creditRaceGoals` | `noteBookResult(...)` |
| `startNextSeason`, after `state.scorerRace = initScorerRace(state)` | `openLeagueBook(state)` |

Not touched: lines 1 to 6, the `realLeagueFixtures` lines of `CareerState`, `kickOff`, `careerRoundPairs`,
`careerFixtureCoverage`, `loadCareer`, `trimCareer`, `leanCareer`, `SAVE_CAPS`, `finishSeason`.

## Decisions the builder took (each one is the critic's recommendation unless it says otherwise)

- THE ROW SURVIVES JSON (critic 1). Four numbers, zeros and never holes; both counts always present. The
  test file and the harness hold "a round trip is the same book, and it holds no null" after every credit
  and after every calendar entry of the fleet.
- THE STAMP IS THE LEAGUE AND ITS SAVED ORDER, NOT THE SEASON'S NUMBER (critic 2, its second option, and its
  advice 12 in one). `s = leagueId|hash(leagueClubs)`. `leagueClubs` is shuffled for every career and again
  every summer and is saved, so last season's book never reads as this one's, two careers at one club do
  not deal the same scorers for the same scoreline, and the job you join today keeps the book its run-in
  filled with no edit to the calendar module. The first cut re-stamped in `joinClubNow` through a helper
  exported by the engine; `scripts/simCmRealFixtures.mjs` bundles the calendar module against an OLDER
  engine read from git, where that export does not exist, so the import alone broke it. Control
  `seasonstamp` puts the number back and the season three join goes red.
- PENALTIES AND DIRECT FREE KICKS GO TO THE TAKER (critic 3, the lever the lead had not ruled on):
  `CM_BOOK_TAKER = true`, the eleven's heaviest outfield man, the name as the tie break, compared as plain
  text. One constant. Both variants are measured below.
- THE ELEVEN ONLY (critic D5), and a club with no named eleven gets `u`, never an invented scorer.
- CLEAN SHEETS: on the keeper's row AND each defender's of the eleven (the draft's rule, the squad's own);
  the keeper always gets his row, cap or no cap (critic 17). The critic's point 8 (a board of every man is
  degenerate) is measured below and is Round B's board to rule on: the book costs nothing more for holding
  the defenders' numbers. My own men: everyone who PLAYED in the league clean sheet and is a keeper or a
  defender by his card, by player id, which is the rule the squad's own `cleanSheets` line follows.
- IN MY MATCH (critic 13): their scorers are the report's own lines, looked for among the men on their
  pitch at that minute, then their eleven and bench, then their roster; the outfield man wins a shared
  name; the assist is dealt over the men who were on their pitch at that minute.
- THE HOT PATH (critic 14): the match week asks `liveBook` (a stamp and three type checks).
- MY MEN ARE A LIST, NOT A MAP BY ID (the builder's own, after a red). The first cut kept `my` as a map keyed by
  player id. No other map in a save is keyed by a player's id, an academy boy's id carries the clock and a
  counter of the running engine, and `scripts/simCustomClubValues.mjs` sorts a save's keys BEFORE it
  normalises those ids: one of its thirty paired careers (Lincoln City, a youth defender with a league clean
  sheet) read as different on two engines that had made the same save. A list in the order each man first
  kept one has no key to sort.
- THE VIDEO REFEREE (critic D10): the harness plays an arm with `varReviews: true` and holds the law on it.
- NOT TAKEN: the full walk on load. `loadCareer` is on the must not touch list (Round 1225 inserts a
  function directly above it), so a book with one holed row is refused whole by the reader
  (`leagueBookOf`) but still written to in a match week. The engine never makes such a row.

## A NEW SAVE FIELD AND THE HARNESSES THAT PIN AN OLD ENGINE

The brief expected every existing harness to stay green unedited "because the old race is still written".
That is true of the match stream and false of the SAVE: five harnesses compare a whole save, or a hash of
one, against an engine older than this round, and a save that gains a field cannot be byte equal to one
that has none. Found by running all 118 harnesses that load the engine on a runner (`r1229-sweep`), not
by reading. What each one does and what this round did about it:

| harness | what it pins | what was done |
|---|---|---|
| `scripts/simCmShootoutOrder.mjs` | the report and the whole save against the engine at 5b70b05f | one line in `compareContent`: the field is left out on both sides (it already drops a null `live` there) |
| `scripts/simCmLeagueRules.mjs` | hashes of whole saves in `scripts/data/cmLeagueRulesDigest.json` | the digest is taken again in its own commit, after the attribution legs its header describes (see below) |
| `scripts/simManagerAppealIsolation.mjs` | the sha256 of `src/lib/clubManager.ts` in `scripts/fixtures/managerAppealIsolation1081/manifest.json` | the one pin follows the file, in its own commit, as Round 1146 did. IT MUST BE TAKEN AGAIN AT THE MERGE: Rounds 1218 and 1225 edit the same file |
| `scripts/simCmVar.mjs` | `playNextEntry` on a fresh save against the engine at c33d0139 ("Default callers retain every prior report, stat, player credit and save byte") | EDITED BY THE FIXER (61ee53dd): the two comparisons with the prior engine, and no other, leave the field out on both sides. Round 1218 keeps both lines and the file merges with its branches cleanly (see "After the adversarial reviews") |
| `scripts/simCmRealFixtures.mjs` | fresh saves, played entries and a rollover against the engine at 79c729cd | EDITED BY THE SECOND FIX PASS (c0db41a8): the block below, under the assert import. The brief had it on the must not touch list because Round 1225 rewrites the file; the block is the one edit that merges with Round 1225's version with no conflict (see below) |

THE BLOCK (the builder wrote it for the lead as
`C:/Users/antho/dukb-handoff/2026-10-10/results-g/patchSaveCompare-1229.mjs`): fourteen lines under
`import assert from 'node:assert/strict';` that wrap `assert.deepEqual` so a save, or a play result holding
one, is compared without its `leagueBook`. IT IS NOT WANTED FOR `simCmVar.mjs` AND MUST NOT BE RUN ON IT:
that file carries a narrower fix. The block wraps `assert.deepEqual` for the whole process, so there it
would also take the book out of every comparison of today's engine with itself, and out of
`scripts/playCmVar.mjs`, which imports `simCmVar.mjs` and shares the same assert object.

SINCE THE SECOND FIX PASS THE BLOCK IS IN `scripts/simCmRealFixtures.mjs` ON THIS BRANCH (c0db41a8), and of
the five harnesses of the table none is red on this branch alone any more (`r1229-f2c`; what is still over
its line is the weight sweep's three budget rows, part 6 of the numbers). Why that file may carry the wide
block where `simCmVar.mjs` may not:
nothing imports it, so the wrap reaches no other harness; and the one comparison of today's engine with
itself that it reaches ("Playing never changes any raw input field") has a text twin on the next line
(`JSON.stringify(pre)` against the input bytes), so nothing is hidden. Why the block and not a narrow edit
of the seven comparisons with the older engine: Round 1225 rewrites the file, and a mock edit of those
seven lines conflicts with its version in three places (`git merge-file`, base 980654fa), where the block
conflicts in none. With the file as it was at 5e96c4ca the harness is red on this head, and with the block
green, so the block alone is what turns it (`r1229-f2c`, lines `realfix-block-out` and `realfix`).
`patchSaveCompare-1229.mjs` is no longer to be run on this branch's file.

BESIDE ROUND 1225 THE REMEDY IS THE BASE (second fix pass; trial merges of this branch with
`origin/r1225-cm-fixtures-bind` at 6bfd816a, no conflict, the block riding into Round 1225's version of the
file: `r1229-f2a` before the block was committed, `r1229-f2d` after). Round 1225 brings TWO harnesses that
compare with the engine of a commit named by `CM_FIXTURE_BASE`: its version of
`scripts/simCmRealFixtures.mjs` (the groups legacy, rollover, baseline and uncopied, and every control) and
a new `scripts/simCmFixtureFleet.mjs` (sections nofetch and oldsaves: a fresh career, twelve entries and
the saved bytes equal the base's with no field taken out, in every league). Run with no base, as the suite
runs them, both are green beside this round. Named a base from before this round (980654fa), both are red
on the one new field: the first in its group legacy alone (12 of 13 green: that group compares saved
bytes as text, which the block does not reach), the second with 57 failures, nofetch red in every league.
`patchSaveCompare-1229.mjs` run on the MERGED file takes the book out of that text comparison too (13
groups and 11 effective controls against 980654fa), but nothing should strip a field from the second
harness, whose point is that nothing is stripped.
What needs no edit anywhere: MERGE THIS ROUND BEFORE ROUND 1225 AND NAME AS THE BASE THE COMMIT JUST BEFORE
ROUND 1225'S MERGE. That base holds the book, so both harnesses compare like with like. With the base set
to this branch's head on that trial merge: `simCmRealFixtures` 13 of 13 groups, and 11 effective controls
under `CM_REAL_FIXTURE_CONTROL=all`; `simCmFixtureFleet` green over 250 careers, 132 saves and 11 daily
clubs in 10 registered leagues, and its three controls (prefetch, keyless, nostrip) each FIRED for exactly
their own leagues. On the same merged tree, with no base to name: `simCmLeagueFixtures` green (268 of 268
controls) and `simCmLeagueBook` green. If Round 1225 is already in, make the base: revert its merge on a
side branch and name that commit.

THE THREE ROUNDS ON ONE TREE (`r1229-f2b`, `r1229-f2d`: this branch, then `origin/r1218-cm-var-true` at
116faaaf, then Round 1225). This round merges with each of the two with no conflict. THEY CONFLICT WITH
EACH OTHER, with or without this round (`git merge-tree` of the two branches): lines 3 and 4 of
`src/lib/clubManager.ts` (Round 1225 rewrote the `clubManagerFixtures` import, Round 1218 the
`clubManagerVar` import under it: keep 1225's line 3 and 1218's line 4) and line 3 of
`src/components/club-manager/ClubManagerHelp.tsx` (both add lines: keep both). Resolved that way, the tree
of the three: the type gate 0; `simCmVar` 0 and 12 outcomes with 20 effective controls; `simCmLeagueBook`,
`simClubManagerSaveSize`, `simCmShootoutOrder`, `simCmLeagueRules` and the two book test files 0; Round
1225's two base harnesses 0 against the commit that holds this round and Round 1218 (13 groups, 11
effective controls, 250 careers, 132 saves). The one red is the Round 1081 pin, as it must be: the engine
file of the three hashes to d4aa57b9f99dc73244593f25405b023442f6f88f757f86f658e382ceb136c624 (CRLF read as
LF), and with the pin moved to that value `simManagerAppealIsolation` is 0 again.

## THE NUMBERS, for the lead's rulings before the round that reads the book

Measured on GitHub runners, 2026-10-10, by `scripts/simCmLeagueBook.mjs` with `BOOK_FLEET=full`: 8 clubs x 3
seeds x 2 seasons = 48 seasons a seed set, five seed sets (`SEEDSET=0` to `4`), remote check `r1229-g1`
(engine as at 4ab6e246; nothing in the engine changed after it). Clubs: Everton, Arsenal (Premier League),
Bayern Munich (Bundesliga), Southampton (Championship), Hertha BSC (2. Bundesliga), Real Madrid (La Liga),
Ajax (Eredivisie), Barcelona in the 2010-11 era.

### 1. The top scorer of the league (the Golden Boot), book against old race, same seasons of the same saves

Mean goals of the league's top scorer (rivals and my own men on one board), five seed sets:

| leagues | seasons a set | penalties and free kicks to the taker (as shipped) | dealt by the weight (`CM_BOOK_TAKER` false) | the old race |
|---|---|---|---|---|
| 38 games (Premier League, La Liga, La Liga 2010-11) | 23 to 26 | 28.75, 28.80, 28.52, 28.77, 29.35 | 24.21, 23.72, 23.48, 23.62, 24.78 | 33.21, 31.20, 30.80, 31.38, 32.30 |
| 34 games (Bundesliga, 2. Bundesliga, Eredivisie) | 18 | 22.83, 24.39, 23.78, 24.22, 22.06 | 19.83, 20.72, 19.78, 20.67, 19.06 | 29.17, 30.06, 28.89, 27.33, 30.44 |
| 46 games (Championship) | 4 to 7 | 36.83, 36.80, 37.20, 39.25, 35.43 | 31.17, 30.00, 32.00, 29.75, 28.29 | 40.83, 39.40, 39.20, 41.00, 40.71 |

Standard deviation of one season's winner in the 38 game leagues: 3.0 to 4.0 (taker), so the standard error of
a set's mean is 0.6 to 0.8. By league on seed set 0, taker on: Premier League 28.2 (12 seasons: 28 26 26 27
26 28 27 23 31 32 33 31), La Liga 27.3, La Liga 2010-11 31.3, Bundesliga 24.0, Eredivisie 25.3, 2.
Bundesliga 19.2, Championship 36.8. The top scorer was a forward or a winger in 48 of 48 seasons.

THE REAL GAME. Premier League top scorer, 2015-16 to 2024-25: 25 29 32 22 23 23 23 36 27 29, mean 26.9.
Re-opened by the builder on two independent pages, premierleague.com/en/news/1206108 and
footballberry.com/premier-league-golden-boot-winners-list (2026-10-10), which agree on all ten. The other
four leagues' figures in the brief (La Liga 30.7, Bundesliga 30.0 over 34 games, Serie A 28.7, Ligue 1
28.4) are the scout's search summaries and were NOT re-opened: they are a reference here and nothing more,
and the receipts are Round B's. No real number is a constant or a gate in this round.

So the critic's estimate held: without the taker the 38 game mean is 23.5 to 24.8 (it said 22 to 24), under
every real mean; with the taker it is 28.5 to 29.4 (it said 26 to 28), inside the real 26.9 to 30.7.
WHAT THAT LAST RANGE RESTS ON (corrected after the review): the 26.9 is the Premier League's, re-opened on
two pages by the builder. The 30.7 is La Liga's, which the builder did NOT re-open. The reviewer who reads
checked all four on 2026-10-10, by search summaries of two sites each and not by opened pages: La Liga 40
37 34 36 25 30 27 23 24 31 (top-scorers.com, sillyseason.com), mean 30.7; Bundesliga 30 31 29 22 34 41 35
16 36 26 (bundesliga.com news 19353, 90min.com), mean 30.0; Serie A 36 29 29 26 36 29 27 26 24 25
(top-scorers.com, sportskeeda.com), mean 28.7; Ligue 1 38 35 28 33 18 27 28 29 27 21 (balliq.app,
worldfootball.net), mean 28.4. They agree with the brief, they are still not opened pages with a receipt,
and they stay a printed reference: Round B's facts file opens them.

### 2. Who scores

Of 33,081 to 33,888 credited rival goals a seed set: forwards and wingers 55.3 to 55.7 in a hundred,
midfielders 34.4 to 34.9, defenders 9.6 to 10.1, keepers none. The one top division page the scout found
(2012-13, strikers 47, midfielders 37, defenders 11, own goals 5) counts own goals in; it is one source and
gates nothing. (Corrected after the review: an earlier cut of this sentence said the page counts wingers as
midfielders. The page, eplindex.com/29868, never mentions wingers or wide players. It says Opta has one
named forward down as a midfielder and that another man's 17 goals came from midfield; how it would count
a winger was the builder's reading of that line, not the page's statement.) What gates is that the deal follows the engine's own
table (the three lines sat within 1.9 binomial standard deviations of the harness's own expectation on
all five sets) and that forwards hold 9.1 to 9.5 of the top ten places of the Goals board where the old
race gave them 5.0 to 5.4: a rise of 3.85, 4.02, 4.40, 4.19, 4.00.
The old race, same seasons: it gave 62.8 in a hundred of the rivals' goals to anybody, half of those to
midfielders (49.7 forwards, 50.3 midfielders).

### 3. A CLUB WITH NO NAMED ELEVEN IS COMMON OUTSIDE THE PREMIER LEAGUE, and the lead should rule on it

`pickOppSquad` names an eleven or nothing, and the book follows it (the brief's decision 5): a club that
cannot field a named eleven gets its goals counted as unnamed. That is 8,612 to 9,574 of about 36,000 club
weeks a seed set, and 9,072 to 10,001 unnamed goals beside about 33,500 named ones. By league (seed set 1):

| league | club weeks with no eleven | rival clubs with none, of those seen |
|---|---|---|
| Premier League | 0 | 0 |
| La Liga 2010-11 | 228 of 4,332 | 1 of 19 (Levante) |
| Bundesliga | 476 of 4,046 | 4 of 21 (Elversberg, Heidenheim, Kaiserslautern, Schalke 04) |
| La Liga | 874 of 4,332 | 8 of 24 (Espanyol, Girona, Mallorca, Real Oviedo and four promoted sides) |
| Championship | 2,070 of 5,290 | 9 of 28 |
| Eredivisie | 2,244 of 3,468 | 11 of 17 |
| 2. Bundesliga | 2,720 of 2,890 | 17 of 19 |

MOST OF THEM ARE A FEW MEN SHORT, NOT EMPTY. What the roster of such a club holds as the save sees it (seed set
0, the harness prints it): Schalke 04 16 men and no keeper, Espanyol 14 and no keeper, Swansea City 14 and no
keeper, Millwall 11 and no keeper, Girona 10 with a keeper, Heidenheim 10 and no keeper, Elversberg, St. Pauli and
Levante 10 with one, Holstein Kiel 9, Mallorca 8, Blackburn Rovers 7; and at the far end Bolton Wanderers 3,
Lincoln City 2, Dynamo Dresden 1, ADO Den Haag, Cambuur and FC Andorra none. On seed set 0 the Premier League had
two as well, both promoted for season two (Millwall and Swansea City, 76 of 8,664 club weeks). A keeper is what
most of the nearly whole ones lack.
The old race named two men for every one of those clubs (it reads the roster, not the eleven). So a Goals
board read from the book in the 2. Bundesliga would show two rival clubs, my own men and whoever scored
against me. This is not a defect of the round (the Match Centre draws unlabelled dots for the same clubs
today, and the rule was the lead's), but Round B cannot ship a leaders card for those leagues on it as it
stands. The choices, none taken here: deal a thin club's goals over the men its roster does hold (they are
real names, but their totals would then carry the goals of men the data does not have); keep the old race
as the board of a league under some share of named clubs; or fill the rosters (data work, proposal P4).

IT IS WIDER THAN THE FLEET SHOWS (added after the review). The table above is the seven leagues of the
builder's fleet. The reviewer who runs things played one career in every league of every era (49, remote
check `r1229-run-o`): in 21 of the 49 more than a quarter of the rivals' goals have nobody named, and only
15 sit at 0 to 5 in a hundred. The current leagues where it is most of them, share of rival goals unnamed,
by the engine's league ids: segunda 97, croatia 92, ligue2 91, bundesliga2 89, mlsWest 86, serieb 81,
greece 71, switzerland 70, austria 70, denmark 69, proleague 68, scottish 67, ligamx 66, saudi 62. The
harness's own new arm agrees for the league it plays: in the MLS Eastern Conference 9 of 14 rival clubs
have no named eleven (1,428 of 2,222 club weeks on the full fleet, `r1229-fx4`). The old race names two men
for every one of those clubs today. So a Round B that switched the Goals board to the book as it stands
would empty the board in about half the game: the ruling on clubs with no eleven comes before that brief.

### 4. Assists, own goals

Rival assists a credited goal: 0.601 to 0.610 over every club. The rule (0.7 of the goals that are not from
the spot, a direct free kick or an own goal) gives 0.614 for a club with an eleven; the gap is the goals a
club with NO eleven scores against me, which sit on a row (the report names a man of its roster) with
nobody to set them up. Own goals 2.57 to 2.80 in a hundred goals of clubs with an eleven (the rule: 2.75).
Most assists in a 38 game league: 11 to 13.5 a season. The real game runs near 0.69 assists a credited goal
on the one page the scout found; raising the 0.7 would move the match stream, so it stays owed to the round
that stores a seed.

### 5. Clean sheets and the team of the season

The leading keeper's clean sheets: Premier League mean 17.7 (seed set 0), against a real mean of 17.2 for
2015-16 to 2024-25 (16 16 18 21 16 19 20 17 16 13, premierleague.com/en/news/1206130, re-opened by the
builder; one page only). Other leagues, seed set 0: La Liga 23.7, La Liga 2010-11 24.7, Bundesliga 18.8,
Eredivisie 21.8, Championship 24.0 over 46 games, 2. Bundesliga 14.8.
THE CRITIC'S POINT 8, MEASURED. A Clean sheets board of every man with one (keepers and defenders) has men
of 2.4 to 2.5 clubs in its top ten, 2.1 of them keepers: it is one club's back five twice over. A keepers
only board does not have that problem and is what the real award is.
BUT THE NUMBER ON THAT BOARD IS ONLY SHOWN TO BE RIGHT IN ENGLAND (corrected after the review; the builder's
report called the keepers' board sound on the Premier League line alone). The Premier League's second
source, found by the reviewer who reads: givemesport.com/premier-league-golden-glove-winners-list agrees
with the league's own page on 2015-16 to 2023-24, and two more sites give 13 for 2024-25 (search
summaries). Outside England no real number stands beside the engine's: La Liga 23.7 and 24.7 over 38 games
and the Eredivisie 21.8 over 34 are the same log's lines, and the reviewer's search summaries (pages not
opened) put La Liga's leading keeper on 15 in 2024-25 and 16 in 2023-24, with 24 and 26 named as record
seasons. So the engine's AVERAGE leader in Spain sits where the real game's record does. That is the match
engine's number (how often a top side concedes nothing), not the book's, and nothing in this round moves
it; but a keepers' board in Round B would print it, so it needs a sourced number a league and a ruling.
A back four picked by clean sheets + goals + assists (the draft's rule) holds 2.9 to 3.2 men of one club on
average. Picked by goals + assists, level men split by their club's clean sheets and then its table place
(the critic's rule): 1.7 men of one club, and 0.0 to 0.04 of the four on no goal and no assist.

### 6. The save and the page weight

The book is about 50 bytes on day one, 6,023 to 7,284 at the end of season one, 1,236 to 6,534 at season 15
(it is replaced every summer, so it is a level and not a slope). `SIZE_BUDGET` 196,000 to 203,000: healthy
180,907 to 193,046 over six streams against 179,671 to 186,562 on the base; the `uncapped` control 215,793
to 226,422 with the book, fired with 33 failures in section 1 and nothing else (remote checks
`r1229-size-base`, `r1229-size-cand`).
`scripts/sweepWeight.mjs` on a served build (`r1229-w1`): the three pages that load the engine are each
about 1.3K over the budget the gate set at its own measurement: /club-manager 583.3K against 582,
/manager-hot-seat 601.3K against 600, /deadline-day 611.4K against 610. THE ROWS ARE THE LEAD'S TO MOVE.

## What is proven, and where (GitHub runners; `git show origin/rc-results/<name>:summary.txt`)

- THE MATCH STREAM DID NOT MOVE. `r1229-b1` (the weight lift alone, d5dac548): 96 of 96 faces, each the whole
  save and the count of draws, equal to the base commit's source over 24 careers x 2 seasons, and the
  control that makes a striker weigh more fired. `r1229-d0` and `r1229-e1` (the binding in): 96 of 96 equal
  to the base commit on the whole save BUT the book, and 96 of 96 equal to the same source with the book's
  lines out. Controls `mathrandom` (the scorer pick reads Math.random: 16 of 16 faces move) and `weight`.
- THE LAW, THE NAMES, THE SHAPES, THE OLD SAVE, THE DOORS, THE DAILIES: `scripts/simCmLeagueBook.mjs`, default
  and full fleets, five seed sets each, all ten green, and thirteen controls that each FIRED on the final
  shape of the book (`r1229-fin5`, at 852b05fc). Its header's MEASURED block has the z values.
- THE VIDEO REFEREE ON: the law held over 268 to 277 entries a fleet, 162 to 183 reviews in 228 league
  matches of mine, no report whose lines did not add up to its score.
- THE DIGEST OF `simCmLeagueRules`: `r1229-rules` and `r1229-rules2` (taken twice: the book's list of my own men
  changed shape in between), two legs each, in that harness's header.
- WHICH REDS OF THE SWEEP WERE THIS ROUND'S: the sixteen that were not green were run on a worktree of the base
  commit on the same kind of runner (`r1229-basered`). Five were green there and so were this round's (all
  five accounted for above); nine are red at the base too (simEra2005, simEra2010, simEra2015, simEra2020,
  simEras, simGmCalendar, simGmDealTableFixture, simGmStaff, simSoccerConquest) and are nobody's here; one
  needs the live database.
- THE WHOLE VITEST SUITE: 403 files passed, 2 skipped, 5,732 tests passed (`r1229-h1`, at 1acb1aab).
- EVERY HARNESS THAT LOADS THE ENGINE: 118 on a runner (`r1229-sweep`, then `r1229-sw00` to `r1229-sw04`).
- A ROUTE SWEEP in Chromium at three viewports, 183 routes, 549 checks, 0 findings (`r1229-w1`).
- THE MERGES: this branch with each of r1218-cm-var-true, r1225-cm-fixtures-bind and r1216-own-goal-motion
  ALONE merges with no conflict; the type gate is at zero and this round's harness is green on each
  (`r1229-m2`). All three together conflict, between Rounds 1218 and 1225 (their import lines 3 and 4 of
  `clubManager.ts`, and `ClubManagerHelp.tsx`), in no line this round touches (`r1229-m1`).

THE BASE MOVED: the gate branch gained five fix commits while this was built (980654fa to 24f57a98, nothing of
Club Manager). They are merged in (a658174a) and the gates were run once more on that head (`r1229-fin8`).

## After the adversarial reviews (the fixer, 2026-10-10)

Two reviewers read and ran the round at d2055c81. Neither found a defect in the engine binding or the pure
module. What they found was in the PROOF: seven of ten small mutations of the book's core path left the
harness and both test files green. What changed, each in a commit of its own, nothing of it a player sees:

- EVERY GOAL IS ITS OWN ROLL. With the goal's index dropped from the deal key every goal of a side in one
  match was the same roll (one man's brace every time) and everything stayed green. Now a test case deals
  three goals on 6,000 keys and holds how often two, and three, are one man's against the weights, and
  harness section shapes (iv) holds the same over the fleet: one man took every goal in 12.0 to 13.8 in a
  hundred of the matches a club scored two or more in, where the harness's own table says 12.4 to 13.1.
  Control `keyindex`: 92 in a hundred, z 99 to 105.
- THE BOOK AGAINST THE REPORT of every league match of mine (section names, `reportAgainstBook`): an own
  goal line is an own goal of the book, no man gains more than the report names him for, a line whose name
  is on that club's roster is on his row (so only a name the roster does not hold may be unnamed), no
  assist from the spot or a free kick, every assister on their pitch for a goal he did not score. Controls
  `wrongman`, `unnamed`, `offbyone`, `penassistmine`, `assistbench`: the reviewer's five surviving mutations.
- THE WEEK I DO NOT PLAY. `playNextEntry` notes a league round I am not part of at a call of its own, and
  only a league with an odd number of clubs reaches it: none was in the fleet. New England Revolution (MLS
  Eastern Conference, fifteen clubs) is in the full fleet and the default one now, and control `byeweek`
  takes that call out (325 to 505 failures of the law). One thing it taught the harness: one call can play
  that week and then my own match, so a club can play twice in an entry; clean sheets are counted from the
  table a match at a time, and on a range where the table cannot tell which of two was the clean sheet.
- A HAND DAMAGED CLUB ENTRY NEVER THROWS. A book with the right stamp and a club entry with no rows map
  (only an edited save can hold one) threw in a match week. The module now steps over such an entry and
  leaves it as found; the reader still refuses the whole book. A test case, a sixth unreadable book in
  section oldsave, control `hurtentry`.
- ONE ASSIST WEIGHT. `creditMyScorers` calls `assistWeight` (it typed the same expression out before); the
  same arithmetic in the same order, and section stream holds 108 of 108 faces equal to main at f78037dc.
  The comment on `CM_BOOK_TAKER` says the taker rule is for a rival's matches against other clubs: in its
  match against me the book credits the report's own lines.
- THE HARNESS ITSELF: it removes its temp folder on exit; a fleet that no longer plays leagues of 15, 18,
  20 and 24 clubs and both ledger cases exits 2 and names the arm; the season three join tries twelve seeds
  and exits 2 (cannot run), where it failed section doors, when none reaches the letter.
- `scripts/simCmVar.mjs`: see the table above. The Round 1081 manifest pin was taken again for the engine
  edit (0fc7b35a), with the proof on a runner first (`r1229-fx6`).

Measured again on the fleet as it is now (27 careers full, 5 default; `r1229-fx4`, `r1229-fx5`, at
332c8ce7): ten fleets green, the 38 game top scorer means unchanged to the hundredth (28.75, 28.80, 28.52,
28.77, 29.35), the rise of forwards in the top ten 3.74 to 4.15 (full) and 3.20 to 3.90 (default) against
0.00 to minus 0.60 under `twoman`, and every one of the 21 controls FIRED for its own section and no other.
The new league on the boards: MLS Eastern Conference, 28 games, top scorer mean 20.3 over six seasons with
the taker (15.8 by the weight, 20.5 on the old race), leading keeper's clean sheets 12.2. No real number
was looked up for it: it is printed, never gated.

## What a later session must not trust

- A BOOK'S STAMP SAYS WHICH SEASON IT BELONGS TO, NEVER HOW MUCH OF THE SEASON IT HAS SEEN (both reviewers).
  An engine from before this round carries `leagueBook` through its JSON clone and writes nothing into it.
  So a save played for some weeks on an older bundle (a tab left open across the deploy, a second device
  with a cached build, a rollback of the published site) comes back with a valid stamp and rows that are
  weeks short of the table, and `liveBook` and `readBook` both accept it. Measured (`r1229-run-s`): after
  three entries on the base engine an Arsenal save read "readable" with 16 rival clubs whose rows no longer
  added up and 44 goals on no line; a Bayern Munich one 14 clubs and 39 goals; and it stays short for the
  season. Nothing reads the book in this round, so nobody sees it. THE ROUND THAT READS THE BOOK MUST hold
  the first law against `state.table` for every rival (rows + own goals + unnamed = goals for) in its
  reader and read a book that fails as no book, which falls back to the old race exactly as a hot seat
  handover does. "A rollback is five lines" is true of the code and not of the saves written in between.

- A read of a save on a copy of the engine that last touched ANOTHER save. The engine keeps one save's
  league memberships registered at a time (`registerLeagueOverrides`, set by `startCareer`,
  `startNextSeason` and `loadCareer`). `leagueBookOf(state)` asks which league the club is in, so read on
  the wrong world it can answer for another league and the book, stamped by its league, reads as none.
  In the game there is one active save and the question never comes up; in a harness it did, on some seeds
  and not others, until the harness woke each save first (`wake` in `scripts/simCmLeagueBook.mjs`).
- "A week is one entry": `playNextEntry` can carry a save across two weeks in one call.
- The four other leagues' real top scorer means in the brief. Only the Premier League's were re-opened.
- The assist share over every club (0.601 to 0.610) as a defect: it is the rule (0.614) minus the goals of
  clubs with no eleven against me.

## Owed

- TO THE LEAD AT THE MERGE: this round BEFORE Round 1225, and `CM_FIXTURE_BASE` named as the commit just
  before Round 1225's merge, wherever its base groups, its fleet harness or their controls are part of a
  gate (see "Beside Round 1225 the remedy is the base"); the two conflicts Rounds 1218 and 1225 have with
  each other (the import lines of `src/lib/clubManager.ts`, the top of `ClubManagerHelp.tsx`); the Round
  1081 manifest pin again, last, after the three rounds are in the engine file; the three budget rows of
  `scripts/sweepWeight.mjs`; NOTHING for `scripts/simCmVar.mjs` or `scripts/simCmRealFixtures.mjs` on this
  branch (both carry their fix; do not run the block script on either); a ruling on clubs with no named
  eleven before Round B, and a sourced number a league before a keepers' board.
- TO ROUND B, FROM THE REVIEWS: the reader holds the first law against the table before it trusts a book
  (see "must not trust"); the facts file carries the second sources named in this file, each opened.
- TO ROUND B: the readers, the Stats card, the awards, the team of the season, What's New, the facts file
  with two receipts a fact, `simAwardRaces` re-pointed, the browser walk. A sentence for the other lane's
  guide (`src/data/gameContent/clubManagement.ts`) on the league leaders is owed THEN, not now: nothing a
  player can see changed in this round.
- TO THE ROUND THAT STORES A SEED: the assist share (0.7 against a real 0.69 of credited goals on one page
  means about 0.61 as the engine counts it), and retiring the old race and its draws.
