# Navbar stats read repair, 2026-09-15

## Scope

Repair commit: `14778302e6d265c898e359c13a4c38e91d481a79`.
Base: `03fa0efa96369ecf565c0c3039e629aee2a2c1cf`.
Recorded validation: `2026-09-16T00:56:02.302482+00:00` (September 15 in America/New_York).

The three committed files are `src/hooks/useGameNavbarStats.ts`, its adjacent test file, and `scripts/simNavbarStatsReads.mjs`. The hook starts remote stats reads only for a signed-in user whose loaded profile belongs to that account, while the document is visible. Local completion counts and streak updates remain available for guests and hidden documents. Login, profile changes, foreground refresh, the visible 60-second fallback, and the existing 800-millisecond completion refresh remain supported.

Each effect generation ignores obsolete success and error responses. Account changes clear prior remote stats. Cleanup removes listeners and cancels polling and queued completion timers. The Supabase scoring endpoints and payloads are unchanged. A TypeScript AST comparison found the original query pair and five result/scoring expressions identical to the base: `[rankRes, playedRes]`, `rankRow`, `totalPointsToday`, `dailyRank`, `serverGames`, and `gamesPlayedToday`.

## Measured offline evidence

`node scripts/simNavbarStatsReads.mjs` passed all seven actual-hook cases using fake timers and mocked Supabase responses:

1. Guests make zero stats RPC or completion-table calls through focus, visibility changes, completion and 180 seconds of timer advancement; local facts update.
2. Hidden signed-in documents make zero new stats calls through 120 seconds, focus and completion; foreground makes one request, in-flight focus is coalesced, visible polling remains active, and hiding again stops new calls.
3. Login waits for the correct profile; account changes reject the preceding account's profile, and handle changes refresh.
4. Completion updates local facts immediately, coalesces the delayed request at 800 milliseconds, and preserves distinct-game counting.
5. Same-handle account changes create a new generation; stale successful responses cannot replace current stats; sign-out clears remote stats.
6. Stale errors cannot finish the current account's request; current errors retain local facts and allow recovery.
7. Unmount removes timers and listeners, including a queued completion refresh.

All 12 unique source mutation controls proved their intended assertion failures: `guest`, `hidden`, `foreground`, `poll`, `profile`, `completion`, `local`, `identity`, `stale`, `error`, `timer`, and `listener`. Each exited 1 with its `CONTROL PROVED` marker. The real app type command, `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json`, exited 0. JavaScript syntax and diff whitespace checks passed. Parent and independent harness reviews found no production blocker.

Local evidence is retained in `C:/Users/antho/AppData/Local/Temp/dukb-navbar-stats-repair/`: `summary.json`, `healthy-report.json`, `controls.json`, the twelve control logs, and `query-and-score-equivalence.json`.

## Limits and integration

These tests prove avoided requests in the modeled hook lifecycles. They do not measure production visitor traffic, database bytes, Disk IO budget recovery, or latency savings. Other navbar hooks and their reads were outside this repair. Already-started reads are not aborted when the document becomes hidden. A completion refresh encountering an in-flight request can wait for the existing foreground/poll refresh; this behavior was inherited.

No new runtime import dependency was added: AuthContext and useAuth were already imported. Added hook code can still increase a shared chunk's size. Exact combined build and unchanged weight-budget checks belong to the separate integration gate. This record covers the isolated repair; it does not approve an integration artifact or include the later lazy DailyLegendOverlay change.
