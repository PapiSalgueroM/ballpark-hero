# Game health notes from the Round 48 content sweep (2026-08-12)

While writing the on-page guides, every game's page/hook/lib was read closely. These
are the real issues that turned up. None are fixed yet; they are ranked for future
rounds. Guides were written to describe actual behavior, so nothing below is
misdescribed on the live pages.

## P1: registry daily flags that are not real

- All four Conquest games (`/conquest`, `/conquest-nba`, `/conquest-mlb`, `/conquest-nhl`)
  are `daily: true` in gameRegistry.ts, but the Imperialism boards have no date seed,
  no daily lock, and a "New season" reset; pairings are pure Math.random. Either build
  a real shared daily map or drop the flags. Guides make no daily claims for them.
- `/nfl-career` daily seeds from the browser's LOCAL date (not getTodayET) and has no
  localStorage persistence: refresh = replay the same daily, and timezones disagree
  on which player is "today's".

## P2: daily timezone drift (house rule is getTodayET everywhere)

UTC or local-time seeds instead of ET, so these dailies flip at odd hours vs the rest
of the site: `usePerfectLineupGeneric` (Perfect Lineup NBA/NHL/F1, also no lock),
`useCbbProgram` (Guess The CBB Program, also no persistence), `useGuessTheNation`,
`useHofOrBust`, `useScorePredictor`, `getDailyGuessTheYearPuzzle` (local-time day
count, fully replayable, 50-puzzle pool repeats).

## P2: daily replay holes

- NBA Grid, MLB Grid, Hockey Grid: filled daily cells persist to localStorage but the
  daily wrong-guess count does not. Reload mid-daily = fresh guess budget with the
  board intact.

## P3: scoring/display disagreements

- Baseball Career Path: board shows 100 pts at the final clue but the hook awards 0.
- Guess The Nation: hint button says "-100 pts" but the real drop varies (e.g. 150).
- Missing Five / Missing Nine: the level-3 hint (surname letter count) is unreachable,
  the game ends at 3 misses first.
- Olympics: TOTAL_CLUES = 7 but only 6 clue types render; revealing clue 7 costs score
  and shows nothing.
- Baseball Connections: on a loss, auto-revealed groups get appended to solvedGroups,
  so the share line says 4/4 groups even when you found 1.
- CBB program board: a 50ms setTimeout reads stale state, so the "wrong guess" flash
  can fire on a winning guess.
- HockeyGrid's own help copy says "9 guesses total" but only wrong answers are charged.

## P3: content/data

- collegeGridPuzzles.ts has only 15 puzzles; the date-modulo daily repeats every 15 days.
- Sports Millionaire: the ballon_dor question type never generates for anon players
  (RLS has no public SELECT policy; the fix migration is written in a comment in
  triviaQuestionBank.ts).
- Mystery Box: if the pool fetch fails entirely, the page renders an empty shell with
  no error message (empty if-block in MysteryBoxBoard.tsx ~lines 42-44).
- Football/College Grid: the first-ever pick for a cell scores as rarity 101 (shown),
  capped to 100 in the score, so a true unicorn answer scores worst-possible.

## Cosmetic / cleanup

- PerfectSeasonNfl/Nba pass a boolean expression in a useEffect dependency array.
- Stale comments: cfbDynasty.ts says "40-program subset" (44 in the array);
  cbbDynasty.ts says Cinderella is seed 5+ (code requires 10+).
- GuessTheCollege shows the Easy/Hard toggle in daily mode where it does nothing.
- NhlMyCareerBoard imports legacy type alias names from nhlMyCareer; compiles fine
  today but worth normalizing next time that file is touched.
- Old GameSeoContent howToPlay/examples props are now dead weight at ~117 call sites
  (superseded by src/data/gameContent); safe to strip gradually whenever pages are
  edited for other reasons.
