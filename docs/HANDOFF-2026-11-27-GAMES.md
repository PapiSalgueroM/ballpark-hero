# DoUKnowBall release handoff, November 27, 2026

The original four-mode release was published and replayed on `index-CcQ7--q_.js`. Five subsequent Club Manager releases reached the custom domain. The latest application revision is `fbe6b0305`, serving `index-Cdnjm2PD.js`. Managers can scout and sign players for a brief, plan squad succession, give conditional bench orders, practice and call competitive shootouts, choose flank tactics before kickoff or during a match, and rehearse a named pair for a competitive corner. See [Project state](PROJECT-STATE.md) for the native results and [the expansion ledger](EXPANSION-IMPLEMENTATION-LEDGER.md) for the continuing manager work. The December 4 revenue comparison remains scheduled.

## What players can do in the candidate

| Game | Where to find it | A decision to test |
| --- | --- | --- |
| Club Manager | Tactics, Rehearse the next match | Protect a 1-0 lead or chase a 1-0 deficit with the selected eleven. Give instructions at 60 and 75 minutes, compare the result with the standing instructions and optionally apply the final call to the next competitive kickoff. |
| Stadium Tycoon | Matchday Director, Gate Control | Staff a scanner or send overflow to a neighboring entrance. Upgrade a turnstile between fixtures and choose which of three kickoffs to hold. Replay the same schedule to compare the receipts. |
| MLB My Career | Training diamond with a starting or relief pitcher, Inherited Runners | Protect one-run leads in the seventh, eighth and ninth innings. A pitch that induces a double play against one hitter can put the next hitter on base. |
| Missing XI | Full XI, Scouting Challenge | Spend a report on one shirt. A correct pick counts as assisted and a miss locks that shirt. Three and six clean recalls earn another report apiece. Daily and ordinary Full XI keep their own results. |

The four modes reuse their existing public game URLs. Their instructions are in the game guides and What's New. Gate Control replays a saved sequence of calls. Its simulation checks all 64 draws against both a winning strategy and a losing one, verifies crowd conservation and restores every winning checkpoint. Set `SIM_GATE_CONTROL=sign` for the negative control.

## Local evidence collected before the push

All five changed URLs completed prerendering. Regenerating the sitemap found five changed page fingerprints and preserved the other 171. The build passed after retrying with two Go workers. At 390 and 1366 pixels, Club Manager resumed the rehearsal at 75 minutes and took the same fixture to a 2-2 draw or a 2-3 defeat. Applying the chosen instructions opened the real next kickoff. At 320, 390 and 1366 pixels, Gate Control could meet all three targets or miss all three on the same draw. Starting and relief pitchers could preserve all three leads or concede all three on the same innings. Reload, keyboard focus and the existing hitter training entry passed. The practice replays used disposable profiles and intercepted outgoing submissions.

The app TypeScript check passed, as did 22 focused tests across five files, all 15 release checks and the Gate Control simulation. The assembled build retained the same local entry. Missing XI completed six full scouting sessions at 320, 390 and 1366 pixels. The correct pick produced 11/11 and the wrong pick produced 10/11 on the same lineup, with ten clean recalls in both cases. All six restored the open report and the finished sheet. A prior full-suite run against an older revision stopped before completion. Its recorded failures include simClubManagerScore and simDailyReload. Keep its results distinct from this candidate's focused checks.

## Release ownership

This is a GitHub handoff. The last verified public release at handoff was `bd230ad40` with entry `index-C_DFbd-D.js`. The new four-game candidate built successfully with local entry `index-CBE6ynNH.js`. The public host builds its own entry. Check Lovable's reported revision against both remote release refs before publishing, then check what douknowball.com actually serves.

Start from the latest remote `main`. The Lovable project has also tracked `codex/ads-layout-2026-11-27`. Compare both before fast-forwarding either and preserve any newer work. The owner's original checkout contains unrelated edits. The existing integration checkout or an isolated clean worktree is the place to continue.

1. Read the newest entry in [Project state](PROJECT-STATE.md). Run the app TypeScript project, the four focused gameplay checks, the build and snapshot gates from [the shipping guide](SHIP-PIPELINE.md). Complete the native phone and desktop replays for fresh play, resuming, replaying a different outcome and preserving the underlying career and Daily results. Keep the older Club Manager replay and its documented baseline.
2. Publish the verified revision once. Repeat direct visits and active play on the custom domain. Check the four game guides and What's New in the served HTML. Check sitemap, canonical, indexability and IndexNow for those pages. Test consented single GA page views on real route changes, plus refusal and opt-out. Intercept QA submissions so the tests do not create impressions or analytics traffic.
3. Recheck ad space on Home, Soccer Career, Club Manager, the sport hubs and the priority routes at 1280, 1366, wide desktop and phone widths. Use the actual placed creative edge and playable controls for clearance. [Traffic priorities](TRAFFIC-PRIORITIES-2026-11-26.md) distinguishes the ten pages visible in Lovable from the 25 Google Search landing pages. Search clicks alone cannot establish the site's most played games.
4. Continue shipping playable additions from the owner's expansion masterplan and [implementation ledger](EXPANSION-IMPLEMENTATION-LEDGER.md). Prioritize verified traffic, preserve saves and controls, and show the difference between two player decisions on a matched draw. Keep runtime ad or consent changes in their own release.
5. Keep the existing December 4 comparison for November 27 through December 3. Use matched dates, equivalent periods and the same Lovable page-view denominator for AdSense impressions and earnings per 1,000 site page views. Separate a rendered slot, a request and a paid impression. Record the source, dates, reporting timezone and any missing data.

## Advertising and privacy already in place

The shared layout reserves equal desktop side slots when safe, plus one footer placement. Phones use the footer. Keep the publisher tag, ad and analytics permissions, regional defaults, European 30-day affirmative renewal, existing refusals, Global Privacy Control and the visible Cookie choices link. Unknown regions require a choice. The preceding release's browser checks and their scope are recorded in Project state. Keep fullscreen vignettes off while Google cannot reliably limit them to safe phone-only transitions between public pages.
