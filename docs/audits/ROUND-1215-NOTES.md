# Round 1215 notes: the live match walk can be replayed

Written 2026-10-10 by the desktop Claude lane (session G), builder of Round 1215.
Branch `r1215-live-walk-replay`, base origin/main 074a9054. Files: `scripts/lib/pageSeed.mjs` (new),
`scripts/playLiveMatchFit.mjs`, this file. Nothing under `src` was touched: no engine, no rule, no save, no screen.

## Why

Release AR's gate found a bug that had been live since Round 1101 (a goal lost its net and its scorer card when the
other side changed a man in the same minute) only because `scripts/playLiveMatchFit.mjs` happened to be dealt that
match. The walk never called `Math.random` itself. The PAGE does (Club Manager's engine draws from the ambient
`Math.random`), and three fresh browser contexts were dealt three matches nobody could ask for again. A red could
not be played a second time and a green proved little.

## What changed

1. `scripts/lib/pageSeed.mjs`: a helper a walk CALLS. `pageSeedOf(scriptPath, raw)` reads the seed (a whole number,
   the word `fresh`, or undefined for the FNV hash of the walk's file name; an empty or malformed value throws,
   because `Number('')` is 0). `seedPages(target, seed)` adds one init script to a context or a page that installs
   the mulberry32 of `scripts/lib/seedRandom.mjs` and keeps `window.__pageSeed = { seed, draws }`.
   `pageDraws(page)` reads the count. It is deliberately NOT in `playwrightLoader.mjs`: `playRenderStability` and
   `playSnapshotDrift` exist to see what an unseeded page does.
2. `playLiveMatchFit` prints its seed and the command that replays the run as its FIRST line. Its three contexts
   (phone, reduced motion phone, wide screen) take seed, seed + 1 and seed + 2. Each prints the match it opened:
   the page's draw count at kick off and a digest of everything the engine drew for it.
3. The digest is an FNV hash of the save's whole `live` object (every shot, corner, foul and throw in of the half,
   the goals, the cards, the share of the ball, the other eleven), keys sorted, with two things taken out because a
   clock writes them and no draw does: `live.minute`, and the squad's ids (turned into the man's place in the squad
   and his name, since an academy player's id carries `Date.now()`, clubManager.ts line 4702).
4. `LIVE_FIT_REPLAY=1` is the proof of the seed: four fresh contexts open the first match, A, B and C on the seed
   and D on the next. A, B and C must print one digest and one draw count, D another digest, and the page must
   draw nothing in five idle seconds. `LIVE_FIT_CONTROL=noseed` (replay mode only) leaves the helper out: three
   contexts must then open three different matches (exit 1 as it must, 3 otherwise).
5. A red hands back its match. The save is kept as stored when a goal is picked to be watched. On a red in
   section 1, 2 or 7 it is written to `LIVE_FIT_SHOTS`, `RC_OUT` or the temp folder as
   `[control-]live-fit-save-<phone|calm|wide>.json` with the goal that was watched, and two lines are printed:
   `RED TO REPLAY: section N (view), match digest X, the goal watched ...` and the path, the size and the command.
