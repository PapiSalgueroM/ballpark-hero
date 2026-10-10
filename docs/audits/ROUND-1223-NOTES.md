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
| `src/lib/gmDeskHost.test.ts` (39 cases), `GmCareerDesk.test.tsx` (13 cases) | Unit proof, the lazy path included (the brief's A8, with its control). |
| `scripts/simGmDeskHost.mjs` | Ten checks on the four real engines, 26 negative controls. |

## The decisions made here (the brief left them to the builder, or the critic bound them)

- `HostClub` extends `gmPicks.StandingRow` and the sport type is `GmSportKey` (A1). No fourth club shape.
- `HostLegacy.seasonCounted` replaces the draft's `seasonClosed` (B7). The caller says whether its counters
  already include the league's season; the verdict passes `false` itself. A new save's first close therefore
  starts its stint in the season he started, and `hostArriving` is false on that recap.
- A legacy record always carries `before: { seasons, tierUnknown: true }` (B14). Only `hostNewSeat`, called the
  day he takes a club, knows the tier on arrival. The Career panel leaves the tier off an old save's first box.
- The market's line is the host's own, `hostMarketLine` (B6). A closed line never says sit, and the season
  count includes the seasons known only as a count.
- The quiet state is split (B4): `HostMarket.nextYear` is `open`, `climb` (the phone rings next year only if
  his old club finishes in a better tier, `climbTo` names it) or `shut`. A market that reads `shut` IS closed.
  Closed is decided on next year's standing with the best pedigree, so it also covers a tier 1 club's fired GM.
- `hostTakeSeat` reads the offer off the market by club id and never trusts the screen. Block ownership is a
  declared list (B13): `HOST_BLOCK_RULES` plus the sport's rows, applied by `hostMoveBlocks`. `gm` blocks travel,
  `club` blocks are opened again from `fresh` (or dropped when the rule has none), `league` blocks stay.
- The verdict's order (B13): the grade, the Ownership cushion on the grade's change alone, then the business
  changes in `trustMovers` uncushioned, the firing from the sum, and the host's close last.
- The year out's order is the host's (`hostSeasonAway` over the write side `GmAwayHost`, B13): draft, summer,
  every period, postseason, then the year on the record. Each step is handed the desk and may hand back the
  next one, because a league owned block rolls in a summer. Refused in a seat, on an open season, on a closed
  market, and it answers `broken-adapter` when the sport does not leave the league one decided season on.
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

