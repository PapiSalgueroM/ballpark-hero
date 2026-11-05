# Soccer Grid pending-submission settlement implementation plan

Goal: settle a pending main-round guess only while its originating cell, rules and real deadline still allow it.

Spec: master SG-11 (P0, delayed timer/background/slow validation and exactly-once round settlement) plus bounded PL-05 support (coherent consequential action history). No new real sports data, schema, eligibility rules or scoring formula.

Baseline: clean PR513d3935a288f00abd556467a45076636b890d8dd25, tree47941e1282cb378018a5ed5f2e8c8f4a16d15060. Hook6beb012bbc5cd4b2402724fb2a80efe7d0fc5f0c. Main3b14650d verified. Other owner retains Team-picker/KLeague.

## Concrete source gaps
- A pending response checks only whole-round completion after awaits. If another tab fills the same cell and the waiting tab adopts eight valid cells, the old response can append a ninth ok action for an occupied cell. Rendering shows eight cells while action-count win detection/completion awards900.
- Timer completion follows a one-second nowTick render. Date.now can pass the persisted deadline before an interval fires, allowing a late result to initiate a write or mutate the result.

## Scope
- Modify useSoccerGrid.ts only as far as needed to read latest main-cell ownership, originating puzzle/rules, and wall-clock deadline at submission entry and the existing commit boundaries.
- Preserve first real-submission timer start, stored epoch, raw action codec, exact score, rarity formula, main/Overtime separation, fail-closed validation and old late-unverified toasts/checkingDown behavior.
- Expiry uses existing persisted expired flag and completion path exactly once. Ensure first-start epoch is available synchronously before any promise returns.
- Do not count or flash a wrong answer for a cell that became filled while checking. Drop superseded originating puzzle/ruleset results rather than assigning them elsewhere.
- Do not claim rollback of a request that was already sent before expiry/ownership changed. Recheck before initiating writes and before local action commit after the write reply.
- Explain the existing competitive wall-clock policy in reopenable rules if source review finds it insufficient. Time runs from first submission through checking/backgrounding; Unlimited has no deadline and Overtime remains unscored. Do not add a new pause/grace/scoring edition.

## Checks
1. Two independent fictional-fixture real-hook suites, ownership and no-interval deadline, must fail on named business assertions in original App. Preserve source/raw reports and exact failed/passed case census, no missing-import/runtime reds.
2. Make the smallest hook change after original proof. Fixed/restored suites and effective physical cell/deadline guard omissions must distinguish the defects. Preserve timely/untimed/Overtime, true ninth-cell win, initial idle start, late-unverified and reload/once-completion.
3. Proper app types, relevant existing grid/daily/deadline/settings contracts and original-current save parity where supported. Production build, all20saved-output readers and16unchanged caps. If policy copy changes, use existing route-only guide/search/snapshot derivation tools, keep unrelated reference rows/routes exact and prove stale-content controls.
4. Native remote browser keyboard/touch across phone/desktop; actual source board with explicitly marked transport-only synthetic validation for concurrency/slow responses. Abort all foreign requests, no live backend/eligibility credit. Verify exact main save, visible cells, finish/Overtime state, no jumps after target preparation and fresh screenshots.
5. Independent source/outcome/visual audits, exact clean source join, draft stacked after PR513. Update PROJECT-STATE and WORKBOARD. WholeSG11/PL05/master stay partial and global release holds remain.

All App/Git/test/build/browser execution is remote. Local source/index held. Native external evidence and append-only board writes only. Canonical master remains unchanged.

## Design review update before implementation

The original fixtures also challenge storage adoption and callback resolution in one React batch, and a rules change before its pending callback resumes. A ref updated only by this game render can still lag the authoritative save.

Add one readonly getCurrentProgress() getter to useDailyPuzzle, reading its existing synchronous guesses/status refs. This changes no existing append/restore/persistence algorithm. Soccer Grid first takes any newer stored save, then reads this authoritative progress for each eligibility check. Its settings and first-start epoch refs update synchronously at their existing setters; the request captures a meaningful puzzle/rule identity.

The old-hook single-tab parity adapter needs a snapshot getter shim because the historical hook lacks this new API. That shim reads the historical hook's own returned guesses/status and cannot claim same-batch semantics. Run all available old/current daily consumers and existing shape/record/stale tests; preserve every old raw save/outcome. No production compatibility fallback or duplicate storage parser.

This slice guards stale originating requests and real deadlines for a fixed selected ruleset. It does not redesign pre-play setting availability, backend idempotency, ranking cohorts or legacy forged logs. Those master-card parts stay open.
