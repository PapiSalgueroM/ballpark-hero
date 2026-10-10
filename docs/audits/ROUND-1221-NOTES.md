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
| a2 | the record, made on a runner at a1 (`scripts/data/usSeasonLawDigest.json`, the file the runner wrote, byte for byte) | (this commit) | pending |
| b | the move | pending | pending |

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

## What a later session must not trust

- Nothing here is proven until the table above names a runner result for it.
