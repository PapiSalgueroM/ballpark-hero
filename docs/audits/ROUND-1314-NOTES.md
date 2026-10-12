# Round 1314 notes: owed fences D, part one

Written 2026-10-12 by the builder (desktop Claude lane, session H). Kept current at every push. The full closing
report, with every runner result name, is C:/Users/antho/dukb-handoff/2026-10-10/results-g/finish-1314.md on the
owner's PC. This round ships no byte to a player: it edits only harnesses and walks under scripts/ and this file.

## Step 1: the thirteen owed checks on main, one row each

Measured on GitHub runners through the lane's remote check kit. Node harnesses: request `r1314-s1a`, head
35f85630 (origin/main before Release AY; AY touched none of the files those ten read). Walks: request `r1314-s1b`,
head 1f99084f (this branch with origin/main 21941630, Release AY, merged; AY edits the NFL front office board two
of the walks drive). Seconds are the runner's.

| Name | Run (exit, seconds) | First failing line there | What it protects | Verdict and cause | Fix |
|---|---|---|---|---|---|
| simSafari | s1a: exit 1, 1 s | `src/hooks/useTransferPathGuidance.test.ts: regex lookbehind`, then `src/components/club-manager/LiveSimMotion.css: hand written 100vh` | Nothing shipped breaks the iPhone the owner plays on | STALE twice: a vitest file is not shipped (04e1e2d9, Round 1010a); a 100vh fallback followed by 100dvh is the cure, not the fault (b458d699, Round 1101) | 3.2, done |
| simActivityNotCompletion | s1a: exit 1, 4 s | `the season advance (advanceProSeason(career, clubs)) is not in the file` | A played Soccer Career season pings activity and never writes a ranked completion | STALE anchor: Round 1047 (1c8ce33c) wrapped the call as `stepWithMomentsBanked(c => advanceProSeason(c, clubs))`; the ping is 44 characters after the call | 3.3, done |
| simHalftime | s1a: exit 0 three times (350, 344, 270 s); gains 1.57, 1.69, 2.37 against bars 1.13, 1.14, 1.17 | none on these runs (rAV-gC red at 0.91 against 1.11) | Working the halftime break is worth points | COIN TOSS: unseeded fleets of 800 seasons an arm | 3.4 |
| simEras | s1a: exit 0, 559 s | none | Club Manager's eras and ageing | GREEN since Round 1304, in lane C since Release AX. Thin margins read here: section 5's champion points gap 2.9 against 4; section 4's world XI mean 70.1 to 70.8 against the 71.6 anchor, band 2.5 | 3.8, a row only |
| simGmXp | s1a: exit 1, 1 s | `nbaFrontOffice.ts no longer grows a young player the way this harness reads`, then mlbFrontOffice.ts, then `came back thin` | Every number a GM board stores is one it can hold | STALE regex: Rounds 1018 (93a18bc2) and 1020 (08c90228) split the growth line in two | 3.9, done |
| simGmCalendar | s1a: exit 1, 1 s | `Everton seasonDays: hash 158dee139333cccc41abdbfc != recorded 4f6e77bb426d72edb25d0123` (6 failures: seasonDays and monthGrid of Everton, Augsburg, Norwich City) | Club Manager's calendar did not move in the lift into shared modules | STALE pin, mover not yet found | Round 1316 |
| simGmDealTableFixture | s1a: exit 1, 1 s | `section B no longer replays (720 lines recorded, 720 now)`, `section C no longer replays (101 lines recorded, 126 now)` | Club Manager's deal table did not move in the lift | STALE pin: the modern market moved; section A still replays | Round 1316 |
| simGmStaff | s1a: exit 1, 2 s | `Arsenal natural: line 5 of 81 differs` (16 failures, all section 1; `day one levels: 846 clubs hash 07703bf4bf47a880, the fixture has 760 at e67d11c154e316d0`) | Club Manager's staff desk did not move in the lift | STALE pin: picks by index and an all club hash move with every league added | Round 1316 |
| playNationJob | s1b: exit 1, 36 s | `TimeoutError: locator.click: Timeout 30000ms exceeded ... waiting for locator('text=Take the job')` at line 47 | You can be offered your country's job and take it | STALE walk, two presses: the Round 1052 sentence under the title takes 'text=Premier League', and the Round 928 "Managers" switcher takes the MANAGER substring | 3.5, done |
| playFoHub | s1b: exit 1, 47 s, 26 failures | `NFL: the hub opens on five boxes (saw 9)`, then the same on MLB, NBA and NHL; NBA also `the roster box names Nikola Jokic` and `a fit squad puts the dot out` | The four front office hubs open on the boxes they name | STALE walk: nine boxes since the GM desks (Staff, Re-sign desk, Draft picks, Trade desk), each box carries 4 lines; the NBA roster box obeys Round 722's floor line. Release AY's Game Day tile did NOT change the NFL hub's count or titles (Roster, Free agency, Trades, This week, Standings and the four desk boxes) | Round 1317 |
| playGmPress | s1b: exit 1, 30 s, 2 failures | step 4: `the offseason set a new mandate` AND `the feed credits the press answer for the softer bar` | What you say at the podium softens next season's mandate | STALE walk, by the probe of correction 1 (`r1314-wild1`, label gmPressProbe, on 2e288252 with Release AY): the walk's first `.grid button` press hits the franchise tag panel's "Tag" button (Round 723), the next two draft, and it stops with "You hold 1 pick"; the hub is never reached. Drafting on until "That is your draft done" and pressing the card's Continue reaches the hub, whose five drawn feed rows were: the last pick, "The re-sign desk: 0 kept, 2 gone.", "You left 2 deals open, so your staff settled them by its own rule.", "The new mandate: ...", "Your ask for patience was heard. The bar sits softer." Both lines drawn, the patience line as the LAST of the five. So this run supports the stale walk cause. The critic's slice cause is still live as a DEFECT candidate in other states: any further line ahead of them (Round 828's over the limit line, or a third desk line, a staff walk) pushes the patience line past the hub's five rows, and on the draft screen's four rows it was already not drawn. Round 1317 reads the MLB, NBA and NHL boards the same way | Round 1317 |
| playWilderness | s1b: exit 0 three times, 17, 59 and 16 s | none on these runs (rAXg-F-J5 red at 98 s) | A sacked manager has a way back into work | COIN TOSS (unseeded page) | 3.6 |
| playClubManager | s1b: exit 0 three times, 272, 269 and 276 s; each "played the season out", 2 signings, 43 to 44 windows | none on these runs (Round 1304: 5 red in 22) | A full season plays through the real screens, signings and the review included | COIN TOSS (unseeded page; a sack before the first signing) | 3.7 |

