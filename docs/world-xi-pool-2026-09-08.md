# Round 539: complete World XI player loading

September 8, 2026. Branch `codex/round-539-world-xi-pool`, base538
`db9766d9`, claim `90c8fe8f`. Draft-only work, no backend or account writes.

Implementation: `593b9f4b`. Draft PR90: https://github.com/PapiSalgueroM/ballpark-hero/pull/90.

## Repair and scope

`fetchWorldXiPool` previously appended only successful required query responses.
A failed middle page could therefore remove1000 players, retain more than the
800-player floor and still authorize play across12 countries. If the missing
page contained a current player also present in the previous-year extras, the
old record could become the retained record. A failed previous-year query also
silently removed its extras. Required responses now all need data and no error.
Empty successful tail pages remain valid. Failed loading uses the existing
page's Try again state. Optional curated position history remains fail-soft.
The existing8000-row capacity, identity rules and eligibility thresholds stay
unchanged. Fixtures use only synthetic names and nations, never real-data edits.

## Verification

- The actual function is bundled with a synthetic query client. The unchanged
  baseline has20 required-page failures and7 passing comparison cases; the fix
  passes all27. Every required page is checked with returned errors and null
  data. The cases also cover retry, optional history, current-year precedence,
  previous extras, a legal11-country draw and existing minimum-pool rules.
- Exact source controls restore the old omission (20 intended assertion
  failures) and incorrectly require optional history (1 intended failure).
  Unexpected runtime errors reject with exit1. Network attempts must be zero.
- Both exact app and node TypeScript checks pass. Build passes in32.54seconds.
  All15 generated-site checks pass. The selected runner passes simWorldXiPool
  and the unchanged simWorldXiReport. No broad or live-data harness was run.
- Phone390 and desktop1440 each cover missing current page, missing previous
  extras, and missing optional history. All6 normal cases pass. Both viewport
  action controls detect an intercepted Retry and Draw, restore each control
  and complete a valid pick. Every case selects Fixture Player1025 from the
  formerly missing middle page and reaches Filled1/11. The failures are served
  through intercepted actual Supabase requests; no game state is injected.
  Zero unexpected runtime, network, local-resource or console faults; layouts
  fit both viewports. Main image review checked the phone error and both
  viewport first-pick states.

## Evidence and handoff

OS-temp logs: `dukb-round539-world-xi-baseline.log`,
`dukb-round539-world-xi-partial.log`, `dukb-round539-world-xi-optional.log`,
`dukb-round539-world-xi-runtime.log`, `dukb-round539-app-types.log`,
`dukb-round539-node-types.log`, `dukb-round539-build.log`,
`dukb-round539-site-fences.log`, `dukb-round539-boot.log`,
`dukb-round539-scoped-sims.log`.
The first oversized baseline log `dukb-round539-world-xi-before.log` was
interrupted and replaced by the complete compact baseline above. The first
browser run SGWsDm completed its game flow but rejected Chrome's expected
blocked-font Inspector suffix. The exact blocked-request receipt now verifies
that console exception; the passing reruns are6fzmHv,NORQuL andPDg61V under
`%TEMP%/dukb-world-xi-pool-*`, with report.json and screenshots. A final phone control refresh lnZy6a adds a filled-squad screenshot; main reviewed it. Synthetic nation labels exercise the existing fallback, so real flag rendering was not assessed.

Preview4215, PID4980, serves index-DYgVTiKy.js and WorldXi-DaR_DXKt.js.
Preserve Claude's root and every previous worktree/preview. No main merge,
publication, account/backend writes or new sports data. Next540 candidate is
the independently reproduced Soccer Attack pending-retry/unsaved-choice race.
A separate audit found simSoccerGridTiers still reports false success when a
later page fails; retain that as follow-up, not a claim fixed by this round.
## Final review follow-up

Independent review cleared production and the browser flow. It found that
fixture assertions thrown inside the real fetch's catch could be swallowed.
The harness now retains unexpected-query receipts outside that catch. A
caught-query control proves those errors reject with exit1, including when
all required-null assertions otherwise pass. All27 normal cases and both
source controls were rerun and pass; both runtime rejection controls exit1.
Logs use the `dukb-round539-world-xi-*-final.log` suffix and
`dukb-round539-pool-final.log`. Returned optional-history errors remain
fail-soft; rejected optional promises retain the existing outer-catch behavior.
No product changes or rebuild were needed for this harness correction.