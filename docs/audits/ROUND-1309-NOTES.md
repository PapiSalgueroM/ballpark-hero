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
The edge sits inside the box's bottom border with a one pixel scroll margin (`scroll-mb-px`): laid inside the border with
no margin it left the border's pixel one past the screen (box 449 to 801 of 800, r1309-d2-walk), and laid ON the border
(`-bottom-px`, 78a19441) it made the box (overflow hidden, so a scroll container) scroll a pixel inside itself with the
same result (r1309-fin-w).

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

## Proof (GitHub runners; the closing report has every line)

On 90b64d7c: r1309-fin2-g (tsc 0, the front office vitest 0, simGmGameDay 462/0, the board controls' strings once,
simHarnessAnchors 0), r1309-fin2-w (the walk 367 checks 0 failed; bracketjump and playoffspoil red at point 14 alone,
lostblock at 15 alone), r1309-fin2-rd (revealdown red at 12 alone), r1309-fin2-pw (simResultMoment 0). On 78a19441
(less one className): r1309-fin-a (tsc 0, the whole vitest suite 0 with 7,370 tests, simGmGameDay's 37 controls all
fired, the harness list 0, the keeper's nine part controls fired, 20 of the 24 rule fences green and the other four
the live database or a missing dist), r1309-fin-c (all 35 board controls fired, blank did not), r1309-fin-w (the
other walks: the base's two playGmPress failures and 26 playFoHub failures unchanged, the Season Center's three
walks green, playGames 0 findings, simRevealScroll green). On a2440ca5: r1309-old (the base bb051ee0 plays every
save this round writes outside the bracket and refuses the one in it with its delete button; this round plays every
save the base writes), r1309-weight.

## Rollback note

Once GMs sit in a bracket, a build from before this round refuses their saves (the old validator says no to a hub
save at Week 18 and the old board shows "Delete unusable save"), proven on r1309-old. A rollback locks those saves
out until the round is put back.

## The fix pass (after the adversarial review, review-run-1309.md and review-read-1309.md)

- THE MAJOR: watching the title game gave the result away. Its press closes the season at once (closeSeason: the
  graded trust, the press room, the finish), and the hub page drawn while he watches showed the press card ("The
  podium" or "The accountability scrum", answers live) and the owner card's new trust, and recorded the finish.
  Now `heldRoom` ({ from, trust, presser, won }) is taken beside `held` on a playoff Watch and read only while the
  hold is that league: the owner card gets the trust from before the press, the press card the room from before it
  with its answers shut (GmPressCard's optional `shut`), and useGameCompletion the finish from before it, so the
  finish is recorded at full time. Board test over a title won and a title lost (a title mandate, trust 60),
  controls trustspoils, pressspoils, donenow; walk point 18 (fixture D, the title game watched) and its control
  titlespoil. The board of e505ec9e built and walked goes red at point 18 alone.
- RULE FOR THE NEXT BINDS: anything the season close sets on the page (trust, the press room, the finish, and
  whatever a later round adds there) is a reader held at a watch (Round 1307's rule 8). A board whose title game
  can be watched holds it the same way.
- "Your game" on a tie against a club he met in the regular season: a board test (leagues of seeds 1 to 24) and
  control tiewhere, the review's mutant that every test was green under.
- Reduced motion on a playoff watch: a board test (his result at once, no clock; the title game's recap at once).
- "Play Week 17" says a man hurt that week is "out for the playoffs" in the feed (the bracket heals nobody); the
  old button's line is as it was. Board test and control hurtweeks.
- The hub's Trades box past the last period reads "Shut for the playoffs" (src/lib/foHub.ts, inside the one branch
  past the last period; a deal done and a cap sheet over the line still come first). simFoHub section 8 and its
  control nopost.
- In the bracket the reveal's edge from sm up is the bottom of the row under the box, so the back chip is on the
  screen with the buttons and the box after a press (1280 by 800: buttons from 324, box 392 to 744, chip 756 to 800;
  1280 by 900: chip 842 to 886). Walk point 12 asserts the chip from sm up.
- Not changed, for the lead: Watch Week 17 at 390 by 844 leaves the next press above the screen (ruling 2b's
  ground); a short landscape screen puts the box's top under the sticky header (the hook's ground); the playoff mount
  wiring is the NFL board's alone; /front-office weighs 369.3K against its 366K row.

## The closing check's fixes (results-g/verify-1309.md, then results-g/fix2-1309.md)

- Watch Week 17 at 390 by 844 (ruling 2b's asserted point): the press writes the feed box ABOVE the week box, which
  moved the box 74 px down and left 126 px of it readable on the review's save, so the hook fired and top aligned the
  box, leaving the stacked buttons above the screen until the next press. Under sm in the bracket the hook is now
  handed `block: 'end'` (the element is still the wrapper that starts at the box; the hook honours the end only when
  the wrapper fits, and in the bracket it does), so when it has to move the page the buttons, the chip and the box are
  all on the screen. The regular season is as shipped. Walk point 19 (fixture E, the review's save) asserts it.
- The back chip under sm sits ABOVE the box (between the press row and the reveal's wrapper), so it is on the screen
  whenever the buttons are (under the box it was at 984 to 1028 of 844). From sm up it stays under the box with the
  reveal's edge. Point 12 asserts the chip at 390 by 844.
- A landscape phone (844 by 390) is now printed by the walk for the lead; the route mounts no sticky header
  (App.tsx's HEADER_PATHS), so the review's premise for it was not this page's. Measured on r1309-cx-w2 (7f7d94d1),
  after the first press of a visit: a regular week puts the box at 38 to 390 (his result 105 to 133, Play above the
  screen); "Play Week 17" and a playoff round put the box at -18 to 334 with the back chip at 346 to 390 and his
  result at 49 to 77 (the first button at -86). The buttons, the box and the chip (476 px) cannot all fit 390 px; the
  bracket's end aligned span takes 18 px off the box's top. Whether the box's top or the chip wins there is the
  lead's call.
