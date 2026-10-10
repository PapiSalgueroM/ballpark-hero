# Round 1220: the draft night you watch, in all four US My Careers

Branch `r1220-draft-night`, base `origin/main` 09df145a. Built 2026-10-10 by the desktop Claude lane.
This is ROUND A of the split the critic proposed: the scouts path recording, one repaired control and
the night. The combine you run (stations, drills, a save field) is Round B, later, on this head.

## What a player sees

- At the draft step the card prints where the scouts have him, from the same arithmetic the draft
  is about to draw with: "The scouts have you between pick 43 and pick 71 of 224." A low stock
  reads "between pick 190 and undrafted".
- Pressing "Draft day" plays the night, once, in that mount: for the NBA the lottery turns over
  first (the one shared presenter of Round 1222), then the picks ahead of his come off the board,
  then his name is called, or the last pick goes by without it. At most eight board rows and
  twelve rows in all, in every sport and era, MLB's 1,500 pick draft of 2004 included.
- "Start your career" and "Skip to my pick" are live from the first frame. Nothing is saved, so a
  reload shows the result block the card always showed.
- The journey's help gained one paragraph (the rule and a worked example built from the function).

## What did not move, and how that is known

- THE SCOUTS PATH IS BYTE EQUAL. `scripts/data/careerPreDraftDigest.json` holds 80 sha256 digests
  (8 sport and era pairs, seed sets a to e, the 2,000 road states after the showcase and after the
  draft). It was recorded on a GitHub runner (Node v24.21.0, remote check `r1220-rec`) in commits
  1dcc9162 and 5f8c0047, which touch no file under `src`. Section 9 of `scripts/simCareerPreDraft.mjs`
  compares on every run. Controls `gradeshift` and `extradraw` each turn the 8 lines of section 9
  red and nothing else. The file carries the base sha, the Node version, a hash of each engine file
  as it stood, and the first three roads of every pair as plain values.
  Record and check on the same Node major: the rank uses `Math.pow(z, 1.6)`.
- That proves the engine FUNCTIONS. That the three showcase BUTTONS and "Draft day" still call them
  is the other lane's Round 993 test, `src/test/usCareerProspect.test.tsx`, which has NO diff in
  this round (it compares the whole save after every press, and `scripts/simUsCareerProspect.mjs`
  counts its 36 outcomes exactly, so the night's board cases are a new file).
- `src/components/us-career/UsCareerBoard.tsx`: not one line.
- No save field. `saved(row)` equals the engine's state after the draft in every board test.

## The night shows, it never draws

`src/lib/careerDraftNight.ts` has no draw and no clock. The order is `preDraftOrder(desc, seed)`,
the same pure call the draft made, and the witness for the closing row is the outcome the save
holds. If the saved club is not the holder of the saved pick it builds nothing and the card shows
the result block alone. Since the night only plays in the mount that pressed "Draft day", that
branch can be reached only by a test; it is two comparisons and it has a control (`nightopen`).

Section 13 of the harness, on 16,000 roads a seed set and on built outcomes for every pick from 1
to 12, the last four picks and an undrafted ending in all eight pairs: the closing row is the saved
pick and club; every pick row's club is the holder in the order the harness works out itself;
every pick called before the closing row is shown exactly once (lottery tile, row or gap); a gap
covers at least two picks; the range the card quoted is the range the night recalls and the pick is
inside it; an unbacked outcome builds nothing; the whole pass runs with `Math.random` made to
throw, leaves every state byte equal and builds the same night twice.

| Control | What it breaks | Result on seed set a (each exit 1, failures in section 13 only) |
|---|---|---|
| `nightoffbyone` | a pick row reads `order[pick]` | 8 pairs: every pick row shows the next holder |
| `nightlottery` | lottery rows read the standings | the 2 NBA pairs |
| `nightopen` | the fail closed test is off | 8 pairs: 216 to 228 unbacked outcomes built a night |
| `nightdedup` | the "show them all" branch is off | 8 pairs: a gap of -1 picks, a pick shown twice |
| `nightdraw` | the builder draws once from `Math.random` | 1: "Math.random was called" |
| `projection` | the range is drawn at 0.25 and 0.75 | 8 pairs: pick 19 outside the quoted 21 to 27 |

REPAIRED: control `squeeze` had been dead since Round 1104 (its needle ended in `rng);`, the line
had gained the position offset, so it exited 2 and refused to run). It carries today's line and
exits 1 with 32 failures (sections 2, 3, 9 and 13). The other lane's workflow
`.github/workflows/prospect-journey.yml` runs that control and requires exit 1, so it was red on
any pull request touching these paths until this round.

## Why this is not the front offices' draft night

`src/lib/draftNight.ts` and `DraftNightCard.tsx` (Round 515) show a player name and a scouted grade
on every row. The road names no other prospect, ever: a pick ahead of yours is a number and a
club, and there is no field here a name could go in. The conventions are the same: rows final
from the frame they appear, a bounded run, nothing that blocks, `data-` hooks for a walker.
The pace answers to the same bound: every night lands inside 5,000 ms with a tenth in hand
(`careerNightClock` in the component; the longest is the NBA's, 4,500 ms with its lottery).

## The clock is the component's

The builder returns rows only. `DraftNightSequence.tsx` owns the clock: `revealDelay` for each row
and `revealAfter` for the closing row, both from the celebration kit, so the pure builder pulls no
React into the harness bundle. `src/test/careerDraftNight.test.tsx` holds the bound for every board
length each sport can show.

## What holds the ending back, and what a screen reader hears

While the rows arrive, the title ("This is your moment." or "A different way in."), the club line
under it, the numbers after the minors and the result block wait for the closing row. The hold is
a CSS animation with a delay and nothing else: there is no base rule at opacity 0, so anything
that stops it leaves the words visible (fail safe). It sits on the title and the club line
themselves, not on `.stageCopy`, whose own arrival animation would outrank it.
Confetti mounts only once the closing row has landed (the kit's burst fires on mount).
A screen reader: focus lands on the hidden heading, which reads "Draft night." while the rows
arrive; every row is in the DOM and can be read ahead (the same final frame less motion gets);
when the closing row lands a `role="status"` line says the result in one sentence.
With less motion the night starts on its last frame and nothing is held.
