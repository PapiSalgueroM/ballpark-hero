# Round 1210 notes: the owed fences, part one

Written 2026-10-10 by the builder of Round 1210 (desktop Claude lane, session G). Branch `r1210-owed-fences`, based on
origin/main `074a9054` (Release AS). Everything heavy ran on GitHub runners as remote checks; the result names below are
branches `origin/rc-results/<name>` and each one names the commit it checked.

Scope, by the lead's ruling: the four deterministic steps only. A flag in Footle and six nations under their
confederation (step 1), the Career Hub walk (step 2), the daily save flake (step 3), the storage seam's refused saves
(step 4). The summer balance check, the Hall marks tripwire and the Dart Draft league lookup are NOT in this round.

## What a later session must not trust
- Nothing here was run on the tree that holds Release AT, Round 1149 or PR216. `playCareerHub` counts every button
  holding a `div.uppercase` on the board, and PR216 adds a section to `UsCareerBoard.tsx`: rerun the walk there before
  trusting it. Round 1149 gives the Trophy Case tile a row "in other awards": same rerun.
- The builder took no Footle screenshots, and the reason first written here was false: with the database host blocked
  the pool is NOT empty. `src/hooks/useGame.ts` starts the pool as the committed `players.ts` and keeps it when the
  fetch answers nothing, and `scripts/qa/footle995.mjs` already walks the built page on a runner with the pool
  fulfilled from fixtures. The reviewer walked Footle on a runner at 390 and 1280 with the host blocked
  (`r1210-run-walk`: the example, sixteen feedback lines and Nation boxes, the receipt, each with its flag, 0 px of
  sideways scroll) and the screenshots are in `dukb-handoff/2026-10-10/review-shots/r1210/`. The jsdom test and its
  swap control stay the committed proof.
- `simNationalityFlags` is green WITH ONE OWED BARE PRINT, not with none (see step 1).
- `scripts/sweepWeight.mjs` is RED on this branch, on `/footle` alone, until the lead moves one row (the last section
  of this file has the numbers and the proof that the row at 348 is green). The branch does not move it: the budget
  rows are the lead's.

## Step 1: a flag beside every nationality in Footle, six nations under their confederation
Commits `bba8a70a`, `feb46ac4`, `7a591d03`.

