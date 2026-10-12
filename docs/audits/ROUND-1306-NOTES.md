# Round 1306 notes: Club Manager, the league book made whole enough to read (Round B1)

Branch `r1306-cm-league-book-b1`, base `origin/release-aw-int` (started at 8d3f54c6, merged again at c9a1f86a;
no Club Manager file differs between the two). Written by the builders, 2026-10-11. This is ROUND B1 of the two
the critic cut the scout's draft into: the book is made whole enough to READ. Nothing reads it for a screen
yet, so the site looks exactly as it did and there is no What's New entry. Round B2 (the boards, the awards,
the walk, What's New) starts when the lead has ruled on the numbers in the closing report.

## What shipped, in the order it was built

1. STEP (a), the measuring mode. `BOOK_MEASURE=leagues node scripts/simCmLeagueBook.mjs` plays every league of
   every era for one season (47 leagues: 27 of today and 5 an era for 4 eras) on three arms that share one
   match stream (the rule before the round, the rule, the literal reading) and prints a line a league. It gates
   nothing. Since step (d) it also says how many careers ended their season on a whole book that adds up.
2. STEP (b), thin clubs. `partialEleven(roster, strength, lineOf)` in `src/lib/clubManagerLeagueBook.ts`: a club
   that cannot field a named eleven is dealt over the men its roster has, in the places a full eleven would
   give them (four DEF, four MID, two ATT, then the best men left), with an EMPTY SHIRT (`BookMan.e`) at the
   club's strength in every outfield place it cannot fill. A shirt is never given a row: `rowOf` refuses it, so
   its goals stay unnamed, its assists are dropped and it keeps no clean sheet. The grouping is handed in (the
   engine passes `groupOf`), so the pure module still imports nothing of the engine. In the engine:
   `thinBookEleven`, `thinBacks`, `noteBookSide` (the roster is asked for once) and the clean sheet a thin
   club keeps against me in `noteBookMine`. A club with an eleven is not routed through any of it.
3. STEP (c), who is given a rival's assist. Harness section shapes (v), the control `assistgoalweight`, and a
   unit witness in `src/lib/clubManagerLeagueBook.test.ts`. No engine edit.
4. STEP (e), the pure reader. NEW `src/lib/clubManagerLeagueBoards.ts` and its test file: `leaders` (goals,
   assists, clean sheets for keepers only), `bestOfMine`, `bookShare`, `keepersOnRecord`, `bookIsWhole`, and
   `bookFits` handed on from the book module. The late book's three optional fields (`r0`, `b`, `u0`),
   `openLateBook`, and `readBook` accepting exactly those shapes. NOTHING IN src CALLS THE READER YET: it is
   not in any page's bundle. Not built, by the lead's decision: `teamOfSeason`, `seasonAwards`,
   `leagueBoardsOf`.
5. STEP (d), the repair, last. `ensureLeagueBook` in `src/lib/clubManager.ts`, called once at the top of
   `playNextEntry` after `ensureIntl`; the `noBook` option; `src/lib/managerHotSeat.ts` passes it at its three
   calls of `playNextEntry`; the two comments that said "a whole season or nothing" say the new rule.

## The one rule for a book that cannot be verified

The engine treats a book it cannot verify as ABSENT. Verify means the careful reader accepts it (`readBook`:
the stamp, every club entry, every row, the three late fields) AND the first law holds for every rival club
against the table (`bookFits`). A book that fails either is replaced at the top of the next match week:
- by nothing when no league match is left this season (the summer opens a whole book);
- by an ordinary whole book when no league match of the season has been played (every table row on no match);
- otherwise by a LATE book (`openLateBook`): every rival club's goals so far counted unnamed, the round it
  starts at in `r0`, my men's league goals and assists at that moment in `b`, the unnamed sum in `u0`.
The week never throws on any damage. No award may be read from a late book (Round B2 holds that).
ONE DEVIATION from the critic's words, on purpose: correction 11 says a book opened "when no rival has a goal
for and none of my men has a league line" is whole. Built: "when no league match has been played". After a
goalless first round nobody has a goal, but clean sheets were kept and a book called whole would miss them.

## The hunks, for the merge with other rounds

