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
   (stamp, clubs, my men's league clean sheets by player id). Every roll is `keyedRng` on a key of the match
   and the goal. `liveBook` is the match week's cheap reader (stamp and types), `readBook` the full walk.
3. The binding in `src/lib/clubManager.ts` (one block under `creditRaceGoals`, and five one line hunks):
   `openLeagueBook` in `startCareer` and `startNextSeason`; `noteBookMine` beside my league match's
   `applyResult`; `noteBookResult` beside the two `creditRaceGoals` pairs (the week's close and my bye week).
   Exported for the round that reads it and for the harness: `leagueBookOf`, `leagueBookEleven`,
   `CM_BOOK_TAKER`. `CareerState.leagueBook?` sits after `resultLog?`.
4. `src/lib/managerHotSeat.ts` and `src/lib/deadlineDay.ts`: one `delete ...leagueBook` each, beside the
   strip of the fixture key Release AT put there.
5. `scripts/simCmLeagueBook.mjs`: seven sections, thirteen controls (its header says what each holds).
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
| `scripts/simCmVar.mjs` | `playNextEntry` on a fresh save against the engine at c33d0139 ("Default callers retain every prior report, stat, player credit and save byte") | NOT EDITED: Round 1218 rewrites this file. A block for the lead is proven on a runner (below) |
| `scripts/simCmRealFixtures.mjs` | fresh saves and played entries against the engine at 79c729cd | NOT EDITED: on the brief's must not touch list and rewritten by Round 1225, whose version takes its base from `CM_FIXTURE_BASE` and so pins nothing by default |

THE BLOCK FOR THE LEAD (not committed anywhere in the repo; it is in the closing report and at
`C:/Users/antho/dukb-handoff/2026-10-10/results-g/patchSaveCompare-1229.mjs`): fourteen lines under
`import assert from 'node:assert/strict';` that wrap `assert.deepEqual` so a save, or a play result holding
one, is compared without its `leagueBook`. `node patchSaveCompare-1229.mjs scripts/simCmVar.mjs` inserts it.

So on THIS BRANCH ALONE two harnesses are red and stay red until the lead acts: `simCmVar` and
`simCmRealFixtures`. Both are red for one reason, the new field, and both are green with the block in.

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

### 2. Who scores

Of 33,081 to 33,888 credited rival goals a seed set: forwards and wingers 55.3 to 55.7 in a hundred,
midfielders 34.4 to 34.9, defenders 9.6 to 10.1, keepers none. The one top division page the scout found
(2012-13, strikers 47, midfielders 37, defenders 11, own goals 5) counts own goals in and wingers as
midfielders; it is one source and gates nothing. What gates is that the deal follows the engine's own
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

The old race named two men for every one of those clubs (it reads the roster, not the eleven). So a Goals
board read from the book in the 2. Bundesliga would show two rival clubs, my own men and whoever scored
against me. This is not a defect of the round (the Match Centre draws unlabelled dots for the same clubs
today, and the rule was the lead's), but Round B cannot ship a leaders card for those leagues on it as it
stands. The choices, none taken here: deal a thin club's goals over the men its roster does hold (they are
real names, but their totals would then carry the goals of men the data does not have); keep the old race
as the board of a league under some share of named clubs; or fill the rosters (data work, proposal P4).

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
  and full fleets, five seed sets each, thirteen controls. Its header's MEASURED block has the z values.
- THE VIDEO REFEREE ON: the law held over 268 to 277 entries a fleet, 162 to 183 reviews in 228 league
  matches of mine, no report whose lines did not add up to its score.
- THE DIGEST OF `simCmLeagueRules`: `r1229-rules`, two legs, in that harness's header.
- THE WHOLE VITEST SUITE: 403 files passed, 2 skipped, 5,732 tests passed (`r1229-h1`, at 1acb1aab).
- EVERY HARNESS THAT LOADS THE ENGINE: 118 on a runner (`r1229-sweep`, then `r1229-sw00` to `r1229-sw04`).
- A ROUTE SWEEP in Chromium at three viewports, 183 routes, 549 checks, 0 findings (`r1229-w1`).
- THE MERGES: this branch with each of r1218-cm-var-true, r1225-cm-fixtures-bind and r1216-own-goal-motion
  ALONE merges with no conflict; the type gate is at zero and this round's harness is green on each
  (`r1229-m2`). All three together conflict, between Rounds 1218 and 1225 (their import lines 3 and 4 of
  `clubManager.ts`, and `ClubManagerHelp.tsx`), in no line this round touches (`r1229-m1`).

## What a later session must not trust

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

- TO THE LEAD AT THE MERGE: the Round 1081 manifest pin again (three rounds edit the engine file); the
  three budget rows of `scripts/sweepWeight.mjs`; the block for `scripts/simCmVar.mjs` (and for
  `scripts/simCmRealFixtures.mjs` only if it is run with a base older than this round); a ruling on clubs
  with no named eleven before Round B.
- TO ROUND B: the readers, the Stats card, the awards, the team of the season, What's New, the facts file
  with two receipts a fact, `simAwardRaces` re-pointed, the browser walk. A sentence for the other lane's
  guide (`src/data/gameContent/clubManagement.ts`) on the league leaders is owed THEN, not now: nothing a
  player can see changed in this round.
- TO THE ROUND THAT STORES A SEED: the assist share (0.7 against a real 0.69 of credited goals on one page
  means about 0.61 as the engine counts it), and retiring the old race and its draws.
