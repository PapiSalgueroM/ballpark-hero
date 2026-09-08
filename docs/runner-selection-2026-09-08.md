# Round 528: explicit harness selection

Base527 e012beec, draft PR78. The default runner currently discovers every
node harness, including production write/cache probes documented in the state
file. Require a nonempty ONLY list before any probing or subprocess work.
Browser opt-in alone must not bypass selection. Named lists, filename aliases,
unknown-name refusal, child environment cleanup, failure and empty-output
reporting retain their existing behavior.

This guard does not isolate network access. Selected harnesses still require
inspection and authorization; full suite process isolation remains unresolved.
No new broad-run bypass or automatic production probing will be introduced.

Use an actual copied runner in a temporary marker-only repository to reproduce
the default execution, then verify refusal and exact changed-source controls.
The fixture intercepts fetch and runs only small marker-writing local scripts.
Do not test the unsafe old behavior against this project's real scripts.

## Evidence and review

Before the guard, the copied plain command exited0 and recorded one intercepted
database probe plus both unselected local children. After the guard, all eight
empty-selection variants refuse with no markers, including browser-only flags,
blank/comma lists and database-probe overrides.

All 21 fixture cases (22 checks) pass. Six exact source controls produce 18
expected behavioral failures, including real marker activity after removing
the guard. A runtime/load-error control is rejected with exit1. Every fixture
uses a synthetic client, intercepted fetch, local marker children and a fake
browser server that never binds a socket. Temporary cleanup checks its exact
unique directory before removal.

The review found that a literal browser import inside generated fixture code
made the outer harness look like a browser test to the runner's source scan.
Constructing that generated import fixes classification while retaining the
real fixture branch. The actual needsBrowser function now classifies the new
harness as a node test. Final independent review has no actionable finding.

Control evidence:
`C:\Users\antho\AppData\Local\Temp\round528-runner-controls-fa9450c4209445f5acb6b87cc14d95c8\results.json`.

Tracked CLAUDE.md and SHIP-PIPELINE.md now explain explicit selection. The
untracked root AGENTS.md belongs to the root workspace and was not edited.
Historic bare-command examples now encounter the refusal and usage message.
The full suite is still not declared isolated or verified.

Both exact type checks and `npm run build` pass. All fifteen generated-site
fences pass; the fourteen node fences ran alongside simRunnerSelection in an
explicit list with DB_PROBE=unreachable, while simPrerenderBoot ran directly
through installed Chrome on port4329. The runner reported all15 selected node
harnesses green, including simRunnerSelection, proving its checks were not
skipped as browser work. No real database probe was needed for this named run.

No app, package, lockfile, snapshot or sitemap ledger changes. The build still
uses index-BXbTBTnd.js, and NBA preview4205 remains on the preceding round.
Logs: `C:\Users\antho\AppData\Local\Temp\dukb-round528-build.log`,
`dukb-round528-fences.log` and `dukb-round528-boot.log` in the same directory.
