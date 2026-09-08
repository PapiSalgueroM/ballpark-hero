# Overnight work, September 8, 2026

Start: 09:46:50 UTC. Stop starting work at 17:46:50 UTC, then safely checkpoint
the active bounded unit and provide a handoff. Local heartbeat: every 15 minutes.
No merge, publish, production database writes, provider changes or paid services.

## Round 517 plan

1. Reproduce one 50-point finish followed by repeated activity pings. The current
   implementation reports four plays and average 13 after three pings, rather
   than one play and average 50.
2. Separate streak-only activity from completion recording. Preserve date/streak
   behavior, finished-game counts, points and genuine completion accounting.
3. Verify same-day and consecutive-day activity, actual completion, storage
   behavior and no account writes. Prove the old completion call breaks the test.
4. Run relevant tests, exact app type gate, build, all fifteen generated-site
   fences and independent review. Leave the broader suite status explicit.

## Round 517 scoped verification

- RED: original code failed two of six real-code cases, with four plays instead
  of one after three pings, and three instead of one for two pings plus a finish.
- GREEN: all six cases pass against the real modules with an isolated backend
  boundary. Same-day totals, consecutive/missed days, actual completion, zero
  backend calls, quota failure and empty routes are covered.
- Six controls passed exact failure contracts: completion (2), dayless (1),
  network (1), erase (3), empty (1), uncounted (2). They must change source,
  fail their specified AssertionError messages and leave other cases passing.
  No activity-test temporary directories remained after the final runs.
- Fresh `npm ci --ignore-scripts` and explicit postinstall kept the pinned SDK
  patch intact. Exact app types pass. Build passed in 38.93 seconds with 2,839
  modules and entry `index-NKKSIYfc.js`. Existing Browserslist, duration utility
  and large chunk warnings remain. No package or lockfile change.
- All fifteen generated-site fences pass on that final build: simAdsense,
  simBrand, simHeadTags, simHiddenPages, simHubs, simIndexNow, simIndexing,
  simInternalLinks, simNoRivalNames, simPrerender, simPrerenderBoot,
  simRetiredRoutes, simSchema, simSitemap and simSnapshotAssets. The browser boot
  samples have zero failed requests and all eleven retired routes redirect.
- simScoringCoverage, simCompletionOnce (eight tests), simSessionMarks and
  simActivityNotCompletion (two real-hook tests) pass. Snapshots and the sitemap
  ledger are unchanged from Round 516.
- Independent read-only review found no actionable issue. Limits: no real
  signed-in account/browser profile restoration test, and no explicit legacy
  snapshot, nonempty visit history or throwing-read fixture in the new harness.
  Those unchanged paths are not claimed newly verified. No whole-suite all-clear,
  historical totals correction, merge or publication.

## Remaining findings, not yet fixed

These are source audits at `a7a07d30`, not production prevalence measurements.

- Profiles: fresh browsers never restore `profiles.streak_state`, but completion
  sync uploads the smaller local snapshot. Own profile mixes server points with
  browser-only play counts. In-memory fixture: 10 plays/500 points followed by one
  50-point finish from empty storage gives server totals 11/550 but a local count
  of 1. The displayed average can become 550 instead of 50. Requires a separate
  account restoration/aggregation design and mocked integration tests.
- Profiles: local dates use Eastern while account completion writes and profile
  queries use UTC. At 2026-09-08T01:00:00Z they disagree by one calendar day.
  Historical row interpretation must be considered before changing this.
- Ticker: every sport resets the scroll to zero, holds 1.5 seconds and traverses
  the full row containing all collapsed sport labels. Later sports spend longer
  crossing preceding labels. Next safe UI fix: measure each active sport's bounds
  and test actual score-card visibility at every handoff and final wrap on phones.
- Ticker: the REST query returns the earliest 60 fixtures across all sports, then
  sorts live-first. Later live fixtures and whole sports can be lost before that
  sort. Test a bounded paginated query against a realistic REST stub first.
- Ticker: browser reads every five minutes. This is separate from upstream delay;
  the documented backend poll interval is not verified current production evidence.
  Mock time and changing responses before changing the refresh policy.

## Ticker follow-up preparation

Keep the current hub-navigation links, which are not sport selectors. A wrapper
ref on the active SportBox can give the group's left edge and its final score
card's right edge in viewport scroll coordinates. Clamp that interval to physical
scroll range instead of restarting at zero and traversing all collapsed labels.
Remove the animated 4,000px max-width cap before relying on measured bounds.
Include a visible final-card hold on sport changes and the one-sport restart.
Test actual first/last score-card visibility through all nine sport handoffs,
including final wrap, resize, pause and reduced motion. The current reduced-motion
mode mounts every group but hidden overflow needs manual-access verification.
Preserve existing hub links and avoid adding a selector as an incidental change.
Use synthetic fixtures only. Keep refresh/pagination as separate bounded fixes.

## Verification isolation

Round 515's full node run was active when work began (session 95111, PID 56308),
then finished with exit 1 during this turn. All 264 node harnesses reported, with
eight not green: simConnect4ClubRecords, simLineupPositions, simLoginReturn,
simNoZeroFacts, simRarityPools, simSoccerStintNameFold, simTransferOverlay and
simWorldXiPositions. Five report failed backend fetches or missing fetched pools.
The Connect4 and name-fold guards report source expectations missing. LoginReturn
calls bare `chromium.launch()` instead of the project's browser loader. A direct
launch-only reproduction in Round 515 failed because Playwright's expected
`chromium_headless_shell-1234` executable is absent. Installed Chrome remains
available for the other browser harnesses. No actual sign-in was attempted and
this is not evidence of a production login failure. Keep that portability repair
separate from Round 517's profile fix.
Do not treat this as a passing suite or as evidence for Round 516 or 517.
Another full run, PID 43208 started 05:28 Eastern under a Git timeout parent,
remains active and is not owned by this turn. Do not stop or duplicate it.
Round 516 preview stays on port 4186.
Some existing harnesses use fixed filenames in the shared OS temp directory.
Give this round a unique process TMP/TEMP directory for runs alongside the suite.
