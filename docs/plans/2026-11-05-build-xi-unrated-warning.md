# Build Your XI unrated record warning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Warn before a Club year player record with unusable rating inputs is committed, while preserving the player's choice to finish an unrated XI.

**Architecture:** Keep the change in the Build Your XI page, with a small addition to its existing reopenable help. Use the current selected-record rating gate, the existing AlertDialog primitives and the unchanged submitPlayer admission path. The pending choice owns a copied entity and copied origin, and can be consumed once only while that origin still matches.

**Tech Stack:** React, TypeScript, existing Radix AlertDialog wrappers, Vitest/Testing Library and the existing remote Chromium qualification tools. No new dependency.

**Spec:** C:/Users/antho/Downloads/DoUKnowBall_Game_Expansion_Masterplan.txt, XI-03, lines 3263-3273. The card requires warning before an avoidable unrated result; nearby supported alternatives, coverage expansion and ranked eligibility policy remain outside this slice. Master SHA256 fda0f7eef07d41f2ba91e89dff3542fef98cd3bd9aabcbe02f70b649797d357a.

## Global Constraints

- Remote authoring and qualification only. Root owns all commits, branches, refs and workflows. This handoff is a plan blob only.
- No product authoring until proper app types and the original source produce the intended owned business AssertionErrors. Import, setup or controller failures earn no original-red credit.
- No new real sports data, database/provider/backend request, price conversion, rating estimate, save format, score formula, RNG draw, search ordering, validator behavior or dependency/budget change.
- Preserve the exact accepted entity metadata, existing eligibility checks, incomplete-record admission and existing unrated result. Mixed and complete Club year records keep their immediate selection path.
- Use no em dash or en dash. Native actions must wrap and be at least 44px high. Preserve the document position and return focus to the connected search input after cancellation.
- This is bounded XI-03 progress, not a completed card, full-suite result, live roster/provenance audit, merge or publication.

## Source pins and current gap

Base: clean PR514 head 3cf296e80ad254bec3cfba2f12660addef5bbe18. The page body also matches inspected current main 3b14650d360b010b25b525de33a5f32f33de2798. Root independently confirmed the page, hook and existing test pins on this clean base.

- src/pages/LineupBuilder.tsx, acb60c5c9f8a4d45a2b33b71b0beda0062570592: handleSelectPlayer at lines 161-175 submits immediately; lines 198-205 define whether the selected row can be rated; lines 231-236 explain missing inputs after eleven records are filled. PlayerAutocomplete is mounted at lines 414-425; page inputRevision already tracks changes. Context-changing handlers include formation selection, position selection, reroll, reset, replay and input/Browse changes.
- src/hooks/useLineupBuilder.ts, d6ecb6bd9ca7e15d328957294c60126b1d02f1d8: submitPlayer(name, pickMeta) owns year/club/position/duplicate admission and records the original metadata. Leave every byte unchanged.
- src/components/lineup/LineupHowToPlay.tsx, a4b77d3ac376273c837e5c5d80f2d1c30d3f78c7: lines 43-53 already explain Club year and missing numeric inputs, and its modal can be reopened from the page.
- src/components/ui/alert-dialog.tsx, 6dfbfb49fedb30753b1b2c08402953d40cc3389c: reuse unchanged for the accessible controlled dialog.
- src/test/buildXiClubYear.test.tsx, 98ca43f7221f4b71eff18d2db456baf598e66a8e: lines 427-441 prove missing age, value or both can reach the unrated result without an invented simulation. Preserve these assertions; update its fill helper only where it must explicitly confirm a newly warned incomplete pick.
- src/components/game/PlayerAutocomplete.tsx, a0bd500b63306c75e0dea251cb6fb67ea2ed9452: unchanged. It passes the chosen entity to the page, and already updates the input and closes the list on selection.

## Review Focus

1. Zero/nonfinite value and nonnumeric/nonfinite age must follow the exact existing rating gate; finite age zero is not a new rejection.
2. A retained confirmation must not commit after a slot, club, formation, year, phase, reset, replay or input context changes, including leaving and returning to an equal-looking origin.
3. Repeated activation must consume one pending choice once, not call submitPlayer twice before React renders.
4. Cancelling must preserve the current lineup, initiate no admission/history/validator/simulation/completion work and restore usable keyboard focus without changing document scroll. Existing autocomplete search on refocus remains allowed.
5. A warning is about rating inputs, not proof of football eligibility. Confirmation must still pass through the unchanged admission path and retain its refusal behavior.

## Task 1: Original-first actual-page warning cases

**Files:** Create src/test/buildXiUnratedWarning.test.tsx. Read and retain the existing Club year setup, history and result tests. No product edits.

**Interfaces:** Mount the real LineupBuilder and real useLineupBuilder. Use fictional records and controlled search/history transport boundaries following buildXiClubYear.test.tsx. Keep the real shared autocomplete, native dialog when implemented, selected-row report gate and admission code. Boundary completion/auth stubs may follow existing tests; do not mock the page or hook.