Measured first on origin/main (`r1210-base`): `simNationalityFlags` exit 1, 8 failures. It named `Footle.tsx:190`,
`Footle.tsx:372`, the four nations (Niger, Namibia, French Guiana, Mauritius) and one thing nobody had listed:
`src/components/soccer-career/TrophyCabinet.tsx:135 prints {career.nationality} with no flag beside it` (the opened
trophy's "Won with ..." line, Round 1170, Release AQ).

What changed:
- `src/pages/Footle.tsx`: the how to play example, the practice feedback line and the Nation row of the player details
  print `<FlagImg name={...} size={12} showLabel />`. The facts array is typed `[string, ReactNode][]` so `key={label}`
  stays a string. Nothing else in the file moved.
- `src/lib/confederationGroups.ts`, `DISPLAY_CONFED`: Niger, Namibia, Mauritius and 'Southern Sudan' as CAF,
  Turkmenistan as AFC, 'French Guiana' as CONCACAF. Display only. `src/lib/soccerInternational.ts` is not edited
  (`r1210-s1`, line `soccer-intl-untouched`), so no qualifying draw moves. `src/lib/transferPathModes.ts` line 83 is
  the one other reader of `confederationFor` and asks only "is it UEFA": none of the six is, so Transfer Path's daily
  does not move.
- Sources, each read by the builder on 2026-10-10, two a nation, none a wiki:
  Niger, Namibia, Mauritius: inside.fifa.com/associations/NIG, /NAM and /MRI each print Confederation CAF;
  cafonline.com/member-associations lists all three among its 54 (Niger under WAFU B, the other two under COSAFA).
  Southern Sudan (the A-League map's spelling of South Sudan): inside.fifa.com/associations/SSD prints CAF;
  cafonline.com/member-associations lists South Sudan under CECAFA.
  Turkmenistan: inside.fifa.com/associations/TKM prints AFC; the-cafa.com names the Football Federation of Turkmenistan
  among its six members and calls CAFA one of the five regional associations of the AFC. (the-afc.com serves its
  member page by script and gave no text.)
  French Guiana: concacaf.com/inside-concacaf/member-associations/french-guiana says it became a full member of
  Concacaf in 2013 after more than two decades as an associate and says nothing about the world body;
  nbclosangeles.com (its report on Greenland's application) names French Guiana with Martinique, Guadeloupe, Bonaire
  and Saint Martin as Concacaf members the world body does not recognise. It is marked the way Guadeloupe and
  Martinique already are. No page of the world body's own was found that states the absence in words.
- `scripts/simNationalityFlags.mjs`:
  section 3 reads every map `nationalityOf` reads. The list comes from that function's own return line and the file's
  imports, never typed, and each league map is read as its own block (A-League 299 rows, Russia 402 rows).
  After that change and before the rows the fence named exactly six (`r1210-s1a`, `flags-six`, exit 1, 7 failures:
  the summary and Niger, Namibia, French Guiana, Mauritius, Southern Sudan, Turkmenistan).
  New control `league`: drops from the tables, in memory, a nation only a gathered league map carries (computed:
  Southern Sudan today) and section 3 must name it. The `confed` control now fires only when Argentina is named;
  before, any failure anywhere counted, so on a red main it was green whatever section 3 did.
  `OWED_BARE`, a ratchet for a bare print in a file this lane may not edit: one entry,
  `src/components/soccer-career/TrophyCabinet.tsx` `{career.nationality}`. It is printed on every run, covers exactly
  one bare print of that expression in that file, and fails as stale (with the entry to delete spelled out) the day
  the print has its flag. New control `owedstale`.
  The harness also prints `groups as placed` on a red run, which is how the picker was shown not to move.
- `src/test/footlePractice.test.tsx`: two cases. The feedback line, the Nation row and the example each hold one img
  whose alt is the nationality and whose src is on flagcdn.com; a nationality with no flag code prints as its bare name
  with no img and no svg.

Proof (`r1210-s1`, commit `feb46ac4`): tsc exit 0; vitest footlePractice exit 0, 11 tests; `simNationalityFlags`
exit 0 "green ... (owed: 1)"; controls bare, code, confed, league, owedstale each exit 0 with "control: green" (in THIS
harness a control that fires exits 0 and one that does not exits 1); simHarnessAnchors, simNoRivalNames (0 findings),
simNoInventedQuotes, simLegalPages exit 0.
The test's own control was a one off, run on that same request as line `footle-swap` (the script is not committed: it
writes three copies of Footle.tsx, each with ONE FlagImg put back to bare text, and swaps each in through
NO_DOUBLE_SWAP): "footleSwap: 3 of 3 controls FIRED, 0 problems", each turning exactly the flag case red on its own
site's message with the other 10 tests green.
Groups (`r1210-s1c`): the picker is UEFA 52, CONMEBOL 10, CONCACAF 15, CAF 34, AFC 22, OFC 1 with the base table and
with the new one. The market was UEFA 49, CONMEBOL 10, CONCACAF 21, CAF 37, AFC 18, OFC 4 and 6 unplaced; it is
UEFA 49, CONMEBOL 10, CONCACAF 22, CAF 41, AFC 19, OFC 4, 145 placed and none left over.
In a browser (`r1210-s2`, line `evidence`, a one off walk on the built site, database host aborted): Club Manager's
Market tab at 390 and 1280 draws six groups (Europe 48, South America 10, CONCACAF 17, Africa 37, Asia 15, Oceania 3,
130 nations in the default world), no "Elsewhere", Niger and Southern Sudan under Africa, Turkmenistan under Asia,
0px of sideways scroll.

## Step 2: the Career Hub walk
Commit `7dd91549`. `scripts/playCareerHub.mjs` only.

The walk had been red since Round 1008 made the Career Log open the season review, whose one way back reads
"Back to career" where the walk looked for "Hub". On the built site the walk as it stood on origin/main
(`r1210-s2`, line `hub-base`) fails `NFL: "Career Log" has a way back`, then waits thirty seconds on
`button:has-text("Hub")`, throws and exits 1 before the other three games.

Now each box carries the exact name of its own way back, a missing way back fails that one check and the walk reloads
to reach the hub again, and the Career Log is checked for what it is: three season tiles for the three seasons the
walk wrote, and focus back on the log's own box after "Back to career". The walk aborts the database host on every
context. No further drift was found behind the first failure.

Proof (`r1210-s2`, commit `7a591d03`, the built site behind the host like server, Chromium): `hub` exit 0,
188 PASS and 0 FAIL across the four games; `hub-revert` exit 0 "all 36 guarded checks fired (mutations landed:
inboxBox 8, moneyHeadline 8)"; `hub-logback` (new) exit 0 "all 4 guarded checks fired (mutations landed: logBack 12)".
In this walk a control that fires exits 0. Screenshots of the opened Career Log at 390 and 1280 (NFL) went to the lead
with the result files.

## Step 3: the damaged save test flaked on /olympics and /nba-career
Commit `36940d8a`. `src/test/dailySaveShapes.test.tsx` and `scripts/simDailySaveHardening.mjs`. No page and no hook.

The base rate, measured the way the cure was (`r1210-base-shapes`, origin/main, `R848_PART=shapes` twelve times, three
side by side): 12 of 12 runs red. /olympics in all twelve (the difference starts at the "How to play" button), and
/nba-career as well in two (the difference starts at `data-seo-content="ready"`). No other route and no other kind of
difference in the logs read.

The fault was the test's. It called a page settled after six turns of a zero timer and took its "fresh" baseline
then, and the first row to need a guide file could take it before that file's import had landed. Each row now fetches
its route's guide through the loader before its first mount and fails by name when it has not landed, and after the
last damaged form it mounts fresh once more, so a lazy piece that lands late is named as "the fresh page moved while
the row ran" and not as a damaged save's fault. Every `R848_SHAPES` line carries `guide: ready` or `none`, and the
shapes part fails on anything else.

`R848_GUIDE` switches the race on in the test, and the harness has three controls that do not depend on load:
- `guideslow`: the loader answers 300 ms late and the row does its fetch. "36 of 36 rows green with the loader 300 ms
  late (9 loads waited), 35 ready, 1 none".
- `guidelate`: the loader waits behind a gate, the row skips its fetch and opens the gate after its baseline (the two
  named guide assertions are off under it). "9 rows red, exactly the first row of each of the 9 guide files
  (/afl-higher-lower, /baseball-career, /career, /cfb-higher-lower, /football-grid, /hockey-career, /nba-career,
  /olympics, /career-ladder), 27 green; every failure a page difference". The set is computed from PATH_BUNDLE and the
  order of ROWS and must hold /olympics and /nba-career. This is the recorded red, on demand.
- `guideheld`: the gate never opens. "35 rows red, exactly the 35 rows whose route has a guide, each on the named
  assertion; 1 rows with no guide green".
In this harness a control that fires as designed exits 0.

Proof (`r1210-s3`, commit `36940d8a`): shapes exit 0 "36 of 36 routes ... (guide ready on 35, none on 1)"; the three
guide controls exit 0 "fired as designed"; the older `shape` control exit 0 "33 of 36 routes red; all 17 routes whose
game hands in no check threw"; parts saves, skip and parity exit 0; tsc exit 0.
The run count (`r1210-s3-battery`, same commit, the base's method): 12 of 12 green.

Two things found on the way and not changed:
- /shirt-number has a daily consumer and no row in PATH_BUNDLE, so it is the one "none". Whether it should have a guide
  is the guides' owner's call.
- `src/test/dailySaveParity.test.tsx` compares page frames too, but its page mounts wait on
  `vi.dynamicImportSettled()` four times and then on a ready condition (lines 260 to 265 and 309 to 316): a condition,
  not a count. It is not exposed the same way and was left alone.

## Step 4: the storage seam and the refused saves games remember
Commit `1e277e19`. `scripts/simStorageWrites.mjs` only. `src/lib/safeStorage.ts` is not edited (it needs no new
function: `holdPendingSave` already takes any retry).

Section 7 takes its sites from the write, not from what a state is called. Three detectors in union: a guarded storage
write whose catch calls a state setter, or a useState pair whose name says a save failed (`state:<name>`); a guarded
write whose catch does anything else at all (`write:<owner>`); and, one hop on, a call that keeps the answer of a
function whose catch answers false, or of `safeSetItem` (`keeps:<callee>`). A write with an empty catch remembers
nothing and is not a site.
Measured: 124 writes, 122 guarded, 85 with an empty catch, 37 that do something; 56 keys in 32 files (55 before the
review's fix pass gave a function's second write a key of its own, `write:switchSlot#2`). Every key is on exactly one
list: 1 NAMED (the US career board), 39 NOTHING_HELD in 25 entries, each with the line that shows it, and 16 OWED in
12 entries. A key on no list fails. An OWED entry whose file now names that save fails as stale and the message spells
out the entry to delete. The summary line ends "(owed: 12)".

NAMED is judged at the hold, one key at a time (the fix pass, see the last section): the function that calls
`holdPendingSave`, the innermost one, must read the state or a const made from it, in its body or in its hook's
dependency list. As first built the check climbed through every enclosing function, and the outermost is the component
or hook that declares the state, so one hold anywhere in a hook passed for every save the hook keeps. Both reviewers
found it; the first cut's sentence "held to it per site" was not true of the code.

Sites only the write could find, which no name pattern would: `useAussieRulesLeague.ts` and
`useAussieRulesManager.ts` (the state is `storageNotice`), `useMmaPromotion.ts` (a ref, `blocked.current`) and
`tycoonRewards.ts` (a module flag, `memoryOnly`).

Proof (`r1210-s4`, commit `1e277e19`): plain exit 0 "all green (owed: 12)". The three new controls exit 1 and say so:
unnamed "1 failed, the control FIRED on src/components/us-career/UsCareerBoard.tsx state:saveFailure", newsite
"1 failed, the control FIRED on src/components/FlagImg.tsx state:plantedNotice", stale "1 failed, the control FIRED on
src/pages/SoccerCareer.tsx state:saveFailed". The ten older controls exit 1 with "1 failed" (probe "2 failed", as its
header says). In THIS harness a control that fires exits 1, a refusal exits 2 and a new control that did not fire
exits 3. tsc exit 0; simHarnessAnchors, simNoRivalNames, simNoInventedQuotes exit 0.

## Owed, for the lead to pass on (nothing below was done here)
To the other lane:
1. `src/components/soccer-career/TrophyCabinet.tsx`: "Won with {career.nationality}" becomes
   `Won with <FlagImg name={career.nationality} size={12} showLabel />`, then the `OWED_BARE` entry in
   `scripts/simNationalityFlags.mjs` is deleted (the fence goes red as stale until it is).
2. Soccer Career names its refused save to the seam. In `src/pages/SoccerCareer.tsx`: `saveCurrentCareer` answers
   whether the write went through, the write goes through `safeSetItem(SAVE_KEY, ...)`, and one effect names the save
   while `saveFailed` is true, the shape of `UsCareerBoard.tsx` lines 370 to 374:
   `useEffect(() => { if (!saveFailed) return; return holdPendingSave(() => saveCurrentCareer()); }, [saveFailed, saveCurrentCareer]);`
   Its test is shaped like `src/test/usSeasonCentreEntry.test.tsx` ("the tile stays and says why when its Reload
   would lose a save the device refused"): that is the file that goes red when the board's hold is removed, moved or
   turned round (the reviewer's runs `r1210-run-hold`); `src/test/usCareerSaveRetry.test.tsx` stays green under all
   three and is NOT the worked example the brief took it for. Then its OWED entry in
   `scripts/simStorageWrites.mjs` moves to NAMED (the fence goes red as stale until it does). The hold must sit in a
   function that itself reads `saveFailed` (the effect above does); a hold that reads nothing is not counted.
   A hook that keeps two saves and names one (Footle's `useGame.ts` is the live candidate) is told "partly stale":
   only the named key moves to NAMED, the other stays owed.
3. The same for Footle's practice run and unlimited session (`src/hooks/useGame.ts`) and Rank Em's circuit
   (`src/pages/RankEm.tsx`).
4. Footle keeps its three FlagImg in its next round. Two places still print a country with no flag where the fence
   cannot see: the example string handed to the guide block (a plain string) and the nationality cells of
   `src/components/footle/FootleClueDesk.tsx`. A design question for the page's owner.
5. No guide sentence became false in this round that the builder could find.

To this lane:
6. Club Manager (`src/hooks/useClubManager.ts`, after Release AT lands) and the two Aussie Rules hooks name their
   refused saves to the seam.

For the lead to assign: Stadium Tycoon's ticket policy save, the tycoon rewards ledger, MMA Promotion's session, and
three low ones (the two Connections scratch notes, the pinned games list).

At release: the saved page of /whats-new is redrawn by the lead (this round writes nothing into `public/`).

## After the review: the fix pass (2026-10-10)
Two adversarial reviews (one that runs, one that reads) found two majors and a list of minors. What changed, each in
its own commit, each proven on a runner (`origin/rc-results/<name>`):

1. `scripts/simFootlePractice995.mjs` was RED on this round and nobody had run it: it pins the exact case list of
   `src/test/footlePractice.test.tsx`, and step 1 added two cases there. Re-recorded (commit `9776104a`): the two
   titles join the `mounted` list and nothing else moves. Proof before (`r1210-fix-p995a`): the branch exit 1 with
   the two titles the only `+` lines; the branch with only the test file taken from the merge base, exit 0. Proof
   after (`r1210-fix-p995b`): `FOOTLE_PRACTICE_CONTROL=all`, "28 modes completed", exit 0.
2. `scripts/simStorageWrites.mjs`, section 7 (commit `53dd2474`): a NAMED save is judged at its hold, one key at a
   time, and the climb stops at the function that calls `holdPendingSave`. An OWED entry with one of two saves named is
   "partly stale" and the message says which key moves. A function's second remembered refusal is a key of its own
   (`write:owner#2`; one today, step 3 of `switchSlot`). One file filter for sections 1 and 7, on forward slashes.
   Six new controls: `deadhold`, `partial`, `second`, `twolists`, `gone`, `floor` (19 in all). `r1210-fix-storage`:
   plain exit 0, 19 controls exit 1 with FIRED, and the reviewer's own mutations now read as the header promises
   (the hold moved to a function that reads nothing: red; a second save claimed NAMED with nothing holding it: red;
   Footle naming its practice run with the unlimited session honestly left owed: green).
3. `scripts/playCareerHub.mjs` (commit `c7a82516`): a way back that is there and does nothing costs one check, a
   reload and the walk goes on; the Trophy Case click is guarded; a game that throws fails by name and the next game
   runs. New control `deadback`. `r1210-fix-hub`: plain green, `revert` 36, `logback` 4, `deadback` 4, and with the
   season review's back button given an empty handler and the site rebuilt, exit 1 on exactly four failures, one a
   game, where the walk used to die in the first.
4. Two rules got the control they lacked (commit `bbcc2d3c`): `owedsecond` in `simNationalityFlags` (a second bare
   print in a file with an OWED_BARE entry is named, the first stays owed) and `guidepart` in
   `simDailySaveHardening` (the shapes part's own judgement names every row whose guide word is "skipped").
   `r1210-fix-ctl`: both exit 0 "green" and "fired as designed". What's New lost "same as everywhere else on the
   site", which was wider than the code.
5. The `guard` control of `simDailySaveHardening` had been red on main since Round 1003, which made NBA Connections'
   submit ask `takeNewerSave` before its own click: its click row of section 7 has two layers now. Re-recorded
   (commit `a1f07707`): eight target rows, and `stale` still turns the ninth. Proof before (`r1210-fix-guard`): 8 of 9
   red as it stood; 9 of 9 with that one line taken out of the hook.

Measured and owed to the lead, not changed here (the budget rows are the lead's): `/footle` weighs 348K of gzipped
JavaScript against its ceiling of 345K (`r1210-fix-weight`, exit 1, the only failure). Footle loads the flag component
for the first time in this round. The row in `scripts/sweepWeight.mjs` moves to 348 at the gate.

Not changed, and why: the two new Footle cases have no control inside `simFootlePractice995` (their control is the one
off swap, run by the builder and again by the reviewer, 3 of 3 fired); section 7's state keys are still one key a
state, so a second write that sets an already listed state rides on its entry (the state is what a hold reads, so it
is the unit); the fence cannot see whether a hold's condition is the right way round (a test holds that for the US
board, see above).

## After the closing check: the second fix pass (2026-10-10)
The closing check sent back one finding, the paragraph above about `/footle`, as a major: the release gate's
`sweepWeight` is red on any tree that holds this round until the row `['/footle', 345]` moves. Nothing in `src/` or
`scripts/` changed in this pass. The code is right, and the row is still the lead's.
- What the 3.1K is, file by file (`r1210-fix2-weight`, head `b954f79b`, the same job, the page opened the way section
  1 of the sweep opens it). The branch: 40 files, 356,415 bytes gzipped, 348.1K. The same tree with only
  `src/pages/Footle.tsx` put back to main's and the site rebuilt: 39 files, 353,305 bytes, 345.0K. The 3,110 bytes
  between them are one new file, the flags file `FlagImg` (2,976 bytes), plus 50 in Footle's own file, 26 in the
  entry and 58 spread over 25 files whose imports were renamed by the rebuild (1 to 5 bytes each). Twelve files are
  byte for byte the same weight.
- Why it is not lighter. Round 659 moved the flags out of the entry so that only a page that draws a flag pays for
  them, and Footle now draws one on its first screen: the rules open by themselves on a first visit (`Footle.tsx`
  lines 99 to 106) and their example sentence prints a pool player's nationality, with the pool there even when the
  database is not (it starts as the committed list). Asking for the flags file only when a flag is first drawn was
  MEASURED, as a rewrite made in the runner's checkout and never committed (`r1210-fix2-lazy`, head `b954f79b`): still
  40 files, 356,577 bytes, 348.2K, which is 162 bytes MORE than the branch, and the sweep is red the same way. So
  the page was left as it is. The only lighter Footle is one with no flag in the example, which is the feature.
- The lead's one step, proven. In the same job the row was moved to 348 in the runner's checkout only and the whole
  sweep exits 0 ("sweepWeight: green", `/footle` 348K over 40 files against 348). 348.1K is 449 bytes under the
  point where it rounds to 349, so the release sets the row from its own build, as every row comment there says.
  The edit is a script kept beside the report (`dukb-handoff/2026-10-10/results-g/fix2-1210-footleRow.mjs`).
