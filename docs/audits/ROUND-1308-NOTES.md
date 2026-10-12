# Round 1308: the NFL front office's playoffs as libraries and a card (GM Game Day R3)

Branch `r1308-gm-bracket-libs`, based on `origin/release-ay-gate` (082b956a, Release AY's gate: Round 1307 alone).
Nothing a player sees changes in this round: no route imports any file it adds. Round 1309 puts the postseason on
the NFL board (the week box, the button row, the save key, the validator's line, the walks, What's New).

## What was built

New files only, plus two harnesses:

- `src/lib/gmPostseason.ts` (sport free, no React; static in a board's chunk from Round 1309): the sport's
  interface `GmPostseasonSport<L>`, `inGmPostseason`, `loadGmPostseason`, and the type `GmBracketMount` (what a
  board hands the card; a type only).
- `src/lib/frontOfficePostseason.ts` (the NFL's bind, no React): `NFL_POSTSEASON`, `nflPlayTie` with its sink,
  `nflRoundsOf`.
- `src/lib/gmBracketView.ts` (sport free; rides with the card, never static in a board): `gmBracketPlace` and its
  six lines (`GM_BRACKET_LINES`), `gmBracketWeeks`, `gmBracketRows`, `gmSideText`, `gmSeriesNote`, `gmSeedText`,
  `GM_BRACKET_UNKNOWN`, `GM_BRACKET_WORDS`.
- `src/components/front-office-shared/GmBracketCard.tsx` (the shared card) and
  `src/components/front-office/NflBracket.tsx` (bound: `NFL_BRACKET_HELP`, `nflSeedOf`, `nflWeekLabel`).
- Tests: `src/lib/gmPostseason.test.ts`, `src/lib/frontOfficePostseason.test.ts`, `src/lib/gmBracketView.test.ts`,
  `src/components/front-office-shared/GmBracketCard.test.tsx`, `src/test/gmBracketLedger.test.ts`.
- `scripts/simGmGameDay.mjs`: the new files join NEW_FILES (section 5's scan), ROUND_OF and the mount list of
  section 6 with their tests; the three card files also join STORY_FILES (no board may import them statically);
  sections 11, 12 and 13 with the controls `undo`, `keydrift`, `trust`, `keyrebuilt` and `logplayoff`.
- `scripts/simUsPostseason.mjs`: section G (the front office brackets are the ledger's) with the control `gmclubs`,
  and the bundle's four new exports.

## The rulings applied (brief section 1)

- The NFL's bind is a NEW file, not additions to `src/lib/frontOfficeGameDay.ts` (that file is in /front-office's
  static chunk since Round 1305).
- A playoff game's key: `nflPlayTie` plays `simGame` at week 0, takes the win and the loss back exactly as
  `runPlayoffs` does, then tells the game with `nflTell(g, teams, season, tie.round, edges)`. The data's round
  names are `runPlayoffs`' own, so the same game gets the same key on both paths. The sink: every told game is
  pushed in play order as its `GmLastGame`.
- `loadGmPostseason` never throws and reads nothing of an unknown version: outside the postseason it answers null
  whatever the block; inside, a block whose `v` is not 1 (or that throws when asked) goes to `repairGmBracket` as
  absent, so the rebuild is fresh from the engine's seeds. A season with no format answers
  `{ kind: 'refused', refused: 'no-format' }`; a league whose fresh seeds the repair throws on (or a sport whose
  `seeds` or `isClub` throws) answers `refused: 'no-bracket'`. The answer is tagged by `kind` ('bracket' or
  'refused'): the app's tsconfig has strictNullChecks off, where a null tag does not narrow (the type gate of
  r1308-b1 said so).
- `NFL_POSTSEASON.seedsOk` wants fourteen distinct clubs of this league, the AFC's seven first and the NFC's seven
  after (stricter than "one conference then the other": the data's round names say AFC for seeds 1 to 7).
- The card is a face of the board's box and holds no press button (decision 2c). Its controls: the week chips
  (viewing only), "Your game" on a decided tie of his (`onOpenGame(tieId)`), and the "?" through a portal into
  `helpHost`. A club's seed is the sport's to number (`seedOf`); the week names are the ledger's (`weekLabel`).
- The place line's six kinds: "You have the bye.", "Next: the AFC Divisional, against (the club's name)." (named only
  once `bracketPairings` names it, else "Next: the AFC Divisional."), "Through. The rest of this round is still to
  play.", "Out in the AFC Wild Card.", "Champions.", "No playoffs this year." None says who hosts or who goes
  through.

## Proof so far (GitHub runners)

- r1308-a (base 082b956a): simGmGameDay exit 0, 326 checks, 0 failed; all 26 controls exit 1, "RED AT THE NAMED
  CHECK". simUsPostseason exit 0, 26 checks, 0 failed, 0 findings; all 9 controls exit 1, fired.
- r1308-b1 (1a9e712c): vitest on five library files 55 passed; simGmGameDay 334 checks, 0 failed; mounted and
  static fired; simHarnessAnchors 0; simNoRivalNames 0 findings. tsc exit 2 (the null tag), fixed at d1c4b514.
- r1308-c1 (69699850): simGmGameDay exit 0, 414 checks, 0 failed; undo, keydrift, trust, keyrebuilt and
  logplayoff each exit 1 with "RED AT THE NAMED CHECK" and their clean lists held. Per seed set: 80 seasons;
  section 13's club seasons with a bye 72 to 82 and that went out 124 to 138; section 12 loaded 10 stops and
  rebuilt 52 damaged blocks.
- r1308-d1 (f1a88a56, the ledger tie): tsc exit 0; vitest on eight files (the new ones, gmBracket, gmGameLog,
  frontOfficeGameDay, usPostseasonFormat, usPlayoffs) 87 passed; simUsPostseason exit 0, 32 checks, 0 failed, 0
  findings; gmclubs and the nine older controls each exit 1, fired (gmclubs: the qualifiers red in 35 of 35
  seasons, and the title tie no longer the only cross tie); simGmGameDay 414 checks, 0 failed; mounted and static
  fired; simHarnessAnchors 0.
- r1308-e1 (df62a406, the card): tsc exit 0; vitest on the five new files 39 passed; vitest over
  src/components/front-office, src/components/front-office-shared and the five library and ledger files 24 files,
  280 passed; simGmGameDay 426 checks, 0 failed; mounted and static fired; simHarnessAnchors, simNoRivalNames,
  simInventedNames, simNoInventedQuotes, simNumberFormatting, simStorageWrites and simAccessibility exit 0.

- r1308-f-gates (882ece5f): tsc exit 0; the five new test files 41 passed; the front office folders and the
  library and ledger files 24 files, 282 passed; simGmGameDay 426 checks, 0 failed, and ALL 31 of its controls
  fired; simUsPostseason 32 checks, 0 failed, 0 findings, and ALL 10 of its controls fired; the seven source
  harnesses exit 0.
- r1308-f-weight (882ece5f against 082b956a, one runner, one command at a time): /front-office 364.2K over 36 files
  and /nfl-my-career 483.4K over 47 files on both trees, and the per chunk gzipped bytes of both routes identical.
  No NflBracket chunk is made: no route imports it.
- Merged origin/main at 21941630 (Release AY) as 5057f124; the merged tree's runs are in the closing report.

## The fix pass after the adversarial review (2026-10-12)

Two reviews (C:/Users/antho/dukb-handoff/2026-10-10/results-g/review-run-1308.md and review-read-1308.md) found
one major and ten minors. The fixer's report is results-g/fix-1308.md. Each fix is its own commit:
- babacc42, the major: sections 11 and 13 run again with the GM desk on. For each of section 9's four GM clubs a
  season his club gets the desk's strongest edge (+3) and the postseason is played the one press way (runPlayoffs
  and nflTell with the edges) and the bracket way (nflPlayTie with them) from the same generator. Control
  `noedges` (the edges dropped from nflPlayTie's game). Measured per seed set 0 to 4: the edge moved the
  postseason in 25, 30, 34, 26 and 38 of 320 club seasons (146 to 156 of them in the bracket); `noedges` breaks
  exactly those.
- 27e9718d: controls for the checks that had none: `inseason` (s12, outside the postseason the load is null),
  `byeplays` (s13, no entry in a week he has the bye) and `deskless` (the count of club seasons the edge moved).
- 8652ebc3: section 6 follows every chain of static imports under src from the four boards and from the press
  half (gmPostseason, frontOfficePostseason): 108 files reached, no story file. Control `storyleak`.
- 6c798103: simUsPostseason section G names a dangling tie id (it skipped it), control `dangling`.
- 5020f5b0, ab1cccde, 36ec4b8d: gmSeriesNote's comment; a club beaten in the title tie reads "Lost the Super
  Bowl."; the play in test holds the LAST tie a club beaten twice lost.
- ad50f2fa, 26cb235f: the card keeps a tapped week only on the same bracket (season and seeds), and brings the
  shown week's chip and his tie into its own scrollers' view on every face change (never the page). A walk of the
  card at 320, 390 and 1280 (r1308-fixwalk) reads 0 problems on the head and 24 with the card of f2c48bb5.

## Not done here, and owed to Round 1309

See the closing report (C:/Users/antho/dukb-handoff/2026-10-10/results-g/finish-1308.md) for the props the board
must hand the card and the rest.
