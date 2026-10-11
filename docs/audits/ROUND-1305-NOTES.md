# Round 1305 notes: the front offices, step one of Game Day

Written 2026-10-11 by the builder of the round (desktop Claude lane, session G). Branch `r1305-gm-press`, base
origin/release-av-gate cbfa94fd (Release AV, live as main feb919f1, merged in before the last proof). Every check
named here ran on a GitHub runner as a remote check; a runner result is the branch `rc-results/<name>` on origin.

## What the round is

Two parts, in the order they were built and proven.

ROUND P, the NBA draft night fence. `draftPick` in the NBA board writes the scout's read onto the captured
`rivalPicks` list and hands that list to `buildDraftNight` (the NFL board's shape); the copy called `rivalCard` is
gone. Nothing a player sees changes. The fence that was red (scripts/simDraftNight.mjs section 5) reads a variable's
name, so it had gone red on a screen that was right. The real fence is new:
src/components/nba-front-office/NbaDraftNightRivals.test.tsx compares the rows the card draws with what the engine
did to the class in the save, on the GM desk off and on, and `DRAFT_CONTROL=norivals` needs BOTH reds (the source
check and that test, red by name with the copy loaded) to exit 0.

ROUND R1, the press. In the NFL front office every score a GM reads is told by the football law for the winner the
engine decided: the week's sixteen games and the thirteen of the one press postseason. His club's games of the
season are kept in the save as `gameLog`. The season close is lifted out of `playWeek` as `closeSeason(lg, rounds,
champ)`. No card, no tile, no new button: those are the next rounds.

## What must not move, and how it is held

- src/lib/frontOffice.ts and src/lib/frontOfficeSave.ts are not edited (`git diff --stat cbfa94fd` prints nothing
  for them, the libraries of Round 1224, the fleet and its fixture: runner result r1305-c1, label engine-untouched).
- THE DIGESTS. src/components/front-office/FrontOfficeOnePress.test.tsx plays twelve saves on the real board (two
  league kinds, the GM desk off and on, an ordinary season, a title and a firing) to three points (the recap, the
  draft opened, the next season's hub) and holds a sha1 of the save at each, with `gameLog` deleted and the two
  score numbers of the thirteen playoff games zeroed. 52 values, printed on the base's own src: runner result
  r1305-a1b, label print-base (a worktree of cbfa94fd holding the test file), a second print and the branch's head
  identical, and a run of the fired cases alone gave the same values. Each case resets the modules and fixes the id
  minter's epoch, because with the desk on saved state depends on a player's id.
- THE FLEET. scripts/simGmGameDay.mjs section 7 plays every season of the fleet a third time with the bind telling
  every game inside the seeded Math.random: the generator's state and draw count, the 272 winners, the 32 records
  and the postseason's row are the untold season's, which section 4 holds to the recorded fixture.

## The save field

`gameLog?: { v: 1, season, games: GmLastGame[] }` (src/lib/gmGameLog.ts), his club's told games in order.
- ABSENT WHEREVER THERE IS NOTHING TO HOLD: never null, never an empty log. The board drops it when a new franchise
  starts, when he abandons one, and in the summer, each before that handler's save.
- THE READER IS ALL OR NOTHING AND NEVER REFUSES A SAVE: another season, another club's games, a damaged or
  repeated entry, an empty log, junk: read as absent, the save loads, the next press starts a fresh log.
- A save from before the round adopts the log at the week it is first played here. `gmLogRecord` is therefore the
  record OF THE LOG and no screen may print it as his season.
- An older build loads a save that holds the key: src/lib/frontOfficeSave.ts names every key it checks and refuses
  no unknown one, and the base's writer is a literal with no rest spread, so its next save simply has no key.

## Measured

- Section 7 of the harness, the share of games whose told score is not the engine's own: 0.9978, 0.9981, 0.9979,
  0.9982, 0.9975 over seed sets 0 to 4 (22,800 games a set). Floor 0.99. The bind refused 0 games in every set.
- The weight, same runner, serial (r1305-w1, step c head d2c70353 against cbfa94fd): /front-office 361.2K to
  363.1K gzipped over 34 to 36 files (the board's chunk 29,380 to 30,694 bytes, two new shared chunks of 209 and 344
  bytes for the keyed stream and the score law, the entry 38 bytes larger for their names). Budget 362.
  /nfl-my-career 479.2K both. /manager-hot-seat reads 604.5K to the tenth on both builds and tips from 604 to 605
  on those 38 bytes of the entry. The budgets are the lead's; none was edited.

## Findings on the way

- scripts/simGmReload.mjs's control GM_RELOAD_CONTROL=replay could not load its copies of three boards (they import
  a file relative to their own folder) and exited 1 on every run, on the base too (r1305-pd, label
  base-simGmReload-replay). Fixed in its own commit: the copy gets those imports by their full path.
- The four NBA rotation harnesses of the other lane hold `from './NbaRotationPanel'` in the NBA board as an anchor,
  so that import was left as it is and the new control rewrites it in its copy, as they do.
- Blind spots, printed and not chased: the one press digests do not see the staff's edge of a fresh desk (dropping
  it from the week's games leaves all thirteen rows green), and the board test with the desk on tells the same
  final with and without the edge (1.03 strength points). The bind's unit test holds the edge to the chance.
- Abandon and a new franchise each clear the log; either clear alone hides the other (two keys, one lock). The
  control that fires removes both.

## Owed, not in this round

- The save keeper's row for `gameLog.v` and a played fixture: scripts/simSaveKeeper.mjs and
  scripts/lib/realSaves.mjs are rewritten by Release AW, so that step is built on a tree that holds AW (see the
  closing report for where it stands).
- The tile, Watch, the bracket you play, week 18's readers: the next rounds of the critic's split (R2, R3, R4).
- The same behaviour test over all four boards' draft nights (Round 1222's binds), after which section 5's two name
  checks of scripts/simDraftNight.mjs can go.
- The /front-office guide (src/data/gameContent/football.ts, the other lane's file) says nothing false; it could
  say scores are football scores now.
