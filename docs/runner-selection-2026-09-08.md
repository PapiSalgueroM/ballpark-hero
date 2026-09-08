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
