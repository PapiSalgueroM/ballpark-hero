# Round 1300: the playoffs game by game, part one (the pure deriver)

Written 2026-10-10 by the builder of the round (the desktop Claude lane, session G). Branch
`r1300-us-playoffs-deriver`, based on the head of Round 1221 (`origin/r1221-nfl-score-law`, `5d6ffbef`).
A player sees nothing yet: no component, no engine and no save field changed, and nothing under `src` imports
the deriver but its tests. The stage that shows it (Round B) and the NFL engine step that saves playoff numbers
(Round N) are later rounds.

## What the round added

| Step | What | Commit |
|---|---|---|
| 0a | The seeded fleet of the US careers lifted out of `scripts/simUsSeasonCentre.mjs` into `scripts/lib/usSeasonFleet.mjs`, a pure move, so a second harness plays the same careers | `440b8ce7` |
| 0b | The digest mode of that harness keeps a second receipt, `lay`, with its own control | `d2742308` |
| 0c | `scripts/data/usSeasonLayDigest.json`, recorded on a GitHub runner | `a79fa3b9` |
| 1 | `src/data/usPostseasonFormat.ts` and `src/test/usPostseasonFormat.test.ts` | `45488f8b` |
| 2 | `usPlayoffLay` in `src/lib/season/us.ts`; `usPlayoffPath` maps over it | `4d3ebd80` |
| 3 | `src/lib/season/usPlayoffs.ts` and `src/test/usPlayoffs.test.ts` | `293ba603`, `956ab63d` |
| 4 | `scripts/simUsPostseason.mjs` (the NBA), with the measured form number of the deriver | `63b95c7f` |

## Step 0: nothing already derived moves, and how that is held

The proof is the digest mode Round 1221 built into `scripts/simUsSeasonCentre.mjs`: one sha1 a sport and a seed
set over every season of the fleet as the viewer is handed it (the derived season AND the playoff path), and one
over the careers themselves. This round did not write a second recording mechanism. It added a second RECEIPT to
the same one:

- `US_SEASON_DIGEST_RECEIPT=lay` picks the record `scripts/data/usSeasonLayDigest.json`, whose moved list is
  `src/lib/season/us.ts` plus this round's two new files. The default receipt (`law`) is Round 1221's and every
  command of that round reads as it did.
- The record was printed on a runner at `d2742308`. That commit differs from the base `5d6ffbef` only in
  `scripts/` (the fleet lift and the receipt table), so its `src` tree is the base's byte for byte; the record
  carries the base's sha as its commit. Its ten digests are the ten of `scripts/data/usSeasonLawDigest.json`,
  compared field by field, which is the record Round 1221 made before its own move.
- Control `lay` swaps the two keyed shuffles that name a playoff run's opponents. The season digest of BOTH
  sports must move on every seed set, and the careers, the counts and the stray draws must hold.

