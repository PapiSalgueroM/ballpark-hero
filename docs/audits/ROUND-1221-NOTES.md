# Round 1221 notes: the NFL score law moves to a shared home

Branch `r1221-nfl-score-law`, base `origin/main` at `09df145a`. Written by the builder, rewritten after every step.
Nothing a player sees changes in this round. No What's New entry, no guide sentence, no screen.

## What the round is

The NFL My Career Season Center plays a score law (`nflScore`, the drive lists, the minute picker, the clock
label) that lived inside `src/lib/season/nfl.ts`. The front offices are going to tell their games with the same
law, and they cannot import the Season Center's number file (it pulls the season core and a career engine into
their chunk). So the law moves to `src/lib/gameLaws/`, in two files because a module is never split across chunks:

- `src/lib/gameLaws/nflScore.ts`: the score and its constants (what a press needs in the same tick).
- `src/lib/gameLaws/nfl.ts`: the rest (drive lists, minutes, the clock, the club lines), for a lazy story file.
- `src/lib/gameLaws/types.ts`: the two shapes a sport's law has (`ScoreLaw`, `StoryLaw`).
- `src/lib/keyedShuffle.ts`: the keyed shuffle the drive lists need, moved out of the season core so a law file
  never imports the core. The core imports it back and still exports it.

`src/lib/season/nfl.ts` imports the law back and exports the same names it exported before, so no other file
changes its import.

## The proof: byte equality

`scripts/simUsSeasonCentre.mjs` has a digest mode (see its header): one sha1 a sport and a seed set over every
season of its fleet as the viewer is handed it (the whole derived season and the playoff path), and one over the
careers themselves after every season. It is recorded on the commit before the move into
`scripts/data/usSeasonLawDigest.json`, with the blob of every bundled source file the move does not touch, and
compared on the move commit. A compare that finds one of those files changed answers "inputs moved under the
digest" with exit 3 and compares nothing, so a difference can never be blamed on the move by mistake.

Control `lawdrift` changes one constant of the law (`FG_A_DRIVE`) where the law lives: the NFL season digest must
move on every seed set, and the NBA's digests, both sports' careers and the stray draw count must hold.

The record is a receipt of this round. It is in no gate: any later round that changes a career or a season on
purpose moves it.

## Steps

| Step | What | Commit | Runner result |
|---|---|---|---|
| a1 | this file, the digest mode and `lawdrift` in the harness, no `src` line moved | `c211113f` | `r1221-a1`: the type gate 0, the default run 0 (98 checks, 0 failed), simHarnessAnchors 0, two prints 0 and byte equal |
| a2 | the record, made on a runner at a1 (`scripts/data/usSeasonLawDigest.json`, the file the runner wrote, byte for byte) | `c367e8b7` | `r1221-a2`: compare of all five seed sets 0, each seed set alone 0, `lawdrift` 1 and red at its named check, the controls minutes, points, forty, level, oddtd, bigkick and kick 1 and red at their named checks (the law still in the number file) |
| b | the move, ONE commit whose parent is the record commit, no merge of main between | `2388a06d` | see the next section |

## The record (made on `c211113f`, runner result `r1221-a1`, 2026-10-10)

Forty careers and eight targeted ones a sport and a seed set, seed sets 0 to 4, both runs of the fleet.

| Sport | Seed set | Seasons | Derived |
|---|---|---|---|
| NBA | 0, 1, 2, 3, 4 | 904, 900, 902, 890, 897 | 812, 809, 810, 802, 809 |
| NFL | 0, 1, 2, 3, 4 | 786, 787, 790, 781, 799 | 500, 502, 505, 500, 515 |

A season that is not derived is one the Season Center does not open (a held season length, or a line that cannot
be laid out): the digest holds its answer too. 2,522 NFL seasons are derived, 42,874 games, each with its score,
its drives, its minutes and his line. 68 source files are in the bundle; 66 of them are recorded by blob and may
not change under a compare, and the other two (`season/nfl.ts` at `9fc77010557c`, `season/core.ts` at
`02513e627fb5`) are the ones the move edits. Stray draws: 0.

## The move, proven (on `2388a06d`, all on GitHub runners, 2026-10-10)

| Check | Exit | Runner result | What it says |
|---|---|---|---|
| the type gate | 0 | `r1221-b1` | zero errors |
| digest compare, seed sets 0 to 4 in one run | 0 | `r1221-b1` | 11 digests, 0 moved |
| digest compare, each seed set alone | 0, 0, 0, 0, 0 | `r1221-b1` | 3 digests, 0 moved, five times |
| control `lawdrift` | 1 | `r1221-b1` | red at its named check: the NFL season digest moved on all five seed sets; the NBA's five, both sports' careers and the stray draws held |
| the default run | 0 | `r1221-b1` | 98 checks, 0 failed |
| the five retargeted controls: minutes, points, forty, level, oddtd | 1 each | `r1221-b1` | each red at its named check |
| the NFL controls still on the number file: sum, kick, days, nflformula, lumpy, flat, tdform, order, bigkick, oddsack, and poscore, nflstage, nflheld | 1 each | `r1221-b1` | each red at its named check |
| vitest: gameLawNfl (19 tests), usSeasonNfl (35), usSeasonCentre (9), seasonCore (22), seasonCentreWords (3) | 0 | `r1221-b1` | 5 files passed |
| every `sim*` that reads the season core by path: simCareerLeagueWorld, simSeasonCentreAgreement, simSeasonCentreMotion, simSeasonCentreNeutral, simSeasonCentreTable, simSeasonMoments, simSoccerDiscipline, simSoccerLeagueWorldLookup, simSoccerOwnGoals; and simSeasonLaw | 0 each | `r1221-b2` | all green |
| the browser walk of the US Season Center (playUsSeasonCentre) | 0 | `r1221-b4` | 144 checks, 0 failed |
| its control `column` (it patches the clock literal in the built chunk, which must be there once) | 1 | `r1221-b4` | red at its named check; the literal was found once, in one chunk |
| the weight sweep | 0 | `r1221-b4`, base in `r1221-b6` | /nfl-my-career 468.1K, /front-office 359.3K and /soccer-career 786.3K, the same to the tenth on the base commit |

