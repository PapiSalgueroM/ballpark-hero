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
- "Start your career" and "Skip to the end" are live from the first frame. Nothing is saved, so a
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
under it and the result block wait for the closing row. The hold is a CSS animation with a delay
and nothing else: there is no base rule at opacity 0, so anything that stops it leaves the words
visible (fail safe). It sits on the title and the club line themselves, not on `.stageCopy`, whose
own arrival animation would outrank it.
The file under the stage (age, rating, health) is NOT faded. Since the fix pass the journey prints
the numbers from before the press until the closing row has landed, and then the ones the career
starts with (MLB and the NHL have minors in between, so those change). Nothing in it goes blank.
Confetti mounts only once the closing row has landed (the kit's burst fires on mount).
A screen reader: focus lands on the hidden heading, which reads "Draft night." while the rows
arrive. Since the fix pass the four things that say the ending (the title, the club line, the
result block and the closing row) are `aria-hidden` while the rows arrive, because a screen reader
reads through opacity; the rows above the closing row can be read ahead. When the closing row
lands they come back and a `role="status"` line says the result in one sentence.
With less motion the night starts on its last frame and nothing is held.

## The walk (scripts/playDraftNight.mjs), measured on a GitHub runner

Remote check `r1220-walk2` at head fcbf417d: ALL GREEN, 40 nights (4 sports, 390 by 844 with touch
and 1280 by 800; a first pick, a late pick and an undrafted road watched, a late pick skipped, an
undrafted road with less motion). What it measured:

- The card and the journey keep one height from the first frame of the night to the last
  (for example MLB's late pick, 8 rows: 764 px at every one of its frames).
- The press reveals the board once (the page moved 22 to 442 px inside the first second and a
  half, never after) and the closing row landed wholly on screen every time: at 707 to 761 of 844
  on the phone and 663 to 717 of 800 on the desktop, with the two buttons right under it.
- Until the closing row starts to land (0.7 s for a first pick, 3.5 s for an 8 row board, 4.1 s
  for the NBA with its lottery), the title, the club line, the result block and the closing row
  were at opacity 0 on every recorded frame (31 to 235 frames a night).
- No enabled button inside anything at opacity 0, every button at least 44 by 44, no frame wider
  than its viewport, the save equal to the engine's state after the draft, the career that
  starts at the club the closing row showed, no page error.

THE FIRST RUN OF THE WALK FOUND A REAL JUMP: the outlined skip button is 2 px taller than
"Start your career", so the row under the board lost 2 px when the skip went (32 height failures
and 8 skip failures in 40 nights, `r1220-walk`). Fixed by giving the two buttons the same border
box. It also showed three of its own controls had changed nothing (a style put in from an init
script, before the document has a root element) and refused them with exit 2, which is what that
refusal is for; the styles now go in after load.

| Control | What it breaks | Its own check, red (exit 1) |
|---|---|---|
| `late` | rows take their room only when they arrive | height: the card went from 490 to 765 |
| `spoiler` | the hold is taken off | spoiler: at 0 ms of 3500 the title, the club and the result are at 1 |
| `fold` | the press reveals nothing | fold: the closing row landed at 995 to 1049 in an 844 high viewport |
| `hidden` | a row left invisible with less motion | reduced: the first frame has a row at 0 |

`fold` is also the proof the reveal is needed: without it the name is called below the screen.

## The fix pass after the two reviews (2026-10-10)

Two adversarial reviews (one that ran things, one that read) found two majors and a list of minors.
Everything below is on the branch, each in its own commit, proven on GitHub runners.

| Finding | What changed | What holds it now |
|---|---|---|
| The closing row could print the overall pick as the pick in the round with every check green (every case ended in round one) | nothing in the product: the row was right | `careerDraftNight.test.tsx`, "the row that ends the night, word for word": the fifth pick of round two and the last pick of the draft in all eight pairs, the 85th NFL pick typed out, the undrafted row; the walk compares the whole row with the save |
| The NBA lottery tile cut 14 of 30 club names at 390 wide | the tile is handed the club's own name (`teamShort` on the descriptor, the NBA's only; "Trail Blazers", not "Portland Trail Blazers"), the line under the tiles keeps the city, and the journey gives the tile 6 px more room | the walk's check 9 measures both lines of every tile and every club of the era in the tile's own box, in the site's typeface, at 390, 360 and 1280; control `cut` |
| Nothing held which way "Up" and "Down" point | nothing in the product | vitest reads Up, Down and Held off real tiles in both NBA eras, and two cases typed out; the walk compares every tile with the order |
| The walk judged the hold against the page's own number for the hold | the walk | the moment is the closing row's own animation delay, and each held element's own delay must reach it |
| The range line's boundary and the screen reader sentence could go wrong unseen | nothing in the product | both typed out in vitest |
| The file under the stage went blank while the night played (MLB, NHL) | the journey prints the numbers from before the press until the row has landed; the fade is gone | the board test on all four boards; the walk reads the file in every frame of the hold |
| A screen reader could read the ending early | the title, the club line, the result block and the closing row are `aria-hidden` while the rows arrive | the board test and the component's test |
| At 320 wide the card lost 20 px when the skip went | the journey's narrow rule keeps the night's two buttons on one line | the walk's 320 wide night |
| One era and two widths walked | the walk | a late pick of each throwback era at 390, the NBA's night at 360 by 740 and 320 by 640: 48 nights |
| The scroll check started a fixed 1,500 ms in | the walk | the page must be SEEN standing still (measured: 33 to 350 ms after the night's first frame, median 266), and never move after; control `again` |
| The face down number on a tile was about 3.3 to 1 | it is the journey's muted ink, 5.2 to 1 | read from the CSS |
| What's New said the picks come off "one at a time" | the words | read |

Measured with the site's typeface (Inter, let through from Google Fonts in the walk): a tile has
106 px for a club at 390 wide, 91 at 360 and 247 at 1280, and the longest of the 30 clubs of today
and the 29 of 2003 is "Timberwolves" at 83 px.

Each new check was shown to bite by putting the defect back on a runner (one source mutation, then
the two vitest files, a fresh build and the walk). All ten went red for their own reason:

| Mutation | Red in |
|---|---|
| the closing row prints the overall pick as the pick in the round | vitest and the walk (`save`) |
| the tile's "moved" number has its sign flipped | vitest and the walk (`save`) |
| the tile is handed the city and the name again | vitest and the walk (`cut`, `save`) |
| the hold ends at the first row | the walk (`spoiler`) |
| the hold ends one second early | the walk (`spoiler`) |
| the file shows the numbers after the minors while the night plays | vitest and the walk (`spoiler`) |
| the narrow rule for the two buttons is removed | the walk (`height`, `skip`: 861 to 881 px at 320 wide) |
| the range line says "and undrafted" for a range ending on the last pick | vitest |
| the two numbers of the screen reader sentence are swapped | vitest |
| the title is back in a screen reader's tree while the rows arrive | vitest |

## The second fix pass, after the closing check (2026-10-10)

| What was open | What changed | What holds it now |
|---|---|---|
| At 320 wide the lottery tile cut its longest club and a long seed line (73 px of room; "Timberwolves" 83, "Seed 1 · Down 3" 76) | the journey's own CSS gives the tile's words 10 px more under 360 wide and prints the club at 11 px: 83 px of room, "Timberwolves" 77, the widest seed line ("Seed 2 · Down 2") 78. The presenter is not edited | the walk's check 9 is judged at 320 as at every width, and tries every seed line the era's lottery can print (56 today, 39 in 2003); control `narrowtile` (8 failures at 320 wide) |
| On a screen shorter than the night (844 by 390) the closing row landed below the fold, or, when the night's own reveal won, the press jumped to the buttons and the lottery and first picks arrived off the top | a night more than 28 px taller than the screen is left at its start by the press, and the reveal under the board is asked when the closing row starts to land, or on Skip; a night that fits is brought in whole, as before | the walk's 49th night (item 4b: the top on screen at rest, no move until the closing row starts, the row wholly on screen a second after it landed, the page at rest at the end); controls `ending` and `nottall`; five vitest cases with the layout handed in |
| "Skip to my pick" on a night that has no pick | "Skip to the end" on every night | the tests and the walk press it by that name |
| The real world statements the night prints stood on rows of other names | sixteen rows of their own in `US-PRE-DRAFT-RULES-2026-10.md`, each with the two sources its row above carried (nothing read again) | read |

Measured on a runner on the fixed head: the NBA's night is 646 px high at 320 by 640, 610 at 360
by 740, 595 at 390 by 844 and 547 at 844 or 1280 wide; the NFL's and MLB's are 441 at 390 wide. At
844 by 390 the page stands at rest from the first frame with the top of the night on screen, moves
310 px when the closing row starts to land, and the row ends at 253 to 307 of 390.

The control `nottall` fired in 15 of its 16 runs on runners and once exited 2 ("changed nothing"),
which the walk refuses to call a result. Why that one run differed is not known; the report of
the pass has what was measured. A gate that runs it should run it again alone before reading an
exit 2 as anything.

## Residual, known and written down

- The night plays once. There is no "watch it again" after a reload.
- If the chunk has not arrived when "Draft day" is pressed (a slow connection, a press in the same
  frame as the mount), there is no night, only the result block. Nothing is lost.
- The reveal is one `useRevealScroll` on the row of buttons, aligned to the bottom of the screen.
  Where the night fits on the screen (every upright phone measured, 640 px high and up, down to
  320 wide) the press brings it in whole and the page does not move again. On a screen shorter
  than the night itself (a phone on its side, 844 by 390: the NBA's night is 547 px high) the
  start and the ending cannot both be on screen. There the press leaves the page where the player
  is looking, at the start of the night, and the same reveal is asked when the closing row starts
  to land, or on Skip: one more move, 310 px in the walk, after which the closing row sits at 253
  to 307 of 390. See the second fix pass below. Under less motion the night starts on its last
  frame, so on such a screen the press brings the ending in and the start is a scroll up.
- "Fits" has 28 px of give (`NIGHT_TOP_SLACK`): the NBA's night is 646 px high on a 320 by 640
  phone, 6 px over, and is still brought in whole there with the tile's small heading at the edge.
- Under 360 wide the lottery tile is restyled by the journey's own CSS (4 px of padding, 2 px of
  gap, 4 px of the number box, the club at 11 px), so a tile has 83 px for its words where the
  shared presenter alone gives 73. The presenter (Round 1222's file) still cuts "Timberwolves"
  (83 px at its own 12 px) on a screen that narrow anywhere else it is mounted.
- "Skip to the end" is the label on every night. It was "Skip to my pick" until the second fix
  pass: a night that ends without his name has no pick to skip to, and a different label on that
  night alone would give the ending away in the first frame, so every night wears the one label
  that is true either way (the site's other skips read the same way: "Skip to the decision",
  "Skip to the results").
- Once the night has landed the pick is on screen twice: in the closing row of the board, and in
  the result block under it (Round 993's block, which is all a reload shows). That is the design
  the brief asked for, the night above the result, and the block also carries what the row does
  not (the seasons in the minors, in the sports that have them). Not changed.
- The NHL and MLB lotteries are real and not modelled by the career engines: no tile, and no
  sentence that says there is none.

## Owed, not done here

- `/nfl-my-career` weighs 469.0K gz against a budget of 468K (468.1K on the base, measured on the
  same runner): this round adds 0.9K to the first chunk of the four career pages (the range line,
  the journey's night state and help paragraph, the hold's CSS). The budget number is the lead's.
- `scripts/qa/career993.mjs` (the other lane's walk) fails on `origin/main` itself: its expected
  career lacks `summerSalt` (Round 1038), in all six journeys at the "joined" step. On this head it
  walks through the live night (its 44 px and overflow checks pass at 390, 320 and 1440) and then
  fails at that same step. `scripts/simDraftNight.mjs` is red on main too (the NBA front office
  board does not hand its rivals to `buildDraftNight`). Neither is this round's file.
- One sentence in each of the four career guides (src/data/gameContent, the other lane's files):
  draft night is watched. No guide sentence became false.
- `/whats-new` is the one saved page that changes (one entry).
- Round B, the combine you run, builds on this head (sections 10 to 12 of the harness are kept
  free for it).
