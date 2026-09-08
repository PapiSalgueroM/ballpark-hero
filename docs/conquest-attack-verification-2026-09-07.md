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

This remains a local review candidate. Independent Task 4 review passed. No merge, publication, database, DNS or host change has occurred.

## Whole-branch review and first broad runs

The independent review of all 19 commits from `d1c541b3` through `6b0c9cff` found no Critical issue. Its Important malformed-save reproduction shifted one region and its anchor in a valid two-cell fixture: parsing accepted two living clubs with no legal launch, and the next spin threw. This was not reproduced from ordinary generated-map play. Its Minor finding was incomplete reopenable help: elimination, inherited captures, final country upgrade and the approved frontier fallback were missing. Both findings are assigned together to the single final fix wave.

The first full Vitest attempt returned 332 passed and six failed out of 338 tests across 28 files, plus a worker `onTaskUpdate` timeout. Four failures were test timeouts; two were later assertions in those files. The attempt ran alongside CPU-heavy node tests and browsers, so contention is a hypothesis, not a proven disposition. The controller canceled its 266-node-harness run before completion and stopped the 152-route guest sweep after its first navigation timeout and 40 checks. Neither incomplete run is counted as green.

Read-only process inspection found Claude's separate full node suite running in the root checkout. At least one existing harness, `simEras`, uses fixed `os.tmpdir()` paths, establishing a cross-checkout collision risk without proving it caused the failures. Further Codex tests use unique task-specific `TEMP` and `TMP` directories. Do not stop Claude's jobs or modify his dirty Round 507 checkout.

An unchanged diagnostic rerun of `src/hooks/useClubManager.test.ts` and `src/components/conquest/ImperialismBoardShared.test.tsx`, with `--maxWorkers=1 --minWorkers=1 --no-file-parallelism --reporter=verbose`, passed all seven tests in 9.63 seconds. Assertions and timeout budgets were unchanged. This resolves those focused reproductions, not the outstanding whole-suite gate. The full Vitest and node suites, final fix review and completed broad browser sweep remain open.

## Final fix and current verified candidate

Commit `edc31320` rejects any non-champion save with a living club that has no legal launch. Champion recap and finished saves still load. A changed two-cell fixture asserts the ring/anchor movement actually changed the save, verifies both origins are null, and checks rejection. Its production mutation control disables the exact new guard and the behavioral test fails. Board regressions first failed for absent damaged-save recovery and missing help, then passed after the correction. Recovery retains the original stored bytes until an explicit choice. The question-mark help now includes elimination, whole-empire transfer, inherited captures, final +4 instead of +2, cap 99 and the app-specific frontier fallback. The short intro is unchanged.

The single final re-review closed both findings and found no direct new breakage or out-of-scope observation. No second final fix wave was needed.

- Engine: 94/94 passed. Board: 16/16 passed, including the existing full-map UI test in 19.116 seconds within its unchanged 30-second budget. Save: all four cases passed again in the final full suite.
- Map: 11/11 passed over seeds 0 through 19, with 805 resolutions and 3,220 transitions. Seed 9 retained the moved HUL launch. All runs finished with valid champion saves. Median transition 2.49ms, p95 31.38ms.
- Types and production build passed. Scoped prerender wrote one route with no date-dependent blocks; sitemap retained all 140 dates and no generated content changed. A fence run between prerender and the required final build caught missing route module wiring. The final build restored that wiring, then all 15 generated-site fences passed, including the browser boot fence. Existing build and shared-dialog warnings remain nonblocking.
- Final full Vitest: 28 files and 342 tests passed in 128.91 seconds on the final code. Command: `node node_modules/vitest/vitest.mjs run --maxWorkers=1 --minWorkers=1 --no-file-parallelism --reporter=dot`. Assertions and timeout budgets were unchanged. This replaces neither the recorded failed first attempt nor the independent node harness gate.
- Final Chromium: the changed disconnected-save fixture initially failed to open recovery against the prior build. On the final build, recovery, byte preservation, complete reopenable help and unsaved play passed at 320, 390, 430 and 1440. No page error or horizontal overflow was observed. The controller inspected settled phone help screenshots at the top and bottom; the first screenshot had caught the opening animation, so the capture now waits for that animation to finish.
- Final Chromium also repeated a full 160-action seed 9 game, exact finished-state JSON and reload, no local ranked completion, quota failure and exact retry, competing tabs, Daily Season entry precedence, both save namespaces, active damaged-save recovery, real map inspection, captured drag and outside-release/no-button re-entry. All passed.

The final guest sweep now passes: 152 routes at 320, 390 and 1440 pixels, 456 checks, zero findings. It does not cover tablets or another browser engine, and it checks opening pages, not every game's full play loop. Claude's changes have not been integrated or jointly tested here. No merge or publication.

## Broad verification jobs, updated September 8 at 01:33 Eastern

Draft PR 63 backs up the reviewed candidate and incorporates the older PR 61 changes:
https://github.com/PapiSalgueroM/ballpark-hero/pull/63. It remains draft, unmerged and unpublished.

Guest sweep session `11480`, node process `18220`, completed with exit 0 and the closing line `Swept 152 routes across 1 engines and 3 viewports (456 checks). 0 findings.` Its log is `.superpowers/sdd/2026-09-07-conquest-attack/site-sweep-final.log`.

Coordinator session `8842` was stopped just as the sweep finished and the full node suite began. Its log contains only `Running 266 node harnesses`; this is an incomplete attempt, not a pass or 266 measured failures. Read-only process inspection confirmed only Claude's two pre-existing full suites remained. The coordinator is retired and refuses to restart. Do not use it. The full node gate remains open.

A resource check counted 181 Node processes, but that count does not establish how many are busy. A Windows processor snapshot reported 99% load; subsequent three-second performance-counter samples reported 46.0%, 45.7% and 48.4%, with 2.8GB physical memory free out of 15.7GB. Four Claude-owned simulation children dominated the sampled CPU usage. No other process was stopped. The large Codex suite is held until the other suites settle and resources permit a clean isolated run.

The final Attack revision negative control was repeated on `edc31320`: offline generation passed, the exact revision transition was changed, the existing invariant failed, and the wrapper recognized that intended failure with exit 0. Temporary control files were removed and the tracked tree stayed clean.

The Website review checkpoint follow-up is active, points at this worktree and the completed sweep, and will resume the remaining node gate without duplicate jobs when capacity permits. It also tracks Claude's pending review and final season browser walk. Do not rebuild while a running suite reads `dist`. Keep the scratch evidence until broad verification is recorded and archived; unchanged state stays quiet.

## Implementation rulings retained for owner review

1. Start with verified England, not an incomplete World label. Broader coordinates and roster coverage remain open. Cost if this priority is wrong: another league may need to be built before extending England; the engine remains reusable.
2. If a home cannot launch across connected land, use the nearest playable owned anchor measured from that home, with lexical region-ID ties. This fixes the reproduced seed 9 dead end without sea jumps or arbitrary opponents. It is an explicit app interpretation. Cost if the owner prefers another frontier rule: change that rule before release and recheck saved-origin behavior.
