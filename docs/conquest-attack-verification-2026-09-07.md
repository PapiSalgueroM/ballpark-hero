# Soccer Attack verification

Local preview only. No merge, publication, database or hosting change is represented by this report.

## First built-board pass

The controller tested the production build on `http://127.0.0.1:4178/soccer-conquest` using isolated Chromium browser contexts. All external network requests were aborted. Cookie choice was essential only. These were signed-out game checks, not a fresh worst-case signed-in header audit.

The fixtures came from the actual geographic England engine with seed 9. They passed the real save parser before being put into local browser storage. No manually invented scores, ownership states or player transfers were used.

- 55 browser assertions passed across 320, 390, 430 and 1440 pixel viewports. No horizontal document overflow or content buttons/selects below 30 pixels. Geographic SVG territories are not enlarged to fake tap-target compliance; keyboard region selection and the club list are the accessible alternatives.
- Keyboard zoom, pan and reset worked. Inspecting a club and moving the map did not change any saved game bytes.
- Resolving the target advanced the saved revision once, showed the recap, and kept scroll position within two pixels.
- The losing-attacker recap and moved frontier launch used the original saved launch anchor. Reloading recap, frontier and finished states preserved the exact saved bytes.
- Injecting a quota failure left the old screen and old save visible. Restoring writes and pressing Retry committed exactly the engine's original next state, not a fresh draw. Reload resumed that same state.
- Two browser tabs attempting the same team spin settled on one persisted revision.
- Choosing an unsaved session from damaged stored bytes left those bytes untouched and visibly marked the session unsaved.
- A complete run played all 160 actions through the real page controls. The entire final snapshot matched the independent engine result. Reload kept that finish, and neither the local ranked-completion key nor the streak key was created.

The controller viewed phone and desktop screenshots. The first visual pass identified a real follow-up: default labels had no overlap but were too small. Effective font sizes were 5.135 pixels at 320, 6.486 at 390, and 7.562 at 1440. This was returned to the board implementer before completion, not accepted as finished polish.

First-pass screenshots are in the local visualization folder:
`C:/Users/antho/.codex/visualizations/2026/09/07/01a07c86-df27-7430-8dbe-27176e8155c4/`.
These local screenshots are evidence, not shipped site assets. They still contain the pre-integration SEO copy, which Task 4 must update.

## Remaining gates

Readable default map labels, the independent board review, integration metadata, generated-page checks and whole-change review are still pending at this checkpoint. This report will be updated with their actual outcomes rather than assuming earlier checks cover later edits.

## Larger-label follow-up

The replacement build passed the same 55 browser assertions. A separate real-browser check seeded both an unfinished Daily Season and an unfinished Attack. Daily Season took entry precedence, and switching modes and reloading preserved both exact save payloads.

Abbreviated default labels improved effective font size to 10.270 pixels at 320, 12.972 at 390, and 15.124 at 1440. The larger-label pass exposed two visual findings: Brentford and Brighton text rectangles overlapped, and the bottom-right pan pad covered two southern club labels at the default phone view. Both were returned to the implementer. This checkpoint is not the final visual approval.

## Final board visual recheck

After expanded deterministic label spacing and moving pan controls above the drawing, the controller reran the actual-browser measurements. The effective sizes above were preserved and all 20 opening club labels had zero text-rectangle overlaps at 320, 390 and 1440. The pan pad no longer occupies territory space. The controller viewed the replacement phone screenshot.

The same 55 browser assertions passed again on the final board build at all four required widths. Independent code review and the later integration gates remain separate requirements.

## Independent review and focused corrections

Review found two Important issues the earlier acceptance script did not cover. A save corrupted during an active run could be replaced by a second ordinary game action. Immediate parent SVG pointer capture also prevented real stationary map taps from selecting a territory.

Commit `878ccd33` blocks ordinary actions during active save recovery, offers explicit replacement or continuing without saving, and delays pointer capture until drag movement. Three new regressions failed before the fix and passed afterward. The full focused board/save suite passed 17 tests, the app type gate returned zero errors, and the build passed in 27.81 seconds. Real Chromium checks confirmed damaged bytes remain untouched until explicit recovery, a stationary Villa Park tap inspects that region, and a zoomed drag still pans. Scoped independent re-review remains required before integration.

That re-review resolved the first two findings but exposed direct pointer fallout: releasing outside the SVG before capture left a stale drag that panned on later hover. Commit `49664f18` tracks the active pointer, clears a released or uncaptured departing pointer, and preserves captured dragging. The new regression failed before the fix; two focused pointer cases and all 14 board tests passed after it. The four save-helper tests were unchanged. Types passed, build completed in 40.34 seconds, and Chromium proved the exact outside-release/no-button re-entry leaves the viewBox unchanged while real taps and captured drags still work. Scoped independent review is now clean, with no open Task 3 findings. Integration and whole-change review remain pending.

## Task 4 integration checkpoint

The final scoped build and browser pass now carry the two-mode metadata and guide. Daily Season still states and plays its guarded 96 clubs, 154 regions and 10 regular matchdays. England Attack is identified as the current English first slice, with generated game regions, simulated ratings, unlimited unranked play and its separate durable save.

The final Chromium pass repeated all 55 acceptance assertions at 320, 390, 430 and 1440 pixels. Opening labels had zero overlaps at every measured width. Daily Season retained entry precedence when both modes had unfinished saves, and both exact payloads survived switching and reload. The complete 160-action UI run matched the independent engine's final snapshot. Quota failure and retry, competing tabs, stationary inspection, captured drag and the outside-release regression all passed. No page error, overflow or ranked completion was observed.

The type gate, two production builds, 121 focused Attack outcomes over 20 actual-map seeds, existing Conquest sims, scoped prerender, sitemap generation and all 15 built-site fences pass. The Attack wrapper's changed revision transition fails the intended existing assertion. The older shared-map fence was updated to require exactly the Daily Season renderer plus the separate Attack renderer, and its private third-renderer control still fails.

This remains a local review candidate. Independent Task 4 review, the 266-harness full node suite, full Vitest and the 152-route guest sweep are still running. No merge, publication, database, DNS or host change has occurred.
