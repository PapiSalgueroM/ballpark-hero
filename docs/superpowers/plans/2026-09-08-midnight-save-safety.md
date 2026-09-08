# Midnight Save Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox syntax for tracking.

**Goal:** An older daily tab must not delete newer progress or roll a newer Conquest streak backward.

**Architecture:** Keep the existing dated save keys and payloads. Share chronological cleanup between the record writer and puzzle hook. Commit Conquest final results and their monotonic streak updates inside one sport-wide browser lock, before the board can reveal the finish. Test the actual hook and board across the midnight boundary, including a deferred final-commit continuation.

**Tech Stack:** React, TypeScript, localStorage, Vitest, Testing Library, existing node harness runner.

**Spec:** `docs/midnight-save-probe-2026-09-07.md`, especially its narrow next-round checks, plus Anthony's September 8 instruction to continue other improvements.

## Global Constraints

- Preserve every existing storage key, version, payload field and pinned Eastern puzzle date.
- Never delete a newer daily payload, rewrite its bytes, or change another game's record during cleanup.
- Normal forward rollover must still remove genuinely older dated records for that exact slug.
- Do not change same-day Conquest claim ordering, completion scoring, puzzle seeds, or Attack mode.
- An older Conquest result cannot decrease the stored streak date or count. Reading a streak dated after the requested day returns 0, not future credit.
- Keep production changes in dailyRecord.ts, useDailyPuzzle.ts, conquestDaily.ts and ImperialismBoardShared.tsx. Test configuration and harness changes are allowed only to exercise these contracts.
- No dependencies, database writes, sports data edits, public submissions, merge or publish. No em dashes or en dashes in new text.
- Work only in `.worktrees/round-513-midnight-saves`. Root belongs to Claude. PR 63's reviewed tree and preview stay unchanged.
- Run focused tests serially with unique process-local TEMP/TMP. Do not start another full node suite while Claude's heavy suites run. The controller owns broader gates.

### Task 1: Protect daily records and streaks from older tabs

**Files:**

- Modify: `src/lib/dailyRecord.ts`, `src/hooks/useDailyPuzzle.ts`, `src/lib/conquestDaily.ts`, `src/components/conquest/ImperialismBoardShared.tsx`
- Create: `src/test/midnightSaves.test.tsx`, `scripts/simMidnightSaves.mjs`
- Modify: `vitest.config.ts` only for temp-copy mutation aliases, if needed
- Existing regression coverage: `src/lib/dailyRecord.test.ts`, `src/test/dailyRecord.test.tsx`, `src/lib/conquestDaily.test.ts`, `src/components/conquest/ImperialismBoardShared.test.tsx`

**Interfaces:**

- Consume unchanged `writeDailyRecord(slug, date, fields)`, `useDailyPuzzle(options)`, `saveDailyResult(sport, result, date, picks)` and `commitDailyRun(sport, expected, next, date)`.
- Add `pruneOlderDailyRecords(slug: string, date: string): void` in dailyRecord.ts, used by both cleanup callers. Collect keys first, delete only exact-prefix canonical calendar date suffixes strictly less than the caller's pinned date. Malformed, nested-prefix and future keys are left untouched; invalid cutoff means no cleanup.
- Preserve the old tab's own dated write. Return 0 for an older result's streak display when the store already holds a later date; do not attribute the later streak to the old puzzle. Preserve the later streak record byte-for-byte.
- Preserve synchronous saveDailyResult for the existing direct harness contract. The real board must mutate the streak only inside commitDailyRun's browser lock. Use one lock name per sport, not per date, so different-date final commits serialize as well. After a final run saves successfully, call saveDailyResult inside that lock callback. The board's continuation reads loadDailyStreak and never calls the writer after the lock. Same-day compare-and-save checks and return values are unchanged.

- [ ] **Step 1: Add reproductions before implementation.** Use real localStorage and real helpers. The core record oracle is literal and compares raw bytes:

```ts
writeDailyRecord('midnight-probe', '2026-09-06', { guesses: ['old'] });
writeDailyRecord('midnight-probe', '2026-09-07', { guesses: ['new', 'progress'] });
const newer = localStorage.getItem('midnight-probe-daily-2026-09-07');
writeDailyRecord('midnight-probe', '2026-09-06', { guesses: ['old', 'late'] });
expect(localStorage.getItem('midnight-probe-daily-2026-09-07')).toBe(newer);
expect(JSON.parse(newer!).guesses).toEqual(['new', 'progress']);
```

