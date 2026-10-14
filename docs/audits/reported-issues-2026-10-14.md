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

The Isak/Dijk stale-season report remains unverified. [PR242](https://github.com/PapiSalgueroM/ballpark-hero/pull/242) and [PR243](https://github.com/PapiSalgueroM/ballpark-hero/pull/243) are open draft and unmerged. They cover verified Trent/Mbappe 2025/26 Madrid membership and its changed paths, not this reported pair. The scoped Isak/Dijk PR search found no matching proposal.

Next: retain the exact puzzle/rule, selected identities and rejection line; inspect the actual loaded player pool and club-season index, including whether the dates represent shared-season coverage rather than current club. Reproduce before changing data. Any missing real membership requires the existing two-source data workflow; do not fill it from a plausible transfer.

## Soccer Career and MLB

- Soccer Career's reported 38-0 score needs the exact game context, teams, season, difficulty/build and recorded result. No matching qualified balance fix was identified. Existing `r1329-sc-world-truth` work addresses sourced historical/world narrative boundaries and must not be credited as a 38-0 fix without matching outcome evidence.
- A referee career is a product idea, not a reproduced defect. No matching implementation was identified. It remains outside the save-size change and the active manager/career core work.
- MLB manual retirement already has a `Hang them up now` action in `UsCareerBoard.tsx`, guarded by at least six saved seasons and located in the season hub. The actual callback calls the retirement flow and persists the retired phase. This source finding does not prove the reported UI is accessible. Retain current phase and season count, then test visibility, confirmation, durable retirement and reload on that save. An earlier-retirement request is a separate product decision from a broken existing action.

No issue in this note is marked fixed, published or accepted. The original focused task remains the unchanged 60,000-character Soccer Career save gate.
