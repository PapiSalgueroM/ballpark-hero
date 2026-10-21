# Rounds 1517 and 1518: readable career match visuals

The owner asks to see matches in NBA My Career and fights in Fight Career, and to keep improving the site using his saved career, sports and life-simulation inspiration. The NBA report came from a 432 by 813 Android viewport. These are presentation requests, not evidence of a wrong engine result.

## Shared contract

Keep the current deterministic engines, random streams, saved results and save schemas unchanged. Add no real sports data, external assets or dependencies. Use original SVG artwork and generic figures. Do not add real athlete likenesses, logos, crests, kits, photos or attributed fictional dialogue. Existing scores and career progression remain unchanged. These are existing unlimited career games, with no new daily mode or score model.

Phone controls must remain readable at 360, 390 and 432 CSS pixels, with at least 44px tap targets. Keep the fixed stage size, existing back/close behavior, focus handling and scroll protection. Reduced motion gets a settled illustration. Instructions and a worked example must be available before watching and reopenable through the existing help control.

## Round 1517: NBA court recap

Objective: let a player understand the current quarter, both teams' scores and the direction of the game at a glance.

Use the existing lazy Season Center and its optional sport stage. Wire an original compact court only for the NBA binding. Keep it behind the existing viewer boundary so a visitor who does not watch games pays no new court download. Make the NBA entry say Watch games while preserving the existing entry marker and load-before-play/save protections. Other sports retain their current labels and behavior.

The stage reads the supplied DerivedGame, its quarter scoring events and current clock. Show a court, clear team sides, current quarter and lead, plus four quarter comparisons as they become available. Use the recorded hot-event flag for a generic player highlight. Preserve the final PTS, REB and AST line and the viewer's existing playback controls.

Visible explanation: scores update each quarter. No shot chart, possession indicator, individual opponent, made-basket animation or rebound location can be inferred from this payload. Do not depict those as recorded actions. A deeper possession engine is a separate later contract.

Verification: actual supplied events reconcile the displayed totals at 0, 12, 24, 36 and 48 minutes; future quarters and the final player line stay hidden; rest/injury games do not highlight participation; pause and Results show consistent settled frames. Watching, replaying and closing must preserve saved career bytes and the random stream. Test the actual lazy integration and phone geometry, home and away score order, and exact quarter boundaries shared with the clock. Effective faults must expose swapped sides, future leakage and false participation.

## Round 1518: Fight Career ring recap

Objective: make the latest revealed round and its tactical outcome understandable, with enough time to read it.

Add one original fixed boxing-ring SVG with two generic fictional figures inside the current fight card. Use the latest revealed RoundLog and existing condition point. Show the real current tactics, landed totals and knockdown on its actual victim. A player knockdown flag names the scorer, so the opponent is the victim. Keep the engine and conditionTrack unchanged.

Label the scene Round recap. Movement is an illustration of stance and condition, not an invented punch-by-punch sequence. The current round record has no strike times, types or coordinates. Only the current revealed knockdown or a completed KO puts a figure down. A TKO without a finishing-round knockdown shows the loser stopped with the TKO label, without inventing a fall. A decision leaves both upright.

Add Pause/Play and Next round beside the existing Skip action. Next round pauses, cancels the old timeout and reveals exactly one. Before completion use the scheduled round count, and scale comparisons from revealed rounds only, so future outcomes cannot change the current scene. Slow automatic reveals to a readable pace, with the exact interval chosen and documented by the builder. Show one compact current-round panel; older scorecards can be expanded without growing the default phone wall. Preserve fight creation, payment, result persistence and continue behavior.

Verification: actual fixture tactics/counts, both knockdown directions, no future round or winner leakage, KO/TKO versus decision poses, pause/manual step/skip, exact saved outcome and accessible summary. Test 360, 390 and 432px widths and reduced motion. Effective faults must expose victim inversion, future leakage and playback ignoring Pause.

## Build and release

Source starts from published main 076091ac870db38b953ddf71d3252cf1ac556782 in the separate ordinary checkout C:/Users/antho/.codex/checkouts/career-match-visuals/ballpark-hero, branch codex/career-match-visuals. Local app parsing and execution remain prohibited. All app type checks, tests, builds, simulations and browser work run on GitHub Actions with the existing offline transport and local fixtures. Do not read production users or exercise live AI/report endpoints.

First write outcome regression cases against the actual unchanged presentation and observe intended remote assertion failures. Then implement and run the full focused checks, effective faults, relevant inherited tests, completed-build readers and unchanged weight limits. Adopt generated snapshots only from verified remote output. Review and publish through a PR and the standard host commit/readback gates.

The protected Club Manager 1516/BO lane and world files remain untouched. Its incoming era-editor, league, wage-budget, coaching-award, national-team and matchplay requests are retained for coordinated later work. Their real-world inputs need the data guardian and source verification before implementation.
