# Conquest full-map verification follow-up

Read-only check of the unchanged Round 513 candidate on September 8.
No game code, test driver or timeout was changed.

## What the latest replay proves

The isolated full-map UI test passed in 29.632 seconds against its existing
30-second limit, with 368 ms of headroom. Fifteen other tests were skipped by
the explicit name filter. This is not a full-file or full-suite pass, and it
does not erase the earlier suite and isolated timeouts. A prior same-code run
was recorded at 19.116 seconds. No one timing proves a performance root cause.

The deterministic seed-9 game completes after 160 actions. The earlier 32-click
probe covered only 20 percent of that path. The map remains 48 regions and
2,166 ring points, so it does not grow when clubs capture one another.

Actual growing work includes captured-player validation, recap text and the
inspected roster. Late recaps contain up to 13 captured names in this measured
run, the inspected winner roster reaches 49 players and the final save is
161,778 bytes. Every action also clones, validates, serializes, stores and reads
roughly 160 KB of state. Fresh references cause map lookup and label work to
repeat, even though the geometry size is fixed.

The test itself parses the full save and searches the entire accessible page
for a button after every action. Those are executed paths, not proof that they
dominate time. Measure early, middle and late React commits before changing
production rendering or save guarantees.

## Safest next investigation

Keep the real board and map, all 160 UI actions, final winner, no-ranked-score
and reload assertions, and the current 30-second limit. Profile first. A test
driver improvement can scope role queries to the existing action panel and
avoid reparsing the save on every known phase. Require exactly 160 actions;
a negative control stopping at 159 must fail completion. Do not replace the
whole-map run with a near-finished save or inflate the timeout to report green.

## Capacity correction

The older full-suite PID 52872 had ended, with no live descendants, by the
process audit. Its exit code and result were not recovered from that fact.
Most remaining Node processes were Codex, browser-control and plugin helpers,
not orphaned test workers. A separate Gemini-launched browser audit was active
outside these worktrees. Nothing in that other lane was stopped or changed.
Process count alone is not evidence that the old test was CPU-starved.
