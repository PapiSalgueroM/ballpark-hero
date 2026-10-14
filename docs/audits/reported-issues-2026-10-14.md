# Reported issues, 14 October 2026

Read-only triage while Round 1368's Soccer Career save change is being verified. This note implements no fix and changes no real data. Reports and diagnostic payloads were relayed in the active chat; no player save JSON was supplied. Source inspected: main `082fc277`, plus named existing branches. GitHub PR status was queried on 14 October 2026.

## Build context

The three Club Manager reports carry `index-DaI30mwt.js`, Release BB. The main state receipt records Release BC published on 13 October at 18:23 EDT as `index-BFkO1jyo.js`, deployment `3cf3a2d7`, with the prior BB entry explicitly identified. Transfer Path and MLB reports carry the BC entry. An older entry identifies the reported build; it does not prove a report is fixed on BC. No matching save was replayed here.

Source for this distinction: the Release BC prefix in `docs/PROJECT-STATE.md` and `docs/WORKBOARD.md`.

## Club Manager

| Report | Existing evidence | Next diagnostic, still owed |
| --- | --- | --- |
| A player scores many goals but is absent from league top scorers | Round 1311's boards and awards shipped in BB, with its reader/floor limitations recorded in `docs/audits/ROUND-1311-NOTES.md`. `goldenBootTable` reads the league book where it decides; its fallback reads each owned player's `comp.league.goals`, not all-competition totals. This is an inspection finding, not a reproduction. | Preserve the reported player's identity, total goals, league goals, active table/book coverage and final award in one save. Replay the reported build and current build with the same input. Determine whether the mismatch is an all-comps comparison, thin/late coverage, identity problem or actual lost league goals. |
| A league winner is not promoted | [PR20](https://github.com/PapiSalgueroM/ballpark-hero/pull/20) is merged. Current `runPromotionRelegation` trades only configured paired divisions, explicitly skips historic/custom careers, and skips a pair without complete readable tables. Soccer Career's separate [PR207](https://github.com/PapiSalgueroM/ballpark-hero/pull/207) is merged and is not a Club Manager fix. | Retain club, league, era, custom status, final standings, paired table and pre/post-summer overrides. Check the actual promotion transition and next league. Unsupported historical/custom promotion should be described honestly; do not assume modern promotion evidence covers it. |
| A real player retires after one year in 2010/11 | No matching qualified fix was identified in this scoped search. Current `retireChance` returns zero below age 32, reaches certainty at 42 and otherwise uses age/rating/position. Historical summers derive their ageing base from the selected era. | Identify the player and preserve starting age, era/start year, first-summer age/rating, retirement draw and exit record. Compare the historical bake, own squad and projected world anchors. A first-year retirement alone is insufficient to distinguish an incorrect age from an allowed older-player outcome. |

The active roster/ownership proposals PR266 and PR269 address current squad display and missing completed AI-transfer ownership, respectively. Their scopes do not establish resolution of these three reports. H owns the current core and integration.

## Transfer Path

Follow-up read-only diagnosis after Anthony asked to keep going: verified main `082fc277` has a concrete coverage gap. `transferPathGraph.ts` reads only `p.career` club-season rows. Isak's retained rows stop at Newcastle in 2024/25; Van Dijk's Liverpool rows also stop in 2024/25. The September quarantine migration removed their projected Liverpool 2025/26 statistic rows, which had also supplied this graph's membership evidence. Oyarzabal and Isak already have exact shared Real Sociedad 2019/20 and 2020/21 records. The missing recorded edge is Isak to Van Dijk. The board's word `never` overstates that missing coverage. This is current-source diagnosis, not a replay of the reported live session.

The overlap is independently verified: Liverpool's starting XI against Atletico on 17 September 2025 includes both players, in [Liverpool's official lineup](https://www.liverpoolfc.com/news/confirmed-liverpool-line-v-atletico-madrid-1?amp=1) and [UEFA's official match report](https://www.uefa.com/newsfiles/UCL/2026/2045911_HR.pdf). No new statistics or membership rows were written here.

[PR242](https://github.com/PapiSalgueroM/ballpark-hero/pull/242), head `e0c94d42`, and [PR243](https://github.com/PapiSalgueroM/ballpark-hero/pull/243) remain open draft and unmerged on the follow-up check. Their membership-only infrastructure and path work cover Trent/Mbappe 2025/26 Madrid, not this Liverpool pair. PR242's retained source `2dfee304` has successful run `38285493476`, but that does not resolve this report on main. Next: reuse the verified membership-only path after its integration and add this independently sourced Liverpool membership. Do not restore quarantined statistics or duplicate the open infrastructure proposal.

## Soccer Career and MLB

- The soccer 38-0 message requests a new perfect-season game with random teams and limited rerolls, like the existing perfect-season games. It is a product idea, not a Soccer Career score or balance defect. It remains outside this save-size change and the active manager/career core work.
- A referee career is a product idea, not a reproduced defect. No matching implementation was identified. It remains outside the save-size change and the active manager/career core work.
- MLB manual retirement already has a `Hang them up now` action in `UsCareerBoard.tsx`, guarded by at least six saved seasons and located in the season hub. The actual callback calls the retirement flow and persists the retired phase. This source finding does not prove the reported UI is accessible. Retain current phase and season count, then test visibility, confirmation, durable retirement and reload on that save. An earlier-retirement request is a separate product decision from a broken existing action.

No issue in this note is marked fixed, published or accepted. The original focused task remains the unchanged 60,000-character Soccer Career save gate.

The separate keep-going Manager work is draft [PR272](https://github.com/PapiSalgueroM/ballpark-hero/pull/272). It reproduced created-club promotion failures before editing the engine and added current-source age/scorer diagnostics. Its full build and source-fault checks passed; browser and full-unit qualification were still in progress when this follow-up was recorded. The unavailable original Manager saves remain unreplayed. All Soccer save application and proof bytes stay held.
