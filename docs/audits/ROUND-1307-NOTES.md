# Round 1307 notes: the NFL front office's Game Day tile and Watch

Written 2026-10-12 by the builder (desktop Claude lane, session G). The full closing report, with every runner
result name, is C:/Users/antho/dukb-handoff/2026-10-10/results-g/finish-1307.md on the owner's PC. This file is what
a later session needs from inside the repo.

## What the round is

Round 1305 made the NFL front office tell every score as a football score and keep his club's games in the save
(`gameLog`). This round puts them on screen. The week box has a tile for his game (the final, a line score by
quarter, the shape of the game in a sentence, the plays that decided it, his seed as it stands, his season as
chips) and a Watch button that plays the same press with his game on the Season Center's match clock first.

## Where things live

- src/lib/gmGameDayView.ts: every word and number on the tile, sport free, no React. Unit test beside it.
- src/lib/gmGameLog.ts: `GM_GAME_DAY_BOX` (the tile's box, one height a breakpoint) and `GmGameDayMount` (what a
  board hands its tile). They are here because a board needs them before the card's chunk lands.
- src/components/front-office-shared/GmGameDayCard.tsx: the shared card. One box, three faces, one scroller.
- src/components/front-office/NflGameDay.tsx: the NFL's bound card; the board reaches it by a lazy import only.
- src/components/front-office/FrontOfficeBoard.tsx: the watch state (`held`, `hold`), the five readers that read
  `hold ?? league`, the Watch button, the tile's box, the reveal wrapper, the help host. `playWeek` is untouched.
- Tests: FrontOfficeTile.test.tsx (the real board), GmGameDayCard.test.tsx, gmGameDayView.test.ts.
- scripts/playFrontOfficeGameDay.mjs: the browser walk at 320, 390 and 1280, with three controls.
- scripts/controlFrontOfficeBoard.mjs: four more controls (recordspoils, gridspoils, holdkept, tilenolog).
- scripts/simGmGameDay.mjs section 6: the mount list holds the three new files.

## Rules a later round must keep

1. WATCH IS THE SAME PRESS. The watch state is one piece of React state on the board (`held`, the league before
   the press). It is never saved. A watched week leaves the same save as a played week, byte for byte.
2. NO SPOILER. While `hold` is set the Week chip, the Record chip, the owner card's pace, the matchup sentence and
   the Play label read the league before the press, the league grid is not drawn, both buttons are shut, and the
   card draws nothing of the result. Anything new on the page that reads the league must read `seen`.
3. THE BOARD OWNS THE TILE'S BOX. The card is `h-full` inside it. Inside the card only `data-gameday-scroll` (the
   story) scrolls up and down and only `data-gameday-chips` scrolls sideways. A new line on the result face goes
   inside the scroller or the walk's point 8 goes red.
4. THE TILE PRINTS NO RECORD. A log can begin in the middle of a season, so chips say their own week and score
   and nothing counts them.
5. THE STANDING LINE is the engine's own seeding (`conferenceSeeds`): his seed, or outside the seeds. It says
   nothing about who goes through.
6. A lazy part is made at module level, and no board imports the card, the view lib or a story law statically
   (simGmGameDay section 6 reads the syntax tree).
7. The "?" sheet is the Season Center's, not edited. It is put in an empty element at the end of the week box
   (`data-gameday-help-host`, no margin) so it lies over the whole box and takes none of the box's spacing.

## Owed, not done here

- The other three front offices (NBA, MLB, NHL) mount the same card with their own law: later rounds.
- Week 17 has no Watch: its press goes to the recap. The bracket round gives the postseason its own presses.
- The hub's "last result" still reads React state and is empty after a reload (one line from the log).
- The standing line does not say whether he moved up or down: that needs his seed before the press.
- The /front-office guide (src/data/gameContent/football.ts, the other lane's file) could say there is a Game Day
  tile and a Watch button now. No guide sentence was made false.
