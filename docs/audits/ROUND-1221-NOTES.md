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
| a1 | this file, the digest mode and `lawdrift` in the harness, no `src` line moved | (this commit) | pending |
| a2 | the record, made on a runner at a1 | pending | pending |
| b | the move | pending | pending |

## What a later session must not trust

- Nothing here is proven until the table above names a runner result for it.