- [ ] Author bounded cases with explicit XI_RECORD_WARNING_ assertion labels before querying the currently missing dialog. Own the age, value and both-missing warnings, cancellation, one confirmed original record, stale origin and reopenable help/example. Parameterize invalid numeric edges without building a second framework.
- [ ] Preserve complete Club year and Mixed immediate selection; wrong club/year/position refusal; one missing-input draft staying unrated without simulation; and unchanged successful full-record report behavior. Pin rawName, club, year, rawPosition, position, nationality, age and value, not only the display name. Do not coerce numeric strings or substitute data.
- [ ] Retain before/after selected entity, pending UI, filled slots, current team/slot/year, transport calls separated by search versus admission/history/validator, completion, input and scroll/focus observations. Assert no admission/history/validator/season/completion side effects before confirmation. If measuring RNG, distinguish App draws from framework setup and compare against the original after setup; do not assert global zero draws or claim native RNG measurement.
- [ ] Root runs proper app TSC, then the original test leaf in remote CI and inspects actual reports. Admit only the exact named business failures and preservation passes. Stop for method/setup errors. Product authoring remains held until this receipt exists.

## Task 2: Page-owned warning and help

**Files:** Modify src/pages/LineupBuilder.tsx and src/components/lineup/LineupHowToPlay.tsx. Do not change the hook, shared autocomplete, search source or rating helpers.

**Interfaces:** Keep the existing handleSelectPlayer(entity: PlayerEntity) selection boundary and unchanged metadata projection into submitPlayer. A candidate has usable rating inputs only when its projected value is a finite number greater than zero and its projected age is a finite number. This is the same predicate as ratedXi, including its current acceptance of any finite age; this slice adds no age-range rule.

- [ ] For Mixed or a complete Club year record, run the existing immediate path without a dialog. For an incomplete Club year record, copy the entity and its primitive metadata before storing a pending choice. Copy formation, phase, mode/year, selected slot, assigned club/isNation, filled-count context and the input revision. Do not retain an origin object by mutable alias and do not reconstruct the entity from a display name later.
- [ ] Use the existing controlled AlertDialog. Title: "This record is missing rating inputs". Description: "No usable {fields} is recorded for {name} in {year}. If accepted, this pick leaves the completed XI unrated." Fields are exactly "market value", "age" or "market value and age", derived from the existing predicate. Buttons: "Keep searching" and "Use this unrated record". Give Keep searching initial focus; use explicit 44px minimum heights and wrapping text. Keep candidate name/year and the consequence visible on narrow screens.
- [ ] Keep searching, Escape and onOpenChange(false) discard the pending choice without submission. Restore the connected search input with preventScroll. Do not promise a supported alternative exists, clear the lineup, reroll or initiate admission/history/validator/simulation/completion work. The selected name may remain in the input so the player can edit it. Refocusing the unchanged shared autocomplete may legitimately start its ordinary fresh search; retain that search behavior and do not classify it as a cancelled admission.
- [ ] Keep a synchronous pending ref beside the UI state so confirmation can consume the choice once before calling the original async submit path. Compare its copied origin with current page context and require an available empty slot in the same building Club year draft. Refuse a mismatching or consumed choice. Do not reimplement football admission or bypass submitPlayer.
- [ ] Synchronously invalidate a pending choice before page handlers change formation, selected position, club reroll, reset/replay, input or Browse revision. Also invalidate on rendered context changes or unmount. This invalidation must prevent a stale callback from succeeding after an origin changes away and later looks equal again; comparing only current strings is insufficient. Closing a dialog must not revive its old choice. Keep all original handler calls and arguments intact.
- [ ] Expand the existing Club year help with: "Club year draft warns before you use a record with no usable value or age. Keep searching, or choose Use this unrated record to continue." Add: "Example: a matching record with a value but no age needs your confirmation. Keep searching leaves the slot open. Use this unrated record keeps the original record, and the completed XI stays unrated." Preserve the existing historical example and other rules. This new example makes no real sports claim.
- [ ] Root runs the new leaf plus unchanged relevant Club year, history/read, validator, picker and report checks. Preserve the existing missing-input result assertions and complete-record report once-only behavior. Record actual counts and all failures; no weakened tests or removed cases.

## Task 3: Effective controls and same-artifact qualification

**Files:** Temporary remote QA/controller/workflow leaves owned by Root, outside the permanent product slice. Small plan/project-state updates belong to the final reviewed delivery. Generated guide/search/snapshot files are included only if the normal producer actually changes their owned content, with all unrelated routes/fields held.

**Interfaces:** Controls perturb the actual final page/help copy, assert each physical anchor occurs exactly once and restore full source bytes in finally. No control may rewrite an expected result to manufacture success. Existing permanent harnesses remain unchanged.

- [ ] Measure separate faults: bypass the incomplete-record warning; omit age or value from its gate; submit on cancellation; remove origin invalidation/guard; remove synchronous one-use consumption; and omit the new instruction/example. Derive exact expected case sets from the admitted test source, then inspect measured AssertionErrors and RAW changes. Do not credit method failures or untouched source as effective controls.
- [ ] Require fixed/restored cases, relevant original tests, proper app TSC, the normal build, all required saved-output readers and every unchanged size budget. Preserve source, lock, data, RNG, transport and output evidence. No need to rebuild solely for a QA recovery when the completed App artifact is held unchanged.
- [ ] Run native touch/keyboard flows on the same completed artifact at 320, 390 and 1280: open the missing-input warning, cancel with focus/scroll held, reopen and confirm once, then finish a genuine unrated draft. Include one ordinary complete-record path and inspect the reopenable worked example. Fixture verdicts prove UI/admission plumbing only, not real roster coverage. Retain actual dialog screenshots, layout/action receipts and literal source/output hashes.
- [ ] Update the scoped plan/project state with admitted source/evidence pins and unresolved limits. Deliver for Root review without claiming XI-03 complete, wider suite green, merge or publication. Root selects and controls the following implementation step only after original business reds.
