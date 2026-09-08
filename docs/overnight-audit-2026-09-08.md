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

## Verification isolation

Round 515's full node run was still active when work began (session 95111,
PID 56308). Do not rebuild or edit its source/runtime/dist, duplicate it or claim
its eventual result covers Round 516 or 517. Round 516 preview stays on port 4186.
Some existing harnesses use fixed filenames in the shared OS temp directory.
Give this round a unique process TMP/TEMP directory for runs alongside the suite.
