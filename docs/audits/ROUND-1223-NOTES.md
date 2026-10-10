# Round 1223 notes: the GM desk host, the lift

Branch `r1223-gm-desk-host`, base `origin/main` 09df145a. Written by the builder of the desktop Claude lane,
2026-10-10. This round is the LIFT of the GM career work: new files only, nothing mounts them, no player sees a
change, so there is no What's New entry and no guide sentence.

## What this round ships

| File | What it is |
|---|---|
| `src/lib/gmDeskHost.ts` | The host: the read adapter type, the `seat` and `xp` blocks, the record of an old save, the season verdict and close, the job market in three honest states, taking a seat, the year out's order, the seven tree effects, the sport neutral routes, and every word on the boxes. Imports no engine. |
| `src/lib/gmDeskHostNhl.ts`, `Nba`, `Mlb`, `Nfl` | The four read adapters. Each imports its own engine and the seat packs, nothing else. |
| `src/components/front-office-shared/gmLazyPanel.tsx` | `lazyGmPanel` and `lazyPart`: a panel that loads on demand, with a fixed height holding box. Generic over the facts, for the two sibling GM lifts to reuse. |
| `GmJobMarketPanel.tsx`, `GmCareerPanel.tsx`, `GmXpDeskPanel.tsx`, `gmCareerDesk.tsx` | The three panels and the one module level list `GM_CAREER_PANELS` (keys `seat`, `career`, `xp`). The market panel draws its own offer tiles (the brief's B5): `GmSeatCard.tsx` stays unmounted. |
| `src/lib/gmDeskHost.test.ts` (42 cases), `GmCareerDesk.test.tsx` (15 cases) | Unit proof, the lazy path included (the brief's A8, with its control). 39 and 13 before the fix pass. |
| `scripts/simGmDeskHost.mjs` | Ten checks on the four real engines, 46 negative controls (26 before the fix pass). |

## The decisions made here (the brief left them to the builder, or the critic bound them)

- `HostClub` extends `gmPicks.StandingRow` and the sport type is `GmSportKey` (A1). No fourth club shape.
- `HostLegacy.seasonCounted` replaces the draft's `seasonClosed` (B7). The caller says whether its counters
  already include the league's season; the verdict passes `false` itself. A new save's first close therefore
  starts its stint in the season he started, and `hostArriving` is false on that recap.
- A legacy record always carries `before: { seasons, tierUnknown: true }` (B14). Only `hostNewSeat`, called the
  day he takes a club, knows the tier on arrival. The Career panel leaves the tier off an old save's first box.
- The market's line is the host's own, `hostMarketLine` (B6). A closed line never says sit, and the season
  count includes the seasons known only as a count.
- What a year out leaves is read in every state (B4): `HostMarket.nextYear` is `open`, `climb` (the phone rings
  next year only if his old club finishes in a better tier, `climbTo` names it) or `shut`. With an empty feed,
  `shut` is the closed state. With offers on the table `shut` is NOT closed: the state reads `offers` and those
  are the last calls he gets (corrected in the fix pass; the first version of these notes said a market that
  reads `shut` is closed, which is false whenever somebody called). The year out is offered and played on
  `hostCanSitOut` alone, which reads `nextYear` and not the state. `shut` is decided on next year's standing
  with the best pedigree, so it also covers a tier 1 club's fired GM.
- `hostTakeSeat` reads the offer off the market by club id and never trusts the screen. Block ownership is a
  declared list (B13): `HOST_BLOCK_RULES` plus the sport's rows, applied by `hostMoveBlocks`. `gm` blocks travel,
  `club` blocks are opened again from `fresh` (or dropped when the rule has none), `league` blocks stay.
- The verdict's order (B13): the grade, the Ownership cushion on the grade's change alone, then the business
  changes in `trustMovers` uncushioned, the firing from the sum, and the host's close last.
- The year out's order is the host's (`hostSeasonAway` over the write side `GmAwayHost`, B13): draft, summer,
  every period, postseason, then the year on the record. Each step is handed the desk and may hand back the
  next one, because a league owned block rolls in a summer. Refused in a seat, on an open season, on a closed
  market, on a last call (offers on the table and next year shut, reason `last-call`), and it answers
  `broken-adapter` when the sport does not leave the league one decided season on.
- A year out is not a season on his record (B15): `hostSeasonsRecorded` does not move.
- The sport neutral routes live in the host (B2): `hostPressOption`, `hostCutQuote`, `hostCraftCut` (the LAST
  entry for the id, A4), `hostDeskCases`, `hostSummerMandate`, `hostArriving`, `hostSeasonVerdict`,
  `hostLastGrade`.

## What pairs 6 and 8 extend (section 1, decision 2: by adding a field, never by changing a signature)

| Later lift | The interface it extends | How |
|---|---|---|
| Pair 6: the books, the buildings, the inbox | `GmDeskHost<L>` | Optional reads: men out, the period and the number of periods, whether the deadline is open. Record, place and room under the line are already on `HostClub`. |
| | `GM_HOST_KEYS`, `HOST_BLOCK_RULES` | Keys `books`, `facilities`, `inbox`, each a `club` owned row with its `fresh` value. |
| | `HostVerdictInput.trustMovers`, `HostSeasonFacts` | Its year end joins the close as a trust mover (after the cushion, before the firing). |
| | `GmAwayHost<L>` | An optional step for the books in a year with nobody in the chair. |
| | `GmCareerBinding` and a new panel list beside `GM_CAREER_PANELS` | Built with `lazyGmPanel`, typed over a facts type that extends `GmFacts`. |
| Pair 8: the farm, waivers, call ups | `GmDeskHost<L>` | Optional roster reads. |
| | `GM_HOST_KEYS`, `HOST_BLOCK_RULES` | Keys `farm`, `lineup`, both `club` owned. |
| | `HostSeasonFacts.prospectsGraduated` | Already a field: the farm feeds the XP source that pays for bringing a prospect through. |
| | `GmAwayHost<L>` | An optional step for the cover and the call ups. |

## Found and not fixed here (reported to the lead)

- `scripts/simGmXp.mjs` is RED on origin/main 09df145a: exit 1, 3 failures, its growth reader cannot read the
  hooked growth line in the NBA and MLB engines (the brief's B9). Runner result `r1223-base`. It is this lane's
  harness from Round 942 and not a file of this round, so the lift does not lean on it: `simGmDeskHost` check 7
  walks every level of every tree itself.
- Known and accepted, as the brief's A9 lists: an offer's ask carries the seat pack's wording while the next
  summer's carries the board's; on a fired old save with titles and no last grade the market reads his last
  season as a title; seasons known only as a count do not weigh as experience in the market.

## Not in this round (the brief's section 1, decision 1)

The measuring run on real NHL firings and the ruling on the dead end (B4), the playFoHub counting fix (A2),
Round M1 (the NHL board) and Round M2 (the five trees in the NHL engine). No board, desk file or engine is
edited. The year out is proven here in the host's order on the four engines with the old club still named as
the engine's user club; the engine option that plays a league with nobody in the chair is the bind's.

## Proof

Everything heavy ran on GitHub runners as remote checks (branch `rc-results/<name>`). On head e05fc891:

| Check | Result name | Exit | What it printed |
|---|---|---|---|
| Type gate (`tsc --noEmit -p tsconfig.app.json`) | r1223-f1 | 0 | no errors |
| vitest, 6 files | r1223-f1 | 0 | 102 tests: gmDeskHost 39, GmCareerDesk 13, GmDeskMount 16, GmSeatCard 4, gmSeat 18, gmXp 12 |
| `simGmDeskHost`, seeds 1,2,3 (twice), 4,5,6 and 7,8,9 | r1223-f1 | 0 each | all 10 checks passed; the two runs of seeds 1,2,3 print one feed digest |
| `simGmDeskHost` anchors | r1223-f1 | 0 | 27 rewrites checked, 0 cannot run |
| 26 negative controls | r1223-c2 | 1 each | every one FIRED in its own check (counts in the harness, under T) |
| Rule fences | r1223-fence | 0 | simLiveScores, simNoRivalNames (0 findings), simInventedNames, simHarnessAnchors, simNoInventedQuotes, simNoInventedConduct, simStorageWrites, simGmSeat, simGmDesk, simGmReload, simFrontOfficeCuts and 17 more green |

Reds in the fence run that are not this round's, each read in its log: simGmXp (3 failures, red on main, above);
simGmStaff (16) and simDraftNight (2), both red the same way with this round's 14 files removed (r1223-base2);
simDailySaveHardening (/olympics, and /nba-career in one run of two; red with the files removed as well);
simSchemaNames and simLeaderboardCaps (the database is unreachable from a runner by design); simWritesAreSent
and simResultMoment (the request did not install the browser).

The closing head is the same code with the measured control counts written into the harness, the six club floor
raised to 70 percent of its measured size, and these notes. Its own runner results are in the builder's closing
report.

What the harness measured (three seed sets of three, three seasons a seed a sport): 84 real leagues and 240 real
saves a set; 16,800 careers on the market ladder a set, of which about 4,770 read closed, 3,330 quiet and 805
quiet on a climb; 1,116 real seasons graded a set, about 505 of them short of the ask.

The pace, which the lead asked for (the critic's A7): on the four sources a save can feed today (win share,
titles, playoff rounds, the ask) the median club earns 95 to 106 XP a season in every sport, and 20 to 40 percent
of clubs hold the first point (400 XP) after three seasons. The median GM is about four seasons from his first
point. The GM level help now says so, computed from gmXp, never typed.

## For the bind (Round M1), what not to trust

- The year out is proven in the host's order on four real engines, with the old club still named as the
  engine's user club. A league played with nobody in the chair needs the engine option the brief's decision 19
  describes, and M1's harness must prove it.
- The market's shares here are over a ladder of careers, not over real firings. The measuring run of B4 (how
  many real NHL firings end closed on the first screen) is the lead's, and the ruling on a first feed that is
  never empty would be a host rule on top of `hostMarket`.
- `HostClub.pct` is filled only by the NHL adapter (the points share). The other three leave it out, as
  `StandingRow` allows.

## The fix pass after the two adversarial reviews (2026-10-10, same branch)

Two reviewers read and ran the closed head 6a12b36d and both said FIX. Their reports are
`C:/Users/antho/dukb-handoff/2026-10-10/results-g/review-run-1223.md` and `review-read-1223.md`; the fixer's full
report is `fix-1223.md` in the same folder. What changed, one commit a finding:

| Finding | What was wrong | What it is now |
|---|---|---|
| Major, both reviews | With an offer on the table and next year shut, Stay out for a year was on the screen, said nothing about next year, and the host played a season that ended the save. | `hostCanSitOut` reads next year alone. The panel draws the button on it and `hostSeasonAway` refuses on it (reason `last-call`). The line says these are the last calls, and on a climb what passing costs; the first tap on stay out is handed the market and says what the year leaves. |
| Major, the run | The Career box lost the club name at 390 and at 1280; two of three Job market states were cut at 390. | The Career box reads Season N over With the (club). The Job market box reads N offers, Nobody called or No more calls. `HOST_TILE_VALUE_MAX` 17 and `HOST_TILE_SUB_MAX` 32 are the review's browser measurement less a tenth, and the harness holds every box to them under each board's real club names. |
| Minor | The two tap arm outlived its action, so after a year out one more tap played a second season. | The arm carries the market it was made on and is cleared when the action fires. |
| Minor | The NBA adapter's header said the tax cheque was in the payroll and it was not. | It is (`nbaCapUsed` plus `taxDue`), and check 1 holds the room under every club to that engine's own room function. |
| Minor | Next year is still open was read at today's tier and said without a condition. | Every place that says open says as things stand. The rule is unchanged: see the ruling owed below. |
| Minor | Tier 3 read lower half, so a bottom quarter club was told to climb into the half it is in. | The four words are top, second, third and bottom tier. |
| Minor | The GM level help typed the 16 a missed season costs. | Read off `gradeSeason`. |
| Minor | The out of work card and the years out head said let go for every ending. | One wording an ending. |
| Minor | The GM level help repeated the earn line printed above it. | The help is the four rule lines; the earn line joins it only on a desk that is off. |
| Minor | A run on one seed was red on its size alone. | The floors are held at the run's own seed count. |
| Minor | Five plausible regressions passed every gate, and seven more only vitest caught. | Eleven of them are harness rows with a permanent control each (46 controls in all). |

### Owed by Round M1, and a condition of mounting `GM_CAREER_PANELS`

1. **`GmXpPanel` still promises six sources.** `GmXpDeskPanel` prints the honest four source line and, under it,
   the unedited Round 942 panel prints its own sentence naming six (finishing higher than expected and bringing
   a prospect through pay nothing on this desk). This round is new files only and could not edit it. The brief's
   decision 20 gives `GmXpPanel` an optional `earns` prop in M1: pass it and keep ONE copy of the sentence on the
   screen. Nothing may mount the three boxes before that.
2. **The GM level screen on a phone.** At 390 wide `GmXpPanel` is seven tree cards in one column (about 1,230 px on
   an 844 px screen), the two trees a first bind can sell are the last two, and every Spend button is 25 px tall.
   For M1: live trees first, tiles, a 44 px button. The shared panel header's Hub back button is 67 by 34 px.
3. **The lazy panel in a real chunk.** The holding box is proven in vitest and under a server render only; the
   review's stage was one bundle. M1 walks it on a slow phone.
4. **Real saved JSON.** The saves of harness check 2 are envelopes built around real leagues, not saves that went
   through a board's writer and `isFrontOfficeSave`. The review read 480 saves made by the base tree's engines
   through the host with no throw and no write (runner result `r1223-run-o`); M1's own fixtures (the critic's B8)
   are where a board's saved JSON is first read.

### For the lead

- **THE RELEASE GATE RUNS THREE THINGS FOR THIS ROUND, not one**: `node scripts/simGmDeskHost.mjs`, and the two
  vitest files `src/lib/gmDeskHost.test.ts` and `src/components/front-office-shared/GmCareerDesk.test.tsx`. The
  panel's two tap rule can only be judged with a click, so the harness alone does not hold it.
- **The B4 ruling, with numbers.** On the harness ladder (16,800 careers a seed set, three sets) about one market
  with offers in eight is one where passing costs next year: 514 / 510 / 499 are last calls (next year shut) and
  473 / 483 / 479 hang on a climb, of 7,913 / 7,898 / 7,877 markets with offers. The review played the year out
  on real NHL leagues (runner result `r1223-run-p`): every one of 33 and 34 last call markets read closed a year
  later, and of 608 and 619 with offers on a climb 559 and 584 did. Of 7,877 quiet markets that read open, 198
  (2.5 percent) were under the floor a year later because the old club dropped a tier, and 1,084 (13.8 percent)
  read closed a year later for any reason. This fix pass made the screen honest about all of it and refuses the
  one year that cannot bring a call; it did not change who gets a call. A host rule on top of the feed (a first
  feed that is never empty, or reading open at the worst tier) is still yours to rule on.
- Controls `mutate` and `dropclub` rewrite the NHL adapter, `notax` the NBA one. Check 1 runs the same code for
  all four sports, so it can fail for each; its firing is proven on two.