| file | where (by function) | what |
|---|---|---|
| src/lib/clubManager.ts | the book module's import | five more names |
| | the comment block above `CM_BOOK_TAKER` | the third promise rewritten |
| | under `openLeagueBook` | `ensureLeagueBook` (new, 32 lines) |
| | under `bookNamed` | `thinBookEleven`, `thinBacks` (new) |
| | `noteBookSide` | the roster read once, the thin branch |
| | `noteBookMine`, the clean sheet line | a thin club's clean sheet against me |
| | `CareerState.leagueBook` | its comment |
| | `playNextEntry` | `noBook?: boolean` on the signature, one call of `ensureLeagueBook` after `ensureIntl` |
| src/lib/managerHotSeat.ts | `skipToMatch`, `startOnStaticWorld`, `playOnStaticWorld` | `noBook: true` at each call, one comment |
The signature line of `playNextEntry` is the one Release AW also edits (`varReviews?: CmVarAsk`): both are in.

## Pins that follow the engine file (each in its own commit, in the same push as its step)

- `scripts/fixtures/managerAppealIsolation1081/manifest.json`, the sha256 of `src/lib/clubManager.ts`: taken
  after step (b) (083d112f) and after step (d) (449361a1). THE LEAD TAKES IT AGAIN AT THE MERGE if another
  round's edit of the engine file lands beside this one.
- `scripts/data/cmLeagueRulesDigest.json`: taken again after step (b) (ca421497), by the attribution legs its
  harness prescribes: with the old rule patched in, the digest as it stood is green; with the rule, 40 of the
  47 saves move (the ones whose league holds a club with no named eleven). Step (d) does NOT move it.

## What is proven, and on which remote check

Everything heavy ran on GitHub runners; a result is read with
`git show origin/rc-results/<name>:summary.txt` and a log with `...:logs/<label>.log`.

- `r1306-f1`, head ecb69867 (every src file and every harness of the round as shipped, after the merge of
  release-aw-int at c9a1f86a), 58 lines, all as they must be: the type gate exit 0; the two unit files exit 0;
  `scripts/simCmLeagueBook.mjs` green on ten fleets (default and full, seed sets 0 to 4), nine sections, the two
  of seed set 0 with `BOOK_BASE` at c9a1f86a: 108 of 108 faces equal to the engine with the book out and to the
  base commit's source, 671 of 671 entries of clubs with an eleven byte equal to the base's; ALL 35 CONTROLS
  FIRED on seed set 0, each for its own section and no other but the ones its line names. That is the run that
  fired mathrandom (stream, with oldsave and dailies), dropmine (law, with names, oldsave, doors, thin, boards
  and shapes) and byeweek (law, with thin, boards and oldsave) again after their lists were derived again.
  `simDailyDeals` green and both its controls fired; `simManagerHotSeat`, `simDeadlineDay`,
  `simManagerAppealIsolation`, `simHarnessAnchors`, `simNoRivalNames`, `simNoInventedQuotes`, `simLiveScores`,
  `simStorageWrites` exit 0.
- `r1306-f1r`, head ecb69867: a plain build exit 0; `simCmLeagueRules` exit 0 with the digest of step (b);
  `simClubManagerSaveSize` green on six streams and `SAVE_SIZE_CONTROL=uncapped` fired (33 failures, section 1
  only); the whole unit suite exit 0 (459 files passed, 2 skipped; 6,999 tests passed, 58 skipped).