The drifted digests `lawdrift` prints are the same ten values on the record commit (the law in the number file,
`r1221-a2`) and on the move commit (the law in its own files, `r1221-b1`): the law answers a changed constant the
same way from both homes.

The rule fences (`r1221-b3`, on a plain build): 19 of 24 green. The five that are not are not this round's:
simSchemaNames and simLeaderboardCaps read the live database, which a runner cannot reach by design;
simWritesAreSent and simResultMoment import a browser library from a path that is not on the runner;
simDailySaveHardening fails on /olympics with the same two lines on the base commit run alone (`r1221-b5`), and
Round 1210's branch carries its fix.

## One definition

`git grep` over `src` (tests left out) finds each of these once, in a law file: `function nflScore`,
`function nflDrives`, `function nflDriveCost`, `function driveOptions`, `function nflMinutePicker`,
`function nflClockLabel`, `function nflEdgeForShare`, `function nflClubLine`, `function nflTryWords`,
`const TD_A_GAME`, `const FG_A_DRIVE`, `const DRIVE_GAP`, `const MINUTE_TRIES`, `const MAX_TD`, `const MAX_FG`,
the 11.3 logistic, the three club sentences and the clock's `labelClass`. The keyed `shuffled` is defined in
`src/lib/keyedShuffle.ts` alone; the season core's export is that function (the unit test holds the two to be one
object).

## What the next round needs to know (Game Day's libraries, round B of the critic's split)

- `ScoreLaw` and `StoryLaw` hold what the moved code backs: `score`; `events`, `clock`, `line`. The draft's
  `shape` (rout and comeback numbers and their sentences), `help` and the clock's periods are NOT in the types
  yet: they come with the code that reads them and with the facts the "?" must source (the critic's corrections
  12 and 13). That round adds them to `src/lib/gameLaws/types.ts` and `nfl.ts`, which are this lane's files.
- `NFL_SCORE_LAW.score(pHome, rng)` is `nflScore(nflEdgeForShare(pHome) - 1, true, rng)`. Measured over 4,000
  games a cell: the home side wins 0.223, 0.527 and 0.819 of them at 0.2, 0.5 and 0.8 (eight more streams a cell
  sat between 0.2105 and 0.2290, 0.5148 and 0.5397, 0.8080 and 0.8275). The law leans to the home side by two
  or three games in 100 because it breaks a level game the home side's way. That is the Season Center's law as it
  was; a game that tells a score for a winner an engine already decided is not moved by it.
- `NFL_STORY_LAW.events(home, away, rng)` gives null only when a side is on 1 or 4 (280 of the 5,041 finals from
  0-0 to 70-70), and at most 26 lines a game.
- The Season Center's clock IS `NFL_STORY_LAW.clock` now (one object). scripts/playUsSeasonCentre.mjs's control
  `column` needs the literal `labelClass:"w-14"` once in one built chunk: a second literal of that clock
  anywhere makes the control refuse.
- The record `scripts/data/usSeasonLawDigest.json` is a receipt. A round that changes a career or a season on
  purpose (Round 1149's rivalry beats, the MLB and NHL week by week round) moves its inputs, and the compare then
  answers "inputs moved under the digest" with exit 3. That is the mode working, not a red.

## Run after the table above

- The whole vitest suite on `2388a06d`, three shards (`r1221-b7`): 387 files passed, 2 skipped, 1 failed; 5,340
  tests passed, 55 skipped, 1 failed. The one failure is `src/test/dailySaveShapes.test.tsx`, "a damaged daily
  save resets itself", on /olympics: the same failure the base commit has (`r1221-b5` runs
  simDailySaveHardening, which runs that file, on `09df145a` alone: the same two lines).
- The six browser walks that read the season core (`r1221-b8`, on `7a911efb`): playSeasonCentre 40 checks,
  playSeasonCentreMotion 77, playSeasonMoments 117, playSoccerCareerDiscipline 178, playSoccerCareerLeagueWorld
  249, playSoccerCareerOpponents 164, each 0 failed and exit 0.
- `origin/main` did not move during the round (`09df145a` throughout), so the merge after the compare had
  nothing to merge. On `7a911efb` (`r1221-c1`): the type gate 0, the compare 0 (11 digests, 0 moved), `lawdrift`
  1 and red at its named check, the default run 0, the five test files 0 (88 tests), simNoRivalNames 0,
  simLiveScores 0, simHarnessAnchors 0.

## What a later session must not trust

- Nothing here measures a front office: no front office file is touched and none imports the law yet.
- The record is true for the tree it was made on. After any merge that changes a bundled file the compare
  answers exit 3 and proves nothing either way.
