# Career Path early-club hint implementation plan

> **For agentic workers:** Execute this bounded slice with the existing writing-plans, test-driven-development, QA-hunter and verification workflow. Preserve the held local tree.

**Goal:** Give a stuck Career Path player one deliberate club clue while retaining the four-box random hint.

**Architecture:** Derive the first nonempty unrevealed club row from the page's existing targetPlayer and revealedCells. The native button calls the existing revealCell with that exact row key. No hook, data, backend, save or scoring changes.

**Tech stack:** React, TypeScript, Vitest, Testing Library, isolated Playwright through GitHub Actions.

**Spec:** Canonical master CRQ-06, lines5825-5835. This is the early-club portion only. The canonical 409-card file is unchanged.

## Constraints and decisions

- Base: draft stack f0f6e773ad71a7444dc67998dad070098ff5fe28, tree e8c9e27e448fceecc164707b8a646f5b7bdea0c5.
- Source page6f297a53cf8f5276c86b066d13cf49c20aa916f7; hookfd4a554a75e2a9ed208ddfc53bb9d88fbb95559f and boardb07c3cc0ee62b53ef6d110939337f69de2743c9e remain unchanged.
- Existing board order is the hint policy. Do not reorder years or split a composite/loan club string. Describe the earliest club box still hidden on this board, not a verified first senior club.
- One ordinary reveal costs one box. Give Hint continues to reveal up to four random hidden boxes. Results use existing assistance and scoring semantics.
- Empty/whitespace club rows are skipped. Disabled early-club button when no valid club remains. No hint controls after game end.
- No local App or Git execution. No database writes, invented real facts, cap changes, dependency changes or publishing.

## Review focus

Board-order versus repeated seasons and composite club strings; all clubs exhausted while stats remain hidden; empty clubs; stale daily save or reload; repeated keyboard/touch activations, end state and unlimited reset. Tests must measure exact reveal keys, calls and state rather than only rendering a button.

## Task1: page and daily contracts

- [ ] Add an actual-page UI test with original-first named failures. Cover first eligible board row and next hidden row; empty/whitespace rows and composite names; disabled exhausted action without disabling four-box hint; one revealCell call, no giveHint/RNG/save writes; existing random action; end state and instructions.
- [ ] Watch original failures. Keep the product page byte-identical until those failures are recorded.
- [ ] Add only the derived index and native action to CareerGame. Add compact explanatory text and a worked rules example. Use wrapping controls with at least44px targets.
- [ ] Run fixed tests plus effective controls for first revealed selection, empty-club selection, random substitution, exhausted action and missing cost explanation. Restore exact source.
- [ ] Run existing Career Path daily record, stale-save and reload parity checks without weakening their assertions. Preserve page/hook/board/data and random tapes where applicable.

## Task2: build and native review

- [ ] Proper App types and normal production build. Run all15 required built-output readers plus existing additional fences and all16 unchanged route caps.
- [ ] Real page at320/390/1280: one-box reveal, existing four-box reveal, exact reload/state equivalence to manual cell, no document jump, keyboard/touch, readable costs and reopenable rules. Record source/dist hashes and screenshots before review.
- [ ] Review code and actual screenshots independently. Fix demonstrated regressions, do not loosen caps or assertions.
- [ ] Make a clean draft stacked PR with page/test/plan/state/board only. Temporary controllers and QA workflows stay on the verification branch. Update PROJECT-STATE and WORKBOARD with exact evidence and remaining global limits.

## Ledger

2026-11-05: Plan and claim prepared before product edits. Original page/hook/board source pinned. Broader automatic PR failures are being separately classified; no global release credit or publication.


2026-11-05 qualification follow-up: full run42108226892 at7f58cb93 passes types, fixed11, the3 existing record/stale-save cases, normal build, all20 readers, all16 unchanged caps and4991 actual-day browser checks across320/390/1280. All3 real wins score700, with no completion request forwarded. The source controller stopped at allow-empty because the DOM disabled matcher omits Vitest's custom label in its error; its exact outcome was retained. The controller now accepts only the expected DOM assertion shapes and asserts full failed-case sets. Old save parity failed setup before any case because its copied prehook was outside the Vite project; it now loads the exact retained617b hook inside the evidence directory. Neither failure justified a game logic change. Screenshot review also found the old article's blanket four-box rule; only Career Quiz's three copy strings in soccer2.ts and the help's up-to wording are corrected to describe both hint choices. This requires a fresh build/readers/browser run. Prior partial results remain retained, no global release credit.
