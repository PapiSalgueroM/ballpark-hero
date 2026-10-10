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
- NOT TAKEN: the full walk on load. `loadCareer` is on the must not touch list (Round 1225 inserts a
  function directly above it), so a book with one holed row is refused whole by the reader
  (`leagueBookOf`) but still written to in a match week. The engine never makes such a row.