## Why the list of thirteen is complete

The last two full sweeps, r1306-sweep1 and r1306-sweep2 (126 lines each, heads 4972c6d3 and 449361a1, both before
Round 1304's fix), were red outside this list only on simBracketMoment (green since r1304-fx3b, rAX-gB and
rAXg-F-B2, in lane B), simEra2005 to simEra2020 (fixed by Round 1304, in lane C) and simWindow2026Bundesliga (it
reads the live database and is unreachable by design on a runner; it must stay off every gate list, because the
gate generator's live test would not skip it: it builds the client path with path.join). A fresh full sweep is
the lead's call after Release AZ.

## Fixed items

### 3.2 simSafari (commit f8c3459a)

What ships is src/ without its tests: src/test and every `*.test.*` or `*.spec.*` file are left out (on 35f85630:
2071 files under src, 519 left out, 409 under src/test and 110 elsewhere; on bcbc7f27 after Release AY: 2077,
522, 409 and 113). A new section 0 fails if a kept file imports a left out one (static import, `export ... from`,
`import()`, through the @/ alias or a relative path, comments stripped). Section 4 accepts a 100vh only when the
same block sets the same property again in dvh, svh or lvh AFTER it, read with comments stripped.

Controls (SIM_SAFARI_CONTROL, each adds one file in memory; "FIRED" exits 1, "DID NOT FIRE" exits 2): lookbehind
(section 2), testimport (section 0), barevh, vhafter and dvhcomment (section 4). Proof `r1314-s2` on bcbc7f27:
green exit 0 in 1 s; all five controls exit 1 with "control NAME FIRED: section N failed on src/__control__/..."
and 0 other failures.

### 3.3 simActivityNotCompletion (commit 24ac3089)

The anchor is the one call `advanceProSeason(<name>, ...)` in the comment stripped SoccerCareer.tsx; none fails,
more than one fails (a second advance is a new site the check must be told about). The 600 character window is
unchanged; the measured distance from the call to the ping is 44 characters. Sections 1 and 3 untouched.

Controls (SIM_ACTIVITY_CONTROL; "fired in section N as expected" exits 0, anything else exits 1): match (section
1), career (section 2, now judged on its exact sentences: the ping line and the completion line, never the anchor
line), heavy (section 3), and new noping (the ping line alone) and twocalls (the anchor line alone). Proof
`r1314-s2` on bcbc7f27: green exit 0 in 5 s (vitest 2 passed); all five controls exit 0 with their sentences.

### 3.9 simGmXp (commit bcbc7f27)

The growth reader takes the one line form and the two line form (`const step = a + floor(rng() * n)` whose name
is the default arm of the very next `p.ovr = Math.min(p.pot, p.ovr + (opts?.growth ? ... : step))`), keyed on the
shape, not the name. Real inputs now read growth draws NFL 1/2, NBA 1/2/3, MLB 1/2/3, NHL 1/2/3.

Controls (GMXP_CONTROL; the house convention: every control exits 1, "N failure(s) under GMXP_CONTROL=NAME" means
it fired, "did not fire, every check stayed green" means it is broken): new growthshape (the NBA step written as
`floor(rng() * 3) + 1` in memory: the "no longer grows" line for nbaFrontOffice.ts alone, and the thin line), and
the nine existing ones. Proof `r1314-s2` on bcbc7f27: green exit 0 in 1 s; all ten fired (growthshape 2,
curvestep 6, gmcap 137, nocap 114, saturate 7, notneutral 11, claim 1, fractional 50, pastceiling 2,
cushiongain 1).

### Common gates on every push

`r1314-s2` on bcbc7f27: simHarnessAnchors exit 0 (45 s), simNoRivalNames exit 0 (23 s, 0 findings),
simNoInventedQuotes exit 0 (30 s). `git diff --stat origin/main -- src public index.html package.json
package-lock.json vite.config.ts tsconfig.app.json` prints nothing at every push (merges of main aside).

### 3.5 playNationJob (commit 0cc1de05)

The league press is the league tile (`button:has-text("Premier League")`, as in the sibling walks since Round
1304); the three Manager tile lookups are one helper that takes the button whose title element (`div.uppercase`)
reads exactly Manager, asserted to be exactly one. The walk blocks the database host and leaves a 390 screenshot
of the job card after the reload in $RC_OUT.

Control NATION_JOB_CONTROL=nooffer (servedCodeControl: exit 0 on "all N guarded checks fired", 1 otherwise): the
served offer becomes `null&&{nation:...}`, anchored on the minified return `{nation:X,blurb:\`${X} want you for
the national team alongside the ` (property names and the literal survive minifying, nationOfferFor's name does
not); the run refuses unless the anchor matches exactly once in dist/assets. Guarded: the tile says the country
is calling, the offer card is on the manager panel. Proof `r1314-s3` on 0cc1de05: playNationJob-1 and -2 exit 0
(15 s each); nj-nooffer exit 0, "all 2 guarded checks fired (mutations landed: {"nationOffer":2})" (two page
loads, one hit each).

### 3.6 playWilderness (commit 2e288252)

The page plays on a seeded stream (WILDERNESS_SEED, scripts/lib/pageSeed.mjs; unset is the file name's seed
2899200577), printed first. The loop prints per 40 step block the matches played and board confidence read
from the save and the presses that changed nothing, the step of the sack with the page's draw count, the waits
before a club called, and on a miss the visible buttons and a 390 screenshot in $RC_OUT. The walk blocks the
database host. The sack is deterministic once confidence reaches zero (clubManager.ts, `if
(state.boardConfidence <= 0) state.sacked = true`, two sites).

Seed table, request `r1314-wild1` on 2e288252 (sent 14:50 EDT, ran 19:03 to 19:12 UTC), every run exit 0:

| Seed | Sacked at step | Matches played | Page draws at the sack | Waits before a club called | Seconds |
|---|---|---|---|---|---|
| default 2899200577, run 1 | 6 | 3 | 4042 | 3 | 20 |
| default, run 2 | 6 | 3 | 4042 | 3 | 20 |
| default, run 3 | 6 | 3 | 4042 | 3 | 20 |
| default, CPU throttled at rate 4 (CDP, probe .rc/x/mkThrottle.mjs) | 6 | 3 | 4042 | 3 | 23 |
| 1 | 52 (block 1: 20 matches, confidence 7.8) | 25 | 6349 | 3 | 54 |
| 2 | 2 | 1 | 1307 | 2 | 17 |
| 3 | 4 | 2 | 2700 | 1 | 18 |
| 4 | 38 | 19 | 21982 | 2 | 41 |
| 5 | 2 | 1 | 1288 | 6 | 19 |
| 6 | 4 | 2 | 2694 | 1 | 18 |
| 7 | 16 | 8 | 9225 | 1 | 26 |
| 8 | 6 | 3 | 4069 | 8 | 23 |
| 9 | 2 | 1 | 1414 | 3 | 18 |
| 10 | 2 | 1 | 1371 | 4 | 19 |

Every run drew 4 times before its first kick off. The default seed gave the same ending, step, matches, draw
count and waits in three runs and under CPU throttling. The second request at least an hour later is in the
reproducibility section below.

Controls (servedCodeControl: exit 0 on "all N guarded checks fired", 1 otherwise). nooffers (existing): exit 0,
24 s, "all 1 guarded checks fired (mutations landed: {"offerList":1})". New nosack: refuses unless one built
chunk holds exactly the source's sack sites (it found `2 sack site(s) in clubManager.ts; in dist/assets:
clubManager-D-vLrbID.js 2`); exit 0, 98 s, "all 1 guarded checks fired (mutations landed: {"sack":8})", four
loads of two sites; its diagnostic printed block 1 (20 matches, confidence 0), block 2 (39 matches,
confidence 2.9), then NOT sacked after 120 steps with 58 matches played, season 2 week 25, and no press that
changed nothing. So a 120 step miss on main would now say which it was.

### 3.8 simEras: GREEN, a row only

Read once on main in step 1 (`r1314-s1a`, 35f85630): exit 0 in 559 s, "ALL ERA AND AGEING CHECKS PASSED". The two
thin margins Round 1304 reported, read on this run: section 5's champion points gap 2.9 against its 4 (frozen
clock 81.4, ticking clock 84.3), and section 4's world club XI mean 70.1 at year zero and 70.6 to 70.8 after,
against the anchor 71.6 with a band of 2.5. Not edited here: Release AZ's merge took main's simEras.mjs byte for
byte and PR224's 44 line edit is owed back, so the margins round comes after that owed edit lands. Tell AZ's
integrator that a lane C red on the champion points gap is this known thin margin, to be measured, not waved
through.

## Owed to others (for the lead to pass on; never done here)

- Round 1311's integrator reruns playClubManager AND CM_CONTROL=nobusiness (1311 edits
  ClubManagerSeasonSummary.tsx, whose `signings.length>0&&` guard the control rewrites and refuses unless it
  matches exactly once). A SHALLOW red after a sack on an unseeded tree is the known item 3.7 fixes.
- PR238 (codex/career-guide-clarity), PR241 (codex/career-potential-progress) and
  codex/career-guide-fixture-refresh all edit src/pages/SoccerCareer.tsx: their integrators rerun
  simActivityNotCompletion once this round is on main (none touches the advance handler, so it should hold).
- PR223 and PR227 (codex/manager-ucl-league-phase, codex/manager-ucl-finance) edit src/pages/ClubManager.tsx, the
  header and hub tiles playNationJob presses: their integrators rerun playNationJob.
- Release AZ's integrator: the seeded default rows of simHalftime, playWilderness and playClubManager are this
  round's builder's to re-measure if AZ lands on main first; otherwise AZ's integrator reruns the three with their
  seeds unset and reads them as gate lines (a red there is an engine change moving a seeded sample, to be
  measured, never re-seeded for green). The three Club Manager pins (simGmCalendar, simGmDealTableFixture,
  simGmStaff) are Round 1316's, after AZ.
- Rounds 1308 and 1309 change how an NFL season ends; Round 1317 builds playGmPress and playFoHub on 1309's file.

### 3.7 playClubManager (commits e07cd2df and 48a3e61f)

The lead's ruling (the critic's answer 3, option (a) WITH the seed): the page plays on PLAY_CM_SEED (unset is the
file name's seed 1542433760), printed first; before the first kick off the save's board confidence is doctored
from 60 to 100 from robots.txt (the Round 196 rule), and the walk proves it landed off the manager slot screen,
the only place the game draws the number ("Week 1 of N · Board 100/100"): a lost edit is a BROKEN finding. The
SHALLOW lines are unchanged. The page's draw count is printed at the hub before the first kick off and at the
end; the review is screenshot into $RC_OUT; the walk blocks the database host.

Seed table on e07cd2df, requests `r1314-cm1` (sent 14:56 EDT, ran 19:02 to 19:35 UTC) and `r1314-cm2` (19:08 to
19:36 UTC). Every run: Crystal Palace, "Board 100/100" read back, 4 page draws before the first kick off, exit 0,
0 findings, 2 signings.

| Seed | Ending | Full times | Windows | Shape changes | Draws at the end | Seconds |
|---|---|---|---|---|---|---|
| default 1542433760, run 1 | played the season out | 40 | 44 | 17 | 47491 | 280 |
| default, run 2 | played the season out | 40 | 44 | 17 | 47491 | 281 |
| default, CPU throttled at rate 4 | played the season out | 40 | 44 | 17 | 47491 | 319 |
| 1 | played the season out | 39 | 43 | 7 | 46578 | 268 |
| 2 | played the season out | 39 | 43 | 10 | 46487 | 270 |
| 3 | played the season out | 42 | 46 | 14 | 47639 | 292 |
| 4 | played the season out | 39 | 43 | 11 | 46764 | 270 |
| 5 | played the season out | 40 | 44 | 18 | 47357 | 281 |
| 6 | played the season out | 39 | 43 | 13 | 46635 | 274 |
| 7 | played the season out | 40 | 44 | 17 | 46831 | 278 |
| 8 | played the season out | 40 | 44 | 16 | 46512 | 278 |
| 9 | played the season out | 41 | 45 | 17 | 47734 | 285 |
| 10 | sacked after 27 full times (both signings already made) | 27 | 31 | 9 | 31880 | 190 |

The control CM_CONTROL=nobusiness was STALE on main, found here: on e07cd2df it exited 1 in 2 s with "RED before
it started. The transfer business guard matched 2 time(s) in the built assets". Round 721 (f4702db1) gave the
Deadline Day board its own `g.signings.length > 0 &&`, so the bare minified shape `\w+\.signings\.length>0&&`
matched two chunks. Commit 48a3e61f anchors the guard on the one followed within 400 characters by the block's
"Transfer business" heading (a literal minifying keeps; checked against a local September build: the
season summary chunk alone, once). The control ALWAYS exits 1 and says green or RED in its last line.

### 3.4 simHalftime (commit 9e9480c3)

3.4a, measured first with no edit to the committed harness: seeds 1 to 10 through
`SIM_SEED=N node --import ./scripts/lib/seedRandom.mjs`, at 1200 and 1500 an arm through a probe copy with only
section 2's RUNS changed (copied to a name per label, correction 15 (ii)). All on db2d5083. Gains against their
bars (two standard errors):

| Seed | 800 (`r1314-ht800`) | 1200 (`r1314-ht1200a`, `-b`) | 1500 (`r1314-ht1500a`, `-b`) |
|---|---|---|---|
| 1 | 3.20 / 1.15 | 2.33 / 0.92 | 1.93 / 0.82 |
| 2 | 2.80 / 1.14 | 2.38 / 0.91 | 2.29 / 0.82 |
| 3 | 2.79 / 1.13 | 2.72 / 0.91 | 2.79 / 0.81 |
| 4 | 1.74 / 1.09 (section 1 red) | 1.61 / 0.91 (section 1 red) | 2.34 / 0.81 (section 1 red) |
| 5 | 2.32 / 1.12 | 2.17 / 0.90 | 2.17 / 0.81 |
| 6 | 2.10 / 1.10 | 2.30 / 0.92 | 2.78 / 0.81 |
| 7 | 2.99 / 1.10 | 2.54 / 0.91 | 2.46 / 0.82 |
| 8 | 1.15 / 1.13 | 2.24 / 0.92 | 2.91 / 0.80 |
| 9 | 2.51 / 1.12 | 2.83 / 0.91 | 2.25 / 0.82 |
| 10 | 1.88 / 1.08 | 2.60 / 0.87 | 2.35 / 0.79 |
| mean, spread, mean bar | 2.35, 0.64, 1.12 | 2.37, 0.34, 0.91 | 2.43, 0.31, 0.81 |
| (mean less bar) in spreads | 1.9: fails | 4.3: passes | 5.2 |
| default seed 743293878 | 2.74 / 1.11, twice, logs byte equal (md5 37b2e157) | 3.02 / 0.92 | 2.65 / 0.82 |
| seconds a run on a runner | 486 to 529 | 659 to 963 | 653 to 1118 |

3.4b: seedRandom.mjs is the first import and section 2 plays 1200 an arm, the smallest size passing the rule.
The stop rule (a ten seed mean under 1.5 at 1500) did not trigger: 2.43. The bar stays two standard errors.
The bundle, entry and engine copy moved into a mkdtemp folder removed on exit: hygiene only (a runner gives each
label its own temp folder; this cured no red).

Found while measuring, not changed: seed 4 is red at every size in SECTION 1 ("goals scored moved by 4.4 just
from playing two halves", gap 4.37 against a 3 SE bar of 4.13, 60 seasons an arm). Section 1 runs first on the
same stream at every size, so it is one sample, one seed in eleven read. Signs of the gap differ across seeds, so
it reads as a three standard error tail rather than a shift; the default seed's section 1 reads gaps of 0.12. A
section 1 red after an engine change is therefore possible about as often as a 3 SE tail (around one in a
hundred by the normal reading, one in eleven by this small sample): the lead may want section 1 measured the same
way in a later round.

Control SIM_HALFTIME_CONTROL=deaf (a subject control, advice 15 (i)): the engine copy's two lines that apply a
break's change (`live.onPitch[idx] = change.inId;`, and the pair setting `live.mentality` and `state.mentality`)
are removed, each asserted present exactly once or the run refuses. Proof: request `r1314-ht` on 9e9480c3
(PENDING at the time of this push).
