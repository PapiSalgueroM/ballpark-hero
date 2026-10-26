# Build Your XI: Club year draft

Date: 2026-10-26
Source parent: cb1c2025a31a7e01ad41ffd5f3a76d9b3ab9ed1f
Parent tree: 1b0ee1a3de32c5185c9725b3962f485c2dbb5bef

## Player request and scope

Add an optional draft that rolls existing clubs and helps players find names from a chosen recorded year. Keep the default mixed club/nation draft and its pundit. This round uses the existing 30 clubs and exact stored aliases. More clubs requires a separate data review.

Choose a recorded year before choosing the formation. That year stays fixed through eleven picks, rerolls, review and result. Each assigned club supplies one pick for any empty pitch role. Do not require eleven eligible players from each club. Browse players opens up to 50 matching records in the existing scrollable autocomplete; ordinary typed search keeps its existing limit. These records are not a complete historical squad or proof of match appearances.

## Implementation

1. Add setup choice and visible year context. Keep the mixed deal and reroll behavior. Club year draws and rerolls contain clubs only, with distinct assignments.
2. Filter the existing player search by exact club aliases and numeric recorded year before ranking or dedupe. Keep selected row metadata intact.
3. Reject wrong, missing or unsupported year/club/position evidence before any all-time validator call. Preserve duplicate-player checks, position/history rules and cancellation ownership.
4. Make Browse repeatable after dismissal, retain keyboard/touch selection, and focus without scrolling the page. Distinguish no matching rows from a load failure.
5. Use the existing selected-row rating, fit and season simulation for Club year results. Do not call the prime-name pundit or fixed-2026 fallback in that mode. If required numeric inputs are missing, show an unrated draft. Describe the result as a simulation using the selected records.
6. Explain both modes before play and in the existing help dialog. Keep the year in review, result and sharing.
7. Compose the missing evaluation-generation guards from pending PR320 onto the current hook. Do not duplicate its position-busy lines already merged in PR306 or undo the query ownership work merged in PR335.

## Verification

The first source commit changes no product code. Its two actual-page setup tests retain the existing mixed/formation foundation and require the new Club year draft control. The latter must fail only with the owned assertion XI_CLUB_YEAR_SETUP: actual zero controls, expected one. Import, collection, timeout or infrastructure failures do not qualify that baseline.

Keep those two tests unchanged when implementing. Add focused actual hook/page checks for year-filtered search, metadata retention, wrong-year refusal, clubs-only reroll, repeated Browse, a lower-ranked goalkeeper, empty/failing queries, stale replies after reset and completion without either old evaluator. Re-run existing meaningful query, selection, validator, position and fit checks.

Run real app TypeScript, build, all completed-build readers and the original download budgets remotely. Verify the actual page at phone and desktop sizes, including keyboard/touch, visible year, 44px new controls, focus and page position, completing and replaying a draft. New controls must fail for the intended reason when the relevant product behavior is removed, then pass after restoration.

## Boundaries

No player, club, value, age or appearance record is invented or added. Annual stored values are not official season rosters. Existing shared search, provider configuration, privacy/consent controls and budget limits stay intact. No new route or dependency is needed.

Owner I retains protected data integration, main and publication. This plan and its tests are draft work, not a live feature. Local application execution remains unavailable under the current preservation restrictions; ordinary source pushes provide remote validation. No CI rerun or dispatch is part of this plan.

## Source review and verification updates

The feature candidates keep Mixed as the default and add Club year draft with a fixed recorded year from 2004 through 2026. Each club supplies one player for any open position. Browse uses up to fifty matching stored records, and typed search keeps the existing eight-result limit. Stored records can be incomplete.

The new mode rejects absent or conflicting year, club, identity or position metadata before the all-time validator. Its completed report uses the selected records with the existing fit and season engine. Missing value or age leaves the completed draft unrated. A reset invalidates an older history response without changing the history request's existing timeout.

The source review also found that the shared picker could highlight a row outside its visible dropdown. The narrow additional change scrolls only that dropdown to reveal the selected row. It preserves the existing search, selection, pointer, touch and keyboard commands. Two focused DOM tests and an original-source omission control supplement the real browser checks.

The first tests-only run, 40290957484 attempt1 at3225a0c11d9638e3683003cf3e0ec3a1d3a8d711, is refused. It showed the intended missing-feature assertion, but the real app type check also found an unsupported test selector option. Removing that option preserves the full accessible-name match and assertions. A new ordinary source commit must qualify the full baseline before feature adoption.

The next checks cover the real page at320,390 and1280 widths, years2010 and2026, browsing, repeated activation, keyboard visibility, clubs-only rerolls, eleven picks, the selected-record report and replay. Existing Mixed behavior and relevant shared-picker/search/history tests remain part of verification. Screenshots and raw partial results must survive failures. No feature, full-suite, live-data or publication success is implied by this source plan.