Add controls for forward cleanup, unrelated slugs, same-date replacement, malformed suffixes, month/year rollover and failed storage writes. Use `renderHook` for useDailyPuzzle: mount on September 6, advance the fake Date to September 7, mount a newer hook and save guesses, then change the older hook's `supabasePuzzle` to a different pool index through rerender. Its pinned date must remain September 6, its load effect must actually run, and the newer raw payload must survive. Separately show an ordinary older addGuess already preserves the newer payload. Keep the Round 503 same-tick multi-guess tests intact.

For each of the five Conquest sports, complete September 6 and 7 through saveDailyResult. Assert literal `{ count: 2, lastDate: '2026-09-07' }`, capture raw streak/result, submit September 6 again and assert both newer bytes unchanged and return 0. Assert repeated same-day result is idempotent, next consecutive day increments, a skipped day resets, and loadDailyStreak returns 0 for an earlier requested date.

For the actual ImperialismBoardShared integration, adapt its existing seedFinalRecap/openTab helpers in the new test file. Keep board, engine, daily store and completion hook real; mock external recording and decorative map as in its current tests. Simulate per-key navigator.locks. After the old final lock callback saves and releases its lock, defer resolving that request promise to its caller. Advance Date, seed and finish the new day's board, capture its saved result/streak, then release the old promise. Assert both newer byte strings survive and the old board reaches its finished view. Separately keep the ordinary stale-commit conflict control that never reaches a second finish. Never add a production-only test seam.

Add a real commit test for the serialization boundary. Seed pending results for two different dates without pruning either, queue both final commits through a fake per-key lock, and assert both results are committed with the streak mutation still inside the active callback. The stored streak ends on the newer date with literal count 2 when the earlier commit runs first. Hold the first callback until explicitly released and prove the second cannot modify the shared streak meanwhile. Assert observable storage sequencing, not only the lock name. A negative control restores per-date locks and must violate the overlap/sequencing assertion; another removes the in-lock streak update and must fail the pre-continuation stored-streak assertion.

- [ ] **Step 2: Run RED.** Run `node node_modules/vitest/vitest.mjs run src/test/midnightSaves.test.tsx --maxWorkers=1 --minWorkers=1 --no-file-parallelism`. Record which assertions fail on the existing cleanup and streak paths. Tests of already-safe behavior should pass; a loader error is not a reproduction.

- [ ] **Step 3: Implement the minimal fixes.** Both cleanup callers use the shared helper. Its selection has this shape, with a strict calendar-date check before comparing:

```ts
const prefix = `${slug}-daily-`;
const savedDate = key.slice(prefix.length);
if (key.startsWith(prefix) && isCanonicalDate(savedDate) && savedDate < date) stale.push(key);
```

Keep write-before-cleanup ordering and best-effort storage catches. In loadDailyStreak, a negative calendar gap returns 0. In saveDailyResult, detect a later stored date before writing the streak, preserve that record and return 0 for the older caller; still route the old result through existing saveDailyRun. Use a small local flag or branch rather than changing public interfaces. In commitDailyRun, use one sport-wide lock and finalize the streak there only after saveDailyRun succeeds for a finished record. In the board continuation replace its saveDailyResult call with loadDailyStreak for the pinned date. This eliminates the unlocked second writer without changing scoring or same-day conflict handling.

- [ ] **Step 4: Prove GREEN and negative controls.** Run the new test file and all four listed existing regression files serially. Add simMidnightSaves so default node discovery exercises the new file. Its temp-copy controls independently restore (a) delete-all-other-date cleanup, (b) older-hook cleanup only, (c) backward streak update, and (d) negative-gap streak read. Assert each source rewrite matched exactly once and changed code. Require the named behavioral assertion to fail for each control; syntax/module errors cannot count. Keep controls in unique ignored temporary directories, never alter production source in place. Emit at least four informative lines and an actual final pass/fail count so runAllSims cannot classify the wrapper EMPTY.

- [ ] **Step 5: Commit and report.** Commit only this task's source/tests/harness/config. Report RED and GREEN commands and output, mutation outcomes, changed files and any concerns to the assigned report file. The controller updates PROJECT-STATE and WORKBOARD and runs type/build/generated-site fences on the integrated result.

## Controller verification and delivery

- [ ] Run task-scoped spec and quality review, resolve findings, then one whole-branch review and any single final fix wave.
- [ ] Run the real type gate and production build. If generated snapshots change, run all 15 generated-site fences in sequence after the final build.
- [ ] Record exact tested commit and outputs. Keep full node validation pending while shared-machine capacity is unavailable; do not call a partial run a pass.
- [ ] Push the isolated branch with an accurate draft handoff. Do not merge or publish. Preserve PR 63's review checkpoint independently.
