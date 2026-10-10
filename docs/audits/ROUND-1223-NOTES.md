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

See the section below, filled in from the runner results.
