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

## Not done here, and owed to Round 1309

See the closing report (C:/Users/antho/dukb-handoff/2026-10-10/results-g/finish-1308.md) for the props the board
must hand the card and the rest.