6. `LIVE_FIT_SAVE=<file>` starts EVERY context from that save instead of taking a job (put into storage through
   the context's `storageState`, before any page loads). The match is paused as soon as its stage is up and let
   run when the goal is picked, so a goal in the first minutes is still to come. A dump pins the goal that was
   watched; a plain stored save (what localStorage holds under `dukb-club-manager-save`) is accepted too, and
   then the walk picks its goal by its own rule. Every context checks that the match that opened has the digest
   the file was dumped with.
7. `goalsOfHalf` names an own goal by the man who put it in (the name on the card) and marks it. A goal of mine
   that went in off one of theirs keeps the scorer it was drawn for in `name` and carries the man in `og.n`; the
   old line printed the wrong man. "the goal watched" is now printed on every run, with the half's count of own
   goals.

Every assertion the walk made before is still made, on the same frames. The default run is as strict as it was.

## What Round 1216 can rely on (the interface)

- `LIVE_FIT_SEED=<n>`: one knob. Unset is 3208792607, the hash of `playLiveMatchFit.mjs`. `fresh` draws one from
  the clock and prints it first.
- `LIVE_FIT_REPLAY=1`, and with it `LIVE_FIT_CONTROL=noseed`: section 8 of the walk today. A new section of the
  walk should take the next free number (9), or the replay moves; the dump reads its view off `VIEW_OF`
  (section 1 phone, 2 calm, 7 wide), so a new watching section adds its own row there.
- `LIVE_FIT_SAVE=<file>`: either a dump of the walk or a plain stored save with a match in flight. The envelope is
  `{ liveFitSave: 1, walk, seed, view, section, control, digest, target, bytes, raw }`, where `raw` is the stored
  string byte for byte and `target` is `{ minute, plus, place, side: 'me' | 'opp', own, name }` with `name` the
  man on the card. A save an engine search found in node can be handed over the same way: write
  `{ liveFitSave: 1, raw: JSON.stringify(cm.trimCareer(career)), target }` and the walk watches that very goal at
  the three sizes, held until it is picked. Leave `digest` out when the file is made by hand and the check is
  skipped.
- In the walk: `matchDigest(save)`, `goalsOfHalf(page)` (goals with `side`, `own`, `name`, and `raw`),
  `opening(page, label, seed)`, `seededContext(options, seed)`, `holdIfSaved(page)`, `dumpSave()`, and
  `watchAGoal(page, { tapCard, onTick, view })`.
- What the seed promises: the opening match of each context. A reload starts the stream again from the top.
  Later halves are drawn from the same stream when the walk reaches them, so two runs on one seed watched the
  same three goals in every run so far, but a goal picked right at the edge of the rule (two minutes ahead of
  the clock) can fall either way with the runner's timing. The file replay has no such edge.

## The proof, on GitHub runners (head 33efc2ce, the commit that made the change)

Result names are branches `rc-results/<name>` on origin; a log is
`git show origin/rc-results/<name>:logs/<label>.log`.

| What | Result, label | Exit | What it printed |
|---|---|---|---|
| The clean walk, twice, one seed | r1215-b1 clean-1, clean-2 | 0, 0 | all green, 97 s each; the same three digests (421656fa, e14582e9, 50a7cae5) and the same three goals watched (28' against me, 57' against me, 5' own goal for me) |
| Another seed, a fresh seed | r1215-b1 seed-7, fresh | 0, 0 | all green; seed 7 gave 8ef206aa, d319e98e, 92caa5c6; fresh drew 636123010 and printed it first |
| An empty seed is refused | r1215-b1 badseed | 2 | "a page seed must be a whole number ... and this one reads """ |
| One seed, one match, three runs in a row | r1215-b2 replay-1, replay-2, replay-3 | 0, 0, 0 | each: seed 3208792607 gave digest 421656fa in A, B and C with 1869 draws at kick off; seed 3208792608 gave e14582e9 |
| Two seeds, two matches | the same three, r1215-b2 replay-7, r1215-og (12 seeds) | 0 | 15 seeds in all, 15 pairs of different digests, no seed ever gave two digests |
| The control goes red for its own reason | r1215-b2 noseed | 1 | "control noseed turned the replay red on the line it must (with no seed, three contexts opened three different matches: 2cacae82, 394d4f60, e8b04a58)" |
| The control alone is refused | r1215-b2 noseed-alone | 2 | it is the replay mode's control |
| A forced red dumps its save and the file replays it | r1215-b3 forced-nocard | 0 | both runs exit 1 on "no scorer card was ever on screen", both print `RED TO REPLAY: section 7 (wide), match digest 50a7cae5, the goal watched 5' Lewis Hall (own goal), for me` |
| The same with another assertion | r1215-b3 forced-earlyscore | 0 | both runs exit 1 on "the score changed before the ball was in", the same RED TO REPLAY line twice |
| A plain stored save | r1215-b3 plain-save | 0 | the whole walk from the stored string alone, all green |
| The old controls and the measuring pass | r1215-b4 bar, silentlist, report | 1, 1, 0 | each as it must; the two section 7 controls are the first runs of the forced reds above |
| Type gate, rival names, harness anchors | r1215-b4 tsc, rivals, anchors | 0, 0, 0 | 0 findings, every harness parses |

The draw counts of one context on the walk's own seed: 7 once the page had settled, 7 after 2.5 seconds
untouched, 736 with the job taken, 1869 at kick off, 1869 after 2.5 seconds of the match. So nothing on
/club-manager draws on a timer, before the job or while a match plays, which was the one thing the design could
not rule out by reading. A dumped save is 70,855 bytes as stored and 85,510 in its envelope.

`forced.sh` (the request's extra file) runs a control, then runs it again from the dumped file, and passes only
when both exits are 1 and the two `RED TO REPLAY` lines are equal.

## Base readings (step a), before any edit

| Reading | origin/main 074a9054 (r1215-base) | origin/release-at-int ca780b9c (r1215-at) |
|---|---|---|
| `playLiveMatchFit` as it was, unseeded, twice | green, 100 s and 95 s | green, 88 s and 111 s (VAR on) |
| The part alone (`LIVE_MOTION_ONLY=bundle`) | 19,526 bytes minified, 8,179 gzipped | the same |
| Its ceiling, and what the harness records | 23,133 and 9,693; BUNDLE_MEASURED says 19,277 and 8,077 | the same |
| `[AR held cast] the half found on attempt` | 2 | 71 |
| `[1101 R6] chances staged` | 2,150 | 2,053 |
| `vitest run src/test/liveSimMotion.test.tsx` | 1 file passed | 3 failed, 52 passed (see below) |
| `/club-manager` in sweepWeight (SWEEP_OFFLINE=1) | 577.6K of a 578K budget | 581.7K, over |
| `/soccer-career` | 786.3K of 786K | 796.1K, over |
| `scripts/play*.mjs` | 92 | 100 |

On release-at-int the reading was taken by laying its `src`, `scripts`, `public` and `index.html` over the runner's
checkout (nothing else differs from main but workflow files) and building that. Two things there are Release AT's
and not this round's:

- `src/test/liveSimMotion.test.tsx` is red: "the material is 200 half feeds from five clubs in five leagues"
  expected `[15, 20, 20, 20, 20]` to equal `[20, 20, 20, 20, 20]` (Aston Villa on seed 110101 gives 15 matches, not
  20), and R7 and R8 then read 190 halves where they want 200.
- sweepWeight has four rows over budget: /club-manager 582K of 578K, /soccer-career 796K of 786K,
  /manager-hot-seat 600K of 596K, /deadline-day 610K of 606K.

For Round 1216: the part has 3,607 bytes minified and 1,514 gzipped under its ceiling; the Release AR search needs
71 attempts on the base, so a twin that also wants an own goal (one eligible goal in 32) would want about 2,300
attempts against a cap of 4,000, which is too close to trust on the real engine (the critic's correction 9).