- `r1306-m2`, head 5f1313aa (the harness's measuring mode gained one printed line; nothing else moved): the
  two fleets of seed set 0 green again with the base, the fences green, and THE REPAIR OVER EVERY LEAGUE: with
  two careers a league 94 of 94, and with four 188 of 188, ended their season on a whole book that adds up to
  the table (late 0, whole and not adding up 0). The fleet holds the first law in eight leagues; this line
  says no other league's split, play-off round or conference breaks it, so the repair reopens no healthy book.
- `r1306-basered`, head ecb69867 against the base c9a1f86a: the ten sweep reds below that are not the
  environment's are red on the base with the same exit code, the same last line and the same FAIL lines.
- `r1306-sweep2`, head 449361a1 (step (d); no file a sweep harness reads differs on the final head): 125
  harnesses that load the Club Manager engine, the book or the Hot Seat. 114 exit 0. The 11 that do not, and
  the one that asks the live database, are the same twelve with the same last lines as on `r1306-sweep1` from
  BEFORE step (d), none reads the book, and the closing report says how each stands on the base.
- The numbers behind every floor and gate of the harness are in its own MEASURED block; the tables for the
  lead's rulings (the share on record of all 47 leagues, the assists by line, the boards of three leagues, the
  save's bytes, the three weight rows) are in the closing report.

## What a later session must not trust

- The number of leagues is 47, not the 49 of the brief (the engine's own lists, and simCmLeagueRules' header).
- A harness wall time is not a measure of the fit check: the harness grew sections in the same step. The
  fit check's cost is read off the harness's own "book's own cost" line and is inside its noise.
- `BOOK_BASE` must be a tree whose engine is the base's. The base keeps a book itself (Round 1229), so the
  saves "with no book" of section oldsave are written by the engine with the book's lines out.
- A sweep red is not this round's until the base is green on it: see the closing report for the TEN
  harnesses that are red on the base the same way. (The sweep itself showed twelve reds: those ten, one that
  asks the live database, and `simBracketMoment`, which was red only because that request had no Chromium and
  is green on head and base in `r1306-basered`. An earlier draft of this line said eleven.)
- THE TAKER ON A TIE. `takerOf` breaks a tie of weight by the name as plain text, and an empty shirt is named
  `?1`, `?2`, which sorts before any name that starts with a letter. So in a thin club a named striker rated
  exactly the club's rounded strength, standing beside a striker's shirt, loses the penalties and direct free
  kicks (12 in a hundred of the club's goals against other clubs) to the shirt, and they are counted unnamed.
  That is the conservative side (nothing is invented, a real man is given less, never more) and the harness's
  own copy of the rule reads it the same way (`thinNamedShare`), but it is a choice nobody ruled on.

## The fix pass after the two adversarial reviews (2026-10-11)

Both reviews said SHIP with no major finding and thirteen minors between them. The fix pass changed NO
behaviour of the engine: one harness, three comments, one pin and these notes.

- `scripts/simCmLeagueBook.mjs` gained four checks and six controls, each control proven to fire for its own
  check (the result names are in the fix pass's closing report, results-g/fix-1306.md):
  - thin (vi), WHO is given a clean sheet (a reviewer's mutation, the filter for the back line dropped, passed
    every gate). In every single match of a club with no eleven its rostered keeper and each named man of its
    partial eleven's back line gain one clean sheet when it conceded nothing, and no other row gains any; and
    at each season's end, for every club, only a keeper's row and a row of the back line hold a clean sheet,
    and no defender holds more than his club can have kept by the table. Controls `thinbacks`, `nobacks`,
    `allbacks`. These rows go into every save and cannot be rebuilt, and Round B2's team of the season splits
    its back four on them.
  - thin (vii), one way to take an eleven. `partialEleven` retypes the take lines of `pickOppSquad`, and the
    harness types them a third time. Now, at every season's end, the module's partial eleven of a roster that
    fields an eleven IS the engine's eleven (the same keeper, the same ten, no shirt), and of a roster that
    does not it is the harness's own reading man for man and shirt for shirt. Control `places433`. Whoever
    changes how an eleven is taken (PR224 touches the rosters) meets this check.
  - thin (iii) fails when there is no variance to judge a share on, where it passed unasked.
  - oldsave (i), a sixth save: the parked one with a goalless first round written into its table must get a
    LATE book. This holds the one deviation named above (a league MATCH played, not a goal scored). Control
    `goallesswhole`. If the lead rules for the critic's wording instead, this save and its control go.
  - oldsave (vi), with `BOOK_BASE`: three seasons in play written by the base commit WITH its book are
    carried on by the candidate to the season's end: the book is taken as it is, the law holds after every
    entry, it is never reopened late, and the rows of clubs with no eleven grow. Control `stampv2`.
- The header of that harness now carries the video referee arm's count as it reads today (19 to 39 reviews a
  full fleet, 2 to 10 a default one, against Round 1229's 162 to 183). The move is the base's (Round 1303) and
  the arm's floor is still "not zero": owed to the lead or to Round 1303's owner.
- Comments only: `leagueBookEleven` says it is the harness's door now (nothing in src calls it);
  `BOOK_FULL_SHARE` says it is not bound and why; `BoardMine` says which fields nothing reads yet.
- The Round 1081 pin of `src/lib/clubManager.ts` follows that one comment (c9a3d32e to 9e8c499d), in its own
  commit. `scripts/data/cmLeagueRulesDigest.json` did not move: nothing a save holds changed.

## The second fix pass (2026-10-11, after the closing check)

The closing check found no red and listed seven things still open. This pass closed what a fixer can close
without ruling for the lead and without touching the engine: one harness, two new recordings, one unread
constant, comments in two unit files. `src/lib/clubManager.ts` is untouched, so no pin and no digest moved.

- THE VIDEO REFEREE ARM of section law (`scripts/simCmLeagueBook.mjs`). It was the first two "now" careers
  of whichever fleet ran, so the default fleet, the gate's own line, played Everton and Southampton (a league
  with no video referee): 84 matches and 2 to 10 reviews since Round 1303, against a floor of "not zero". It
  is now `VAR_ARM`, Everton and Arsenal with three seeds each, on both fleets: the six seasons the full fleet
  always played there. Five seed sets read 19 33 35 39 34 reviews in 228 league matches of mine, on the full
  fleet before the change and on the default fleet after it. `VAR_REVIEW_FLOOR` is 11, six tenths of the
  lowest (the rule `ASSIST_FLOOR` follows). Control `novar` (the match is never told which reviews to play)
  reads none and turns section law red alone.
- OLDSAVE (vi), THE SAVE A PLAYER HOLDS ON THE DAY THIS SHIPS, no longer needs `BOOK_BASE`. Two saves of a
  season in play, written by the engine of the commit before the round (c9a1f86a; its engine files are those
  of Release AW as it went live, and a worktree of origin/main wrote the same bytes), are committed as
  `scripts/data/cmBookSaveHerthaFixture.json` (a league where seventeen rival clubs have no named eleven) and
  `scripts/data/cmBookSaveEvertonFixture.json` (a league where every club has one). Every run carries both on
  to the season's end: the old book is taken as it is, the law holds after every entry, it is never reopened
  late, and at Hertha BSC's rivals the goals on named rows grow. Each file is held by its sha256 in
  `BOOK_SAVES`; a file that is not the recording named there stops the run. A recording is taken again with
  `BOOK_BASE` and `BOOK_WRITE_SAVES=<folder>`, never edited. Control `stampv2` now fires on the default line
  too. With `BOOK_BASE` the three saves the base tree writes in the run are carried on as before.
- STILL A ROUND'S PROOF AND NOT THE GATE'S: thin (iv), the stream's base arm and the controls `weight` and
  `thinall` compare the candidate with the commit before the round ("what was not meant to change"). A gate
  line pinned to that commit would go red at the first later round that means to change the book, so they
  stay with `BOOK_BASE`, run by the round's own requests.
- `BOOK_FULL_SHARE` IS GONE from `src/lib/clubManagerLeagueBoards.ts`, with the unit line that pinned 95.
  Nothing read it. The number is not ruled: seven of 47 leagues sit within two points of 95 and the gaps'
  middles are 84 and 89. The comment where the constant stood holds the table; the round that draws the
  honest line adds the constant with the number the lead ruled.
- THE TWO UNIT FILES of the round say at their top what they do not hold: who the engine hands a clean sheet
  to, and when a save with no book gets a whole book or a late one. Both are the harness's.
- NOT CHANGED, on purpose: the wording of the one deviation named above (a league MATCH played, not a goal
  scored). A book opened after a goalless round would miss that round's clean sheets, so it is a late book.
- ONE OLDER CONTROL FOLLOWED THE RECORDINGS: `seasonstamp` (the season's number put back into the stamp)
  turns oldsave (vi) red together with doors now, for the reason `stampv2` does: under that stamp both
  committed recordings are another season's book and the reader refuses them. Its line names oldsave as a
  section that goes with it and the words its own failure in doors must hold ("has no readable book"). The
  first run after the recordings were wired read "did not fire" for it (remote check r1306-f2b), which is
  how this was found. The harness holds 42 controls.
- WHERE THE SECOND PASS IS PROVEN (remote checks, the logs are on the branches origin/rc-results/<name>):
  r1306-f2a (the video referee arm on five seed sets, control `novar`, the recordings written three times),
  r1306-f2b (thirteen fleets, all 42 controls, the fences), r1306-f2c (the type gate, the unit files, the
  harness with and without the base, `seasonstamp` and `stampv2` each with and without the base), r1306-f2d
  (the weight sweep on a served build: /club-manager 588.6K of 589, /manager-hot-seat 605.9K of 606,
  /deadline-day 616.0K of 616), r1306-f2e (more fences), and the release gate's own lists run whole on the
  head before the pass as r1306-gA, gB, gC, gH1, gH2, gH3 and gH4. The full account is the lead's file
  results-g/fix2-1306.md, which is not in the repo.
- WHAT A LATER SESSION MUST NOT TRUST: the two unit files for the engine's binding (they say so at their
  top); the weight rows having room (about half a kilobyte on /deadline-day); the number 95 (not ruled).
