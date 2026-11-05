# Career Quiz answer-independent suggestions implementation plan

Goal: stop the hidden Unlimited answer from deciding which names appear after the public player pool loads.

Spec: canonical master CRQ-03, P0. Candidate ordering must be independent of the answer. No current live-pool mismatch is asserted; source review found a reachable delayed-loader edge.

Architecture: change only useCareerGame.playerNames. Daily stays unchanged. Unlimited names start with the current public tier, then append every missing name from the same tier of the baked fallback cohort in fixed cohort order. Reuse ensureAnswerInOptions only with public fallback names, never the hidden Unlimited answer. No data, target, progress, scoring, storage, draw or shared helper changes.

Prior slice: CRQ-08 reveal review on candidate1b36 is under qualification42123433679, not ready/merged/published. Final fair-search clean delivery will stack after its clean draft if admitted, otherwise hold.

Checks:
1. Add fictional-fixture actual-hook tests with delayed fetch. Original-first runs must expose named business assertion failures, not missing imports. Show two different actual targets with identical public inputs.
2. Implement the smallest memo/comment change. Verify literal ordering for normal/easy/hard, normalized duplicate handling, missing/displaced targets, exact target/progress/RNG holds, daily/empty/small-pool and existing reset behavior. Physical target-append and omitted-fallback controls must change source and fail owned cases; restore exact bytes.
3. Proper types, focused Career/record/stale/old-current parity, production build, all20saved-output readers and16original caps. Keep review source intact and run its tests/browser proof on the joined App. Additional native Unlimited checks can qualify ordinary autocomplete; constructed missing-pool edge belongs to explicit unit fixtures.
4. Clean draft PR, updated PROJECT-STATE and append-only board. Keep broader release-wide tests/live Reach limits open. No merge/publish.

Held local App and Git remain untouched. All application execution/Git mutations are remote. No real sports data or database writes. Owner of Team-picker/K League remains separate. WholeCRQ03 stays partial until source/name identity and wider cross-device cases are reviewed.
