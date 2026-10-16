# Manager competition report handoff

Source audited on corrected main `a758fcec`. These are next implementation seams, not completed features or passing runtime claims. Claude I owns main and the Manager difficulty, retirement, world-transfer and potential rounds. Codex owns competition binding and the browsing screens, with `buildCalendar` and `LEAGUE_RULES` offered by I. Any further shared engine hunk must be coordinated on `docs/WORKBOARD.md` before application edits.

## Spectator Champions League

The visitor's report is supported by the source. `initUclWorld` and `advanceUclWorld` return when `uclGroup` is absent. `UclGroupsCard` also returns. The season calendar already includes the group and knockout dates, but skipped group dates do not create or play the wider competition. A display toggle alone cannot show genuine simulated results.

The smallest repair can reuse existing `uclWorld`, `uclBracket`, calendar dates, eligible fields and AI knockout settlement:

| Named seam | Required behavior |
|---|---|
| `initUclWorld` | For a nonparticipant, draw available groups beginning at A. Preserve the participant's current initialization and draw stream. Do not pad a thin verified field with invented real clubs. |
| `advanceUclWorld` | Accept progress independent of the manager's own group. |
| `playNextEntry`, skipped group date | Advance the wider groups and seed the existing AI bracket after the final group date. |
| Legacy catch-up | Replay completed group dates and closing knockout legs chronologically. A newly backfilled bracket must not be left behind dates that have already passed. |
| `projectedUclBracket` and `UclGroupsCard` | Read available saved groups without claiming A is the manager's group. Final-table and progress labels must agree with the saved world. |
| `ClubManager.tsx`, Cups wording | Distinguish not entering from the competition being unavailable. |

Keep a nonparticipant's `uclKoRound` null. Setting it to an actual round would make `entryInvolvesMe` schedule a manager match and affect European participation grading. The current skipped knockout branch already settles AI ties only on their closing leg, and `UclBracketCard` can display an entirely AI bracket.

New shuffles and AI score rolls consume global `Math.random`. They need an explicitly coordinated isolated stream, using the existing keyed RNG rather than shifting every later manager draw. Added AI results also update form; the eventual champion feeds qualification and awards. Those effects must be measured and intentional, not hidden behind a no-crash check.

Required proof: a real nonparticipant start reaches a world champion without a European manager fixture or participation credit; a participant's existing outcomes and draw counts stay held; old-save catch-up and reload are idempotent; closing-leg timing and spectator UI agree with saved scores. No local runtime or production database probe is needed.

## Modern format and Europa League

Round 1228's `uclLeaguePhase.ts` is the existing verified source for modern pots, draw, table and bracket. It has no production consumer. The current Europa/Conference references in `clubManager.ts` provide board-objective labels and qualification bands, not a playable Europa campaign. The `Competition` union has league, domestic cup, UCL group and UCL knockout only.

Held PR223 must return as the binding of Round 1228, not a second rules implementation. Its old finance companion PR227 remains held with its recorded finance failures. Reusing those drafts wholesale would bypass the current rule library and unresolved gates. Round 1228's notes also explicitly mark incomplete source verification and stand-ins for dates, field composition and venue order; read those before claiming real modern-format fidelity.

Europa qualification, domestic cup routes, Super Cup, Community Shield, Club World Cup and preseason events need separate calendar/save/format rounds after that binding. Do not infer a complete tournament from a board objective that names it.

## Browsing work and its limits

PR284's qualified recent-transfer filter uses the saved world log before the display cap. It cannot recover older moves already removed by the engine's retention limit. A complete own-club archive needs persisted counterparties and a deliberate gross/net distinction, coordinated with I's world-transfer work. Do not join net `seasonSignings` fees to gross market rows by player name.

The independent ClubDetailScreen packet exposes league fixtures only, from saved memberships, `careerRoundPairs`, actual league progress and directed `pairResults` tuples. It marks absent legacy scores as unrecorded and leaves unplayed scores hidden. That screen does not generate spectator Champions League or new tournament results.
