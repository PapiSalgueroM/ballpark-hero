# Cross-midnight save probe

Read-only diagnosis during Round 512. No fix or deployment claimed.

The probe executed the actual transpiled helpers against in-memory browser storage. The dates below are controlled test inputs.

## Proven shared cleanup defect

`src/lib/dailyRecord.ts:48` writes the caller's pinned date, then deletes every other key for that slug at lines 58 to 64. An old September 6 tab writes its run, a September 7 tab writes current progress, and a late September 6 write recreates the old record while deleting September 7. The newer payload is lost deterministically.

`src/hooks/useDailyPuzzle.ts` needs a narrower description. Its ordinary `addGuess` writer does not prune keys, so that stale write preserved September 7 byte for byte in the probe. Its load-effect cleanup does remove newer keys when passed an older pinned key. The effect can rerun when `puzzleIndex` changes, but a live post-midnight puzzle-index transition has not yet been reproduced through the hook. Do not claim every late guess triggers that deletion.

## Conquest streak distinction

`saveDailyResult` in `src/lib/conquestDaily.ts:200` accepts the board's pinned date. After controlled completions on September 6 and 7, the saved streak is `{count:2,lastDate:"2026-09-07"}`. Calling that helper for September 6 again returns 1, stores `{count:1,lastDate:"2026-09-06"}`, and deletes the September 7 daily record through the shared cleanup helper. `loadDailyStreak` also accepts a negative date gap as alive.

The normal serial board path is protected by Round 510's `commitDailyRun`: once today's write has removed yesterday's key, yesterday's expected record no longer matches, the commit returns conflict, and the board does not call `saveDailyResult`. The probe verified the streak and newer record survive this serial conflict.

A possible remaining board-level trigger is suspension after the old final commit succeeds but before its awaited continuation calls `saveDailyResult`. A newer-day tab can complete in that interval because the locks are date-specific. This interleaving is a test requirement, not a reproduced browser incident.

The generic completion streak is different. `recordCompletion` uses finish-time `new Date()` and rereads shared storage. Finishing an old puzzle today preserved today's current streak, longest streak and last date in the probe. A direct artificial backdated call to its lower-level streak helper can regress state, but no caller in that inspected chain supplied the old puzzle date.

## Narrow next-round checks

1. Older pinned writes preserve the exact newer daily payload, while normal forward rollover still prunes genuinely older records.
2. A stale ordinary `useDailyPuzzle` guess remains safe, and a late load-effect cleanup cannot delete a newer dated key.
3. Older Conquest results cannot lower the streak or move its date backward. Negative-gap reads must have an explicit contract.
4. A controlled board pause after the old commit, followed by today's completion and then the old continuation, must preserve today's result and streak. Keep the ordinary stale-commit conflict control.
5. Keep generic finish-time completion tests separate from Conquest's pinned-date streak tests.
