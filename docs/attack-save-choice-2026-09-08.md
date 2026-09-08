# Round 540: pending save choice ownership

September 8, 2026. Worktree `.worktrees/round-540-attack-save-choice`, branch
`codex/round-540-attack-save-choice`, base539 `060d7096`, claim `1d3164b3`.

## Change

After a failed Attack save, an active Retry previously left unsaved-play
buttons usable. That choice could show a local recap, then an older awaited
retry could replace it with another tab's restart. All four unsaved-choice
buttons now disable while saving, and playUnsaved synchronously checks the
busy ref before changing the session. Ordinary unsaved play reopens when the
save attempt finishes. No engine, sports data or save format changed.

## Evidence

- The original two-board audit shows the selected seed9 Palace penalty-win
  recap replaced by a seed88 team wheel while the unsaved badge remains.
  `%TEMP%/dukb-soccer-attack-retry-audit-5cfd3065a2154f46a0bfc27d0cdc4f57`.
- Six final durable cases fail against the original Board and pass against
  the repair. They cover four notice/recovery contexts, a native second click
  before React updates disabled controls, and a real generated restart queued
  before Retry. Idle fallback retains the same move, captured players and
  saved bytes. Baseline evidence:
  `%TEMP%/dukb-round540-save-choice-baseline-38bed85fedd74a149244fa96c531c169`.
- Eleven exact source controls each produce their single intended assertion
  failure. Unexpected runtime and caught-backend probes reject with exit1.
  `%TEMP%/round540-save-choice-controls-ef2c34a3d18f47e39e7216527fa5b513/results.json`.
  Unsupported role-query options were removed after the final TypeScript
  check caught them; the final six-case rerun passes.
- Both exact TypeScript projects and build pass. Build took33.96seconds.
  All15 site checks pass. The selected runner passes the new six-case harness,
  the unchanged offline map/engine/save/Board integration, and World XI pool.
- Phone390 and desktop1440 each pass an actual two-tab walk and a disabled
  button control. A second native click reaches the still-enabled mounted
  button in every walk and the busy ref rejects it. A confirmed seed88 restart
  is restored after conflict. An ordinary failed move can still enter unsaved
  play, show its exact score, capture and ownership map, then Continue without
  replacing the saved bytes. Zero unexpected runtime, network, local-resource
  or console faults; no horizontal overflow. Main reviewed phone locked and
  unsaved states plus desktop results.

Browser evidence: `%TEMP%/dukb-attack-save-choice-GZxS6v` (phone), `SrSfN1`
(desktop), `U5BTTE` (both controls), and `PUa1qb` (final controls with barrier mode recorded). These walks explicitly wait for native
cross-tab storage visibility before releasing Retry. They prove choice
ownership, NOT raw-queue save durability. The two failed unbarriered walks
and one passing diagnostic are documented in
`docs/conquest-save-visibility-2026-09-08.md`. That separate intermittent
lost-update bug is pending Round 541 and must not be reported fixed here.

## Handoff

Logs: `%TEMP%/dukb-round540-{install,app-types-final,node-types,build,site-fences,boot,prior-sims,save-choice-runner}.log`.
Preview4216, PID35056: index-CwIJzwt6.js and SoccerConquest-BlgKe9ym.js.
Preserve Claude's root and all prior worktrees/previews. Draft only, no main
merge, publication, real data or backend/account writes. No broad suite.

The locked install reported two moderate dev-tool advisories (vitest and
@vitest/mocker). Dependencies did not change. Their separately captured audit
is `%TEMP%/dukb-round540-dependency-audit.json`; any toolchain upgrade needs its
own checked round. The earlier grid-tier partial-fetch false-green also
remains a separate follow-up.