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
- scripts/playFrontOfficeGameDay.mjs: the browser walk at 320, 390 and 1280, with seven controls (recordspoils,
  spoiler, tall, and from the fix pass noreveal, helpjump, pacespoils, seedoff).
- scripts/controlFrontOfficeBoard.mjs: six more controls (recordspoils, gridspoils, holdkept, tilenolog, and from
  the fix pass pacespoils and seedoff).
- scripts/simGmGameDay.mjs section 6: the mount list holds the three new files. Section 10 (the fix pass): every
  game of a log tells a story that section 2's checker adds up, from both sides.

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
   The clock stops while it is open (`paused={helpOpen}`).
8. A READER HELD AT A WATCH NEEDS ITS OWN CHECK. The review found two of the ruled readers right in the code and
   held by nothing: the owner card's pace and the seed handed to the standing line each had a one line
   regression that left every test and the walk green. Both are held now by a board test, a board control
   (pacespoils, seedoff) and the walk (points 9 and 10, on saves made for the case). A new reader gets the same.
9. PLAY AND WATCH HAVE ONE LAYOUT A WIDTH: stacked under sm, a row from sm up. Left to wrap, the row broke at
   Week 2 on a phone (a 2 is wider than a 1) and the tile moved as its result arrived.

## For the next binds (the NBA, MLB and NHL boards mount this card)

- A BOARD SETS `mode: 'watch'` ONLY FOR A PRESS THAT ADDED AN ENTRY TO THE LOG. The card opens the last entry of
  `log` and its key is the season and the log's length, so a watched press that logged nothing would run the
  game before it on the clock. The NFL cannot reach this (its law tells every game with a winner).
- THE MOUNT IS NFL SHAPED IN THREE PLACES: `next` is one fixture (a round of four to six games needs a list),
  and there is no `fresh` count and no `stars` line. All three can come as optional fields; `nextNote` (the
  line under the fixture when the tile's own would not be true, used on the NFL's final week) was added that way.
- THE PERIOD COUNT of a game that did not go past regulation is `law.periods.regulation`, and no test has a law
  with that field (the NFL's has none). The first sport with an extra period adds that case to
  src/lib/gmGameDayView.test.ts.
- IF THE CARD'S CHUNK NEVER LANDS after a Watch press, nothing lets the hold go and Play and Watch stay shut
  until he leaves the week box (the tab effect lets go). The week is saved, so nothing is lost; a timeout was
  judged not worth its weight.

## Owed, not done here

- The other three front offices (NBA, MLB, NHL) mount the same card with their own law: later rounds.
- Week 17 has no Watch: its press goes to the recap. The bracket round gives the postseason its own presses.
- The hub's "last result" still reads React state and is empty after a reload (one line from the log).
- The standing line does not say whether he moved up or down: that needs his seed before the press.
- The /front-office guide (src/data/gameContent/football.ts, the other lane's file) could say there is a Game Day
  tile and a Watch button now. No guide sentence was made false.
- A RULING OWED BY THE LEAD: on a desktop the first Play or Watch of a visit lands the tile at the top of the
  screen and leaves both buttons just above it (measured by the review at 1280 by 900: Play at minus 44). That is
  the reveal as ruled (the ref starts at the tile) and what the base did with the grid. The ref one element up
  would land the buttons at the top with the tile under them, at the price of a button row (two rows on a phone).
- Small things the review named and nobody changed: the clock's speed goes back to 1x at every press (the card
  is remounted by its key); the Watch button is disabled while it holds the focus, so a keyboard user's focus
  falls to the page for the length of the watch; the lazy fallback's "One moment" is 11 px (the shared
  GmPanelLoading, older than this round).