After step 2 the law receipt answers "inputs moved under the digest" with exit 3, because `us.ts` is not in its
moved list. That is the mode working (Round 1221's notes say the same of any later round), not a red.

The fleet lift is a move in a file other rounds edit (Round 1212's brief edits that harness). The body of
`playCareer` was compared with the removed text and is equal character for character; the careers digests of
both receipts hold it on a runner.

## Step 1: the real format as data

`src/data/usPostseasonFormat.ts` holds three rows: the NBA from 2003-04 to 2019-20 (2019-20 marked as played to
another format), the NBA from 2020-21 on (with the play-in as the stage before round one) and the NFL from 2020
on. What it types is only what the repo did not hold: the clubs in the bracket, the byes a conference, the stage
before round one, whether the last round is the only one against the other conference, the season played to
another format and the windows' years. The round names and lengths are read from `US_PLAYOFF_FORMAT`
(`src/data/usLeagueShape.ts`), typed there once. A round is handed on as `{ name, series }`, the shape Round
1226's `postseasonRounds` gives the MLB and NHL careers. No MLB row and no NHL row.

Sources, all read by the builder on 2026-10-10 through a fetch that summarises a page and quotes it (said in
the file's header too, so nobody takes the wording for the page's):

| Fact | Publishers |
|---|---|
| NBA: 16 clubs, eight a conference, since the 1984 playoffs | CBS Sports (20 May 2021); NBA.com, an official release (19 April 2018); Sports Illustrated (24 February 2025) |
| NBA: the Finals is the only round against the other conference | ESPN (30 May 2026); Sports Illustrated (24 February 2025) |
| NBA: the first round a best of seven from the 2003 playoffs | NBC Sports, a press release (5 May 2026); the lengths themselves are `US_PLAYOFF_FORMAT`'s on its own two sources |
| NBA: a play-in for places 7 to 10 of each conference, in full from 2020-21 | NBA.com (18 April 2026); CBS Sports (20 May 2021); Sports Illustrated (24 February 2025) |
| NBA: 2019-20 played to another format (a first version of the play-in) | CBS Sports; Sports Illustrated |
| NFL: 14 clubs, seven a conference, from the 2020 season | ESPN (31 March 2020); Sports Illustrated (13 November 2024); NBC Sports (7 January 2026); Fox Sports (22 December 2025) |
| NFL: only the top seed of each conference skips the Wild Card round | ESPN; NBC Sports; Fox Sports |
| NFL: the Super Bowl is the only round against the other conference | NBC Sports; Sports Illustrated |

Marked thin and not filled (`US_POSTSEASON_THIN`): which clubs the 2019-20 version of the play-in was open to;
whether a play-in game counts in playoff statistics; how many clubs skipped round one in the NFL before 2020 (no
row is needed: every NFL season the Season Center opens is 2021 or later).

Three choices of the builder, each stricter than the draft:
- sources are recorded FACT BY FACT (`src: { clubs: [...], byes: [...] }`), and the test counts two publishers
  for every fact a row states, so a row with five sources and one single sourced field cannot pass;
- `byes` is typed AND held to `clubs` as a pair (a knockout of R rounds seats 2^R, and a bye is a seat nobody
  fills), in the test and again in section D of the harness;
- no web address is typed in the file (`scripts/simLiveScores.mjs` forbids a feed host outside a cited url
  field, and a publisher's name and a title are enough to find a page).

The conference bracket of the NBA (open question 8 of the draft) is now two sourced, so `lastRoundOnlyCross` is
true for both sports and nothing about the path's opponents changed.

OWED, for a later round: a test that ties the NFL's `clubs` and `byes` to Round 1224's bracket data
(`src/data/gmBrackets/nfl.ts`) once both are on one base.

## Step 2: the lay

`usPlayoffLay(bind, row, ctx, key)` returns the playoff run as numbers: for each round the opponent's slot, wins
needed, the most games, whether he won it and the games it ran to (null when the saved count is absent or does
not fit). Every draw `usPlayoffPath` made is made there, in the same order on the same key (`|po`), and the path
is now a mapping over it with its signature and its result unchanged.

THE LINES OF `src/lib/season/us.ts` THIS ROUND CHANGED, and no other: 135 to 140 (the comment and the two types
`UsPlayoffSeries` and `UsPlayoffLay`) and 287 to 354 (`usPlayoffLay`, then `usPlayoffPath` as a mapping). The
header, `buildUsSeason` and `usHelp` are as they were. The key streams the deriver adds are written in the header
of `src/lib/season/usPlayoffs.ts` and not in this file's, to keep this file's diff to those two places (Rounds
1226 and 1212 edit it next).

The three strings the harness's controls patch are each in `us.ts` exactly once: the `conf` line, the tail the
`poscore` control rewrites, and the two shuffle lines of `lay`.

FOR ROUND 1212 (the critic's correction 10): this refactor landed first. That round's hunks 4 and 5 (a path that
returns null before a year, and a saved count the rounds cannot hold) are a few lines against `usPlayoffLay`
now, and they move the path's JSON on purpose, so the lay receipt must not be compared across them.

## Step 3: the deriver

`src/lib/season/usPlayoffs.ts`, pure (it imports `./core`, `./us`, `../keyedRng` and the format data):

- `usPostRow(bind, row, pos, games)`: the saved line as a playoff row. Every stat field of his position is
  replaced by the number saved under "po" plus that field with a capital, or removed; null when the line holds
  not one. Nothing is parsed out of a sentence, so every NFL season saved so far gives null.
- `usPostTotals(totals, games)`: a sum as it is; a mean of whole numbers as the whole total nearest to mean
  times games, worked in tenths (`Math.round((Math.round(mean * 10) * games) / 10)`). The float trap is real and
  the unit test names two cases: 4.1 times 15 and 2.3 times 25 are a hair under a half as floats.
- `usSeriesOrder(need, games, won, rng)`: the clincher last, the rest a keyed shuffle.
- `usPostseasonOrWhy(bind, row, ctx, key)` and `usPostseason(...)`: the run, or why not, or null.
- `usPostProblems(p, lay, row, held)`: the module's own agreement list. `usCountWords(at, need)`: the count in
  words ("You lead 2-1", "Series level 1-1", "You win the series 4-2", "You are out").

What the critic's corrections changed against the draft, as built:
- HIS SIDE IS FIRST AND SECOND ALTERNATELY (correction 6): game 1, 3, 5 of the deal with his side first, a fixed
  pattern with no draw. `home` on a playoff game is a scoring input only and is never to be printed.
- THE LEAST REPAIRED TRY (correction 7): all `PO_TRIES` (12) keyed tries count, and among those that pass every
  check the one with the fewest repairs is returned, the lowest number on a tie. The loop stops at the first try
  with no repair, which is the same choice (nothing later can have fewer and a tie goes to the lower number).

Choices of the builder, said here so nobody takes them for the draft's:
- `usPostseason` takes `(bind, row, ctx, key)`, the shape of `usPlayoffPath`, and no `career` argument: the
  context already holds his position and era, and the key is handed in.
- The result carries `try` (which of the tries was taken) so a harness can print its distribution.
- `PO_MEAN_FORM = 0`, where the draft typed 0.5 unmeasured: see the table in step 4.
- `held` lists the core's own totals. A bind whose `finish` lays further numbers (the NFL's yards) holds those
  through its own `check` on the playoff row; the independent checker of the NFL round must restate them.

One unit test goes past this round's sport on purpose: an NFL quarterback line with playoff numbers typed under
the naming rule a later round will save them by (`poPassYds`, `poPassTd`, `poInts`) is laid out through the NFL
bind by the same code, to show nothing in the deriver is the NBA's. It asserts the sum rule on every one of
eight keyed careers that lays out and that at least one does; how many of an NFL fleet lay out is Round N's
measurement, not this round's.

## Step 4: the harness and what it measured

`scripts/simUsPostseason.mjs` plays the fleet of `scripts/simUsSeasonCentre.mjs` (the same loop; its info lines
say the careers are the lay receipt's, career for career, on all five seed sets) and holds every NBA playoff
season the Season Center opens against the save. It runs in about 15 seconds.

| Section | What it holds | Controls that name it |
|---|---|---|
| D | the format rows as the bundle holds them | `onesrc` |
| S | the sum rule, by an independent checker with its own tables | `sum`, `drop`, `clinch`, `allhome` |
| C | it fails closed, and the list is what it was | `open` |
| F | measured (below), with one hard bar | `tries` |
| K | coverage, a fail when short | `thin` |
| X | twice, from a JSON round trip, and not one Math.random | `stream` |

Not in this harness, on purpose (the critic's correction 8): `level` (no NBA game can be level; it is an NFL
control and waits for the NFL's numbers) and the NFL engine's two controls (Round N's own test).

### The table (2026-10-10, 40 careers a seed set, seed sets 0 to 4)

2,001 NBA playoff seasons the Season Center opens, 22,033 playoff games. EVERY ONE LAID OUT: not one failed
closed, which is the bar the critic set for the NBA (a refusal would be a bug to read, not a share to tolerate).

| PO_TRIES | Playoff games the core repaired | One point playoff games |
|---|---|---|
| 1 (the first try stands: the design before the critic's correction 7) | 10.78% | 15.76% |
| 3 | 3.87% | 8.96% |
| 6 | 1.59% | 6.71% |
| 12 (as shipped) | 0.34% (by seed set 0.39, 0.30, 0.26, 0.31, 0.45) | 5.61% (by seed set 5.76, 5.31, 5.28, 5.93, 5.69) |
| 24 | 0.01% | 5.31% |

The regular season of the same careers, for scale: 0.30 repairs a season of 82 games (0.37% of its games) and
5.65% one point games over 331,444 games (5.61, 5.63, 5.63, 5.73, 5.65 by seed set); over the playoff seasons
only 5.93%, and over the first G games of those seasons (the playoff run's own size) 5.77%.

By depth at 12 tries: a first round exit 999 seasons, 5,586 games, 0.18% repaired, 5.35% one point; the
conference semis 476, 5,304, 0.34%, 5.98%; the Conference Finals 245, 4,130, 0.41%, 5.38%; a lost Finals 122,
2,714, 0.41%, 5.12%; a title 159, 4,299, 0.47%, 6.02%. The try taken: 594 runs took the first, 436 the second,
and 21 the twelfth. 1,925 runs needed no repair, 76 needed one, none needed two.

His side's strength (the pull toward even, 0.3 to 0.7 of the run's games): with it 0.34% repaired, 5.61% one
point, 17.66% of playoff games decided by 20 or more, won by 11.7 and lost by 11.7 on average; without it
(variant `noclamp`) 0.33%, 5.52%, 18.19%, 11.7 and 12.0. The regular season: 19.10%, 11.8 and 12.4. The 128
series lost in four straight were lost by 11.9 a game on average.

His lowest game of a run as a share of his average game (p10, median, p90), by how much of the core's form a
total made from a mean follows: 0 (as shipped) 0.34, 0.63, 0.81; 0.25: 0.30, 0.59, 0.79; 0.5 (the draft's
number): 0.25, 0.53, 0.73; 1: 0.15, 0.37, 0.59. The first G games he played of the same regular seasons: 0.51,
0.63, 0.77.

### What the table says, for the lead's bars

1. THE ACCEPTANCE AS WORDED IS NOT A GATE, AND WHY. "One point playoff games inside the spread, over the five
   seed sets, of the regular season's share" reads INSIDE at 12 tries, at the very edge (5.61% against 5.61% to
   5.73%), and OUTSIDE BELOW at 24 tries (5.31%). The reason is in the table: the regular season carries its
   own repaired games (0.37%), so the score law by itself gives about 5.3% and a playoff with NO repair at all
   falls under the regular season's spread. And the spread of five shares on 66,000 games each is narrower than
   the noise of one share on 22,000. So the harness prints the acceptance as a line that starts "ACCEPTANCE",
   counts an OUTSIDE as a finding in its closing line, and gates on the direct measure instead.
2. THE BAR THE BUILDER SET, for the lead to keep or change: at most 1.0% of playoff games repaired. Three times
   what 12 tries measure and under what six give, with the control at 10.78%.
3. PO_TRIES STAYS 12. At 12 a playoff game is repaired as often as a regular season game (0.34% against 0.37%)
   and the two one point shares meet (5.61% and 5.65%). 24 would remove the last repairs and put the playoffs
   under the regular season.
4. THE PULL TOWARD EVEN CHANGES LITTLE (0.34% against 0.33% repaired; half a point of games by 20 or more). It
   is kept as the draft had it. Dropping it is one line and moves no check here.
5. THE FORM NUMBER WAS CHANGED FROM THE DRAFT'S 0.5 TO 0, because that is where the median of his lowest game
   meets the regular season's (0.63 both). The low tail stays heavier than the regular season's (p10 0.34
   against 0.51): a total is handed out a unit at a time, and for a man who averages four points that is a lot
   of noise. Left as measured; a floor a game would be a rule of its own.
6. NO FIRST ROUND EXIT OF FOUR GAMES EXISTS in a save an engine wrote: the engine's count for one round is 5 to
   7. A series of four games only happens inside a longer run.

## The proof, step by step, with the runner result of each

Every heavy check ran on a GitHub runner as a remote check; a result is read with
`git show origin/rc-results/<name>:summary.txt`.

| Step | Head | Result | What it shows |
|---|---|---|---|
| 0 | `d2742308` | `r1300-s0` | Round 1221's compare 0 after the lift (11 digests, 0 moved) and 0 in a worktree of the base; the lay record printed; the default run 0 (98 checks, 0 failed); `lawdrift` 1, red at its named check; simHarnessAnchors 0; the type gate 0 |
| 0 | `a79fa3b9` | `r1300-s0b` | the lay compare 0 (11 digests, 0 moved); control `lay` 1, red at its named check (10 moved); `lay` with the law receipt refuses to run (2) |
| 1 | `45488f8b` | `r1300-s1`, `r1300-s1b` | the type gate 0; the format test 0 (10 tests); simLiveScores 0; simNoRivalNames 0 (0 findings); simNoInventedQuotes 0; simLegalPages 0 |
| 2 | `4d3ebd80` | `r1300-s2` | the type gate 0; the lay compare 0 (11 digests, 0 moved: the path of every season is what it was); `lay` 1 at its named check; the default run 0 (98 checks, 0 failed); `conf` 1 at its named check (1,585 seasons); `poscore` 1 at its named check (1,220 seasons); five test files 0 (122 tests); simHarnessAnchors 0 |
| 3 | `956ab63d` | `r1300-s3b` | the type gate 0; the deriver's and the format's tests 0 (29 tests); the lay compare 0. (`r1300-s3` on `293ba603` was red on three defects of the test file itself: the name of the NFL label function, the way a build is narrowed, and a float example that was not one) |
| 4 | `63b95c7f` | `r1300-s4b` | one at a time: simNoRivalNames 0, simNoInventedQuotes 0, simNumberFormatting 0, simLegalPages 0, simStorageWrites 0 |
| 4 | `63b95c7f` | `r1300-s4` | the type gate 0; six test files 0 (141 tests); `node scripts/simUsPostseason.mjs` 0 (26 checks, 0 failed, 0 findings); its nine controls each 1, each RED AT THE NAMED CHECK with only its own section red (`onesrc` D; `sum`, `drop`, `clinch`, `allhome` S; `open` C; `tries` F; `thin` K; `stream` X); the variants print the table above figure for figure (one, three and six tries exit 1 because they are over the bar, as they must be); one seed set alone 0; a fleet of ten careers 1 in section K only, by design; the lay compare 0; the default run of `simUsSeasonCentre` 0 (98 checks, 0 failed); simHarnessAnchors 0; simLiveScores 0 |

The browser walk of the Season Center on a build (`r1300-walk`) and the checks of the final head
(`r1300-final`) are recorded in the closing report of the round, `finish-1300.md` in the lane's handoff folder,
with their exit codes: they were still queued on the runners when this file was last committed.

## What this round did not do, and what is owed

- NOT BUILT, by the lead's decision: the NFL engine step (Round N), the stage and every word a player reads
  (Round B), any file under `src/components`.
- NOT RUN: the whole unit suite, `runAllSims` and the release gate (the lead's, at the train). The careers'
  own harnesses (`simNbaCareer`, `simNflCareer`, `simCareerHall`, `simUsBoardParity`) and the truth digest were
  not run because no engine, no save field and no board file changed (the careers digests of the lay receipt
  hold the engines' streams for both sports).
- NO GUIDE SENTENCE IS OWED to the other lane and there is no What's New entry: a player sees nothing.
- A GATE LIST LINE to add: `node scripts/simUsPostseason.mjs` (runAllSims finds it by its name).
- THE LAY RECEIPT IS A RECEIPT OF THIS BASE. On a tree that also holds Release AT, Round 1226 or Round 1212 it
  answers "inputs moved under the digest" with exit 3, by design. A later round that wants the same proof
  records again on its own base.
- THE INFO LINES "P" of the new harness will read "NOT the lay receipt's" the day an NBA engine changes on
  purpose. They are info and fail nothing.
