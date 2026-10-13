# Round 1327 notes: Soccer Career event deck integrity

Branch `r1327-sc-deck-fair`, cut from origin/main `8fea14e2` (Release AY plus the board's depth claim).
Kept current at every push. The brief is `dukb-handoff/2026-10-10/briefs/brief-1327.md`.

## Base

- Base SHA for every comparison: `8fea14e216fb550b4676ac29f06867234594df21` (until Release BB is merged).
- `git grep -n "pickN(" -- src/lib/soccerCareerEngine.ts` on the base prints the declaration only (line 2563):
  `pickN` has no caller anywhere, so it is deleted rather than made fair.

## Steps

| Step | What | Commit | Runner result |
|---|---|---|---|
| (a) | the two harnesses, red on the base | (this push) | pending |

## Harness design notes

- simSoccerDeckFairness section 1 draws 40,000 batches through the real `generateRandomEvents`. The brief asked for
  Math.random to be reset to one seed before every trial so the catalogs' random gates resolve alike. Done as: the
  stream replays one fixed seed for exactly the calls the catalog build makes (counted per trial with a dry build),
  then continues on a fresh per trial stream. The catalogs' gates resolve alike in every trial, and an old
  Math.random shuffle (the base, and the `shuffle` control) shows its real bias instead of dealing one batch forever.
  On the keyed deck the second stream is never read (section 3 proves it).
- Both harnesses read the engine through esbuild with every `src` file taken from the working tree, or from git at
  the base SHA for the base arm, and append one export line so the deck and the paper are reachable on a tree that
  does not export them.

## Readings

(filled in from runner results at each step)
