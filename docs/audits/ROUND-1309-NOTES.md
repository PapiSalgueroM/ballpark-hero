# Round 1309: the NFL front office's playoffs, a round at a time on the Game Day box (GM Game Day R4)

Branch `r1309-gm-postseason`, based on `origin/r1308-gm-bracket-libs` (f2c48bb5, which holds Release AY, main
48cb9d4b), with Round 1308's fix pass merged in (bb051ee0). Round 1308's files are not edited here.

## What a player sees

- Week 17 has three buttons, in this order: "Play Week 17" (plays the week, freezes the fourteen seeds the way the
  engine seeds them, opens the year's bracket and moves the league to Week 18, the engine's own "18 = playoffs"),
  "Watch Week 17" (the same press, his game on the clock) and the old "Play the final week + playoffs", in outline,
  word for word, playing exactly what it always played. Stacked under sm, three a row from sm up at one height.
- In the bracket: "Play the <round>" (his tie's round from the bracket data when he plays in it, else "Play the next
  round"), "Watch your game" only when his club plays in the round, and "Sim the rest of the playoffs".
- ONE BOX, TWO FACES. The Game Day box shows the bracket card (NflBracket, a lazy part made at module level), or his
  game on the tile when a press logged one of his games or he opened one ("Your game" on a decided tie of his opens
  THAT game: the tile is handed the log up to it). A row under the box holds the back chip ("The bracket") on both
  faces, so the box never moves when the face changes. No league grid and no standing line in the bracket.
- Watch in the bracket keeps Round 1307's rules: the same press (the save is the played round's, byte for byte), the
  page as it stood before the press until full time (the bracket is held beside the league, so the round's name, the
  matchup line and the buttons read the round before; every press and the back chip are shut; the bracket card and
  its place line are not drawn), and the title game's recap waits for full time.
- Every reader of Week 18 reads the playoffs: the chip says "Playoffs", the week box names his round or says "No
  game for you this round. The playoffs play on.", a hurt man is "(out for the playoffs)" on the roster and the depth
  chart, the roster limit's men go "before the next round", the old button is gone, and the hub's play box keeps its
  title and its value "Postseason" with his last result (read from the log on every period, which also ends the
  empty box after a reload owed since Round 1305) while the standings box says "The regular season is over." and
  does not pulse (src/lib/foHub.ts, one branch past the last period; `playWord` unchanged).
- Trades are shut while the bracket is open for every GM: with the desk on the deadline's own line refuses first
  (Week 18 is past it), with it off "Trades are shut for the playoffs. Deals open again once the season is over."
  (inside `deadlineBlock`, `nflDeadlineRefusal(league)` kept).
- Round 1307's final week note ("No Watch on this one...") is gone: Week 17 has Watch now and the tile's own line is
  true again. `nextNote` stays on the mount.

## The save

- `playoffs` (a `GmBracketSave`, `v: 1`) rides every save while the bracket is open (persist reads a ref) and is
  absent otherwise. The validator (src/lib/frontOfficeSave.ts line 36 only) accepts a hub save at Week 18 only with
  the key. The load asks first and repairs second (`loadGmPostseason`): a sound bracket comes back as it is and
  nothing is drawn on the way; one that does not read is started again unplayed with its feed line, and the log
  keeps its regular season and drops its playoff games in the same load (ruling 2g); a hub save past the last week
  with nothing to play (a champion already, no key, or a block the loader refuses) opens on the save error screen
  with its delete button (ruling 2k). `start` and `reset` clear the bracket, `ask` and the watch (correction 23).
- The save keeper: PART_VERSIONS '/front-office' gains `['playoffs', 'v']` (current 1, other 'absent', reader
  loadGmPostseason) and scripts/lib/realSaves.mjs a fixture in the bracket after one round (seeds that are 3 in 4),
  control `partplayoffs`.

## The reveal (ruling 2a), and what was measured

The ruling moves the reveal's element from sm up to a wrapper that starts at the button row. Measured on
r1309-d-walk (83bb51af) at 1280 by 800: after the first press of a visit the first button's top was at 410 and the
box ran from 478 to 830 of 800, because the hook (src/hooks/useRevealScroll.ts, not edited) counts an element whose
top is on the screen with 160 px of it showing as readable, and scrolls nothing. 1280 by 900 passed. So the round
meets the ruling's proof by an equal means: from sm up the element is the box's bottom edge (one pixel laid over the
box, no layout of its own) with `block: 'end'`, so a box whose bottom is off the screen is brought to the screen's
bottom, and the buttons and the box (420 px together) are then on it; under sm the element is the box's wrapper,
top aligned, as shipped. The width the page LOADED at decides (no live breakpoint), so a resize across sm changes no
key and no option and scrolls nothing (walk point 12 holds it at 1280).
The edge sits on the box's bottom border (`-bottom-px`): laid inside the border the first try left the border's last
pixel one past the screen (box 449 to 801 of 800, r1309-d2-walk).

## The bracket path is the one press path

`playPlayoffs` and `closeSeason` sit ABOVE `playWeek` (scripts/simNflGmDesk.mjs reads playWeek as the text up to the
next component level const) and are reached only through `playWeek`, below its mark and its guards (two keys, one
lock: the bracket AND the week past 17). Every playoff game is played by `nflPlayTie` with the edges the desk gives,
so "Play Week 17" then four round presses, and "Play Week 17" then "Sim the rest" (after none, one, two or three
rounds), leave the one press save string for string after the same number of draws, over the twelve cases of
FrontOfficeOnePress.test.tsx (both league kinds, the desk off and on, an ordinary season, a title, a firing):
src/components/front-office/FrontOfficePostseason.test.tsx. The one press digests are untouched and green.

## Controls (each proven on a runner; scripts/controlFrontOfficeBoard.mjs unless said)

noplayoffs, abandonbracket, rebuiltkeeps, champopen (b1); bracketnoedges (red on the desk on TITLE cases: the desk's
edges are his club's alone, so only a season where he plays in the bracket can show a told score move; the ordinary
and fired cases stayed green under it), restround (b2); weekeighteen, playofftrades, simFoHub `nopost`,
simSaveKeeper `partplayoffs` (b3); roundspoils, holdround, recapnow, bracketgrid, tiegame (c); the walk's
bracketjump, playoffspoil, lostblock and revealdown (d; revealdown is a board mutation built again on its runner).
`blank` does not fire, as it must not.

## Weight (brief section 6; the budget is the lead's)

Measured on r1309-weight (a2440ca5) against the base bb051ee0, both built and served on the runner: /front-office
369.1K against 364.2K (+4.9K; budget 366, so sweepWeight is red by 3K until the lead sets it). The board's chunk
FrontOffice.js grew 4,343 bytes gzipped (31,908 to 36,251: the bracket machine, the NFL's bracket data, the press and
load half of the postseason and the board's own lines) and the shared finalsBracket chunk (577 bytes) is now asked
for on the route; every other difference is a few bytes of hash noise. /nfl-my-career is 483.4K on both. The bracket
card, its help words and the ledger's week names are one lazy chunk, NflBracket (9,836 bytes raw), asked for only
when the week box opens in the playoffs.
