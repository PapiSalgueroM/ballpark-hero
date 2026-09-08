# Round 513 verification

Production change: `64fdea29`. Final comment correction: `fef84b82`.
Branch: `codex/round-513-midnight-saves`, based on the reviewed `21f7090b` candidate.
Local build: `http://127.0.0.1:4180`. This is not the published website.

## What changed

Older dated writes and delayed puzzle load effects only prune genuinely older
records for the exact game slug. Newer, malformed and other-game keys survive.
Save keys, versions, fields and pinned Eastern puzzle dates are unchanged.

Conquest streaks cannot be backdated by an older result. An older requested date
does not display future streak credit. The actual board commits final results and
their streak update inside one sport-wide browser lock, then only reads the streak
in its resumed continuation. Same-day stale-claim protection remains intact.

## Evidence

- Initial reproduction: 15 failing behavioral assertions, 3 already-safe checks
  passing. Failures included loss of the exact newer payload and a backward streak.
- Additional serialization reproduction: 1 failing overlap assertion, 18 passing.
- Focused final suite: 51/51 tests across 5 files, including the existing real
  Transfer Path and Career Path multi-guess regressions.
- New default-discovered harness: 19/19 live outcomes. All 6 negative controls
  changed an exact production branch and failed their named outcome assertions:
  delete-other-dates, old-hook-only cleanup, backward streak update, negative-gap
  streak read, per-date locks and missing in-lock streak finalization.
- Existing simDailyPuzzleContract and simConquestDaily checks passed.
- Task review and final whole-branch review found no Critical or Important issue.
  One stale per-day lock comment was corrected. The single scoped re-review is
  clean; its covering suite passed 19/19 after the comment correction.
- Type gate: `tsc --noEmit -p tsconfig.app.json`, exit 0. Production build: exit 0,
  2,839 modules, 73 seconds, current assets wired into 148 snapshots. Existing
  Browserslist age, ambiguous utility and large-chunk warnings remain.
- All 15 generated-site fences passed after that build, including real snapshot
  boot checks, sitemap hashes, policy-page checks and current-asset wiring.
- Native Chromium at 390 pixels: two isolated pages held different fixed dates.
  The old final commit finished inside real Web Locks before delivery to its
  board was deliberately suspended. The newer page then completed with the literal
  `{count:2,lastDate:"2026-09-07"}` streak. Resuming the old page preserved the exact
  newer result and streak strings, did not recreate the pruned old record, reached
  the final view and produced no page errors.
- The first controller browser run timed out on a wrong selector: it expected the
  already-played picker notice instead of the active run's final screen. The actual
  completed screen says "Daily done". After correcting only that selector, all
  storage and final-screen assertions passed. No production workaround was added.

The integrated full Vitest run on `fef84b82` finished with 359 passing and 2 failing
tests across 29 files in 171.87 seconds. Both failures are in the unchanged
SoccerAttackBoard test file: the full-map UI test exceeded its existing 30-second
limit, then the following cancelled-replacement check found one extra team-spin
transition. The 19 new midnight tests passed in that same run. A separate unchanged
Attack-file rerun reproduced both failures, with 14 passes in 41.87 seconds. The
cancelled-replacement check passes alone (347 ms). Read-only inspection found the
extra write is precisely seed 9's first team spin, and the timed-out loop keeps
using global screen/storage after awaits without observing Vitest's abort signal.
The Attack board, engine, save, map and data files are unchanged from `21f7090b`;
neither failing direct-board test calls the changed Daily helpers. This strongly
supports a lingering test continuation causing the second failure, but does not
establish why the original complete-map test exceeded 30 seconds. The full run is
red, not an all-clear. No assertions or timeouts were weakened.

The full node suite remains pending while Claude's existing heavy suite uses the
shared machine. Neither an incomplete run nor a deferred run is a pass. This is a
draft candidate only, with no merge or publish here.

## Ruling made

The initial helper-only scope was expanded to finalize the board's streak inside
one lock per sport and make its continuation read-only. The existing work board
calls for serialized streak writes; a synchronous localStorage guard alone does
not provide a transaction across browser contexts. If this choice is wrong, the
cost is that different-date daily actions for the same sport briefly wait on one
another. The serialization, same-day conflict and deferred-delivery tests cover
that boundary without changing saved formats.

## Next independent defect

A separate read-only probe of the previous reviewed build reproduced the home
page becoming completely empty when localStorage.length throws SecurityError.
Denied access to window.localStorage also stops module evaluation at the explicit
auth storage option in integrations/supabase/client.ts. After selectively allowing
that access, CookieConsent's unguarded mount read is the next root-level failure.
A denied consent write leaves the banner stuck. These are queued, not fixed by
Round 513. Follow-up scope is guarded optional auth storage, safe home enumeration
and privacy-safe consent fallback, without a global storage shim or changed game
persistence. The probes used fresh contexts and blocked all external requests.
